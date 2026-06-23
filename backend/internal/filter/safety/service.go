package safety

import (
	"fmt"
	"sync"
	"time"

	"github.com/tokenhub/backend/internal/adapter"
	"github.com/tokenhub/backend/internal/filter/injection"
	"github.com/tokenhub/backend/internal/filter/pii"
	"github.com/tokenhub/backend/internal/filter/sensitive"
)

type Service struct {
	acEngine      *sensitive.ACEngine
	piiDetector   *pii.Detector
	injDetector   *injection.Detector
	logs          []*SafetyLog
	mu            sync.RWMutex
	maxLogs       int
}

type SafetyLog struct {
	EventID        string    `json:"event_id"`
	Timestamp      time.Time `json:"timestamp"`
	UserID         string    `json:"user_id"`
	ModelName      string    `json:"model_name"`
	InputSummary   string    `json:"input_summary"`
	TotalTokens    int64     `json:"total_tokens"`
	SafetyResult   string    `json:"safety_result"`
	SafetyLabels   []string  `json:"safety_labels"`
	SensitiveWords []string  `json:"sensitive_words"`
	PIIFindings    int       `json:"pii_findings"`
	InjectionScore float64   `json:"injection_score"`
}

type CheckResult struct {
	Action         string   `json:"action"`
	Labels         []string `json:"labels"`
	SensitiveWords []string `json:"sensitive_words"`
	PIIFindings    int      `json:"pii_findings"`
	InjectionScore float64  `json:"injection_score"`
}

type SafetyOverview struct {
	TotalChecks       int64           `json:"total_checks"`
	Passed            int64           `json:"passed"`
	Blocked           int64           `json:"blocked"`
	Review            int64           `json:"review"`
	PIIFindings       int64           `json:"pii_findings"`
	InjectionAttempts int64           `json:"injection_attempts"`
	BlockRate         float64         `json:"block_rate"`
	RiskCategories    []RiskCategory  `json:"risk_categories"`
}

type RiskCategory struct {
	Category   string `json:"category"`
	Label      string `json:"label"`
	Count      int64  `json:"count"`
	Percentage float64 `json:"percentage"`
}

var globalService *Service

func init() {
	svc := &Service{
		maxLogs: 1000,
		logs:    make([]*SafetyLog, 0, 1000),
	}
	svc.initEngines()
	svc.seedDemoLogs()
	globalService = svc
}

func GetService() *Service {
	return globalService
}

func (s *Service) initEngines() {
	acEngine := sensitive.NewACEngine()
	words := []*sensitive.SensitiveWord{
		{Word: "敏感词", Category: "political", Level: "block", Action: "block"},
		{Word: "违禁品", Category: "drug", Level: "block", Action: "block"},
		{Word: "赌博", Category: "gambling", Level: "block", Action: "block"},
		{Word: "色情", Category: "porn", Level: "block", Action: "block"},
		{Word: "暴力", Category: "violence", Level: "block", Action: "block"},
		{Word: "诈骗", Category: "fraud", Level: "block", Action: "block"},
		{Word: "广告", Category: "spam", Level: "warn", Action: "mask"},
	}
	acEngine.Load(words)
	s.acEngine = acEngine
	s.piiDetector = pii.NewDetector()
	s.injDetector = injection.NewDetector()
}

func (s *Service) CheckInput(messages []adapter.Message) *CheckResult {
	result := &CheckResult{Action: "pass", Labels: []string{}}

	allText := ""
	for _, m := range messages {
		allText += m.Content + " "
	}

	// 1. 注入检测
	injResult := s.injDetector.Detect(messages)
	result.InjectionScore = injResult.Score
	if injResult.Action == "block" {
		result.Action = "block"
		result.Labels = append(result.Labels, "injection")
	}

	// 2. 敏感词检测
	acResults := s.acEngine.Detect(allText)
	if len(acResults) > 0 {
		for _, r := range acResults {
			result.SensitiveWords = append(result.SensitiveWords, r.Word)
			result.Labels = append(result.Labels, r.Category)
		}
		acAction := s.acEngine.GetAction(acResults)
		if acAction == "block" {
			result.Action = "block"
		} else if acAction == "warn" && result.Action == "pass" {
			result.Action = "review"
		}
	}

	// 3. PII 检测
	piiFindings := s.piiDetector.Detect(allText)
	result.PIIFindings = len(piiFindings)
	if len(piiFindings) > 0 {
		result.Labels = append(result.Labels, "pii")
	}

	return result
}

func (s *Service) Record(eventID, userID, modelName, inputSummary string, tokens int64, result *CheckResult) {
	s.mu.Lock()
	defer s.mu.Unlock()

	log := &SafetyLog{
		EventID:        eventID,
		Timestamp:      time.Now(),
		UserID:         userID,
		ModelName:      modelName,
		InputSummary:   truncate(inputSummary, 200),
		TotalTokens:    tokens,
		SafetyResult:   result.Action,
		SafetyLabels:   result.Labels,
		SensitiveWords: result.SensitiveWords,
		PIIFindings:    result.PIIFindings,
		InjectionScore: result.InjectionScore,
	}

	s.logs = append([]*SafetyLog{log}, s.logs...)
	if len(s.logs) > s.maxLogs {
		s.logs = s.logs[:s.maxLogs]
	}
}

