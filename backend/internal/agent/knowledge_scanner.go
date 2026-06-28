package agent

import (
	"regexp"
)

type KnowledgeScanner struct{}

func (s *KnowledgeScanner) ID() string          { return "s13" }
func (s *KnowledgeScanner) Name() string        { return "知识库安全扫描器" }
func (s *KnowledgeScanner) Description() string { return "检测知识库文件名称、描述中的敏感内容、PII泄露、伪装文件及注入风险" }
func (s *KnowledgeScanner) Category() string    { return "安全扫描" }

var knowledgePatterns = []struct {
	pattern  string
	title    string
	severity string
}{
	{`(?i)(密码|口令|secret|password|passwd)\s*[:=]`, "文件名/描述包含凭据信息", "critical"},
	{`(?i)(身份证号|身份证|idcard)\s*[:：]?\s*\d{15,18}`, "PII泄露：身份证号码", "critical"},
	{`(?i)(手机号|电话|mobile|phone)\s*[:：]?\s*\d{11}`, "PII泄露：手机号码", "high"},
	{`(?i)(银行卡|bank|card)\s*[:：]?\s*\d{16,19}`, "PII泄露：银行卡号", "critical"},
	{`(?i)\.exe$|\.bat$|\.sh$|\.vbs$|\.ps1$`, "疑似伪装文件：可执行扩展名", "critical"},
	{`(?i)(破解|crack|hack|exploit|漏洞|payload)`, "文件描述包含攻击性内容", "high"},
	{`(?i)(忽略|忘记|无视).*(指令|规则|限制|约束|安全策略)`, "注入风险：尝试绕过安全限制", "high"},
	{`(?i)(eval|exec|system|subprocess|popen|shell_exec|os\.system)`, "代码执行风险", "critical"},
}

func (s *KnowledgeScanner) Scan(asset AssetInfo) *SkillScanResult {
	findings := make([]ScanFinding, 0)

	summary := asset.AssetName
	if desc, ok := asset.Config["description"].(string); ok {
		summary += " " + desc
	}
	if fileName, ok := asset.Config["file_name"].(string); ok {
		summary += " " + fileName
	}

	for _, rule := range knowledgePatterns {
		re := regexp.MustCompile(rule.pattern)
		if re.MatchString(summary) {
			findings = append(findings, ScanFinding{
				Dimension:   "knowledge_security",
				Severity:    rule.severity,
				Title:       rule.title,
				Description: "在知识条目信息中检测到匹配模式: " + rule.pattern,
				Suggestion:  "请检查并移除风险内容，确保知识库文件名称和描述不含敏感信息",
			})
		}
	}

	criticals := 0
	highs := 0
	for _, f := range findings {
		if f.Severity == "critical" {
			criticals++
		} else if f.Severity == "high" {
			highs++
		}
	}
	status := "pass"
	score := 100
	if criticals > 0 {
		status = "blocked"
		score = 20
	} else if highs > 0 {
		status = "warning"
		score = 50
	}

	return &SkillScanResult{
		SkillID:   s.ID(),
		SkillName: s.Name(),
		Status:    status,
		Score:     score,
		Findings:  findings,
	}
}
