package dashboard

import (
	"fmt"
	"strings"
	"time"
)

type BillingQuery struct {
	OrgID    string    `form:"org_id"`
	Start    time.Time `form:"start" time_format:"2006-01-02"`
	End      time.Time `form:"end" time_format:"2006-01-02"`
	GroupBy  string    `form:"group_by"`
	DeptID   string    `form:"dept_id"`
	UserID   string    `form:"user_id"`
	Model    string    `form:"model"`
	Page     int       `form:"page"`
	PageSize int       `form:"page_size"`
}

type BillingSummary struct {
	TotalCost   float64 `json:"total_cost"`
	TotalTokens int64   `json:"total_tokens"`
	TotalCalls  int64   `json:"total_calls"`
	AvgCost     float64 `json:"avg_cost_per_call"`
	ActiveUsers int     `json:"active_users"`
	ActiveModels int    `json:"active_models"`
}

type BillingRow struct {
	DeptName          string  `json:"dept_name,omitempty"`
	UserName          string  `json:"user_name,omitempty"`
	ModelName         string  `json:"model_name,omitempty"`
	ProjectName       string  `json:"project_name,omitempty"`
	Date              string  `json:"date,omitempty"`
	CallCount         int64   `json:"call_count"`
	PromptTokens      int64   `json:"prompt_tokens"`
	CompletionTokens  int64   `json:"completion_tokens"`
	TotalTokens       int64   `json:"total_tokens"`
	TotalCost         float64 `json:"total_cost"`
	AvgLatencyMs      float64 `json:"avg_latency_ms"`
	P95LatencyMs      float64 `json:"p95_latency_ms"`
	ErrorCount        int64   `json:"error_count"`
	ErrorRate         float64 `json:"error_rate"`
	FirstCallAt       string  `json:"first_call_at"`
	LastCallAt        string  `json:"last_call_at"`
}

type BillingReport struct {
	Summary BillingSummary `json:"summary"`
	Data    []BillingRow   `json:"data"`
	Total   int            `json:"total"`
	Page    int            `json:"page"`
	PageSize int           `json:"page_size"`
}

func (q *BillingQuery) Validate() error {
	if q.OrgID == "" {
		return fmt.Errorf("org_id is required")
	}
	if q.Start.IsZero() || q.End.IsZero() {
		return fmt.Errorf("start and end dates are required")
	}
	if q.Page <= 0 {
		q.Page = 1
	}
	if q.PageSize <= 0 || q.PageSize > 100 {
		q.PageSize = 20
	}
	validGroupBy := map[string]bool{"dept": true, "user": true, "model": true, "project": true, "day": true}
	if q.GroupBy != "" && !validGroupBy[q.GroupBy] {
		return fmt.Errorf("invalid group_by: %s", q.GroupBy)
	}
	return nil
}

func (q *BillingQuery) GroupByField() string {
	switch q.GroupBy {
	case "dept":
		return "dept_id"
	case "user":
		return "user_id"
	case "model":
		return "model_name"
	case "project":
		return "project_id"
	case "day":
		return "toString(toStartOfDay(timestamp))"
	default:
		return "model_name"
	}
}

func (q *BillingQuery) GroupByLabel() string {
	switch q.GroupBy {
	case "dept":
		return "dept_name"
	case "user":
		return "user_name"
	case "model":
		return "model_name"
	case "project":
		return "project_name"
	case "day":
		return "date"
	default:
		return "model_name"
	}
}

func (q *BillingQuery) BuildSQL() string {
	groupField := q.GroupByField()

	var selectCols string
	switch q.GroupBy {
	case "dept":
		selectCols = "dept_id, tags['dept_name'] as dept_name"
	case "user":
		selectCols = "user_id, tags['user_name'] as user_name"
	case "model":
		selectCols = "model_name"
	case "project":
		selectCols = "project_id, tags['project_name'] as project_name"
	case "day":
		selectCols = "toString(toStartOfDay(timestamp)) as date"
	default:
		selectCols = "model_name"
	}

	where := []string{fmt.Sprintf("org_id = '%s'", strings.ReplaceAll(q.OrgID, "'", "''"))}
	where = append(where, fmt.Sprintf("timestamp >= '%s'", q.Start.Format("2006-01-02")))
	where = append(where, fmt.Sprintf("timestamp < '%s'", q.End.Add(24*time.Hour).Format("2006-01-02")))
	if q.DeptID != "" {
		where = append(where, fmt.Sprintf("dept_id = '%s'", strings.ReplaceAll(q.DeptID, "'", "''")))
	}
	if q.UserID != "" {
		where = append(where, fmt.Sprintf("user_id = '%s'", strings.ReplaceAll(q.UserID, "'", "''")))
	}
	if q.Model != "" {
		where = append(where, fmt.Sprintf("model_name = '%s'", strings.ReplaceAll(q.Model, "'", "''")))
	}

	offset := (q.Page - 1) * q.PageSize

	sql := fmt.Sprintf(`
		SELECT
			%s,
			count() as call_count,
			sum(prompt_tokens) as prompt_tokens,
			sum(completion_tokens) as completion_tokens,
			sum(total_tokens) as total_tokens,
			sum(total_cost) as total_cost,
			avg(latency_ms) as avg_latency_ms,
			quantile(0.95)(latency_ms) as p95_latency_ms,
			countIf(status_code >= 400) as error_count,
			if(count() > 0, countIf(status_code >= 400) / count(), 0) as error_rate,
			min(timestamp) as first_call_at,
			max(timestamp) as last_call_at
		FROM call_events
		WHERE %s
		GROUP BY %s
		ORDER BY total_cost DESC
		LIMIT %d OFFSET %d
	`, selectCols, strings.Join(where, " AND "), groupField, q.PageSize, offset)

	return sql
}

func (q *BillingQuery) BuildCountSQL() string {
	groupField := q.GroupByField()
	where := []string{fmt.Sprintf("org_id = '%s'", strings.ReplaceAll(q.OrgID, "'", "''"))}
	where = append(where, fmt.Sprintf("timestamp >= '%s'", q.Start.Format("2006-01-02")))
	where = append(where, fmt.Sprintf("timestamp < '%s'", q.End.Add(24*time.Hour).Format("2006-01-02")))

	return fmt.Sprintf(`
		SELECT count(DISTINCT %s) as cnt
		FROM call_events
		WHERE %s
	`, groupField, strings.Join(where, " AND "))
}

func (q *BillingQuery) BuildSummarySQL() string {
	where := []string{fmt.Sprintf("org_id = '%s'", strings.ReplaceAll(q.OrgID, "'", "''"))}
	where = append(where, fmt.Sprintf("timestamp >= '%s'", q.Start.Format("2006-01-02")))
	where = append(where, fmt.Sprintf("timestamp < '%s'", q.End.Add(24*time.Hour).Format("2006-01-02")))

	return fmt.Sprintf(`
		SELECT
			count() as total_calls,
			sum(total_tokens) as total_tokens,
			sum(total_cost) as total_cost,
			if(count() > 0, sum(total_cost) / count(), 0) as avg_cost,
			uniq(user_id) as active_users,
			uniq(model_name) as active_models
		FROM call_events
		WHERE %s
	`, strings.Join(where, " AND "))
}
