package agent

import (
	"regexp"
	"strings"
)

type InjectionScanner struct{}

func (s *InjectionScanner) ID() string          { return "s9" }
func (s *InjectionScanner) Name() string        { return "Agent注入扫描器" }
func (s *InjectionScanner) Description() string { return "检测Agent配置中的提示注入、命令注入和配置注入风险" }
func (s *InjectionScanner) Category() string    { return "安全扫描" }

var injectionPatterns = []struct {
	pattern string
	title   string
	severity string
}{
	{`(?i)(忽略|忘记|无视|忘记所有).*(指令|规则|限制|约束)`, "提示注入：尝试绕过系统指令", "critical"},
	{`(?i)(system\s*prompt|系统提示)`, "系统提示泄露风险", "high"},
	{`(?i)(sudo|exec|eval|system\s*\()`, "命令注入风险", "critical"},
	{`(?i)(base64|atob|btoa|fromcharcode)`, "代码混淆/编码绕过", "high"},
	{`(?i)(rm\s+-rf|drop\s+table|delete\s+from)`, "破坏性命令风险", "critical"},
	{`(?i)(curl\s+-o|wget\s+-O)`, "远程代码下载执行", "critical"},
	{`(?i)(api[_\s]*key|secret|password|token)\s*[:-=]\s*['"]?\w{8,}`, "硬编码凭据暴露", "critical"},
	{`(?i)(os\.system|subprocess|popen|shell_exec)`, "系统命令执行风险", "high"},
}

func (s *InjectionScanner) Scan(asset AssetInfo) *SkillScanResult {
	findings := make([]ScanFinding, 0)
	summary := ""
	if desc, ok := asset.Config["description"].(string); ok {
		summary += desc + " "
	}
	if persona, ok := asset.Config["persona"].(string); ok {
		summary += persona + " "
	}
	if code, ok := asset.Config["code"].(string); ok {
		summary += code + " "
	}
	if cfg, ok := asset.Config["mcp_config"].(string); ok {
		summary += cfg + " "
	}
	summary += asset.AssetName + " "

	for _, rule := range injectionPatterns {
		re := regexp.MustCompile(rule.pattern)
		if re.MatchString(summary) {
			findings = append(findings, ScanFinding{
				Dimension:   "injection",
				Severity:    rule.severity,
				Title:       rule.title,
				Description: "在资产配置中检测到匹配模式: " + rule.pattern,
				Suggestion:  "请审查并移除相关风险配置，添加输入过滤和参数校验",
			})
		}
	}

	return buildResult(s.ID(), s.Name(), findings)
}

type PermissionAuditor struct{}

func (s *PermissionAuditor) ID() string          { return "s10" }
func (s *PermissionAuditor) Name() string        { return "权限审计器" }
func (s *PermissionAuditor) Description() string { return "检查Agent/Skill/MCP的权限配置、API Key暴露和数据泄露风险" }
func (s *PermissionAuditor) Category() string    { return "安全扫描" }

func (s *PermissionAuditor) Scan(asset AssetInfo) *SkillScanResult {
	findings := make([]ScanFinding, 0)
	summary := ""
	if desc, ok := asset.Config["description"].(string); ok {
		summary += desc + " "
	}
	if cfg, ok := asset.Config["mcp_config"].(string); ok {
		summary += cfg + " "
	}
	summary += asset.AssetName + " "

	keyPatterns := []string{
		`sk-[a-zA-Z0-9]{8,}`,
		`AIza[0-9A-Za-z\-_]{35}`,
		`ghp_[a-zA-Z0-9]{36}`,
		`AKIA[0-9A-Z]{16}`,
	}

	for _, kp := range keyPatterns {
		re := regexp.MustCompile(kp)
		if re.MatchString(summary) {
			findings = append(findings, ScanFinding{
				Dimension:   "permission",
				Severity:    "critical",
				Title:       "API Key 明文暴露",
				Description: "检测到疑似 API Key 明文存储在配置中",
				Suggestion:  "请使用密钥管理服务存储凭据，避免硬编码在配置中",
			})
			break
		}
	}

	if strings.Contains(strings.ToLower(summary), "admin") ||
		strings.Contains(strings.ToLower(summary), "root") ||
		strings.Contains(strings.ToLower(summary), "全部权限") {
		findings = append(findings, ScanFinding{
			Dimension:   "permission",
			Severity:    "high",
			Title:       "过度权限配置",
			Description: "资产配置中包含管理员/root级别权限要求",
			Suggestion:  "请使用最小权限原则，仅授予必要的权限范围",
		})
	}

	if assets, ok := asset.Config["allowed_models"]; ok {
		if models, ok := assets.([]interface{}); ok && len(models) > 5 {
			findings = append(findings, ScanFinding{
				Dimension:   "permission",
				Severity:    "medium",
				Title:       "模型访问范围过大",
				Description: "资产配置允许访问超过5个模型，超出推荐范围",
				Suggestion:  "建议限制模型访问范围至实际需要的模型",
			})
		}
	}

	if budget, ok := asset.Config["daily_budget"]; ok {
		switch v := budget.(type) {
		case float64:
			if v > 1000 {
				findings = append(findings, ScanFinding{
					Dimension:   "permission",
					Severity:    "medium",
					Title:       "日预算设置过高",
					Description: "日预算超过1000元，存在成本失控风险",
					Suggestion:  "建议设置合理的日预算上限并配置预警阈值",
				})
			}
		case int:
			if v > 1000 {
				findings = append(findings, ScanFinding{
					Dimension:   "permission",
					Severity:    "medium",
					Title:       "日预算设置过高",
					Description: "日预算超过1000元，存在成本失控风险",
					Suggestion:  "建议设置合理的日预算上限并配置预警阈值",
				})
			}
		}
	}

	return buildResult(s.ID(), s.Name(), findings)
}