func (s *Service) GetOverview() *SafetyOverview {
	s.mu.RLock()
	defer s.mu.RUnlock()

	o := &SafetyOverview{}
	categoryCount := make(map[string]int64)

	for _, log := range s.logs {
		o.TotalChecks++
		switch log.SafetyResult {
		case "pass":
			o.Passed++
		case "block":
			o.Blocked++
		case "review":
			o.Review++
		}
		o.PIIFindings += int64(log.PIIFindings)
		if log.InjectionScore > 0.7 {
			o.InjectionAttempts++
		}
		for _, label := range log.SafetyLabels {
			categoryCount[label]++
		}
	}

	if o.TotalChecks > 0 {
		o.BlockRate = float64(o.Blocked) / float64(o.TotalChecks) * 100
	}

	for cat, count := range categoryCount {
		pct := float64(0)
		if o.TotalChecks > 0 {
			pct = float64(count) / float64(o.TotalChecks) * 100
		}
		o.RiskCategories = append(o.RiskCategories, RiskCategory{
			Category:   cat,
			Label:      cat,
			Count:      count,
			Percentage: pct,
		})
	}

	return o
}

func (s *Service) GetLogs(page, pageSize int, result, label string) ([]*SafetyLog, int) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	filtered := make([]*SafetyLog, 0)
	for _, log := range s.logs {
		if result != "" && log.SafetyResult != result {
			continue
		}
		if label != "" {
			found := false
			for _, l := range log.SafetyLabels {
				if l == label {
					found = true
					break
				}
			}
			if !found {
				continue
			}
		}
		filtered = append(filtered, log)
	}

	total := len(filtered)
	if page <= 0 { page = 1 }
	if pageSize <= 0 { pageSize = 20 }
	start := (page - 1) * pageSize
	if start >= total { return []*SafetyLog{}, total }
	end := start + pageSize
	if end > total { end = total }

	return filtered[start:end], total
}

func (s *Service) seedDemoLogs() {
	users := []string{"张三", "李四", "王五", "赵六", "Agent-数据分析", "Agent-客服", "Agent-代码审查", "Agent-财务"}
	models := []string{"deepseek-chat", "qwen-max", "doubao-pro-256k", "glm-5", "kimi-latest", "deepseek-reasoner", "hunyuan-pro", "ernie-4.5"}

	allLabels := []string{
		"political", "porn", "violence", "gambling", "drug", "pii", "injection", "spam", "abuse",
		"fraud", "terrorism", "minor_harm", "privacy", "misinformation",
		"prompt_leak", "jailbreak", "prompt_injection", "code_injection", "data_exfil", "model_abuse",
		"export_control", "gdpr", "sox", "hipaa",
	}

	// 60条记录，每条1-3个随机标签，部分pass无标签
	for i := 0; i < 60; i++ {
		var action string
		var labels []string
		var words []string
		var piiCount int
		var injScore float64

		// 前45条为拦截/待审，后15条为pass（无标签）
		if i < 45 {
			// 每条随机选1-3个不同的标签
			count := (i % 3) + 1
			shuffled := make([]string, len(allLabels))
			copy(shuffled, allLabels)
			// Fisher-Yates shuffle using deterministic seed (i)
			rng := func(n int) int { return (i*7 + 13) % n }
			for j := len(shuffled) - 1; j > 0; j-- {
				k := rng(j + 1)
				shuffled[j], shuffled[k] = shuffled[k], shuffled[j]
			}
			labels = shuffled[:count]

			if i%5 < 3 {
				action = "block"
			} else {
				action = "review"
			}
			if action == "block" && len(labels) > 0 {
				words = []string{"示例敏感词"}
			}
		} else {
			action = "pass"
		}

		// 特定标签附加属性
		for _, l := range labels {
			switch l {
			case "pii", "privacy":
				piiCount = 2
			case "injection", "prompt_injection", "code_injection":
				injScore = 0.85
			case "jailbreak":
				injScore = 0.92
			case "prompt_leak":
				injScore = 0.78
			}
		}

		log := &SafetyLog{
			EventID:        fmt.Sprintf("evt-%04d", i+1),
			Timestamp:      time.Now().Add(-time.Duration(60-i) * 30 * time.Minute),
			UserID:         users[i%len(users)],
			ModelName:      models[i%len(models)],
			InputSummary:   fmt.Sprintf("检测日志示例 #%d", i+1),
			TotalTokens:    int64(800 + i*300),
			SafetyResult:   action,
			SafetyLabels:   labels,
			SensitiveWords: words,
			PIIFindings:    piiCount,
			InjectionScore: injScore,
		}
		s.logs = append(s.logs, log)
	}
}

func truncate(s string, n int) string {
	runes := []rune(s)
	if len(runes) <= n {
		return s
	}
	return string(runes[:n]) + "..."
}
