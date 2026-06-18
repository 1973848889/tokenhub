package security

import (
	"sync"
	"time"
)

type Service struct {
	mu sync.RWMutex
}

var globalService = &Service{}

func GetService() *Service { return globalService }

// ===== Security Gateway =====

type SecurityGatewayData struct {
	TotalRequests   int              `json:"total_requests"`
	Passed          int              `json:"passed"`
	Blocked         int              `json:"blocked"`
	Warned          int              `json:"warned"`
	RealTimeStream  []GatewayEvent   `json:"real_time_stream"`
	Rules           []GatewayRule    `json:"rules"`
}

type GatewayEvent struct {
	ID        string `json:"id"`
	Timestamp string `json:"timestamp"`
	Source    string `json:"source"`
	Model     string `json:"model"`
	Action    string `json:"action"`
	Reason    string `json:"reason"`
}

type GatewayRule struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Condition string `json:"condition"`
	Action   string `json:"action"`
	Enabled  bool   `json:"enabled"`
	Priority int    `json:"priority"`
}

func (s *Service) GetSecurityGateway() *SecurityGatewayData {
	return &SecurityGatewayData{
		TotalRequests: 12840,
		Passed:        12100,
		Blocked:       520,
		Warned:        220,
		RealTimeStream: []GatewayEvent{
			{ID: "e1", Timestamp: time.Now().Add(-1*time.Minute).Format(time.RFC3339), Source: "Agent-客服", Model: "kimi-latest", Action: "passed", Reason: "正常"},
			{ID: "e2", Timestamp: time.Now().Add(-2*time.Minute).Format(time.RFC3339), Source: "张三", Model: "deepseek-chat", Action: "blocked", Reason: "敏感词命中"},
			{ID: "e3", Timestamp: time.Now().Add(-3*time.Minute).Format(time.RFC3339), Source: "Agent-数据", Model: "qwen-max", Action: "passed", Reason: "正常"},
			{ID: "e4", Timestamp: time.Now().Add(-4*time.Minute).Format(time.RFC3339), Source: "王五", Model: "doubao-pro-256k", Action: "warned", Reason: "PII脱敏"},
			{ID: "e5", Timestamp: time.Now().Add(-5*time.Minute).Format(time.RFC3339), Source: "Agent-代码审查", Model: "glm-5", Action: "blocked", Reason: "越权限访问"},
		},
		Rules: []GatewayRule{
			{ID: 1, Name: "敏感词检测", Condition: "请求内容包含敏感词", Action: "block", Enabled: true, Priority: 1},
			{ID: 2, Name: "PII 脱敏", Condition: "请求包含个人信息", Action: "mask", Enabled: true, Priority: 2},
			{ID: 3, Name: "注入攻击检测", Condition: "检测到提示注入", Action: "block", Enabled: true, Priority: 1},
			{ID: 4, Name: "越权限拦截", Condition: "Agent请求超权限模型", Action: "block", Enabled: true, Priority: 1},
			{ID: 5, Name: "预算检查", Condition: "超过日预算阈值", Action: "block", Enabled: true, Priority: 3},
			{ID: 6, Name: "频率限制", Condition: "超过RPM限制", Action: "throttle", Enabled: true, Priority: 3},
		},
	}
}

// ===== Access Control =====

type AccessControlData struct {
	Roles      []Role      `json:"roles"`
	SSOConfig  SSOConfig   `json:"sso_config"`
	IPWhitelist []string   `json:"ip_whitelist"`
	MFAEnabled bool        `json:"mfa_enabled"`
	LoginLogs  []LoginLog  `json:"login_logs"`
}

type Role struct {
	Name        string   `json:"name"`
	Permissions []string `json:"permissions"`
	UserCount   int      `json:"user_count"`
}

type SSOConfig struct {
	LDAP     bool   `json:"ldap"`
	DingTalk bool   `json:"dingtalk"`
	WeCom    bool   `json:"wecom"`
	OAuth    bool   `json:"oauth"`
	Enabled  bool   `json:"enabled"`
}

type LoginLog struct {
	ID        string `json:"id"`
	User      string `json:"user"`
	Time      string `json:"time"`
	IP        string `json:"ip"`
	Status    string `json:"status"`
	Location  string `json:"location"`
}

func (s *Service) GetAccessControl() *AccessControlData {
	return &AccessControlData{
		Roles: []Role{
			{Name: "超级管理员", Permissions: []string{"全部权限"}, UserCount: 1},
			{Name: "部门管理员", Permissions: []string{"部门管理","Key管理","预算管理","报表查看"}, UserCount: 3},
			{Name: "普通用户", Permissions: []string{"API调用","个人Key管理"}, UserCount: 12},
			{Name: "审计员", Permissions: []string{"日志查看","合规报告","审计追溯"}, UserCount: 2},
		},
		SSOConfig: SSOConfig{LDAP: false, DingTalk: true, WeCom: true, OAuth: false, Enabled: true},
		IPWhitelist: []string{"10.94.0.0/16", "192.168.1.0/24"},
		MFAEnabled: false,
		LoginLogs: []LoginLog{
			{ID: "l1", User: "张三", Time: time.Now().Add(-30*time.Minute).Format(time.RFC3339), IP: "10.94.7.4", Status: "success", Location: "北京"},
			{ID: "l2", User: "李四", Time: time.Now().Add(-1*time.Hour).Format(time.RFC3339), IP: "10.94.8.2", Status: "success", Location: "上海"},
			{ID: "l3", User: "unknown", Time: time.Now().Add(-3*time.Hour).Format(time.RFC3339), IP: "203.0.113.1", Status: "failed", Location: "境外"},
		},
	}
}
