package compliance

import (
	"fmt"
	"time"
)

type ReportType string

const (
	ReportUsageLedger     ReportType = "usage_ledger"
	ReportSafetyAudit     ReportType = "safety_audit"
	ReportAlgorithmFiling ReportType = "algorithm_filing"
)

type ReportRequest struct {
	OrgID string
	Type  ReportType
	Start time.Time
	End   time.Time
}

type UsageLedger struct {
	GeneratedAt   time.Time         `json:"generated_at"`
	Period        string            `json:"period"`
	Summary       UsageSummary      `json:"summary"`
	Records       []UsageRecord     `json:"records,omitempty"`
}

type UsageSummary struct {
	TotalCalls   int64   `json:"total_calls"`
	TotalTokens  int64   `json:"total_tokens"`
	TotalCost    float64 `json:"total_cost"`
	ActiveUsers  int     `json:"active_users"`
	ActiveModels int     `json:"active_models"`
	BlockedCalls int64   `json:"blocked_calls"`
}

type UsageRecord struct {
	Date         string  `json:"date"`
	UserName     string  `json:"user_name"`
	ModelName    string  `json:"model_name"`
	Tokens       int64   `json:"tokens"`
	Cost         float64 `json:"cost"`
	SceneTag     string  `json:"scene_tag"`
	SafetyResult string  `json:"safety_result"`
}

type SafetyAudit struct {
	GeneratedAt       time.Time        `json:"generated_at"`
	Period            string           `json:"period"`
	TotalChecks       int64            `json:"total_checks"`
	Passed            int64            `json:"passed"`
	Blocked           int64            `json:"blocked"`
	Review            int64            `json:"review"`
	PIIFindings       int64            `json:"pii_findings"`
	InjectionAttempts int64            `json:"injection_attempts"`
	BlockRate         float64          `json:"block_rate"`
	RiskCategories    []RiskCategory   `json:"risk_categories"`
}

type RiskCategory struct {
	Category   string `json:"category"`
	Count      int64  `json:"count"`
	Percentage float64 `json:"percentage"`
}

type AlgorithmFiling struct {
	GeneratedAt       time.Time            `json:"generated_at"`
	Models            []FilingModel        `json:"models"`
	SafetyMeasures    []FilingSafetyMeasure `json:"safety_measures"`
	ComplaintMechanism string              `json:"complaint_mechanism"`
}

type FilingModel struct {
	Name       string `json:"name"`
	Version    string `json:"version"`
	Purpose    string `json:"purpose"`
	Type       string `json:"type"`
	IsFiled    bool   `json:"is_filed"`
	FilingDate string `json:"filing_date"`
}

type FilingSafetyMeasure struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Status      string `json:"status"`
}

func GenerateUsageLedger(req *ReportRequest) *UsageLedger {
	return &UsageLedger{
		GeneratedAt: time.Now(),
		Period:      fmt.Sprintf("%s ~ %s", req.Start.Format("2006-01-02"), req.End.Format("2006-01-02")),
		Summary: UsageSummary{
			TotalCalls:   35640,
			TotalTokens:  35800000,
			TotalCost:    10431.85,
			ActiveUsers:  15,
			ActiveModels: 5,
			BlockedCalls: 127,
		},
		Records: []UsageRecord{
			{Date: "2026-06-14", UserName: "张三", ModelName: "deepseek-chat", Tokens: 2500000, Cost: 7.50, SceneTag: "code_generation", SafetyResult: "pass"},
			{Date: "2026-06-14", UserName: "李四", ModelName: "qwen-max", Tokens: 1800000, Cost: 12.60, SceneTag: "document_writing", SafetyResult: "pass"},
			{Date: "2026-06-14", UserName: "王五", ModelName: "doubao-pro-256k", Tokens: 1200000, Cost: 2.40, SceneTag: "creative_writing", SafetyResult: "block"},
			{Date: "2026-06-14", UserName: "数据分析Agent", ModelName: "deepseek-reasoner", Tokens: 4500000, Cost: 72.00, SceneTag: "data_analysis", SafetyResult: "pass"},
			{Date: "2026-06-14", UserName: "客服Agent", ModelName: "kimi-latest", Tokens: 3200000, Cost: 22.40, SceneTag: "customer_service", SafetyResult: "review"},
			{Date: "2026-06-13", UserName: "张三", ModelName: "glm-5", Tokens: 1500000, Cost: 3.00, SceneTag: "code_generation", SafetyResult: "pass"},
			{Date: "2026-06-13", UserName: "李四", ModelName: "deepseek-chat", Tokens: 2200000, Cost: 6.60, SceneTag: "document_writing", SafetyResult: "pass"},
			{Date: "2026-06-13", UserName: "代码审查Bot", ModelName: "glm-5", Tokens: 800000, Cost: 1.60, SceneTag: "code_generation", SafetyResult: "pass"},
		},
	}
}

