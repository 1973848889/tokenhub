package agent

import "time"

type AssetInfo struct {
	AssetID   string                 `json:"asset_id"`
	AssetType string                 `json:"asset_type"`
	AssetName string                 `json:"asset_name"`
	Owner     string                 `json:"owner"`
	Status    string                 `json:"status"`
	Config    map[string]interface{} `json:"config"`
}

type ScanFinding struct {
	Dimension   string `json:"dimension"`
	Severity    string `json:"severity"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Suggestion  string `json:"suggestion"`
}

type SkillScanResult struct {
	SkillID   string        `json:"skill_id"`
	SkillName string        `json:"skill_name"`
	Status    string        `json:"status"`
	Score     int           `json:"score"`
	Findings  []ScanFinding `json:"findings"`
}

type AssetScanReport struct {
	AssetID      string            `json:"asset_id"`
	AssetType    string            `json:"asset_type"`
	AssetName    string            `json:"asset_name"`
	OverallRisk  string            `json:"overall_risk"`
	OverallScore int               `json:"overall_score"`
	SkillResults []SkillScanResult `json:"skill_results"`
	ScannedAt    time.Time         `json:"scanned_at"`
}

type AssetScanOverview struct {
	TotalAssets   int             `json:"total_assets"`
	ScannedAssets int             `json:"scanned_assets"`
	SafeCount     int             `json:"safe_count"`
	RiskCount     int             `json:"risk_count"`
	BlockedCount  int             `json:"blocked_count"`
	ByType        []AssetTypeStat `json:"by_type"`
	ScanIntervalH int             `json:"scan_interval_h"`
	LastScanAt    *time.Time      `json:"last_scan_at"`
}

type AssetTypeStat struct {
	Type    string `json:"type"`
	Total   int    `json:"total"`
	Scanned int    `json:"scanned"`
	Safe    int    `json:"safe"`
	Risk    int    `json:"risk"`
	Blocked int    `json:"blocked"`
}

type SkillExecutor interface {
	ID() string
	Name() string
	Description() string
	Category() string
	Scan(asset AssetInfo) *SkillScanResult
}
