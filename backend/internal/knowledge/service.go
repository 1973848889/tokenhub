package knowledge

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

var allowedExtensions = map[string]string{
	".pdf":  "pdf",
	".txt":  "txt",
	".md":   "md",
	".docx": "docx",
	".xlsx": "xlsx",
	".pptx": "pptx",
	".csv":  "csv",
	".json": "json",
}

var KnowledgeCategories = []string{
	"安全合规", "技术文档", "产品资料", "运营报告", "政策法规", "培训材料", "其他",
}

const maxFileSize = 50 * 1024 * 1024

type ScanResult struct {
	ScannedAt time.Time `json:"scanned_at"`
	RiskLevel string    `json:"risk_level"`
	Findings  []Finding `json:"findings"`
}

type Finding struct {
	Dimension   string `json:"dimension"`
	Severity    string `json:"severity"`
	Title       string `json:"title"`
	Description string `json:"description"`
}

type KnowledgeEntry struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Category    string      `json:"category"`
	FileName    string      `json:"file_name"`
	FileSize    int64       `json:"file_size"`
	FileType    string      `json:"file_type"`
	Status      string      `json:"status"`
	ScanResult  *ScanResult `json:"scan_result,omitempty"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

type Service struct {
	mu      sync.RWMutex
	entries map[string]*KnowledgeEntry
	baseDir string
}

var globalService = &Service{
	entries: make(map[string]*KnowledgeEntry),
	baseDir: "data/knowledge",
}

func GetService() *Service { return globalService }

func init() {
	os.MkdirAll(globalService.baseDir, 0755)
	globalService.seedDemo()
}

func (s *Service) seedDemo() {
	type demo struct {
		name, desc, fileName, fileType, status, category string
		fileSize                                          int64
		scanResult                                        *ScanResult
	}
	demos := []demo{
		{"企业安全合规手册", "内部安全管理规范文档，含数据分类分级标准", "安全合规手册.pdf", "pdf", "safe", "安全合规", 2400000, nil},
		{"AI模型使用指南", "大模型调用规范与最佳实践", "AI模型使用指南.md", "md", "safe", "技术文档", 156000, nil},
		{"Q3预算执行报告", "第三季度部门AI调用预算执行情况", "Q3预算执行报告.xlsx", "xlsx", "safe", "运营报告", 890000, nil},
		{"Agent开发规范", "智能体开发与注册标准流程", "Agent开发规范.docx", "docx", "safe", "技术文档", 1200000, nil},
		{"数据治理方案汇报", "数据治理平台建设方案演示", "数据治理方案汇报.pptx", "pptx", "safe", "产品资料", 5600000, nil},
		{"产品需求文档PRD", "AI治理平台V2.0需求规格说明", "产品需求文档PRD.docx", "docx", "safe", "产品资料", 3200000, nil},
		{"API接口文档", "平台对外API接口定义与调用示例", "API接口文档.json", "json", "safe", "技术文档", 480000, nil},
		{"用户操作手册", "企业AI治理平台终端用户操作指南", "用户操作手册.pdf", "pdf", "safe", "技术文档", 8500000, nil},
		{"月度安全审计报告", "2024年6月安全审计结果汇总", "月度安全审计报告.xlsx", "xlsx", "safe", "运营报告", 1200000, nil},
		{"模型性能对比分析", "主流大模型在业务场景下的性能对比", "模型性能对比分析.csv", "csv", "safe", "运营报告", 640000, nil},
		{
			"内部敏感数据清单", "包含部门人员信息和系统账号密码", "内部数据清单.xlsx", "xlsx", "blocked", "安全合规", 920000,
			&ScanResult{
				ScannedAt: time.Now().Add(-1 * time.Hour),
				RiskLevel: "blocked",
				Findings: []Finding{
					{Dimension: "knowledge_security", Severity: "critical", Title: "PII泄露：手机号码", Description: "在知识条目信息中检测到匹配模式"},
					{Dimension: "knowledge_security", Severity: "critical", Title: "文件名/描述包含凭据信息", Description: "在知识条目信息中检测到匹配模式"},
				},
			},
		},
		{
			"临时调试脚本", "开发环境调试用的测试脚本集合", "debug_scripts.sh", "txt", "blocked", "技术文档", 45000,
			&ScanResult{
				ScannedAt: time.Now().Add(-30 * time.Minute),
				RiskLevel: "blocked",
				Findings: []Finding{
					{Dimension: "knowledge_security", Severity: "critical", Title: "疑似伪装文件：可执行扩展名", Description: "文件名 debug_scripts.sh 看起来是普通文件但名称暗示为可执行文件"},
				},
			},
		},
		{
			"Q2风险评估报告", "第二季度AI应用安全风险评估及改进建议", "Q2风险评估报告.pdf", "pdf", "risky", "安全合规", 4200000,
			&ScanResult{
				ScannedAt: time.Now().Add(-2 * time.Hour),
				RiskLevel: "risky",
				Findings: []Finding{
					{Dimension: "knowledge_security", Severity: "high", Title: "文件描述包含攻击性内容", Description: "在知识条目信息中检测到匹配模式"},
				},
			},
		},
		{
			"第三方SDK集成文档", "外部供应商SDK集成配置说明", "第三方SDK集成文档.md", "md", "risky", "技术文档", 280000,
			&ScanResult{
				ScannedAt: time.Now().Add(-45 * time.Minute),
				RiskLevel: "risky",
				Findings: []Finding{
					{Dimension: "knowledge_security", Severity: "high", Title: "代码执行风险", Description: "在知识条目信息中检测到匹配模式"},
				},
			},
		},
		{"新人入职培训材料", "企业AI治理平台新员工培训PPT", "新人入职培训材料.pptx", "pptx", "safe", "培训材料", 15800000, nil},
		{"数据分级分类标准", "企业数据资产分级分类管理办法", "数据分级分类标准.pdf", "pdf", "safe", "安全合规", 3100000, nil},
		{"Prompt工程最佳实践", "提示词设计规范与调优技巧汇总", "Prompt工程最佳实践.md", "md", "safe", "培训材料", 195000, nil},
		{"智算中心部署方案", "企业智算中心硬件部署与网络规划", "智算中心部署方案.pptx", "pptx", "safe", "产品资料", 22000000, nil},
		{"Token计费模型说明", "多模型Token计费公式与折算规则", "Token计费模型说明.xlsx", "xlsx", "safe", "运营报告", 750000, nil},
		{"等保三级测评材料", "信息安全等级保护三级测评准备资料", "等保三级测评材料.pdf", "pdf", "safe", "安全合规", 6700000, nil},
		{"生成式AI管理办法解读", "生成式人工智能服务管理暂行办法逐条解读", "生成式AI管理办法解读.pdf", "pdf", "safe", "政策法规", 1800000, nil},
		{"GDPR合规对照表", "GDPR与中国个人信息保护法对比分析", "GDPR合规对照表.xlsx", "xlsx", "safe", "政策法规", 560000, nil},
	}

	for i, d := range demos {
		entry := &KnowledgeEntry{
			ID:          uuid.New().String()[:8],
			Name:        d.name,
			Description: d.desc,
			Category:    d.category,
			FileName:    d.fileName,
			FileSize:    d.fileSize,
			FileType:    d.fileType,
			Status:      d.status,
			ScanResult:  d.scanResult,
			CreatedAt:   time.Now().Add(-time.Duration(len(demos)-i) * 12 * time.Hour),
			UpdatedAt:   time.Now().Add(-time.Duration(len(demos)-i) * time.Hour),
		}
		s.entries[entry.ID] = entry
	}
}

func ValidateFileType(fileName string) (string, bool) {
	ext := strings.ToLower(filepath.Ext(fileName))
	t, ok := allowedExtensions[ext]
	return t, ok
}

func ValidateFileSize(size int64) bool {
	return size <= maxFileSize
}

func (s *Service) Create(name, description, category, fileName string, fileSize int64) (*KnowledgeEntry, error) {
	fileType, ok := ValidateFileType(fileName)
	if !ok {
		return nil, fmt.Errorf("不支持的文件类型: %s，允许的类型: pdf/txt/md/docx/xlsx/pptx/csv/json", filepath.Ext(fileName))
	}
	if !ValidateFileSize(fileSize) {
		return nil, fmt.Errorf("文件大小超过限制: %d，最大允许: %d", fileSize, maxFileSize)
	}

	id := uuid.New().String()[:8]
	now := time.Now()

	entry := &KnowledgeEntry{
		ID:          id,
		Name:        name,
		Description: description,
		Category:    category,
		FileName:    fileName,
		FileSize:    fileSize,
		FileType:    fileType,
		Status:      "pending_scan",
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	s.mu.Lock()
	s.entries[id] = entry
	s.mu.Unlock()

	entryDir := filepath.Join(s.baseDir, id)
	os.MkdirAll(entryDir, 0755)

	return entry, nil
}

func (s *Service) GetFilePath(entryID string) string {
	entry := s.Get(entryID)
	if entry == nil {
		return ""
	}
	entryDir := filepath.Join(s.baseDir, entryID)
	return filepath.Join(entryDir, entry.FileName)
}

func (s *Service) List(keyword, category string) []*KnowledgeEntry {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]*KnowledgeEntry, 0, len(s.entries))
	for _, e := range s.entries {
		if keyword != "" {
			k := strings.ToLower(keyword)
			if !strings.Contains(strings.ToLower(e.Name), k) &&
				!strings.Contains(strings.ToLower(e.Description), k) &&
				!strings.Contains(strings.ToLower(e.FileName), k) {
				continue
			}
		}
		if category != "" && e.Category != category {
			continue
		}
		result = append(result, e)
	}
	return result
}

func (s *Service) ListForScan() []*KnowledgeEntry {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]*KnowledgeEntry, 0, len(s.entries))
	for _, e := range s.entries {
		result = append(result, e)
	}
	return result
}

func (s *Service) Get(id string) *KnowledgeEntry {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.entries[id]
}

func (s *Service) Update(id, name, description, category string) (*KnowledgeEntry, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	entry, ok := s.entries[id]
	if !ok {
		return nil, fmt.Errorf("知识条目不存在: %s", id)
	}
	entry.Name = name
	entry.Description = description
	entry.Category = category
	entry.UpdatedAt = time.Now()
	return entry, nil
}

func (s *Service) UpdateScanResult(id, status string, scanResult *ScanResult) {
	s.mu.Lock()
	defer s.mu.Unlock()

	entry, ok := s.entries[id]
	if !ok {
		return
	}
	entry.Status = status
	entry.ScanResult = scanResult
	entry.UpdatedAt = time.Now()
}

func (s *Service) Delete(id string) error {
	s.mu.Lock()
	_, ok := s.entries[id]
	if !ok {
		s.mu.Unlock()
		return fmt.Errorf("知识条目不存在: %s", id)
	}
	delete(s.entries, id)
	s.mu.Unlock()

	entryDir := filepath.Join(s.baseDir, id)
	os.RemoveAll(entryDir)
	return nil
}
