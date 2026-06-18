package keygen

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"
)

const KeyPrefix = "sk-tok-"

type KeyManager struct {
	mu   sync.RWMutex
	keys map[string]*StoredKey // key: keyHash
}

type CreateKeyRequest struct {
	Name          string   `json:"name"`
	UserID        string   `json:"user_id"`
	OrgID         string   `json:"org_id"`
	DeptID        string   `json:"dept_id"`
	ProjectID     string   `json:"project_id"`
	DailyBudget   float64  `json:"daily_budget"`
	RateLimitRPM  int      `json:"rate_limit_rpm"`
	AllowedModels []string `json:"allowed_models"`
	AllowedIPs    []string `json:"allowed_ips"`
	ExpiresDays   int      `json:"expires_days"`
}

type StoredKey struct {
	ID            string    `json:"id"`
	KeyHash       string    `json:"-"`
	KeyPrefix     string    `json:"key_prefix"`
	APIKey        string    `json:"api_key"`
	Name          string    `json:"name"`
	UserID        string    `json:"user_id"`
	UserName      string    `json:"user_name"`
	OrgID         string    `json:"org_id"`
	DeptID        string    `json:"dept_id"`
	DeptName      string    `json:"dept_name"`
	ProjectID     string    `json:"project_id"`
	Status        string    `json:"status"`
	DailyBudget   float64   `json:"daily_budget"`
	RateLimitRPM  int       `json:"rate_limit_rpm"`
	AllowedModels []string  `json:"allowed_models"`
	AllowedIPs    []string  `json:"allowed_ips"`
	CreatedAt     time.Time `json:"created_at"`
	ExpiresAt     *time.Time `json:"expires_at"`
	LastUsedAt    *time.Time `json:"last_used_at"`
	TodayCost     float64   `json:"today_cost"`
	TodayTokens   int64     `json:"today_tokens"`
	TodayCalls    int64     `json:"today_calls"`
}

type CreatedKey struct {
	ID        string `json:"id"`
	APIKey    string `json:"api_key"`
	KeyPrefix string `json:"key_prefix"`
}

type ListKeysQuery struct {
	Status string `form:"status"`
	Search string `form:"search"`
	Page   int    `form:"page"`
	PageSize int  `form:"page_size"`
}

type KeyListResult struct {
	Data       []*StoredKey `json:"data"`
	Total      int          `json:"total"`
	Page       int          `json:"page"`
	PageSize   int          `json:"page_size"`
	TotalPages int          `json:"total_pages"`
}

var globalManager = &KeyManager{
	keys: make(map[string]*StoredKey),
}

func GetManager() *KeyManager {
	return globalManager
}

func NewKeyManager() *KeyManager {
	return globalManager
}

func (m *KeyManager) CreateKey(req *CreateKeyRequest) (*CreatedKey, error) {
	randomBytes := make([]byte, 32)
	if _, err := rand.Read(randomBytes); err != nil {
		return nil, fmt.Errorf("generate random: %w", err)
	}

	apiKey := KeyPrefix + base64.RawURLEncoding.EncodeToString(randomBytes)
	keyHash := sha256Hex(apiKey)
	keyID := uuid.New().String()
	keyPrefix := apiKey[:11]

	if req.RateLimitRPM <= 0 {
		req.RateLimitRPM = 60
	}

	var expiresAt *time.Time
	if req.ExpiresDays > 0 {
		t := time.Now().Add(time.Duration(req.ExpiresDays) * 24 * time.Hour)
		expiresAt = &t
	}

	stored := &StoredKey{
		ID:            keyID,
		KeyHash:       keyHash,
		KeyPrefix:     keyPrefix,
		APIKey:        apiKey,
		Name:          req.Name,
		UserID:        req.UserID,
		UserName:      req.UserID,
		OrgID:         req.OrgID,
		DeptID:        req.DeptID,
		DeptName:      req.DeptID,
		ProjectID:     req.ProjectID,
		Status:        "active",
		DailyBudget:   req.DailyBudget,
		RateLimitRPM:  req.RateLimitRPM,
		AllowedModels: req.AllowedModels,
		AllowedIPs:    req.AllowedIPs,
		CreatedAt:     time.Now(),
		ExpiresAt:     expiresAt,
	}

	m.mu.Lock()
	m.keys[keyHash] = stored
	m.mu.Unlock()

	return &CreatedKey{
		ID:        keyID,
		APIKey:    apiKey,
		KeyPrefix: keyPrefix,
	}, nil
}

func (m *KeyManager) Validate(apiKey string) (*StoredKey, error) {
	keyHash := sha256Hex(apiKey)

	m.mu.RLock()
	stored, ok := m.keys[keyHash]
	m.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("invalid api key")
	}
	if stored.Status != "active" {
		return nil, fmt.Errorf("key is %s", stored.Status)
	}
	if stored.ExpiresAt != nil && stored.ExpiresAt.Before(time.Now()) {
		stored.Status = "expired"
		return nil, fmt.Errorf("key expired")
	}

	now := time.Now()
	m.mu.Lock()
	stored.LastUsedAt = &now
	m.mu.Unlock()

	return stored, nil
}

