package agent

import (
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"
)

type AgentProfile struct {
	KeyID         string            `json:"key_id"`
	KeyPrefix     string            `json:"key_prefix"`
	KeyName       string            `json:"key_name"`
	OwnerName     string            `json:"owner_name"`
	OwnerEmail    string            `json:"owner_email"`
	OwnerRole     string            `json:"owner_role"`
	DeptName      string            `json:"dept_name"`
	Status        string            `json:"status"`
	Stats         AgentStats        `json:"stats"`
	AnomalyFlags  []string          `json:"anomaly_flags"`
}

type AgentStats struct {
	TodayCalls     int64   `json:"today_calls"`
	TodayTokens    int64   `json:"today_tokens"`
	TodayCost      float64 `json:"today_cost"`
	WeekCalls      int64   `json:"week_calls"`
	WeekTokens     int64   `json:"week_tokens"`
	WeekCost       float64 `json:"week_cost"`
	MonthCalls     int64   `json:"month_calls"`
	MonthTokens    int64   `json:"month_tokens"`
	MonthCost      float64 `json:"month_cost"`
	AvgLatencyMs   float64 `json:"avg_latency_ms"`
	ErrorRate      float64 `json:"error_rate"`
	PreferredModel string  `json:"preferred_model"`
	TopScene       string  `json:"top_scene"`
	ActiveHours    []int   `json:"active_hours"`
	CostTrend      string  `json:"cost_trend"`
	CostChangeRate float64 `json:"cost_change_rate"`
	BlockedCalls   int64   `json:"blocked_calls"`
}

type AnomalyRecord struct {
	ID          string    `json:"id"`
	KeyID       string    `json:"key_id"`
	KeyPrefix   string    `json:"key_prefix"`
	OwnerName   string    `json:"owner_name"`
	AnomalyType string    `json:"anomaly_type"`
	Description string    `json:"description"`
	Severity    string    `json:"severity"`
	Timestamp   time.Time `json:"timestamp"`
	Status      string    `json:"status"`
}

type Service struct {
	agents     map[string]*AgentProfile
	anomalies  []*AnomalyRecord
	registered map[string]*RegisteredAgent
	mu         sync.RWMutex
}

var globalService = &Service{
	agents:     make(map[string]*AgentProfile),
	anomalies:  make([]*AnomalyRecord, 0),
	registered: make(map[string]*RegisteredAgent),
}

func GetService() *Service { return globalService }

func init() {
	globalService.seedDemo()
	globalService.seedRegisteredAgents()
}

func (s *Service) GetRanking(sortBy string) []*AgentProfile {
	s.mu.RLock()
	defer s.mu.RUnlock()

	list := make([]*AgentProfile, 0, len(s.agents))
	for _, a := range s.agents {
		list = append(list, a)
	}

	switch sortBy {
	case "calls":
		sort.Slice(list, func(i, j int) bool { return list[i].Stats.TodayCalls > list[j].Stats.TodayCalls })
	case "tokens":
		sort.Slice(list, func(i, j int) bool { return list[i].Stats.TodayTokens > list[j].Stats.TodayTokens })
	case "error_rate":
		sort.Slice(list, func(i, j int) bool { return list[i].Stats.ErrorRate > list[j].Stats.ErrorRate })
	default:
		sort.Slice(list, func(i, j int) bool { return list[i].Stats.TodayCost > list[j].Stats.TodayCost })
	}
	return list
}

func (s *Service) GetProfile(keyID string) *AgentProfile {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.agents[keyID]
}

func (s *Service) GetAnomalies() []*AnomalyRecord {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.anomalies
}

