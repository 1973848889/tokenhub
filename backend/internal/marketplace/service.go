package marketplace

import (
	"sort"
	"sync"
	"time"

	"github.com/google/uuid"
)

type Expert struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Avatar      string   `json:"avatar"`
	Category    string   `json:"category"`
	Description string   `json:"description"`
	Persona     string   `json:"persona"`
	Skills      []string `json:"skills"`
	Connectors  []string `json:"connectors"`
	Tasks       []string `json:"tasks"`
	Rating      float64  `json:"rating"`
	UsageCount  int      `json:"usage_count"`
	Author      string   `json:"author"`
	IsOfficial  bool     `json:"is_official"`
	Subscribed  bool     `json:"subscribed"`
	ApiKeyID    string   `json:"api_key_id"`
	ApiKeyPrefix string  `json:"api_key_prefix"`
	CreatedAt   time.Time `json:"created_at"`
}

type Skill struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Version     string `json:"version"`
	Author      string `json:"author"`
	IsOfficial  bool   `json:"is_official"`
	Downloads   int    `json:"downloads"`
	Rating      float64 `json:"rating"`
	Installed   bool   `json:"installed"`
	Enabled     bool   `json:"enabled"`
}

type Connector struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Category    string    `json:"category"`
	AuthType    string    `json:"auth_type"`
	Status      string    `json:"status"`
	IsOfficial  bool      `json:"is_official"`
	ConnectedAt *time.Time `json:"connected_at,omitempty"`
}

