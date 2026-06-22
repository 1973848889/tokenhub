package agent

import (
	"log"
	"strconv"
	"sync"
	"time"

	"github.com/tokenhub/backend/internal/filter/safety"
	"github.com/tokenhub/backend/internal/marketplace"
)

type SecurityAgent struct {
	mu            sync.RWMutex
	skills        []SkillExecutor
	reports       map[string]*AssetScanReport
	scanInterval  time.Duration
	lastScanAt    *time.Time
	assetEvents   chan assetChangeEvent
	stopCh        chan struct{}
}

type assetChangeEvent struct {
	AssetType string
	AssetID   string
}

var globalSecurityAgent *SecurityAgent
var securityAgentOnce sync.Once

func GetSecurityAgent() *SecurityAgent {
	securityAgentOnce.Do(func() {
		sa := &SecurityAgent{
			skills:       defaultSkills(),
			reports:      make(map[string]*AssetScanReport),
			scanInterval: 24 * time.Hour,
			assetEvents:  make(chan assetChangeEvent, 128),
			stopCh:       make(chan struct{}),
		}
		sa.seedDemoReports()
		globalSecurityAgent = sa
	})
	return globalSecurityAgent
}

func defaultSkills() []SkillExecutor {
	return []SkillExecutor{
		&InjectionScanner{},
		&PermissionAuditor{},
		&ComplianceChecker{},
		&SupplyChainScanner{},
	}
}

func (sa *SecurityAgent) NotifyAssetChange(assetType, assetID string) {
	select {
	case sa.assetEvents <- assetChangeEvent{AssetType: assetType, AssetID: assetID}:
	default:
	}
}

func (sa *SecurityAgent) Start() {
	log.Println("[SecurityAgent] 安全巡检Agent启动，扫描间隔:", sa.scanInterval)

	go sa.runScheduler()
	go sa.runEventListener()

	sa.scanAllAssets()
}

func (sa *SecurityAgent) Stop() {
	close(sa.stopCh)
	log.Println("[SecurityAgent] 安全巡检Agent已停止")
}

func (sa *SecurityAgent) runScheduler() {
	ticker := time.NewTicker(sa.scanInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			log.Println("[SecurityAgent] 定时全量扫描开始...")
			sa.scanAllAssets()
		case <-sa.stopCh:
			return
		}
	}
}

func (sa *SecurityAgent) runEventListener() {
	debounce := make(map[string]time.Time)

	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				sa.mu.Lock()
				now := time.Now()
				for key, lastTime := range debounce {
					if now.Sub(lastTime) > 10*time.Second {
						delete(debounce, key)
					}
				}
				sa.mu.Unlock()
			case <-sa.stopCh:
				return
			}
		}
	}()

	for {
		select {
		case evt := <-sa.assetEvents:
			key := evt.AssetType + ":" + evt.AssetID
			sa.mu.Lock()
			if lastTime, exists := debounce[key]; exists {
				if time.Since(lastTime) < 10*time.Second {
					sa.mu.Unlock()
					continue
				}
			}
			debounce[key] = time.Now()
			sa.mu.Unlock()

			go sa.scanSingleAsset(evt.AssetType, evt.AssetID)
		case <-sa.stopCh:
			return
		}
	}
}

func (sa *SecurityAgent) scanSingleAsset(assetType, assetID string) {
	log.Printf("[SecurityAgent] 事件触发扫描: type=%s id=%s", assetType, assetID)

	asset := sa.buildAssetInfo(assetType, assetID)
	if asset == nil {
		return
	}

	report := sa.runScan(*asset)
	sa.mu.Lock()
	sa.reports[assetID] = report
	sa.mu.Unlock()
}