func (s *Service) seedDemo() {
	profiles := []struct {
		keyID, prefix, name, owner, dept, model, scene, status string
		calls, tokens int64
		cost float64
		latency, errorRate float64
		hours []int
		flags []string
		trend string
		change float64
	}{
		{"k1","sk-tok-abc1","张三-代码生成","张三","研发部","deepseek-chat","code_generation","normal", 12340,15000000,4500.50, 850,0.002, []int{9,10,11,14,15,16,17},nil,"up",0.12},
		{"k2","sk-tok-abc2","数据分析Agent","数据分析Agent","数据部","deepseek-reasoner","data_analysis","warning", 8900,12000000,3800.20, 1200,0.008, []int{8,9,10,14,15,16,17,20,21},[]string{"night_activity"},"up",0.25},
		{"k3","sk-tok-abc3","李四-AI助手","李四","产品部","qwen-max","document_writing","normal", 4500,5500000,1600.75, 780,0.001, []int{10,11,14,15},nil,"stable",0.03},
		{"k4","sk-tok-abc4","客服Agent","客服Agent","运营部","kimi-latest","customer_service","normal", 15600,8200000,2100.30, 620,0.003, []int{8,9,10,11,12,13,14,15,16,17},nil,"up",0.08},
		{"k5","sk-tok-abc5","王五-工具测试","王五","研发部","doubao-pro-256k","general","blocked", 32000,18000000,8200.00, 450,0.15, []int{2,3,4,5},[]string{"night_activity","cost_spike","loop_detection"},"up",3.50},
		{"k6","sk-tok-abc6","代码审查Bot","代码审查Bot","研发部","glm-5","code_generation","normal", 2100,3100000,980.25, 920,0.004, []int{10,11,14,15},nil,"down",-0.05},
	}

	for _, p := range profiles {
		ownerEmail := p.owner + "@example.com"
		ownerRole := "user"

		profile := &AgentProfile{
			KeyID:      p.keyID,
			KeyPrefix:  p.prefix,
			KeyName:    p.name,
			OwnerName:  p.owner,
			OwnerEmail: ownerEmail,
			OwnerRole:  ownerRole,
			DeptName:   p.dept,
			Status:     p.status,
			Stats: AgentStats{
				TodayCalls:     p.calls,
				TodayTokens:    p.tokens,
				TodayCost:      p.cost,
				WeekCalls:      p.calls * 5,
				WeekTokens:     p.tokens * 5,
				WeekCost:       p.cost * 4.5,
				MonthCalls:     p.calls * 22,
				MonthTokens:    p.tokens * 22,
				MonthCost:      p.cost * 20,
				AvgLatencyMs:   p.latency,
				ErrorRate:      p.errorRate,
				PreferredModel: p.model,
				TopScene:       p.scene,
				ActiveHours:    p.hours,
				CostTrend:      p.trend,
				CostChangeRate: p.change,
				BlockedCalls:   int64(float64(p.calls) * p.errorRate * 3),
			},
			AnomalyFlags: p.flags,
		}
		s.agents[p.keyID] = profile
	}

	s.anomalies = []*AnomalyRecord{
		{ID: "an-1", KeyID: "k5", KeyPrefix: "sk-tok-abc5", OwnerName: "王五-工具测试", AnomalyType: "cost_spike", Description: "5分钟内花费¥850，超过阈值¥500，已自动阻断", Severity: "critical", Timestamp: time.Now().Add(-2*time.Hour), Status: "resolved"},
		{ID: "an-2", KeyID: "k5", KeyPrefix: "sk-tok-abc5", OwnerName: "王五-工具测试", AnomalyType: "loop_detection", Description: "1分钟内调用120次，疑似死循环，已触发限速", Severity: "critical", Timestamp: time.Now().Add(-3*time.Hour), Status: "resolved"},
		{ID: "an-3", KeyID: "k2", KeyPrefix: "sk-tok-abc2", OwnerName: "数据分析Agent", AnomalyType: "night_activity", Description: "凌晨2:00-5:00存在高频调用(320次)，可能是定时任务异常", Severity: "warning", Timestamp: time.Now().Add(-8*time.Hour), Status: "pending"},
	}
}

// ===== Registered Agent =====