type MCPTool struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Category    string    `json:"category"`
	Version     string    `json:"version"`
	Author      string    `json:"author"`
	IsOfficial  bool      `json:"is_official"`
	Config      string    `json:"config"`
	Status      string    `json:"status"`
	Installed   bool      `json:"installed"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreateMCPRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Version     string `json:"version"`
	Author      string `json:"author"`
	IsOfficial  bool   `json:"is_official"`
	Config      string `json:"config"`
}

type Service struct {
	mu         sync.RWMutex
	experts    map[string]*Expert
	skills     map[string]*Skill
	connectors map[string]*Connector
	mcpTools   map[string]*MCPTool
}

var globalService = &Service{
	experts:    make(map[string]*Expert),
	skills:     make(map[string]*Skill),
	connectors: make(map[string]*Connector),
	mcpTools:   make(map[string]*MCPTool),
}

func GetService() *Service { return globalService }

func init() { globalService.seedDemo() }

func (s *Service) ListExperts(category string) []*Expert {
	s.mu.RLock(); defer s.mu.RUnlock()
	list := make([]*Expert, 0)
	for _, e := range s.experts {
		if category == "" || e.Category == category { list = append(list, e) }
	}
	sort.Slice(list, func(i, j int) bool { return list[i].Rating > list[j].Rating })
	return list
}

func (s *Service) GetExpert(id string) *Expert { s.mu.RLock(); defer s.mu.RUnlock(); return s.experts[id] }

func (s *Service) SubscribeExpert(id string) { s.mu.Lock(); defer s.mu.Unlock(); if e, ok := s.experts[id]; ok { e.Subscribed = !e.Subscribed } }

func (s *Service) PublishExpert(id string) { s.mu.Lock(); defer s.mu.Unlock(); if e, ok := s.experts[id]; ok { e.Subscribed = true } }

func (s *Service) UnpublishExpert(id string) { s.mu.Lock(); defer s.mu.Unlock(); if e, ok := s.experts[id]; ok { e.Subscribed = false } }

func (s *Service) SetExpertApiKey(id, keyID, keyPrefix string) { s.mu.Lock(); defer s.mu.Unlock(); if e, ok := s.experts[id]; ok { e.ApiKeyID = keyID; e.ApiKeyPrefix = keyPrefix } }

type CreateExpertRequest struct {
	Name        string   `json:"name"`
	Avatar      string   `json:"avatar"`
	Category    string   `json:"category"`
	Description string   `json:"description"`
	Persona     string   `json:"persona"`
	Skills      []string `json:"skills"`
	Connectors  []string `json:"connectors"`
	Tasks       []string `json:"tasks"`
	Author      string   `json:"author"`
	IsOfficial  bool     `json:"is_official"`
}

func (s *Service) CreateExpert(req *CreateExpertRequest) *Expert {
	s.mu.Lock()
	defer s.mu.Unlock()
	e := &Expert{
		ID:          uuid.New().String(),
		Name:        req.Name,
		Avatar:      req.Avatar,
		Category:    req.Category,
		Description: req.Description,
		Persona:     req.Persona,
		Skills:      req.Skills,
		Connectors:  req.Connectors,
		Tasks:       req.Tasks,
		Rating:      0,
		UsageCount:  0,
		Author:      req.Author,
		IsOfficial:  req.IsOfficial,
		CreatedAt:   time.Now(),
	}
	if e.Skills == nil {
		e.Skills = []string{}
	}
	if e.Connectors == nil {
		e.Connectors = []string{}
	}
	if e.Tasks == nil {
		e.Tasks = []string{}
	}
	s.experts[e.ID] = e
	return e
}

func (s *Service) UpdateExpert(id string, req *CreateExpertRequest) (*Expert, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	e, ok := s.experts[id]
	if !ok {
		return nil, nil
	}
	if req.Name != "" {
		e.Name = req.Name
	}
	if req.Avatar != "" {
		e.Avatar = req.Avatar
	}
	if req.Category != "" {
		e.Category = req.Category
	}
	if req.Description != "" {
		e.Description = req.Description
	}
	if req.Persona != "" {
		e.Persona = req.Persona
	}
	if req.Skills != nil {
		e.Skills = req.Skills
	}
	if req.Connectors != nil {
		e.Connectors = req.Connectors
	}
	if req.Tasks != nil {
		e.Tasks = req.Tasks
	}
	if req.Author != "" {
		e.Author = req.Author
	}
	e.IsOfficial = req.IsOfficial
	return e, nil
}

func (s *Service) DeleteExpert(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, ok := s.experts[id]; !ok {
		return nil
	}
	delete(s.experts, id)
	return nil
}

func (s *Service) ListSkills(category string) []*Skill {
	s.mu.RLock(); defer s.mu.RUnlock()
	list := make([]*Skill, 0)
	for _, sk := range s.skills {
		if category == "" || sk.Category == category { list = append(list, sk) }
	}
	return list
}

func (s *Service) InstallSkill(id string) { s.mu.Lock(); defer s.mu.Unlock(); if sk, ok := s.skills[id]; ok { sk.Installed = true; sk.Enabled = true } }
func (s *Service) ToggleSkill(id string) { s.mu.Lock(); defer s.mu.Unlock(); if sk, ok := s.skills[id]; ok { sk.Enabled = !sk.Enabled } }
func (s *Service) UninstallSkill(id string) { s.mu.Lock(); defer s.mu.Unlock(); if sk, ok := s.skills[id]; ok { sk.Installed = false; sk.Enabled = false } }

func (s *Service) ListConnectors() []*Connector { s.mu.RLock(); defer s.mu.RUnlock(); list := make([]*Connector, 0); for _, c := range s.connectors { list = append(list, c) }; return list }
func (s *Service) ConnectConnector(id string) { s.mu.Lock(); defer s.mu.Unlock(); if c, ok := s.connectors[id]; ok { c.Status = "connected"; now := time.Now(); c.ConnectedAt = &now } }
func (s *Service) DisconnectConnector(id string) { s.mu.Lock(); defer s.mu.Unlock(); if c, ok := s.connectors[id]; ok { c.Status = "disconnected"; c.ConnectedAt = nil } }

func (s *Service) ListMCPTools() []*MCPTool {
	s.mu.RLock(); defer s.mu.RUnlock()
	list := make([]*MCPTool, 0, len(s.mcpTools))
	for _, t := range s.mcpTools { list = append(list, t) }
	return list
}

func (s *Service) GetMCPTool(id string) *MCPTool {
	s.mu.RLock(); defer s.mu.RUnlock()
	return s.mcpTools[id]
}

func (s *Service) CreateMCPTool(req *CreateMCPRequest) *MCPTool {
	s.mu.Lock(); defer s.mu.Unlock()
	id := uuid.New().String()
	now := time.Now()
	t := &MCPTool{
		ID: id, Name: req.Name, Description: req.Description,
		Category: req.Category, Version: req.Version,
		Author: req.Author, IsOfficial: req.IsOfficial,
		Config: req.Config, Status: "active",
		Installed: true, CreatedAt: now, UpdatedAt: now,
	}
	s.mcpTools[id] = t
	return t
}

func (s *Service) UpdateMCPTool(id string, req *CreateMCPRequest) *MCPTool {
	s.mu.Lock(); defer s.mu.Unlock()
	t, ok := s.mcpTools[id]
	if !ok { return nil }
	if req.Name != "" { t.Name = req.Name }
	if req.Description != "" { t.Description = req.Description }
	if req.Category != "" { t.Category = req.Category }
	if req.Version != "" { t.Version = req.Version }
	if req.Author != "" { t.Author = req.Author }
	if req.Config != "" { t.Config = req.Config }
	t.IsOfficial = req.IsOfficial
	t.UpdatedAt = time.Now()
	return t
}

func (s *Service) DeleteMCPTool(id string) error {
	s.mu.Lock(); defer s.mu.Unlock()
	if _, ok := s.mcpTools[id]; !ok { return nil }
	delete(s.mcpTools, id)
	return nil
}

func (s *Service) ToggleMCPTool(id string) {
	s.mu.Lock(); defer s.mu.Unlock()
	if t, ok := s.mcpTools[id]; ok {
		if t.Status == "active" { t.Status = "disabled" } else { t.Status = "active" }
		t.UpdatedAt = time.Now()
	}
}

func (s *Service) seedDemo() {
	now := time.Now()
	experts := []*Expert{
		{ID: "e1", Name: "代码审查专家", Avatar:"💻", Category:"研发技术", Description:"精通代码审查，可检查代码质量、安全漏洞和性能问题", Persona:"你是一位资深代码审查专家...", Skills:[]string{"s1"}, Connectors:[]string{"c1"}, Tasks:[]string{"审查PR","安全检查","性能分析"}, Rating:4.8, UsageCount:2300, Author:"官方", IsOfficial:true, CreatedAt:now.Add(-90*24*time.Hour)},
		{ID: "e2", Name: "数据分析师", Avatar:"📊", Category:"运营市场", Description:"擅长数据分析和可视化，自动生成分析报告", Persona:"你是一位专业数据分析师...", Skills:[]string{"s2","s3"}, Tasks:[]string{"销售分析","用户画像","趋势预测"}, Rating:4.6, UsageCount:1800, Author:"官方", IsOfficial:true, CreatedAt:now.Add(-60*24*time.Hour)},
		{ID: "e3", Name: "合同审核专家", Avatar:"⚖️", Category:"财务法务", Description:"自动审核合同条款，识别风险点和合规问题", Persona:"你是一位法律合同审核专家...", Skills:[]string{"s4"}, Tasks:[]string{"条款审查","风险评估","合规检查"}, Rating:4.9, UsageCount:950, Author:"官方", IsOfficial:true, CreatedAt:now.Add(-45*24*time.Hour)},
		{ID: "e4", Name: "HR招聘助手", Avatar:"👥", Category:"人力资源", Description:"智能筛选简历、生成面试题库、评估候选人", Persona:"你是一位资深HR...", Tasks:[]string{"简历筛选","面试出题","岗位匹配"}, Rating:4.5, UsageCount:620, Author:"官方", IsOfficial:true, CreatedAt:now.Add(-30*24*time.Hour)},
		{ID: "e5", Name: "DevOps自动化专家", Avatar:"🚀", Category:"研发技术", Description:"CI/CD流水线配置、容器化管理、监控告警", Persona:"你是一位DevOps工程师...", Skills:[]string{"s5"}, Connectors:[]string{"c2"}, Tasks:[]string{"CI/CD配置","容器部署","日志分析"}, Rating:4.7, UsageCount:1100, Author:"社区", IsOfficial:false, CreatedAt:now.Add(-20*24*time.Hour), Subscribed:true},
		{ID: "e6", Name: "PRD撰写助手", Avatar:"📝", Category:"产品设计", Description:"需求分析到PRD文档生成，结构化产品需求", Persona:"你是一位产品经理...", Tasks:[]string{"需求梳理","PRD撰写","竞品分析"}, Rating:4.4, UsageCount:780, Author:"官方", IsOfficial:true, CreatedAt:now.Add(-15*24*time.Hour)},
		{ID: "e7", Name: "会议纪要专家", Avatar:"🎙️", Category:"通用办公", Description:"自动整理会议录音，生成结构化纪要和待办事项", Persona:"你是一位专业的会议记录员...", Skills:[]string{"s6"}, Tasks:[]string{"语音转文字","纪要生成","待办提取"}, Rating:4.3, UsageCount:1500, Author:"社区", IsOfficial:false, CreatedAt:now.Add(-10*24*time.Hour)},
		{ID: "e8", Name: "安全合规审查团", Avatar:"🛡️", Category:"财务法务", Description:"多专家协作审查：法律+安全+合规三位一体", Persona:"专家团团长...", Tasks:[]string{"综合安全审查","合规评估","风险报告"}, Rating:4.9, UsageCount:420, Author:"官方", IsOfficial:true, CreatedAt:now.Add(-5*24*time.Hour), Subscribed:true},
	}
	for _, e := range experts { s.experts[e.ID] = e }

	skills := []*Skill{
		{ID:"s1",Name:"代码静态分析",Description:"自动检测代码中的bug、安全漏洞和代码异味",Category:"开发工具",Version:"1.2.0",Author:"官方",IsOfficial:true,Downloads:3200,Rating:4.7,Installed:true,Enabled:true},
		{ID:"s2",Name:"Excel数据分析",Description:"读取Excel进行数据清洗、统计分析和图表生成",Category:"数据分析",Version:"2.0.1",Author:"官方",IsOfficial:true,Downloads:5600,Rating:4.8},
		{ID:"s3",Name:"Web Search",Description:"联网搜索获取最新信息",Category:"网络工具",Version:"1.0.0",Author:"官方",IsOfficial:true,Downloads:8900,Rating:4.9,Installed:true,Enabled:true},
		{ID:"s4",Name:"PDF合同解析",Description:"提取合同关键条款，支持条款比对和风险标记",Category:"文件处理",Version:"1.1.0",Author:"官方",IsOfficial:true,Downloads:1800,Rating:4.6},
		{ID:"s5",Name:"K8s操作工具",Description:"Kubernetes集群管理、部署和日志查询，支持exec和sudo操作",Category:"开发工具",Version:"0.9.0",Author:"社区",IsOfficial:false,Downloads:950,Rating:4.2},
		{ID:"s6",Name:"语音转文字",Description:"支持中英文语音识别和转写",Category:"办公效率",Version:"1.5.0",Author:"官方",IsOfficial:true,Downloads:4200,Rating:4.5},
		{ID:"s7",Name:"邮件助手",Description:"自动撰写、回复和整理邮件",Category:"办公效率",Version:"2.1.0",Author:"官方",IsOfficial:true,Downloads:6800,Rating:4.8,Installed:true,Enabled:true},
		{ID:"s8",Name:"Frontend Design",Description:"前端页面设计生成",Category:"开发工具",Version:"1.0.0",Author:"社区",IsOfficial:false,Downloads:1200,Rating:4.1},
		{ID:"s9",Name:"Agent注入扫描器",Description:"检测Agent配置中的提示注入、命令注入和配置注入风险",Category:"安全扫描",Version:"1.0.0",Author:"安全巡检Agent",IsOfficial:true,Downloads:0,Rating:0,Installed:true,Enabled:true},
		{ID:"s10",Name:"权限审计器",Description:"检查Agent/Skill/MCP的权限配置、API Key暴露和数据泄露风险",Category:"安全扫描",Version:"1.0.0",Author:"安全巡检Agent",IsOfficial:true,Downloads:0,Rating:0,Installed:true,Enabled:true},
		{ID:"s11",Name:"合规检查器",Description:"检查资产内容是否符合安全合规要求，包括敏感词和违规内容",Category:"安全扫描",Version:"1.0.0",Author:"安全巡检Agent",IsOfficial:true,Downloads:0,Rating:0,Installed:true,Enabled:true},
		{ID:"s12",Name:"供应链漏洞扫描",Description:"检查依赖的第三方连接器和工具的已知风险",Category:"安全扫描",Version:"1.0.0",Author:"安全巡检Agent",IsOfficial:true,Downloads:0,Rating:0,Installed:true,Enabled:true},
	}
	for _, sk := range skills { s.skills[sk.ID] = sk }

	connectors := []*Connector{
		{ID:"c1",Name:"GitHub",Description:"代码仓库操作、PR管理和Issue跟踪",Category:"开发工具",AuthType:"oauth",Status:"connected",IsOfficial:true},
		{ID:"c2",Name:"企业微信",Description:"发送企业微信消息、管理群组",Category:"通信集成",AuthType:"oauth",Status:"disconnected",IsOfficial:true},
		{ID:"c3",Name:"腾讯文档",Description:"创建、编辑和搜索腾讯文档",Category:"办公效率",AuthType:"oauth",Status:"disconnected",IsOfficial:true},
		{ID:"c4",Name:"TAPD",Description:"项目管理、需求跟踪和缺陷管理",Category:"开发工具",AuthType:"api_key",Status:"disconnected",IsOfficial:true},
		{ID:"c5",Name:"QQ邮箱",Description:"收发和管理QQ邮件",Category:"办公效率",AuthType:"oauth",Status:"connected",IsOfficial:true},
		{ID:"c6",Name:"MySQL 数据库",Description:"数据库查询和管理",Category:"开发工具",AuthType:"api_key",Status:"disconnected",IsOfficial:false},
	}
	for _, c := range connectors { s.connectors[c.ID] = c }

	now2 := time.Now()
	mcpTools := []*MCPTool{
		{ID:"mcp-1",Name:"文件系统工具",Description:"提供文件读写、目录浏览等本地文件系统操作能力",Category:"系统工具",Version:"1.0.0",Author:"官方",IsOfficial:true,Config:"{\"mcpServers\":{\"filesystem\":{\"command\":\"npx\",\"args\":[\"-y\",\"@modelcontextprotocol/server-filesystem\",\"/tmp\"]}}}",Status:"active",Installed:true,CreatedAt:now2.Add(-30*24*time.Hour),UpdatedAt:now2},
		{ID:"mcp-2",Name:"GitHub MCP",Description:"通过MCP协议访问GitHub仓库、Issue、PR等资源",Category:"开发工具",Version:"1.2.0",Author:"官方",IsOfficial:true,Config:"{\"mcpServers\":{\"github\":{\"command\":\"npx\",\"args\":[\"-y\",\"@modelcontextprotocol/server-github\"],\"env\":{\"GITHUB_TOKEN\":\"ghp_A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8\"}}}}",Status:"active",Installed:true,CreatedAt:now2.Add(-25*24*time.Hour),UpdatedAt:now2},
		{ID:"mcp-3",Name:"数据库查询工具",Description:"通过MCP协议连接PostgreSQL/MySQL执行查询",Category:"数据工具",Version:"0.9.0",Author:"社区",IsOfficial:false,Config:"{\"mcpServers\":{\"postgres\":{\"command\":\"npx\",\"args\":[\"-y\",\"@modelcontextprotocol/server-postgres\",\"postgresql://admin:password@localhost/tokenhub\"]}}}",Status:"active",Installed:true,CreatedAt:now2.Add(-15*24*time.Hour),UpdatedAt:now2},
		{ID:"mcp-4",Name:"Slack MCP",Description:"通过MCP协议与Slack工作空间集成，发送消息和管理频道",Category:"通信集成",Version:"1.0.0",Author:"官方",IsOfficial:true,Config:"{\"mcpServers\":{\"slack\":{\"command\":\"npx\",\"args\":[\"-y\",\"@modelcontextprotocol/server-slack\"],\"env\":{\"SLACK_BOT_TOKEN\":\"xoxb-1234567890-ABCDEFGH\"}}}}",Status:"disabled",Installed:true,CreatedAt:now2.Add(-10*24*time.Hour),UpdatedAt:now2},
	}
	for _, t := range mcpTools { s.mcpTools[t.ID] = t }
}
