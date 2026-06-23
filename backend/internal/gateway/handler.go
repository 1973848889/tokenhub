package gateway

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/tokenhub/backend/internal/adapter"
	"github.com/tokenhub/backend/internal/agent"
	"github.com/tokenhub/backend/internal/compliance"
	"github.com/tokenhub/backend/internal/dashboard"
	"github.com/tokenhub/backend/internal/filter/safety"
	"github.com/tokenhub/backend/internal/gateway/middleware"
	"github.com/tokenhub/backend/internal/keygen"
	"github.com/tokenhub/backend/internal/marketplace"
	"github.com/tokenhub/backend/internal/organization"
	"github.com/tokenhub/backend/internal/router"
	"github.com/tokenhub/backend/internal/sandbox"
	"github.com/tokenhub/backend/internal/security"
	"github.com/tokenhub/backend/pkg/config"
)

type Handler struct {
	cfg    *config.Config
	router *router.RoutingEngine
}

func NewHandler(cfg *config.Config) *Handler {
	registry := adapter.GetRegistry()
	engine := router.NewEngine(registry)
	return &Handler{cfg: cfg, router: engine}
}

func (h *Handler) RegisterRoutes(r *gin.Engine) {
	r.Use(CORSMiddleware())
	r.Use(LoggingMiddleware())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "ai-governance-platform", "version": "0.1.0"})
	})

	r.POST("/api/v1/auth/login", h.Login)

	v1 := r.Group("/v1")
	v1.Use(JWTAuthMiddleware(h.cfg.JWT.Secret))
	{
		v1.POST("/chat/completions", h.ChatCompletion)
		v1.GET("/models", h.ListModels)
	}

	admin := r.Group("/api/v1/admin")
	{
		admin.GET("/dashboard/overview", h.DashboardOverview)
		admin.GET("/billing/report", h.BillingReport)
		admin.GET("/billing/summary", h.BillingSummary)
		admin.GET("/billing/export", h.BillingExport)
		admin.GET("/keys", h.ListAPIKeys)
		admin.POST("/keys", h.CreateAPIKey)
		admin.GET("/keys/:id", h.GetAPIKey)
		admin.DELETE("/keys/:id", h.RevokeAPIKey)
		admin.PUT("/keys/:id/budget", h.UpdateKeyBudget)
		admin.PUT("/keys/:id/status", h.UpdateKeyStatus)
		admin.PUT("/keys/:id", h.UpdateAPIKey)
		admin.POST("/recommend", h.RecommendModels)
		admin.GET("/safety/overview", h.SafetyOverview)
		admin.GET("/safety/logs", h.SafetyLogs)
		admin.GET("/agents/ranking", h.AgentRanking)
		admin.GET("/agents/:id/profile", h.AgentProfile)
		admin.GET("/agents/anomalies", h.AgentAnomalies)
		admin.GET("/compliance/report", h.ComplianceReport)
		admin.GET("/settings", h.GetSettings)
		admin.PUT("/settings", h.UpdateSettings)
		admin.GET("/routing/config", h.GetRoutingConfig)
		admin.PUT("/routing/config", h.UpdateRoutingConfig)
		admin.GET("/orgs", h.ListOrgs)
		admin.POST("/orgs", h.CreateOrg)
		admin.DELETE("/orgs/:id", h.DeleteOrg)
		admin.GET("/orgs/:id/depts", h.ListDepts)
		admin.POST("/depts", h.CreateDept)
		admin.PUT("/depts/:id/budget", h.UpdateDeptBudget)
		admin.PUT("/depts/:id", h.UpdateDept)
		admin.DELETE("/depts/:id", h.DeleteDept)
		admin.GET("/orgs/:id/users", h.ListUsers)
		admin.POST("/users", h.CreateUser)
		admin.PUT("/users/:id/budget", h.UpdateUserBudget)
		admin.DELETE("/users/:id/dept", h.RemoveUserFromDept)
		admin.PUT("/users/:id", h.UpdateUser)
		admin.DELETE("/users/:id", h.DeleteUser)
		admin.POST("/users/:id/reset-password", h.ResetUserPassword)
		admin.GET("/security/gateway", h.GetSecurityGateway)
		admin.GET("/security/access-control", h.GetAccessControl)
		admin.POST("/agents/register", h.RegisterAgent)
		admin.GET("/agents/registered", h.ListRegisteredAgents)
		admin.GET("/agents/registered/:id", h.GetRegisteredAgent)
		admin.PUT("/agents/registered/:id", h.UpdateRegisteredAgent)
		admin.POST("/agents/registered/:id/suspend", h.SuspendAgent)
		admin.POST("/agents/registered/:id/activate", h.ActivateAgent)
		admin.DELETE("/agents/registered/:id", h.DeregisterAgent)
		admin.POST("/agents/registered/:id/link-key", h.LinkKeyToAgent)
		admin.GET("/sandbox/reviews", h.SandboxReviews)
		admin.POST("/sandbox/reviews/:id/approve", h.ApproveReview)
		admin.POST("/sandbox/reviews/:id/reject", h.RejectReview)
		admin.GET("/sandbox/rules", h.SandboxRules)
		admin.PUT("/sandbox/rules", h.UpdateSandboxRules)
		admin.GET("/sandbox/history", h.SandboxHistory)
		admin.GET("/market/experts", h.ListMarketExperts)
		admin.GET("/market/experts/:id", h.GetMarketExpert)
		admin.POST("/market/experts/:id/subscribe", h.SubscribeExpert)
		admin.GET("/market/skills", h.ListMarketSkills)
		admin.POST("/market/skills/:id/install", h.InstallSkill)
		admin.PUT("/market/skills/:id/toggle", h.ToggleSkill)
		admin.DELETE("/market/skills/:id", h.UninstallSkill)
		admin.GET("/market/connectors", h.ListConnectors)
		admin.POST("/market/connectors/:id/connect", h.ConnectConnector)
		admin.POST("/market/connectors/:id/disconnect", h.DisconnectConnector)
		admin.GET("/market/mcp", h.ListMCPTools)
		admin.POST("/market/mcp", h.CreateMCPTool)
		admin.GET("/market/mcp/:id", h.GetMCPTool)
		admin.PUT("/market/mcp/:id", h.UpdateMCPTool)
		admin.DELETE("/market/mcp/:id", h.DeleteMCPTool)
		admin.POST("/market/mcp/:id/toggle", h.ToggleMCPTool)
		admin.GET("/asset-scan/overview", h.AssetScanOverview)
		admin.GET("/asset-scan/results", h.AssetScanResults)
		admin.GET("/asset-scan/results/:asset_id", h.AssetScanResult)
		admin.POST("/asset-scan/scan", h.TriggerAssetScan)
		admin.GET("/asset-scan/config", h.GetAssetScanConfig)
		admin.PUT("/asset-scan/config", h.UpdateAssetScanConfig)
		admin.GET("/asset-scan/skills", h.ListAssetScanSkills)
	}
}