func (m *KeyManager) List(query *ListKeysQuery) *KeyListResult {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var filtered []*StoredKey
	for _, k := range m.keys {
		if query.Status != "" && k.Status != query.Status {
			continue
		}
		if query.Search != "" {
			if k.Name != query.Search && k.UserName != query.Search {
				continue
			}
		}
		filtered = append(filtered, k)
	}

	sort.Slice(filtered, func(i, j int) bool {
		return filtered[i].CreatedAt.After(filtered[j].CreatedAt)
	})

	total := len(filtered)
	if query.Page <= 0 {
		query.Page = 1
	}
	if query.PageSize <= 0 {
		query.PageSize = 20
	}

	start := (query.Page - 1) * query.PageSize
	if start >= total {
		return &KeyListResult{Data: []*StoredKey{}, Total: total, Page: query.Page, PageSize: query.PageSize, TotalPages: 0}
	}
	end := start + query.PageSize
	if end > total {
		end = total
	}

	totalPages := (total + query.PageSize - 1) / query.PageSize

	return &KeyListResult{
		Data:       filtered[start:end],
		Total:      total,
		Page:       query.Page,
		PageSize:   query.PageSize,
		TotalPages: totalPages,
	}
}

func (m *KeyManager) Get(keyID string) (*StoredKey, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, k := range m.keys {
		if k.ID == keyID {
			return k, nil
		}
	}
	return nil, fmt.Errorf("key not found")
}

func (m *KeyManager) Revoke(keyID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, k := range m.keys {
		if k.ID == keyID {
			k.Status = "revoked"
			return nil
		}
	}
	return fmt.Errorf("key not found")
}

func (m *KeyManager) Update(keyID string, req *CreateKeyRequest) (*StoredKey, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, k := range m.keys {
		if k.ID == keyID {
			k.Name = req.Name
			k.DailyBudget = req.DailyBudget
			k.RateLimitRPM = req.RateLimitRPM
			k.AllowedModels = req.AllowedModels
			k.AllowedIPs = req.AllowedIPs
			if req.DeptID != "" { k.DeptID = req.DeptID }
			if req.UserID != "" { k.UserID = req.UserID; k.UserName = req.UserID }
			return k, nil
		}
	}
	return nil, fmt.Errorf("key not found")
}

func (m *KeyManager) UpdateBudget(keyID string, budget float64) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, k := range m.keys {
		if k.ID == keyID {
			k.DailyBudget = budget
			return nil
		}
	}
	return fmt.Errorf("key not found")
}

func (m *KeyManager) RecordUsage(keyHash string, cost float64, tokens int64) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if k, ok := m.keys[keyHash]; ok {
		k.TodayCost += cost
		k.TodayTokens += tokens
		k.TodayCalls++
	}
}

func (m *KeyManager) HashKey(apiKey string) string {
	return sha256Hex(apiKey)
}

func (m *KeyManager) SeedDemoKeys() {
	reqs := []CreateKeyRequest{
		{Name: "张三-代码生成", UserID: "user-001", OrgID: "org-001", DeptID: "dept-rd", DailyBudget: 100, RateLimitRPM: 60, AllowedModels: []string{"deepseek-chat", "qwen-max"}},
		{Name: "李四-AI助手", UserID: "user-002", OrgID: "org-001", DeptID: "dept-product", DailyBudget: 50, RateLimitRPM: 30},
		{Name: "王五-客服Agent", UserID: "user-003", OrgID: "org-001", DeptID: "dept-ops", DailyBudget: 200, RateLimitRPM: 120},
		{Name: "数据分析Agent", UserID: "agent-001", OrgID: "org-001", DeptID: "dept-data", DailyBudget: 500, RateLimitRPM: 300},
		{Name: "代码审查Bot", UserID: "agent-002", OrgID: "org-001", DeptID: "dept-rd", DailyBudget: 150, RateLimitRPM: 100},
	}

	for _, req := range reqs {
		created, err := m.CreateKey(&req)
		if err != nil {
			continue
		}

		m.mu.Lock()
		if k, ok := m.keys[sha256Hex(created.APIKey)]; ok {
			k.UserName = req.Name
			switch req.DeptID {
			case "dept-rd":
				k.DeptName = "研发部"
			case "dept-product":
				k.DeptName = "产品部"
			case "dept-ops":
				k.DeptName = "运营部"
			case "dept-data":
				k.DeptName = "数据部"
			}
			k.TodayCost = float64(50+len(req.Name)*10) + float64(req.DailyBudget)*0.3
			k.TodayTokens = int64(1000000 + len(req.Name)*500000)
			k.TodayCalls = int64(100 + len(req.Name)*20)
		}
		m.mu.Unlock()
	}
}

func sha256Hex(s string) string {
	h := sha256.Sum256([]byte(s))
	return fmt.Sprintf("%x", h)
}
