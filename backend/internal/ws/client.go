package ws

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 4096
	sendBufSize    = 256
)

type Client struct {
	ID       string
	OrgID    string
	UserID   string
	Types    map[string]bool
	Conn     *websocket.Conn
	Send     chan []byte
	Hub      *Hub
	mu       sync.RWMutex
}

type ClientMessage struct {
	Type    string   `json:"type"`
	Payload string   `json:"payload"`
	Types   []string `json:"types,omitempty"`
}

func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			break
		}
		var msg ClientMessage
		if json.Unmarshal(message, &msg) == nil {
			c.handleClientMessage(&msg)
		}
	}
}

func (c *Client) handleClientMessage(msg *ClientMessage) {
	if len(msg.Types) > 0 {
		c.mu.Lock()
		c.Types = make(map[string]bool)
		for _, t := range msg.Types {
			c.Types[t] = true
		}
		c.mu.Unlock()
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