func (h *Handler) ChatCompletion(c *gin.Context) {
	var req adapter.ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request body: "+err.Error())
		return
	}
	modelName := req.Model
	if modelName == "" {
		modelName = "deepseek-chat"
	}
	strategy := router.StrategyBalanced
	if s := c.GetHeader("X-Route-Strategy"); s != "" {
		switch s {
		case "quality":
			strategy = router.StrategyQualityOptimized
		case "balanced":
			strategy = router.StrategyBalanced
		}
	}
	routeReq := &router.RouteRequest{ModelName: modelName, Strategy: strategy}
	ctx, cancel := context.WithTimeout(c.Request.Context(), 120*time.Second)
	defer cancel()
	decision, err := h.router.Route(ctx, routeReq)
	if err != nil {
		InternalError(c, "routing failed: "+err.Error())
		return
	}
	if req.Stream {
		h.handleStreamChat(c, ctx, req, decision)
		return
	}
	resp, err := decision.Adapter.ChatCompletion(ctx, &req)
	if err != nil {
		for _, fb := range decision.Fallbacks {
			resp, err = fb.ChatCompletion(ctx, &req)
			if err == nil { break }
		}
		if err != nil {
			InternalError(c, fmt.Sprintf("all models failed: %v", err))
			return
		}
	}
	c.JSON(http.StatusOK, resp)
}

func (h *Handler) handleStreamChat(c *gin.Context, ctx context.Context, req adapter.ChatRequest, decision *router.RouteDecision) {
	ch, err := decision.Adapter.ChatCompletionStream(ctx, &req)
	if err != nil {
		for _, fb := range decision.Fallbacks {
			ch, err = fb.ChatCompletionStream(ctx, &req)
			if err == nil { break }
		}
		if err != nil {
			InternalError(c, "stream init failed: "+err.Error())
			return
		}
	}
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Status(http.StatusOK)
	flusher, ok := c.Writer.(http.Flusher)
	if !ok { return }
	for chunk := range ch {
		data, _ := json.Marshal(chunk)
		fmt.Fprintf(c.Writer, "data: %s\n\n", data)
		flusher.Flush()
	}
	fmt.Fprint(c.Writer, "data: [DONE]\n\n")
	flusher.Flush()
}

func (h *Handler) ListModels(c *gin.Context) {
	models := adapter.GetRegistry().ListModels()
	c.JSON(http.StatusOK, gin.H{"object": "list", "data": models})
}