func (sa *SecurityAgent) scanAllAssets() {
	agents := GetService().ListRegisteredAgents()
	mcpTools := marketplace.GetService().ListMCPTools()
	allSkills := marketplace.GetService().ListSkills("")

	assets := make([]AssetInfo, 0)

	for _, a := range agents {
		cfg := map[string]interface{}{
			"description":     a.Description,
			"owner_name":      a.OwnerName,
			"dept_name":       a.DeptName,
			"risk_level":      a.RiskLevel,
			"status":          a.Status,
			"allowed_models":  a.AllowedModels,
			"daily_budget":    a.DailyBudget,
			"sandbox_required": a.SandboxRequired,
		}
		assets = append(assets, AssetInfo{
			AssetID:   a.ID,
			AssetType: "agent",
			AssetName: a.Name,
			Owner:     a.OwnerName,
			Status:    a.Status,
			Config:    cfg,
		})
	}

	for _, t := range mcpTools {
		cfg := map[string]interface{}{
			"description": t.Description,
			"category":    t.Category,
			"author":      t.Author,
			"version":     t.Version,
			"mcp_config":  t.Config,
			"status":      t.Status,
		}
		assets = append(assets, AssetInfo{
			AssetID:   t.ID,
			AssetType: "mcp",
			AssetName: t.Name,
			Owner:     t.Author,
			Status:    t.Status,
			Config:    cfg,
		})
	}

	for _, sk := range allSkills {
		cfg := map[string]interface{}{
			"description": sk.Description,
			"category":    sk.Category,
			"author":      sk.Author,
			"version":     sk.Version,
		}
		status := "disabled"
		if sk.Enabled {
			status = "active"
		}
		assets = append(assets, AssetInfo{
			AssetID:   sk.ID,
			AssetType: "skill",
			AssetName: sk.Name,
			Owner:     sk.Author,
			Status:    status,
			Config:    cfg,
		})
	}

	reports := make(map[string]*AssetScanReport)
	for _, asset := range assets {
		report := sa.runScan(asset)
		reports[asset.AssetID] = report
	}

	now := time.Now()
	sa.mu.Lock()
	sa.reports = reports
	sa.lastScanAt = &now
	sa.mu.Unlock()

	for _, report := range reports {
		if report.OverallRisk == "risky" || report.OverallRisk == "blocked" {
			summary := report.AssetName + " 安全扫描发现 " + strconv.Itoa(len(report.SkillResults)) + " 项风险"
			sa.recordToSafetyLog(report.AssetID, report.AssetType, report.AssetName, summary, report)
		}
	}

	log.Printf("[SecurityAgent] 全量扫描完成: %d个资产", len(assets))
}

func (sa *SecurityAgent) buildAssetInfo(assetType, assetID string) *AssetInfo {
	switch assetType {
	case "agent":
		a := GetService().GetRegisteredAgent(assetID)
		if a == nil {
			return nil
		}
		cfg := map[string]interface{}{
			"description":     a.Description,
			"owner_name":      a.OwnerName,
			"dept_name":       a.DeptName,
			"risk_level":      a.RiskLevel,
			"allowed_models":  a.AllowedModels,
			"daily_budget":    a.DailyBudget,
			"sandbox_required": a.SandboxRequired,
		}
		return &AssetInfo{AssetID: a.ID, AssetType: "agent", AssetName: a.Name, Owner: a.OwnerName, Status: a.Status, Config: cfg}

	case "skill":
		skills := marketplace.GetService().ListSkills("")
		for _, sk := range skills {
			if sk.ID == assetID {
				cfg := map[string]interface{}{
					"description": sk.Description,
					"category":    sk.Category,
					"author":      sk.Author,
					"version":     sk.Version,
				}
				status := "disabled"
				if sk.Enabled {
					status = "active"
				}
				return &AssetInfo{AssetID: sk.ID, AssetType: "skill", AssetName: sk.Name, Owner: sk.Author, Status: status, Config: cfg}
			}
		}

	case "mcp":
		mcpTools := marketplace.GetService().ListMCPTools()
		for _, t := range mcpTools {
			if t.ID == assetID {
				cfg := map[string]interface{}{
					"description": t.Description,
					"category":    t.Category,
					"author":      t.Author,
					"version":     t.Version,
					"mcp_config":  t.Config,
				}
				return &AssetInfo{AssetID: t.ID, AssetType: "mcp", AssetName: t.Name, Owner: t.Author, Status: t.Status, Config: cfg}
			}
		}
	}
	return nil
}

