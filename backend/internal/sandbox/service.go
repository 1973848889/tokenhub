package sandbox

import (
	"fmt"
	"sort"
	"sync"
	"time"
)

type Review struct {
	ID           string     `json:"id"`
	AgentID      string     `json:"agent_id"`
	AgentName    string     `json:"agent_name"`
	RiskLevel    string     `json:"risk_level"`
	UserPrompt   string     `json:"user_prompt"`
	ModelOutput  string     `json:"model_output"`
	ReviewStatus string     `json:"review_status"`
	Reviewer     string     `json:"reviewer"`
	ReviewNote   string     `json:"review_note"`
	CreatedAt    time.Time  `json:"created_at"`
	ReviewedAt   *time.Time `json:"reviewed_at"`
}

type SandboxRule struct {
	AutoByRiskCritical  bool            `json:"auto_by_risk_critical"`
	AutoByRiskHigh      bool            `json:"auto_by_risk_high"`
	TokenThreshold      int64           `json:"token_threshold"`
	CallRateThreshold   int             `json:"call_rate_threshold"`
	SafetyBlockThreshold int            `json:"safety_block_threshold"`
	AgentSandboxStatus  map[string]bool `json:"agent_sandbox_status"`
}

type Service struct {
	mu      sync.RWMutex
	reviews []*Review
	rules   *SandboxRule
}

var globalService = &Service{
	rules: &SandboxRule{
		AutoByRiskCritical:  true,
		AutoByRiskHigh:      true,
		TokenThreshold:      50000,
		CallRateThreshold:   100,
		SafetyBlockThreshold: 5,
		AgentSandboxStatus: map[string]bool{
			"ra-4": true, "ra-1": false, "ra-2": false, "ra-3": false,
		},
	},
}

func GetService() *Service { return globalService }

func init() { globalService.seedDemo() }

func (s *Service) GetReviews(status string) []*Review {
	s.mu.RLock(); defer s.mu.RUnlock()
	var list []*Review
	for _, r := range s.reviews {
		if status == "" || r.ReviewStatus == status { list = append(list, r) }
	}
	sort.Slice(list, func(i, j int) bool { return list[i].CreatedAt.After(list[j].CreatedAt) })
	return list
}

func (s *Service) ApproveReview(id, reviewer, note string) error {
	s.mu.Lock(); defer s.mu.Unlock()
	for _, r := range s.reviews {
		if r.ID == id {
			r.ReviewStatus = "approved"; r.Reviewer = reviewer; r.ReviewNote = note
			now := time.Now(); r.ReviewedAt = &now
			return nil
		}
	}
	return fmt.Errorf("not found")
}

func (s *Service) RejectReview(id, reviewer, note string) error {
	s.mu.Lock(); defer s.mu.Unlock()
	for _, r := range s.reviews {
		if r.ID == id {
			r.ReviewStatus = "rejected"; r.Reviewer = reviewer; r.ReviewNote = note
			now := time.Now(); r.ReviewedAt = &now
			return nil
		}
	}
	return fmt.Errorf("not found")
}

func (s *Service) GetRules() *SandboxRule { s.mu.RLock(); defer s.mu.RUnlock(); return s.rules }

func (s *Service) UpdateRules(r *SandboxRule) {
	s.mu.Lock(); defer s.mu.Unlock()
	if r.AutoByRiskCritical { s.rules.AutoByRiskCritical = r.AutoByRiskCritical }
	if r.AutoByRiskHigh { s.rules.AutoByRiskHigh = r.AutoByRiskHigh }
	s.rules.TokenThreshold = r.TokenThreshold
	s.rules.CallRateThreshold = r.CallRateThreshold
	s.rules.SafetyBlockThreshold = r.SafetyBlockThreshold
	if r.AgentSandboxStatus != nil { s.rules.AgentSandboxStatus = r.AgentSandboxStatus }
}

func (s *Service) seedDemo() {
	now := time.Now()
	s.reviews = []*Review{
		{ID: "sr-1", AgentID: "ra-4", AgentName: "合规审核Agent", RiskLevel: "high", UserPrompt: "审核这份合同是否符合GDPR要求，涉及欧盟客户数据传输条款...", ModelOutput: "该合同第3.2条款涉及跨境数据传输，根据GDPR第44条规定，向第三国传输个人数据需满足充分性认定或适当保障措施。建议增加标准合同条款(SCC)并在数据保护影响评估(DPIA)中记录此传输的法律依据。", ReviewStatus: "pending", CreatedAt: now.Add(-30*time.Minute)},
		{ID: "sr-2", AgentID: "ra-4", AgentName: "合规审核Agent", RiskLevel: "high", UserPrompt: "分析这份隐私政策是否满足个人信息保护法要求", ModelOutput: "根据《个人信息保护法》第13条，处理个人信息需具备合法性基础。该隐私政策缺少对敏感个人信息(第28条)的单独同意机制说明。建议在第5节增加'敏感信息处理'章节。", ReviewStatus: "pending", CreatedAt: now.Add(-45*time.Minute)},
		{ID: "sr-3", AgentID: "ra-4", AgentName: "合规审核Agent", RiskLevel: "high", UserPrompt: "检查用户协议中的免责条款", ModelOutput: "免责条款分析：第8条'不承担任何责任'表述违反了《民法典》第506条关于免责条款无效的规定，建议修改为'在适用法律允许的最大范围内'。", ReviewStatus: "pending", CreatedAt: now.Add(-1*time.Hour)},
		{ID: "sr-4", AgentID: "ra-1", AgentName: "数据分析Agent", RiskLevel: "medium", UserPrompt: "生成Q2销售数据分析报告", ModelOutput: "Q2总销售额¥1,250万，同比增长18%。其中线上渠道增长32%，线下渠道增长8%。建议增加线上投放预算。", ReviewStatus: "approved", Reviewer: "张三", ReviewNote: "内容合规，数据准确", CreatedAt: now.Add(-2*time.Hour), ReviewedAt: func() *time.Time { t := now.Add(-90*time.Minute); return &t }()},
		{ID: "sr-5", AgentID: "ra-1", AgentName: "数据分析Agent", RiskLevel: "medium", UserPrompt: "分析竞品市场策略", ModelOutput: "竞品A的市场策略：低价渗透+会员体系，市场份额从12%增长至18%。建议我方关注会员权益差异化。", ReviewStatus: "rejected", Reviewer: "李四", ReviewNote: "引用竞品数据来源未验证", CreatedAt: now.Add(-3*time.Hour), ReviewedAt: func() *time.Time { t := now.Add(-150*time.Minute); return &t }()},
	}
}