func (h *Handler) DashboardOverview(c *gin.Context) {
	now := time.Now()

	dailyTrend := make([]gin.H, 0)
	for i := 6; i >= 0; i-- {
		date := now.AddDate(0, 0, -i).Format("2006-01-02")
		baseI := int64(3000000 + (6-i)*500000)
		baseO := int64(2000000 + (6-i)*300000)
		dailyTrend = append(dailyTrend, gin.H{
			"date": date, "cost": 120.0 + float64(i)*30.5,
			"tokens": baseI + baseO, "calls": int64(1000 + i*200),
			"input_tokens": baseI, "output_tokens": baseO,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"today": gin.H{
			"cost":               425.80,
			"tokens":             8500000,
			"calls":              2340,
			"cost_change_rate":   0.12,
			"tokens_change_rate": 0.08,
			"calls_change_rate":  -0.03,
		},
		"month": gin.H{
			"cost":                 8934.50,
			"budget":               50000.00,
			"budget_usage_rate":    0.1787,
			"estimated_month_end":  18500.00,
		},
		"model_distribution": []gin.H{
			{"model_name": "deepseek-chat", "provider": "deepseek", "cost": 3200.50, "tokens": 28000000, "calls": 18000, "percentage": 35.8, "avg_latency_ms": 850},
			{"model_name": "qwen-max", "provider": "qwen", "cost": 2200.30, "tokens": 12000000, "calls": 8500, "percentage": 24.6, "avg_latency_ms": 1200},
			{"model_name": "doubao-pro-256k", "provider": "doubao", "cost": 1500.00, "tokens": 8000000, "calls": 5200, "percentage": 16.8, "avg_latency_ms": 680},
			{"model_name": "kimi-latest", "provider": "kimi", "cost": 1100.75, "tokens": 5500000, "calls": 3400, "percentage": 12.3, "avg_latency_ms": 920},
			{"model_name": "glm-5", "provider": "glm", "cost": 933.95, "tokens": 4500000, "calls": 2800, "percentage": 10.5, "avg_latency_ms": 780},
		},
		"top_depts": []gin.H{
			{"dept_id": "dept-rd", "dept_name": "研发部", "cost": 4500.50, "tokens": 15000000, "user_count": 8, "trend": "up", "cost_change_rate": 0.15},
			{"dept_id": "dept-product", "dept_name": "产品部", "cost": 2100.30, "tokens": 8200000, "user_count": 5, "trend": "stable", "cost_change_rate": 0.02},
			{"dept_id": "dept-ops", "dept_name": "运营部", "cost": 1600.20, "tokens": 5500000, "user_count": 6, "trend": "up", "cost_change_rate": 0.10},
			{"dept_id": "dept-data", "dept_name": "数据部", "cost": 1250.10, "tokens": 4100000, "user_count": 3, "trend": "down", "cost_change_rate": -0.05},
			{"dept_id": "dept-mkt", "dept_name": "市场部", "cost": 980.75, "tokens": 3200000, "user_count": 4, "trend": "stable", "cost_change_rate": 0.01},
		},
		"top_users": []gin.H{
			{"user_id": "user-001", "user_name": "张三", "cost": 1250.00, "tokens": 5000000},
			{"user_id": "user-003", "user_name": "王五", "cost": 980.50, "tokens": 3800000},
			{"user_id": "user-002", "user_name": "李四", "cost": 750.20, "tokens": 3000000},
			{"user_id": "agent-001", "user_name": "数据分析Agent", "cost": 680.00, "tokens": 4200000},
			{"user_id": "agent-002", "user_name": "代码审查Bot", "cost": 320.50, "tokens": 1100000},
		},
		"daily_trend": dailyTrend,
		"alerts": []gin.H{
			{"id": "al-1", "level": "critical", "type": "budget", "title": "预算告警", "message": "研发部月度预算使用率已达85%", "timestamp": now.Add(-2*time.Hour).Format(time.RFC3339), "is_read": false, "related_key_id": "k1"},
			{"id": "al-2", "level": "warning", "type": "anomaly", "title": "异常行为", "message": "王五-工具测试 5分钟内花费¥850", "timestamp": now.Add(-3*time.Hour).Format(time.RFC3339), "is_read": false, "related_key_id": "k5"},
			{"id": "al-3", "level": "info", "type": "safety", "title": "安全通知", "message": "今日拦截12次违规调用", "timestamp": now.Add(-5*time.Hour).Format(time.RFC3339), "is_read": true},
		},
	})
}

func (h *Handler) BillingReport(c *gin.Context) {
	var query dashboard.BillingQuery
	if err := c.ShouldBindQuery(&query); err != nil {
		BadRequest(c, "invalid query: "+err.Error())
		return
	}
	if err := query.Validate(); err != nil {
		BadRequest(c, err.Error())
		return
	}
	report := &dashboard.BillingReport{
		Summary: dashboard.BillingSummary{}, Data: make([]dashboard.BillingRow, 0), Page: query.Page, PageSize: query.PageSize,
	}
	data := generateBillingData(&query)
	report.Data = data
	report.Total = len(data)
	for _, row := range data {
		report.Summary.TotalCost += row.TotalCost
		report.Summary.TotalTokens += row.TotalTokens
		report.Summary.TotalCalls += row.CallCount
	}
	if report.Summary.TotalCalls > 0 { report.Summary.AvgCost = report.Summary.TotalCost / float64(report.Summary.TotalCalls) }
	report.Summary.ActiveUsers = 5
	report.Summary.ActiveModels = 3
	c.JSON(http.StatusOK, report)
}

func generateBillingData(q *dashboard.BillingQuery) []dashboard.BillingRow {
	rows := make([]dashboard.BillingRow, 0)
	templates := []struct{ name string; calls int64; tokens int64; cost float64; model string }{
		{"研发部", 12340, 15000000, 4500.50, "deepseek-chat"},
		{"市场部", 8900, 8200000, 2100.30, "qwen-max"},
		{"产品部", 6700, 5500000, 1600.20, "doubao-pro-256k"},
		{"运营部", 4500, 3200000, 980.75, "kimi-latest"},
		{"数据部", 3200, 4100000, 1250.10, "glm-5"},
	}
	for _, t := range templates {
		row := dashboard.BillingRow{CallCount: t.calls, PromptTokens: t.tokens * 6 / 10, CompletionTokens: t.tokens * 4 / 10, TotalTokens: t.tokens, TotalCost: t.cost, AvgLatencyMs: 850.0, P95LatencyMs: 2500.0, ErrorCount: 12, ErrorRate: 0.001}
		switch q.GroupBy {
		case "dept": row.DeptName = t.name
		case "user": row.UserName = t.name + "负责人"
		case "model": row.ModelName = t.model
		case "project": row.ProjectName = t.name + "项目"
		case "day": row.Date = "2026-06-14"
		default: row.ModelName = t.model
		}
		rows = append(rows, row)
	}
	return rows
}

func (h *Handler) BillingSummary(c *gin.Context) {
	c.JSON(http.StatusOK, dashboard.BillingSummary{TotalCost: 10431.85, TotalTokens: 35800000, TotalCalls: 35640, AvgCost: 0.29, ActiveUsers: 5, ActiveModels: 5})
}

func (h *Handler) BillingExport(c *gin.Context) {
	format := c.Query("format")
	if format == "" { format = "csv" }
	var query dashboard.BillingQuery
	c.ShouldBindQuery(&query)
	query.Validate()
	data := generateBillingData(&query)
	switch format {
	case "csv":
		c.Header("Content-Type", "text/csv; charset=utf-8")
		c.Header("Content-Disposition", "attachment; filename=billing_report.csv")
		c.String(http.StatusOK, buildCSV(data, query.GroupBy))
	default:
		c.JSON(http.StatusOK, data)
	}
}

func buildCSV(rows []dashboard.BillingRow, groupBy string) string {
	var sb strings.Builder
	sb.WriteString("名称,调用次数,输入Token,输出Token,总Token,费用(元),平均延迟(ms)\n")
	for _, row := range rows {
		var name string
		switch groupBy { case "dept": name = row.DeptName; case "user": name = row.UserName; case "model": name = row.ModelName; case "day": name = row.Date; default: name = row.ModelName }
		sb.WriteString(fmt.Sprintf("%s,%d,%d,%d,%d,%.2f,%.0f\n", name, row.CallCount, row.PromptTokens, row.CompletionTokens, row.TotalTokens, row.TotalCost, row.AvgLatencyMs))
	}
	return sb.String()
}

func (h *Handler) ListAPIKeys(c *gin.Context) {
	var query keygen.ListKeysQuery
	c.ShouldBindQuery(&query)
	result := keygen.GetManager().List(&query)
	c.JSON(http.StatusOK, result)
}

func (h *Handler) CreateAPIKey(c *gin.Context) {
	var req keygen.CreateKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil { BadRequest(c, "invalid request: "+err.Error()); return }
	if req.Name == "" { BadRequest(c, "name is required"); return }
	created, err := keygen.GetManager().CreateKey(&req)
	if err != nil { InternalError(c, "create key failed: "+err.Error()); return }
	c.JSON(http.StatusCreated, created)
}

func (h *Handler) GetAPIKey(c *gin.Context) {
	key, err := keygen.GetManager().Get(c.Param("id"))
	if err != nil { BadRequest(c, "key not found"); return }
	c.JSON(http.StatusOK, key)
}

func (h *Handler) RevokeAPIKey(c *gin.Context) {
	if err := keygen.GetManager().Revoke(c.Param("id")); err != nil { BadRequest(c, err.Error()); return }
	c.JSON(http.StatusOK, gin.H{"status": "revoked", "id": c.Param("id")})
}

func (h *Handler) UpdateKeyBudget(c *gin.Context) {
	var body struct{ DailyBudget float64 `json:"daily_budget"` }
	if err := c.ShouldBindJSON(&body); err != nil { BadRequest(c, "invalid request: "+err.Error()); return }
	if err := keygen.GetManager().UpdateBudget(c.Param("id"), body.DailyBudget); err != nil { BadRequest(c, err.Error()); return }
	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

func (h *Handler) UpdateKeyStatus(c *gin.Context) {
	var body struct{ Status string `json:"status"` }
	if err := c.ShouldBindJSON(&body); err != nil { BadRequest(c, "invalid request: "+err.Error()); return }
	if body.Status != "active" && body.Status != "suspended" { BadRequest(c, "status must be active or suspended"); return }
	if err := keygen.GetManager().SetStatus(c.Param("id"), body.Status); err != nil { BadRequest(c, err.Error()); return }
	c.JSON(http.StatusOK, gin.H{"status": body.Status, "id": c.Param("id")})
}

func (h *Handler) UpdateAPIKey(c *gin.Context) {
	var req keygen.CreateKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil { BadRequest(c, "invalid request: "+err.Error()); return }
	updated, err := keygen.GetManager().Update(c.Param("id"), &req)
	if err != nil { BadRequest(c, err.Error()); return }
	c.JSON(http.StatusOK, updated)
}

func (h *Handler) RecommendModels(c *gin.Context) {
	var req struct{ Query string `json:"query" binding:"required"` }
	if err := c.ShouldBindJSON(&req); err != nil { BadRequest(c, "请输入场景描述"); return }
	if len(req.Query) < 2 { BadRequest(c, "描述内容太短"); return }
	c.JSON(http.StatusOK, router.GetSceneClassifier().Classify(req.Query))
}

func (h *Handler) SafetyOverview(c *gin.Context) { c.JSON(http.StatusOK, safety.GetService().GetOverview()) }

func (h *Handler) SafetyLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	result := c.Query("safety_result")
	label := c.Query("label")
	logs, total := safety.GetService().GetLogs(page, pageSize, result, label)
	c.JSON(http.StatusOK, gin.H{"data": logs, "total": total, "page": page, "page_size": pageSize})
}

func (h *Handler) AgentRanking(c *gin.Context) {
	sortBy := c.DefaultQuery("sort_by", "cost")
	c.JSON(http.StatusOK, gin.H{"data": agent.GetService().GetRanking(sortBy), "total": 6})
}

func (h *Handler) AgentProfile(c *gin.Context) {
	profile := agent.GetService().GetProfile(c.Param("id"))
	if profile == nil { BadRequest(c, "agent not found"); return }
	c.JSON(http.StatusOK, profile)
}

func (h *Handler) AgentAnomalies(c *gin.Context) {
	anomalies := agent.GetService().GetAnomalies()
	c.JSON(http.StatusOK, gin.H{"data": anomalies, "total": len(anomalies)})
}

func (h *Handler) ComplianceReport(c *gin.Context) {
	reportType := c.DefaultQuery("type", "usage_ledger")
	exportFormat := c.Query("format")
	start, _ := time.Parse("2006-01-02", c.DefaultQuery("start", time.Now().AddDate(0,-1,0).Format("2006-01-02")))
	end, _ := time.Parse("2006-01-02", c.DefaultQuery("end", time.Now().Format("2006-01-02")))
	req := &compliance.ReportRequest{OrgID: c.Query("org_id"), Type: compliance.ReportType(reportType), Start: start, End: end}
	switch reportType {
	case "usage_ledger":
		ledger := compliance.GenerateUsageLedger(req)
		if exportFormat == "csv" {
			c.Header("Content-Type", "text/csv; charset=utf-8")
			c.Header("Content-Disposition", "attachment; filename=usage_ledger.csv")
			var sb strings.Builder
			sb.WriteString("日期,用户,模型,Token,费用,场景,安全结果\n")
			for _, r := range ledger.Records { sb.WriteString(fmt.Sprintf("%s,%s,%s,%d,%.2f,%s,%s\n", r.Date, r.UserName, r.ModelName, r.Tokens, r.Cost, r.SceneTag, r.SafetyResult)) }
			c.String(http.StatusOK, sb.String())
			return
		}
		c.JSON(http.StatusOK, ledger)
	case "safety_audit": c.JSON(http.StatusOK, compliance.GenerateSafetyAudit(req))
	case "algorithm_filing": c.JSON(http.StatusOK, compliance.GenerateAlgorithmFiling())
	default: c.JSON(http.StatusOK, gin.H{"usage_ledger": compliance.GenerateUsageLedger(req), "safety_audit": compliance.GenerateSafetyAudit(req), "algorithm_filing": compliance.GenerateAlgorithmFiling()})
	}
}

// ===== Settings =====

type SettingsResponse struct {
	Organization OrganizationSettings `json:"organization"`
	Budget       BudgetSettings       `json:"budget"`
	Security     SecuritySettings     `json:"security"`
	Models       ModelsSettings       `json:"models"`
	About        AboutInfo            `json:"about"`
}
type OrganizationSettings struct { Name string `json:"name"`; Email string `json:"email"`; Plan string `json:"plan"`; Status string `json:"status"` }
type BudgetSettings struct { OrgMonthlyBudget float64 `json:"org_monthly_budget"`; DefaultKeyBudget float64 `json:"default_key_budget"`; AlertThreshold float64 `json:"alert_threshold"`; AutoBlockAgent bool `json:"auto_block_agent"` }
type SecuritySettings struct { SensitiveFilterEnabled bool `json:"sensitive_filter_enabled"`; PIIMaskEnabled bool `json:"pii_mask_enabled"`; InjectionDetectEnabled bool `json:"injection_detect_enabled"`; LogRetentionDays int `json:"log_retention_days"` }
type ModelsSettings struct { DefaultStrategy string `json:"default_strategy"`; EnabledModels []string `json:"enabled_models"`; MaxTokensPerCall int `json:"max_tokens_per_call"` }
type AboutInfo struct { Version string `json:"version"`; BuildDate string `json:"build_date"`; GoVersion string `json:"go_version"`; Uptime string `json:"uptime"` }

var currentSettings = SettingsResponse{
	Organization: OrganizationSettings{Name: "企业AI治理智能平台", Email: "admin@example.com", Plan: "专业版", Status: "active"},
	Budget: BudgetSettings{OrgMonthlyBudget: 50000, DefaultKeyBudget: 100, AlertThreshold: 0.8, AutoBlockAgent: true},
	Security: SecuritySettings{SensitiveFilterEnabled: true, PIIMaskEnabled: true, InjectionDetectEnabled: true, LogRetentionDays: 180},
	Models: ModelsSettings{DefaultStrategy: "balanced", EnabledModels: []string{"deepseek-chat","deepseek-reasoner","qwen-max","doubao-pro-256k","glm-5","kimi-latest","glm-5-flash","qwen-plus","hunyuan-pro"}, MaxTokensPerCall: 100000},
	About: AboutInfo{Version: "0.1.0", BuildDate: "2026-06-14", GoVersion: "1.26", Uptime: "2h 35m"},
}

func (h *Handler) GetSettings(c *gin.Context) { c.JSON(http.StatusOK, currentSettings) }

func (h *Handler) UpdateSettings(c *gin.Context) {
	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil { BadRequest(c, "invalid request: "+err.Error()); return }
	if org, ok := updates["organization"].(map[string]interface{}); ok {
		if v, ok := org["name"]; ok { currentSettings.Organization.Name = v.(string) }
		if v, ok := org["email"]; ok { currentSettings.Organization.Email = v.(string) }
	}
	if budget, ok := updates["budget"].(map[string]interface{}); ok {
		if v, ok := budget["org_monthly_budget"]; ok { currentSettings.Budget.OrgMonthlyBudget = v.(float64) }
		if v, ok := budget["default_key_budget"]; ok { currentSettings.Budget.DefaultKeyBudget = v.(float64) }
		if v, ok := budget["alert_threshold"]; ok { currentSettings.Budget.AlertThreshold = v.(float64) }
		if v, ok := budget["auto_block_agent"]; ok { currentSettings.Budget.AutoBlockAgent = v.(bool) }
	}
	if security, ok := updates["security"].(map[string]interface{}); ok {
		if v, ok := security["sensitive_filter_enabled"]; ok { currentSettings.Security.SensitiveFilterEnabled = v.(bool) }
		if v, ok := security["pii_mask_enabled"]; ok { currentSettings.Security.PIIMaskEnabled = v.(bool) }
		if v, ok := security["injection_detect_enabled"]; ok { currentSettings.Security.InjectionDetectEnabled = v.(bool) }
		if v, ok := security["log_retention_days"]; ok { currentSettings.Security.LogRetentionDays = int(v.(float64)) }
	}
	if models, ok := updates["models"].(map[string]interface{}); ok {
		if v, ok := models["default_strategy"]; ok { currentSettings.Models.DefaultStrategy = v.(string) }
		if v, ok := models["max_tokens_per_call"]; ok { currentSettings.Models.MaxTokensPerCall = int(v.(float64)) }
	}
	c.JSON(http.StatusOK, gin.H{"status": "updated", "settings": currentSettings})
}

// ===== Routing Config =====

type RoutingConfig struct {
	DefaultStrategy    string                 `json:"default_strategy"`
	ModelPreferences   []ModelPreference      `json:"model_preferences"`
	HealthCheckInterval int                   `json:"health_check_interval"`
	MaxRetries         int                    `json:"max_retries"`
}

type ModelPreference struct {
	Provider string `json:"provider"`
	Model    string `json:"model"`
	Priority int    `json:"priority"`
	Enabled  bool   `json:"enabled"`
}

var currentRouting = RoutingConfig{
	DefaultStrategy: "balanced",
	ModelPreferences: []ModelPreference{
		{Provider: "deepseek", Model: "deepseek-chat", Priority: 1, Enabled: true},
		{Provider: "deepseek", Model: "deepseek-reasoner", Priority: 2, Enabled: true},
		{Provider: "qwen", Model: "qwen-max", Priority: 3, Enabled: true},
		{Provider: "qwen", Model: "qwen-plus", Priority: 4, Enabled: true},
		{Provider: "doubao", Model: "doubao-pro-256k", Priority: 5, Enabled: true},
		{Provider: "glm", Model: "glm-5", Priority: 6, Enabled: true},
		{Provider: "glm", Model: "glm-5-flash", Priority: 7, Enabled: true},
		{Provider: "kimi", Model: "kimi-latest", Priority: 8, Enabled: true},
		{Provider: "zhipu", Model: "glm-4-plus", Priority: 9, Enabled: true},
	},
	HealthCheckInterval: 30,
	MaxRetries:          3,
}

func (h *Handler) GetRoutingConfig(c *gin.Context) {
	c.JSON(http.StatusOK, currentRouting)
}

func (h *Handler) UpdateRoutingConfig(c *gin.Context) {
	var config RoutingConfig
	if err := c.ShouldBindJSON(&config); err != nil { BadRequest(c, "invalid config: "+err.Error()); return }
	if config.DefaultStrategy != "" { currentRouting.DefaultStrategy = config.DefaultStrategy }
	if len(config.ModelPreferences) > 0 { currentRouting.ModelPreferences = config.ModelPreferences }
	c.JSON(http.StatusOK, gin.H{"status": "updated", "config": currentRouting})
}

// ===== Organization =====

func (h *Handler) ListOrgs(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"data": organization.GetService().ListOrgs()})
}