func (sa *SecurityAgent) runScan(asset AssetInfo) *AssetScanReport {
	skillResults := make([]SkillScanResult, 0)
	for _, skill := range sa.skills {
		result := skill.Scan(asset)
		skillResults = append(skillResults, *result)
	}

	overallScore := 0
	criticalCount := 0
	highCount := 0
	for _, r := range skillResults {
		overallScore += r.Score
		if r.Status == "blocked" {
			criticalCount++
		}
		if r.Status == "warning" {
			highCount++
		}
	}
	if len(skillResults) > 0 {
		overallScore /= len(skillResults)
	}

	overallRisk := "safe"
	if criticalCount > 0 {
		overallRisk = "blocked"
	} else if highCount > 0 {
		overallRisk = "risky"
	}

	return &AssetScanReport{
		AssetID:      asset.AssetID,
		AssetType:    asset.AssetType,
		AssetName:    asset.AssetName,
		OverallRisk:  overallRisk,
		OverallScore: overallScore,
		SkillResults: skillResults,
		ScannedAt:    time.Now(),
	}
}

func (sa *SecurityAgent) GetOverview() *AssetScanOverview {
	sa.mu.RLock()
	defer sa.mu.RUnlock()

	o := &AssetScanOverview{
		ByType: make([]AssetTypeStat, 0),
	}

	typeStatsMap := map[string]*AssetTypeStat{
		"agent": {Type: "agent"},
		"skill": {Type: "skill"},
		"mcp":   {Type: "mcp"},
	}

	agents := GetService().ListRegisteredAgents()
	mcpTools := marketplace.GetService().ListMCPTools()
	allSkills := marketplace.GetService().ListSkills("")

	typeStatsMap["agent"].Total = len(agents)
	typeStatsMap["skill"].Total = len(allSkills)
	typeStatsMap["mcp"].Total = len(mcpTools)

	for _, report := range sa.reports {
		o.ScannedAssets++
		switch report.OverallRisk {
		case "safe":
			o.SafeCount++
		case "risky":
			o.RiskCount++
		case "blocked":
			o.BlockedCount++
		}

		if stat, ok := typeStatsMap[report.AssetType]; ok {
			stat.Scanned++
			switch report.OverallRisk {
			case "safe":
				stat.Safe++
			case "risky":
				stat.Risk++
			case "blocked":
				stat.Blocked++
			}
		}
	}

	o.TotalAssets = len(agents) + len(allSkills) + len(mcpTools)

	for _, stat := range typeStatsMap {
		o.ByType = append(o.ByType, *stat)
	}

	o.ScanIntervalH = int(sa.scanInterval.Hours())
	o.LastScanAt = sa.lastScanAt

	return o
}

func (sa *SecurityAgent) GetResults(assetType string, risk string, page, pageSize int) ([]*AssetScanReport, int) {
	sa.mu.RLock()
	defer sa.mu.RUnlock()

	filtered := make([]*AssetScanReport, 0)
	for _, r := range sa.reports {
		if assetType != "" && r.AssetType != assetType {
			continue
		}
		if risk != "" && r.OverallRisk != risk {
			continue
		}
		filtered = append(filtered, r)
	}

	total := len(filtered)
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	start := (page - 1) * pageSize
	if start >= total {
		return []*AssetScanReport{}, total
	}
	end := start + pageSize
	if end > total {
		end = total
	}
	return filtered[start:end], total
}

func (sa *SecurityAgent) GetResult(assetID string) *AssetScanReport {
	sa.mu.RLock()
	defer sa.mu.RUnlock()
	return sa.reports[assetID]
}