type ComplianceChecker struct{}

func (s *ComplianceChecker) ID() string          { return "s11" }
func (s *ComplianceChecker) Name() string        { return "合规检查器" }
func (s *ComplianceChecker) Description() string { return "检查资产内容是否符合安全合规要求，包括敏感词和违规内容" }
func (s *ComplianceChecker) Category() string    { return "安全扫描" }

var complianceWords = []string{
	"敏感词", "违禁品", "赌博", "色情", "暴力", "诈骗", "广告",
}

func (s *ComplianceChecker) Scan(asset AssetInfo) *SkillScanResult {
	findings := make([]ScanFinding, 0)
	summary := ""
	if desc, ok := asset.Config["description"].(string); ok {
		summary += desc + " "
	}
	if persona, ok := asset.Config["persona"].(string); ok {
		summary += persona + " "
	}
	summary += asset.AssetName + " "

	for _, word := range complianceWords {
		if strings.Contains(summary, word) {
			findings = append(findings, ScanFinding{
				Dimension:   "compliance",
				Severity:    "high",
				Title:       "敏感词命中: " + word,
				Description: "资产内容包含合规敏感词",
				Suggestion:  "请修改资产描述内容，确保符合企业内容安全策略",
			})
		}
	}

	piiPatterns := []string{
		`1[3-9]\d{9}`,
		`\d{6}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]`,
		`\d{16,19}`,
	}

	for _, pp := range piiPatterns {
		re := regexp.MustCompile(pp)
		if re.MatchString(summary) {
			findings = append(findings, ScanFinding{
				Dimension:   "compliance",
				Severity:    "high",
				Title:       "敏感信息泄露风险",
				Description: "资产配置中可能包含个人敏感信息(手机号/身份证/银行卡)",
				Suggestion:  "请移除或脱敏处理配置中的敏感个人信息",
			})
			break
		}
	}

	return buildResult(s.ID(), s.Name(), findings)
}

type SupplyChainScanner struct{}

func (s *SupplyChainScanner) ID() string          { return "s12" }
func (s *SupplyChainScanner) Name() string        { return "供应链漏洞扫描" }
func (s *SupplyChainScanner) Description() string { return "检查依赖的第三方连接器和工具的已知风险" }
func (s *SupplyChainScanner) Category() string    { return "安全扫描" }

var riskConnectors = map[string]string{
	"github":   "GitHub 连接器可访问代码仓库，需确认仓库访问范围",
	"企业微信":     "企业微信连接器可发送消息，需确认消息发送权限边界",
	"mysql":    "MySQL 数据库连接器可执行SQL，需限制查询类型和表范围",
	"数据库":      "数据库连接器存在数据泄露风险，需配置只读权限",
	"tencent":  "腾讯文档连接器可访问内部文档，需确认文档访问权限",
	"qq":       "QQ邮箱连接器可读取邮件内容，需确认邮件访问范围",
}

func (s *SupplyChainScanner) Scan(asset AssetInfo) *SkillScanResult {
	findings := make([]ScanFinding, 0)

	if connectors, ok := asset.Config["connectors"]; ok {
		switch conns := connectors.(type) {
		case []interface{}:
			for _, c := range conns {
				if cs, ok := c.(string); ok {
					for key, desc := range riskConnectors {
						if strings.Contains(strings.ToLower(cs), key) {
							findings = append(findings, ScanFinding{
								Dimension:   "supply_chain",
								Severity:    "medium",
								Title:       "第三方连接器风险: " + cs,
								Description: desc,
								Suggestion:  "建议在沙箱环境中测试后再授权，设置最小权限",
							})
						}
					}
				}
			}
		}
	}

	if category, ok := asset.Config["category"].(string); ok {
		for key, desc := range riskConnectors {
			if strings.Contains(strings.ToLower(category), key) {
				findings = append(findings, ScanFinding{
					Dimension:   "supply_chain",
					Severity:    "low",
					Title:       "资产类别涉及第三方集成: " + category,
					Description: desc,
					Suggestion:  "请确认第三方服务的合规性和安全性",
				})
				break
			}
		}
	}

	return buildResult(s.ID(), s.Name(), findings)
}

func buildResult(skillID, skillName string, findings []ScanFinding) *SkillScanResult {
	criticalCount := 0
	highCount := 0
	for _, f := range findings {
		switch f.Severity {
		case "critical":
			criticalCount++
		case "high":
			highCount++
		}
	}

	status := "pass"
	score := 100
	if criticalCount > 0 {
		status = "blocked"
		score = 20
	} else if highCount > 0 {
		status = "warning"
		score = 50
	}

	return &SkillScanResult{
		SkillID:   skillID,
		SkillName: skillName,
		Status:    status,
		Score:     score,
		Findings:  findings,
	}
}