func (h *Handler) CreateOrg(c *gin.Context) {
	var req organization.CreateOrgRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" { BadRequest(c, "name required"); return }
	c.JSON(http.StatusCreated, organization.GetService().CreateOrg(&req))
}

func (h *Handler) DeleteOrg(c *gin.Context) {
	if err := organization.GetService().DeleteOrg(c.Param("id")); err != nil { BadRequest(c, err.Error()); return }
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

func (h *Handler) ListDepts(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"data": organization.GetService().ListDepts(c.Param("id"))})
}

func (h *Handler) CreateDept(c *gin.Context) {
	var req organization.CreateDeptRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" { BadRequest(c, "name required"); return }
	c.JSON(http.StatusCreated, organization.GetService().CreateDept(&req))
}

func (h *Handler) UpdateDeptBudget(c *gin.Context) {
	var req struct{ Budget float64 `json:"monthly_budget"` }
	if err := c.ShouldBindJSON(&req); err != nil { BadRequest(c, "invalid request"); return }
	d, err := organization.GetService().UpdateDeptBudget(c.Param("id"), req.Budget)
	if err != nil { BadRequest(c, err.Error()); return }
	c.JSON(http.StatusOK, d)
}

func (h *Handler) DeleteDept(c *gin.Context) {
	if err := organization.GetService().DeleteDept(c.Param("id")); err != nil { BadRequest(c, err.Error()); return }
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

func (h *Handler) UpdateDept(c *gin.Context) {
	var req organization.CreateDeptRequest
	if err := c.ShouldBindJSON(&req); err != nil { BadRequest(c, "invalid request"); return }
	d, err := organization.GetService().UpdateDept(c.Param("id"), &req)
	if err != nil { BadRequest(c, err.Error()); return }
	c.JSON(http.StatusOK, d)
}

func (h *Handler) ListUsers(c *gin.Context) {
	deptID := c.Query("dept_id")
	c.JSON(http.StatusOK, gin.H{"data": organization.GetService().ListUsers(c.Param("id"), deptID)})
}

func (h *Handler) CreateUser(c *gin.Context) {
	var req organization.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" { BadRequest(c, "name required"); return }
	c.JSON(http.StatusCreated, organization.GetService().CreateUser(&req))
}

func (h *Handler) UpdateUser(c *gin.Context) {
	var req organization.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil { BadRequest(c, "invalid request"); return }
	u, err := organization.GetService().UpdateUser(c.Param("id"), &req)
	if err != nil { BadRequest(c, err.Error()); return }
	c.JSON(http.StatusOK, u)
}

func (h *Handler) DeleteUser(c *gin.Context) {
	if err := organization.GetService().DeleteUser(c.Param("id")); err != nil { BadRequest(c, err.Error()); return }
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

func (h *Handler) UpdateUserBudget(c *gin.Context) {
	var req struct{ Budget float64 `json:"monthly_budget"` }
	if err := c.ShouldBindJSON(&req); err != nil { BadRequest(c, "invalid request"); return }
	u, err := organization.GetService().UpdateUserBudget(c.Param("id"), req.Budget)
	if err != nil { BadRequest(c, err.Error()); return }
	c.JSON(http.StatusOK, u)
}

func (h *Handler) RemoveUserFromDept(c *gin.Context) {
	u, err := organization.GetService().RemoveUserFromDept(c.Param("id"))
	if err != nil { BadRequest(c, err.Error()); return }
	c.JSON(http.StatusOK, u)
}

func (h *Handler) ResetUserPassword(c *gin.Context) {
	u, err := organization.GetService().ResetPassword(c.Param("id"))
	if err != nil { BadRequest(c, err.Error()); return }
	c.JSON(http.StatusOK, u)
}

func (h *Handler) GetSecurityGateway(c *gin.Context) {
	c.JSON(http.StatusOK, security.GetService().GetSecurityGateway())
}

func (h *Handler) GetAccessControl(c *gin.Context) {
	c.JSON(http.StatusOK, security.GetService().GetAccessControl())
}

// ===== Agent Registration =====

func (h *Handler) RegisterAgent(c *gin.Context) {
	var req agent.CreateAgentRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" { BadRequest(c, "name required"); return }
	a := agent.GetService().CreateRegisteredAgent(&req)
	agent.GetSecurityAgent().NotifyAssetChange("agent", a.ID)
	c.JSON(http.StatusCreated, a)
}

func (h *Handler) ListRegisteredAgents(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"data": agent.GetService().ListRegisteredAgents()})
}