func GenerateSafetyAudit(req *ReportRequest) *SafetyAudit {
	total := int64(35640)
	blocked := int64(127)
	review := int64(45)
	passed := total - blocked - review
	blockRate := float64(0)
	if total > 0 {
		blockRate = float64(blocked) / float64(total) * 100
	}
	return &SafetyAudit{
		GeneratedAt:       time.Now(),
		Period:            fmt.Sprintf("%s ~ %s", req.Start.Format("2006-01-02"), req.End.Format("2006-01-02")),
		TotalChecks:       total,
		Passed:            passed,
		Blocked:           blocked,
		Review:            review,
		PIIFindings:       89,
		InjectionAttempts: 12,
		BlockRate:         blockRate,
		RiskCategories: []RiskCategory{
			{Category: "political", Count: 42, Percentage: 33.1},
			{Category: "pii", Count: 31, Percentage: 24.4},
			{Category: "injection", Count: 12, Percentage: 9.4},
			{Category: "spam", Count: 18, Percentage: 14.2},
			{Category: "violence", Count: 8, Percentage: 6.3},
			{Category: "porn", Count: 6, Percentage: 4.7},
			{Category: "other", Count: 10, Percentage: 7.9},
		},
	}
}

func GenerateAlgorithmFiling() *AlgorithmFiling {
	return &AlgorithmFiling{
		GeneratedAt: time.Now(),
		Models: []FilingModel{
			{Name: "DeepSeek Chat/Reasoner", Version: "V3 / R1", Purpose: "通用文本生成与推理", Type: "语言模型", IsFiled: true, FilingDate: "2025-08-15"},
			{Name: "通义千问", Version: "Max / Plus", Purpose: "多模态理解与生成", Type: "多模态模型", IsFiled: true, FilingDate: "2025-09-01"},
			{Name: "豆包 Pro", Version: "256K", Purpose: "企业级文本生成", Type: "语言模型", IsFiled: true, FilingDate: "2025-10-20"},
			{Name: "GLM-5", Version: "5 / 5-Flash", Purpose: "通用对话与推理", Type: "语言模型", IsFiled: true, FilingDate: "2025-11-15"},
			{Name: "Kimi Latest", Version: "Latest", Purpose: "长文本理解与客服对话", Type: "语言模型", IsFiled: false, FilingDate: ""},
		},
		SafetyMeasures: []FilingSafetyMeasure{
			{Name: "敏感词过滤", Description: "基于Aho-Corasick算法的实时敏感词检测，覆盖涉政/色情/暴力/违法等类别", Status: "已实施"},
			{Name: "PII脱敏", Description: "自动识别并脱敏身份证号/手机号/银行卡号/邮箱等个人信息", Status: "已实施"},
			{Name: "提示注入防护", Description: "检测并拦截Prompt Injection攻击（越狱/角色扮演逃逸/系统提示泄露）", Status: "已实施"},
			{Name: "内容审计日志", Description: "全量记录调用输入输出摘要，支持不可篡改审计追溯", Status: "已实施"},
			{Name: "预算管控", Description: "五级预算体系（公司/部门/项目/用户/Key），超阈值自动熔断", Status: "已实施"},
		},
		ComplaintMechanism: "用户可通过平台投诉通道或联系客服进行内容申诉，平台承诺48小时内响应。",
	}
}