type RegisteredAgent struct {
	ID              string     `json:"id"`
	Name            string     `json:"name"`
	Description     string     `json:"description"`
	OwnerUserID     string     `json:"owner_user_id"`
	OwnerName       string     `json:"owner_name"`
	OwnerEmail      string     `json:"owner_email"`
	DeptID          string     `json:"dept_id"`
	DeptName        string     `json:"dept_name"`
	LinkedKeyIDs    []string   `json:"linked_key_ids"`
	RiskLevel       string     `json:"risk_level"`
	Status          string     `json:"status"`
	SandboxRequired bool       `json:"sandbox_required"`
	AllowedModels   []string   `json:"allowed_models"`
	DailyBudget     float64    `json:"daily_budget"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	LastActiveAt    *time.Time `json:"last_active_at"`
	TodayCost       float64    `json:"today_cost"`
	TodayTokens     int64      `json:"today_tokens"`
	TodayCalls      int64      `json:"today_calls"`
}

type CreateAgentRequest struct {
	Name            string   `json:"name"`
	Description     string   `json:"description"`
	OwnerUserID     string   `json:"owner_user_id"`
	OwnerName       string   `json:"owner_name"`
	OwnerEmail      string   `json:"owner_email"`
	DeptID          string   `json:"dept_id"`
	DeptName        string   `json:"dept_name"`
	RiskLevel       string   `json:"risk_level"`
	SandboxRequired bool     `json:"sandbox_required"`
	AllowedModels   []string `json:"allowed_models"`
	DailyBudget     float64  `json:"daily_budget"`
	LinkedKeyIDs    []string `json:"linked_key_ids"`
}

func (s *Service) ListRegisteredAgents() []*RegisteredAgent {
	s.mu.RLock(); defer s.mu.RUnlock()
	list := make([]*RegisteredAgent, 0, len(s.registered))
	for _, a := range s.registered { list = append(list, a) }
	sort.Slice(list, func(i, j int) bool { return list[i].CreatedAt.After(list[j].CreatedAt) })
	return list
}

func (s *Service) GetRegisteredAgent(id string) *RegisteredAgent {
	s.mu.RLock(); defer s.mu.RUnlock()
	return s.registered[id]
}

func (s *Service) CreateRegisteredAgent(req *CreateAgentRequest) *RegisteredAgent {
	s.mu.Lock(); defer s.mu.Unlock()
	id := uuid.New().String()
	now := time.Now()
	a := &RegisteredAgent{
		ID: id, Name: req.Name, Description: req.Description,
		OwnerUserID: req.OwnerUserID, OwnerName: req.OwnerName, OwnerEmail: req.OwnerEmail,
		DeptID: req.DeptID, DeptName: req.DeptName,
		LinkedKeyIDs: req.LinkedKeyIDs, RiskLevel: req.RiskLevel,
		Status: "active", SandboxRequired: req.SandboxRequired,
		AllowedModels: req.AllowedModels, DailyBudget: req.DailyBudget,
		CreatedAt: now, UpdatedAt: now,
	}
	if a.RiskLevel == "" { a.RiskLevel = "medium" }
	s.registered[id] = a
	return a
}

func (s *Service) UpdateRegisteredAgent(id string, req *CreateAgentRequest) *RegisteredAgent {
	s.mu.Lock(); defer s.mu.Unlock()
	a, ok := s.registered[id]
	if !ok { return nil }
	a.Name = req.Name; a.Description = req.Description
	a.OwnerName = req.OwnerName; a.OwnerEmail = req.OwnerEmail
	a.DeptName = req.DeptName; a.RiskLevel = req.RiskLevel
	a.SandboxRequired = req.SandboxRequired
	a.AllowedModels = req.AllowedModels; a.DailyBudget = req.DailyBudget
	if len(req.LinkedKeyIDs) > 0 { a.LinkedKeyIDs = req.LinkedKeyIDs }
	a.UpdatedAt = time.Now()
	return a
}

func (s *Service) SuspendAgent(id string) error {
	s.mu.Lock(); defer s.mu.Unlock()
	a, ok := s.registered[id]
	if !ok { return fmt.Errorf("not found") }
	a.Status = "suspended"; a.UpdatedAt = time.Now()
	return nil
}

func (s *Service) ActivateAgent(id string) error {
	s.mu.Lock(); defer s.mu.Unlock()
	a, ok := s.registered[id]
	if !ok { return fmt.Errorf("not found") }
	a.Status = "active"; a.UpdatedAt = time.Now()
	return nil
}

func (s *Service) DeregisterAgent(id string) error {
	s.mu.Lock(); defer s.mu.Unlock()
	if _, ok := s.registered[id]; !ok { return fmt.Errorf("not found") }
	delete(s.registered, id)
	return nil
}

func (s *Service) seedRegisteredAgents() {
	now := time.Now()
	agents := []*RegisteredAgent{
		{ID: "ra-1", Name: "数据分析Agent", Description: "自动生成数据分析周报和图表", OwnerUserID: "user-001", OwnerName: "张三", OwnerEmail: "zhangsan@example.com", DeptID: "dept-data", DeptName: "数据部", LinkedKeyIDs: []string{"k1"}, RiskLevel: "medium", Status: "active", AllowedModels: []string{"deepseek-chat", "qwen-max"}, DailyBudget: 500, CreatedAt: now.Add(-30*24*time.Hour), TodayCost: 680, TodayTokens: 4200000, TodayCalls: 1200},
		{ID: "ra-2", Name: "代码审查Bot", Description: "自动审查Git PR代码质量", OwnerUserID: "user-001", OwnerName: "张三", OwnerEmail: "zhangsan@example.com", DeptID: "dept-rd", DeptName: "研发部", LinkedKeyIDs: []string{"k2"}, RiskLevel: "low", Status: "active", AllowedModels: []string{"glm-5"}, DailyBudget: 150, CreatedAt: now.Add(-20*24*time.Hour), TodayCost: 320, TodayTokens: 1100000, TodayCalls: 400},
		{ID: "ra-3", Name: "客服Agent", Description: "7x24小时智能客服", OwnerUserID: "user-002", OwnerName: "李四", OwnerEmail: "lisi@example.com", DeptID: "dept-ops", DeptName: "运营部", LinkedKeyIDs: []string{"k3"}, RiskLevel: "low", Status: "active", AllowedModels: []string{"kimi-latest"}, DailyBudget: 200, CreatedAt: now.Add(-15*24*time.Hour), TodayCost: 2100, TodayTokens: 8200000, TodayCalls: 3400},
		{ID: "ra-4", Name: "合规审核Agent", Description: "审核生成内容的合规性", OwnerUserID: "user-003", OwnerName: "王五", OwnerEmail: "wangwu@example.com", DeptID: "dept-rd", DeptName: "研发部", LinkedKeyIDs: []string{}, RiskLevel: "high", Status: "suspended", SandboxRequired: true, AllowedModels: []string{"deepseek-chat"}, DailyBudget: 100, CreatedAt: now.Add(-7*24*time.Hour), TodayCost: 0, TodayTokens: 0, TodayCalls: 0},
	}
	for _, a := range agents { s.registered[a.ID] = a }
}