func (h *Handler) GetRegisteredAgent(c *gin.Context) {
	a := agent.GetService().GetRegisteredAgent(c.Param("id"))
	if a == nil { BadRequest(c, "agent not found"); return }
	c.JSON(http.StatusOK, a)
}

func (h *Handler) UpdateRegisteredAgent(c *gin.Context) {
	var req agent.CreateAgentRequest
	if err := c.ShouldBindJSON(&req); err != nil { BadRequest(c, err.Error()); return }
	a := agent.GetService().UpdateRegisteredAgent(c.Param("id"), &req)
	if a == nil { BadRequest(c, "agent not found"); return }
	c.JSON(http.StatusOK, a)
}

func (h *Handler) SuspendAgent(c *gin.Context) {
	if err := agent.GetService().SuspendAgent(c.Param("id")); err != nil { BadRequest(c, err.Error()); return }
	c.JSON(http.StatusOK, gin.H{"status": "suspended"})
}

func (h *Handler) ActivateAgent(c *gin.Context) {
	if err := agent.GetService().ActivateAgent(c.Param("id")); err != nil { BadRequest(c, err.Error()); return }
	c.JSON(http.StatusOK, gin.H{"status": "activated"})
}

func (h *Handler) DeregisterAgent(c *gin.Context) {
	if err := agent.GetService().DeregisterAgent(c.Param("id")); err != nil { BadRequest(c, err.Error()); return }
	c.JSON(http.StatusOK, gin.H{"status": "deregistered"})
}