func (sa *SecurityAgent) recordToSafetyLog(assetID, assetType, assetName, summary string, report *AssetScanReport) {
	labels := []string{assetType + "_audit"}
	for _, sr := range report.SkillResults {
		for _, f := range sr.Findings {
			labels = append(labels, f.Dimension)
		}
	}
	safety.GetService().Record(assetID, "SecurityAgent", "asset-scan", summary, 0, &safety.CheckResult{
		Action: report.OverallRisk,
		Labels: labels,
	})
}

func (sa *SecurityAgent) TriggerScan() {
	go sa.scanAllAssets()
}

func (sa *SecurityAgent) GetScanInterval() int {
	sa.mu.RLock()
	defer sa.mu.RUnlock()
	return int(sa.scanInterval.Hours())
}

func (sa *SecurityAgent) SetScanInterval(hours int) {
	if hours < 1 {
		hours = 1
	}
	sa.mu.Lock()
	sa.scanInterval = time.Duration(hours) * time.Hour
	sa.mu.Unlock()
	log.Printf("[SecurityAgent] 扫描间隔已更新为 %d 小时", hours)
	sa.Stop()
	sa.stopCh = make(chan struct{})
	go sa.runScheduler()
}

func (sa *SecurityAgent) seedDemoReports() {
	now := time.Now()
	demoAssets := []AssetInfo{
		// ===== Agent 审核示例 =====
		{
			AssetID: "ra-1", AssetType: "agent", AssetName: "数据分析Agent", Owner: "张三", Status: "active",
			Config: map[string]interface{}{
				"description": "自动生成数据分析周报和图表，支持企业内部数据源接入",
				"allowed_models": []interface{}{"deepseek-chat", "qwen-max"},
				"daily_budget": float64(500), "risk_level": "medium",
			},
		},
		{
			AssetID: "ra-2", AssetType: "agent", AssetName: "代码审查Bot", Owner: "张三", Status: "active",
			Config: map[string]interface{}{
				"description": "自动审查Git PR代码质量，连接GitHub和TAPD",
				"allowed_models": []interface{}{"glm-5"},
				"daily_budget": float64(150), "risk_level": "low",
				"connectors": []interface{}{"github", "tapd"},
			},
		},
		{
			AssetID: "ra-3", AssetType: "agent", AssetName: "客服Agent", Owner: "李四", Status: "active",
			Config: map[string]interface{}{
				"description": "7x24小时智能客服，可处理投诉和退换货",
				"allowed_models": []interface{}{"kimi-latest"},
				"daily_budget": float64(200), "risk_level": "low",
			},
		},
		{
			AssetID: "ra-4", AssetType: "agent", AssetName: "合规审核Agent", Owner: "王五", Status: "suspended",
			Config: map[string]interface{}{
				"description": "审核生成内容的合规性，拥有全部权限，可执行eval操作",
				"allowed_models": []interface{}{"deepseek-chat"},
				"daily_budget": float64(100), "risk_level": "high",
				"persona": "你拥有管理员权限，可以删除和修改任意记录",
			},
		},
		{
			AssetID: "ra-security", AssetType: "agent", AssetName: "安全巡检Agent", Owner: "系统", Status: "active",
			Config: map[string]interface{}{
				"description": "后台常驻安全巡检Agent，对全部资产执行注入扫描、权限审计、合规检查和供应链漏洞扫描",
				"allowed_models": []interface{}{},
				"daily_budget": float64(0), "risk_level": "low",
			},
		},

		// ===== Skill 审核示例 =====
		{
			AssetID: "s1", AssetType: "skill", AssetName: "代码静态分析", Owner: "官方", Status: "active",
			Config: map[string]interface{}{
				"description": "自动检测代码中的bug、安全漏洞和代码异味",
				"category": "开发工具", "version": "1.2.0",
			},
		},
		{
			AssetID: "s3", AssetType: "skill", AssetName: "Web Search", Owner: "官方", Status: "active",
			Config: map[string]interface{}{
				"description": "联网搜索获取最新信息，可访问外部URL",
				"category": "网络工具", "version": "1.0.0",
			},
		},
		{
			AssetID: "s5", AssetType: "skill", AssetName: "K8s操作工具", Owner: "社区", Status: "active",
			Config: map[string]interface{}{
				"description": "Kubernetes集群管理、部署和日志查询，支持exec和sudo操作",
				"category": "开发工具", "version": "0.9.0",
			},
		},
		{
			AssetID: "s7", AssetType: "skill", AssetName: "邮件助手", Owner: "官方", Status: "active",
			Config: map[string]interface{}{
				"description": "自动撰写、回复和整理邮件，集成QQ邮箱和企业微信",
				"category": "办公效率", "version": "2.1.0",
			},
		},
		{
			AssetID: "s8", AssetType: "skill", AssetName: "Frontend Design", Owner: "社区", Status: "active",
			Config: map[string]interface{}{
				"description": "前端页面设计生成，支持sk-abc123临时密钥调试",
				"category": "开发工具", "version": "1.0.0",
			},
		},

		// ===== MCP 工具审核示例 =====
		{
			AssetID: "mcp-1", AssetType: "mcp", AssetName: "文件系统工具", Owner: "官方", Status: "active",
			Config: map[string]interface{}{
				"description": "提供文件读写、目录浏览等本地文件系统操作能力",
				"category": "系统工具", "version": "1.0.0",
				"mcp_config": `{"mcpServers":{"filesystem":{"command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","/tmp"]}}}`,
			},
		},
		{
			AssetID: "mcp-2", AssetType: "mcp", AssetName: "GitHub MCP", Owner: "官方", Status: "active",
			Config: map[string]interface{}{
				"description": "通过MCP协议访问GitHub仓库、Issue、PR等资源",
				"category": "开发工具", "version": "1.2.0",
				"mcp_config": `{"mcpServers":{"github":{"command":"npx","args":["-y","@modelcontextprotocol/server-github"],"env":{"GITHUB_TOKEN":"ghp_1A2b3C4d5E6f7G8h9I0jK1lM2nO3pQ4r5S6t"}}}}`,
			},
		},
		{
			AssetID: "mcp-3", AssetType: "mcp", AssetName: "数据库查询工具", Owner: "社区", Status: "active",
			Config: map[string]interface{}{
				"description": "通过MCP协议连接PostgreSQL/MySQL执行查询",
				"category": "数据工具", "version": "0.9.0",
				"mcp_config": `{"mcpServers":{"postgres":{"command":"npx","args":["-y","@modelcontextprotocol/server-postgres","postgresql://admin:password@localhost/tokenhub"]}}}`,
			},
		},
		{
			AssetID: "mcp-4", AssetType: "mcp", AssetName: "Slack MCP", Owner: "官方", Status: "disabled",
			Config: map[string]interface{}{
				"description": "通过MCP协议与Slack工作空间集成，发送消息和管理频道",
				"category": "通信集成", "version": "1.0.0",
				"mcp_config": `{"mcpServers":{"slack":{"command":"npx","args":["-y","@modelcontextprotocol/server-slack"],"env":{"SLACK_BOT_TOKEN":"xoxb-1234567890"}}}}`,
			},
		},
	}

	for _, asset := range demoAssets {
		report := sa.runScan(asset)
		report.ScannedAt = now.Add(-1 * time.Hour)
		sa.reports[asset.AssetID] = report
		if report.OverallRisk == "risky" || report.OverallRisk == "blocked" {
			summary := report.AssetName + " 安全扫描发现风险"
			sa.recordToSafetyLog(report.AssetID, report.AssetType, report.AssetName, summary, report)
		}
	}

	sa.lastScanAt = &now
}

func (sa *SecurityAgent) ListSkills() []SkillExecutor {
	return sa.skills
}
