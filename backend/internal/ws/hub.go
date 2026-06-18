package ws

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var JWTSecret = []byte("tokenhub-dev-secret-change-in-production")

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type WSEventType string

const (
	EventCallEvent    WSEventType = "call_event"
	EventBudgetAlert  WSEventType = "budget_alert"
	EventSafetyAlert  WSEventType = "safety_alert"
	EventAgentAnomaly WSEventType = "agent_anomaly"
)

type WSMessage struct {
	Type      WSEventType     `json:"type"`
	Payload   json.RawMessage `json:"payload"`
	Timestamp string          `json:"timestamp"`
	OrgID     string          `json:"org_id"`
}

type Hub struct {
	mu         sync.RWMutex
	clients    map[string]map[string]*Client
	Register   chan *Client
	Unregister chan *Client
	redis      *redis.Client
	ctx        context.Context
	cancel     context.CancelFunc
}

func NewHub(redisClient *redis.Client) *Hub {
	ctx, cancel := context.WithCancel(context.Background())
	return &Hub{
		clients:    make(map[string]map[string]*Client),
		Register:   make(chan *Client, 256),
		Unregister: make(chan *Client, 256),
		redis:      redisClient,
		ctx:        ctx,
		cancel:     cancel,
	}
}

func (h *Hub) Run() {
	go h.listenRedisEvents()
	for {
		select {
		case client := <-h.Register:
			h.registerClient(client)
		case client := <-h.Unregister:
			h.unregisterClient(client)
		case <-h.ctx.Done():
			return
		}
	}
}

func (h *Hub) Shutdown() {
	h.cancel()
	h.mu.Lock()
	defer h.mu.Unlock()
	for _, orgClients := range h.clients {
		for _, client := range orgClients {
			close(client.Send)
		}
	}
	h.clients = make(map[string]map[string]*Client)
}

func (h *Hub) registerClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if _, ok := h.clients[client.OrgID]; !ok {
		h.clients[client.OrgID] = make(map[string]*Client)
	}
	h.clients[client.OrgID][client.ID] = client
	log.Printf("[WS] Client registered: org=%s id=%s", client.OrgID, client.ID)
}

func (h *Hub) unregisterClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if orgClients, ok := h.clients[client.OrgID]; ok {
		if _, exists := orgClients[client.ID]; exists {
			delete(orgClients, client.ID)
			close(client.Send)
		}
		if len(orgClients) == 0 {
			delete(h.clients, client.OrgID)
		}
	}
	log.Printf("[WS] Client unregistered: org=%s id=%s", client.OrgID, client.ID)
}

func (h *Hub) listenRedisEvents() {
	pubsub := h.redis.Subscribe(h.ctx, "channel:ws:events")
	defer pubsub.Close()
	ch := pubsub.Channel()
	for {
		select {
		case msg, ok := <-ch:
			if !ok {
				pubsub = h.redis.Subscribe(h.ctx, "channel:ws:events")
				ch = pubsub.Channel()
				continue
			}
			h.handleRedisMessage(msg)
		case <-h.ctx.Done():
			return
		}
	}
}

func (h *Hub) handleRedisMessage(msg *redis.Message) {
	var wsMsg WSMessage
	if err := json.Unmarshal([]byte(msg.Payload), &wsMsg); err != nil {
		return
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	orgClients, ok := h.clients[wsMsg.OrgID]
	if !ok {
		return
	}
	payload, _ := json.Marshal(&wsMsg)
	for _, client := range orgClients {
		if client.Types[string(wsMsg.Type)] {
			select {
			case client.Send <- payload:
			default:
			}
		}
	}
}

func (h *Hub) Publish(ctx context.Context, orgID string, eventType WSEventType, payload interface{}) error {
	rawPayload, _ := json.Marshal(payload)
	msg := WSMessage{
		Type:      eventType,
		Payload:   rawPayload,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		OrgID:     orgID,
	}
	data, _ := json.Marshal(msg)
	return h.redis.Publish(ctx, "channel:ws:events", data).Err()
}

func (h *Hub) ServeWS(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	orgID := r.URL.Query().Get("org_id")
	requestedTypes := r.URL.Query().Get("types")

	userID, err := h.authenticate(token)
	if err != nil {
		http.Error(w, `{"error":"auth failed"}`, http.StatusUnauthorized)
		return
	}

	typeMap := make(map[string]bool)
	if requestedTypes != "" {
		for _, t := range strings.Split(requestedTypes, ",") {
			typeMap[strings.TrimSpace(t)] = true
		}
	}
	if len(typeMap) == 0 {
		typeMap["call_event"] = true
		typeMap["budget_alert"] = true
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WS] Upgrade error: %v", err)
		return
	}

	client := &Client{
		ID:    uuid.New().String(),
		OrgID: orgID,
		UserID: userID,
		Types: typeMap,
		Conn:  conn,
		Send:  make(chan []byte, sendBufSize),
		Hub:   h,
	}
	h.Register <- client
	go client.WritePump()
	go client.ReadPump()
}

func (h *Hub) authenticate(token string) (string, error) {
	claims := &jwt.RegisteredClaims{}
	parsed, err := jwt.ParseWithClaims(token, claims, func(t *jwt.Token) (interface{}, error) {
		return JWTSecret, nil
	})
	if err != nil || !parsed.Valid {
		return "", err
	}
	return claims.Subject, nil
}

func (h *Hub) Stats() map[string]interface{} {
	h.mu.RLock()
	defer h.mu.RUnlock()
	total := 0
	for _, clients := range h.clients {
		total += len(clients)
	}
	return map[string]interface{}{
		"total_clients": total,
		"total_orgs":    len(h.clients),
	}
}