func (h *Handler) LinkKeyToAgent(c *gin.Context) {
	var req struct { KeyID string `json:"key_id"` }
	if err := c.ShouldBindJSON(&req); err != nil { BadRequest(c, err.Error()); return }
	a := agent.GetService().GetRegisteredAgent(c.Param("id"))
	if a == nil { BadRequest(c, "agent not found"); return }
	a.LinkedKeyIDs = append(a.LinkedKeyIDs, req.KeyID)
	c.JSON(http.StatusOK, a)
}

// ===== Sandbox =====

func (h *Handler) SandboxReviews(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"data": sandbox.GetService().GetReviews(c.Query("status"))})
}

func (h *Handler) ApproveReview(c *gin.Context) {
	var req struct{ Note string `json:"note"` }
	c.ShouldBindJSON(&req)
	if err := sandbox.GetService().ApproveReview(c.Param("id"), "管理员", req.Note); err != nil { BadRequest(c, err.Error()); return }
	c.JSON(http.StatusOK, gin.H{"status": "approved"})
}

func (h *Handler) RejectReview(c *gin.Context) {
	var req struct{ Note string `json:"note"` }
	c.ShouldBindJSON(&req)
	if err := sandbox.GetService().RejectReview(c.Param("id"), "管理员", req.Note); err != nil { BadRequest(c, err.Error()); return }
	c.JSON(http.StatusOK, gin.H{"status": "rejected"})
}

func (h *Handler) SandboxRules(c *gin.Context) {
	c.JSON(http.StatusOK, sandbox.GetService().GetRules())
}

func (h *Handler) UpdateSandboxRules(c *gin.Context) {
	var req sandbox.SandboxRule
	if err := c.ShouldBindJSON(&req); err != nil { BadRequest(c, err.Error()); return }
	sandbox.GetService().UpdateRules(&req)
	c.JSON(http.StatusOK, gin.H{"status": "updated"})
}

func (h *Handler) SandboxHistory(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"data": sandbox.GetService().GetReviews("")})
}

// ===== Marketplace =====

func (h *Handler) ListMarketExperts(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"data": marketplace.GetService().ListExperts(c.Query("category"))})
}

func (h *Handler) GetMarketExpert(c *gin.Context) {
	e := marketplace.GetService().GetExpert(c.Param("id"))
	if e == nil { BadRequest(c, "expert not found"); return }
	c.JSON(http.StatusOK, e)
}

func (h *Handler) SubscribeExpert(c *gin.Context) {
	id := c.Param("id")
	e := marketplace.GetService().GetExpert(id)
	if e == nil { BadRequest(c, "expert not found"); return }
	wasSubscribed := e.Subscribed
	marketplace.GetService().SubscribeExpert(id)

	if !wasSubscribed {
		created, err := keygen.GetManager().CreateKey(&keygen.CreateKeyRequest{Name: e.Name, UserID: "user-001", OrgID: "org-default", DeptID: "dept-rd", AllowedModels: []string{"deepseek-chat","qwen-max"}, DailyBudget: 100, RateLimitRPM: 60})
		if err == nil && created != nil {
			marketplace.GetService().SetExpertApiKey(id, created.ID, created.KeyPrefix)
			c.JSON(http.StatusOK, gin.H{"status":"subscribed","api_key":created.APIKey,"api_key_prefix":created.KeyPrefix})
			return
		}
		marketplace.GetService().SetExpertApiKey(id, "", "")
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func (h *Handler) CreateMarketExpert(c *gin.Context) {
	var req marketplace.CreateExpertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request: "+err.Error())
		return
	}
	if req.Name == "" { BadRequest(c, "name required"); return }
	e := marketplace.GetService().CreateExpert(&req)
	c.JSON(http.StatusCreated, e)
}

func (h *Handler) UpdateMarketExpert(c *gin.Context) {
	var req marketplace.CreateExpertRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "invalid request: "+err.Error())
		return
	}
	e, err := marketplace.GetService().UpdateExpert(c.Param("id"), &req)
	if err != nil { InternalError(c, err.Error()); return }
	if e == nil { BadRequest(c, "expert not found"); return }
	c.JSON(http.StatusOK, e)
}

func (h *Handler) DeleteMarketExpert(c *gin.Context) {
	marketplace.GetService().DeleteExpert(c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"status": "deleted"})
}

func (h *Handler) ListMarketSkills(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"data": marketplace.GetService().ListSkills(c.Query("category"))})
}

func (h *Handler) InstallSkill(c *gin.Context) {
	marketplace.GetService().InstallSkill(c.Param("id"))
	agent.GetSecurityAgent().NotifyAssetChange("skill", c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"status":"installed"})
}
func (h *Handler) ToggleSkill(c *gin.Context) { marketplace.GetService().ToggleSkill(c.Param("id")); c.JSON(http.StatusOK, gin.H{"status":"toggled"}) }
func (h *Handler) UninstallSkill(c *gin.Context) { marketplace.GetService().UninstallSkill(c.Param("id")); c.JSON(http.StatusOK, gin.H{"status":"uninstalled"}) }

func (h *Handler) ListConnectors(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"data": marketplace.GetService().ListConnectors()})
}

func (h *Handler) ConnectConnector(c *gin.Context) { marketplace.GetService().ConnectConnector(c.Param("id")); c.JSON(http.StatusOK, gin.H{"status":"connected"}) }
func (h *Handler) DisconnectConnector(c *gin.Context) { marketplace.GetService().DisconnectConnector(c.Param("id")); c.JSON(http.StatusOK, gin.H{"status":"disconnected"}) }

// ===== MCP Tools =====

func (h *Handler) ListMCPTools(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"data": marketplace.GetService().ListMCPTools()})
}

func (h *Handler) GetMCPTool(c *gin.Context) {
	t := marketplace.GetService().GetMCPTool(c.Param("id"))
	if t == nil { BadRequest(c, "mcp tool not found"); return }
	c.JSON(http.StatusOK, t)
}

func (h *Handler) CreateMCPTool(c *gin.Context) {
	var req marketplace.CreateMCPRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Name == "" { BadRequest(c, "name required"); return }
	t := marketplace.GetService().CreateMCPTool(&req)
	agent.GetSecurityAgent().NotifyAssetChange("mcp", t.ID)
	c.JSON(http.StatusCreated, t)
}

func (h *Handler) UpdateMCPTool(c *gin.Context) {
	var req marketplace.CreateMCPRequest
	if err := c.ShouldBindJSON(&req); err != nil { BadRequest(c, err.Error()); return }
	t := marketplace.GetService().UpdateMCPTool(c.Param("id"), &req)
	if t == nil { BadRequest(c, "mcp tool not found"); return }
	c.JSON(http.StatusOK, t)
}

func (h *Handler) DeleteMCPTool(c *gin.Context) {
	marketplace.GetService().DeleteMCPTool(c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"status":"deleted"})
}

func (h *Handler) ToggleMCPTool(c *gin.Context) {
	marketplace.GetService().ToggleMCPTool(c.Param("id"))
	c.JSON(http.StatusOK, gin.H{"status":"toggled"})
}

// ===== Asset Scan =====

func (h *Handler) AssetScanOverview(c *gin.Context) {
	c.JSON(http.StatusOK, agent.GetSecurityAgent().GetOverview())
}

func (h *Handler) AssetScanResults(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	assetType := c.Query("type")
	risk := c.Query("risk")
	data, total := agent.GetSecurityAgent().GetResults(assetType, risk, page, pageSize)
	c.JSON(http.StatusOK, gin.H{"data": data, "total": total, "page": page, "page_size": pageSize})
}

func (h *Handler) AssetScanResult(c *gin.Context) {
	r := agent.GetSecurityAgent().GetResult(c.Param("asset_id"))
	if r == nil { BadRequest(c, "scan result not found"); return }
	c.JSON(http.StatusOK, r)
}

func (h *Handler) TriggerAssetScan(c *gin.Context) {
	agent.GetSecurityAgent().TriggerScan()
	c.JSON(http.StatusOK, gin.H{"status": "scan_started"})
}

func (h *Handler) GetAssetScanConfig(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"scan_interval_h": agent.GetSecurityAgent().GetScanInterval()})
}

func (h *Handler) UpdateAssetScanConfig(c *gin.Context) {
	var req struct{ ScanIntervalH int `json:"scan_interval_h"` }
	if err := c.ShouldBindJSON(&req); err != nil { BadRequest(c, err.Error()); return }
	if req.ScanIntervalH < 1 { req.ScanIntervalH = 1 }
	agent.GetSecurityAgent().SetScanInterval(req.ScanIntervalH)
	c.JSON(http.StatusOK, gin.H{"scan_interval_h": agent.GetSecurityAgent().GetScanInterval()})
}

func (h *Handler) ListAssetScanSkills(c *gin.Context) {
	skills := agent.GetSecurityAgent().ListSkills()
	type skillInfo struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		Description string `json:"description"`
		Category    string `json:"category"`
	}
	result := make([]skillInfo, 0)
	for _, s := range skills {
		result = append(result, skillInfo{s.ID(), s.Name(), s.Description(), s.Category()})
	}
	c.JSON(http.StatusOK, gin.H{"data": result})
}

// ===== Middleware =====

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Org-Id,X-Route-Strategy")
		if c.Request.Method == "OPTIONS" { c.AbortWithStatus(204); return }
		c.Next()
	}
}

func LoggingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		c.Next()
		log.Printf("[%d] %s %s | %v", c.Writer.Status(), c.Request.Method, path, time.Since(start))
	}
}

func JWTAuthMiddleware(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			Unauthorized(c, "missing or invalid authorization")
			c.Abort()
			return
		}
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenStr == "" {
			Unauthorized(c, "empty token")
			c.Abort()
			return
		}
		claims, err := middleware.ParseJWT(secret, tokenStr)
		if err != nil {
			Unauthorized(c, "invalid token")
			c.Abort()
			return
		}
		c.Set("user_id", claims.UserID)
		c.Set("user_name", claims.UserName)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)
		c.Next()
	}
}

// ===== Login =====

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, "请输入邮箱和密码")
		return
	}

	user := organization.GetService().FindByEmail(req.Email)
	if user == nil {
		Unauthorized(c, "邮箱或密码错误")
		return
	}

	token, err := middleware.GenerateJWT(
		h.cfg.JWT.Secret,
		h.cfg.JWT.ExpireHour,
		user.ID,
		user.Name,
		user.Email,
		user.Role,
	)
	if err != nil {
		InternalError(c, "token generation failed")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":         token,
		"refresh_token": token,
		"user": gin.H{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
			"role":  user.Role,
		},
	})
}

// ===== Response Helpers =====

func BadRequest(c *gin.Context, msg string) { c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "INVALID_REQUEST", "message": msg}}) }
func Unauthorized(c *gin.Context, msg string) { c.JSON(http.StatusUnauthorized, gin.H{"error": gin.H{"code": "AUTH_FAILED", "message": msg}}) }
func InternalError(c *gin.Context, msg string) { c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": msg}}) }
