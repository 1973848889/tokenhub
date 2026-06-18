package billing

import (
	"fmt"
	"math"
	"time"

	"github.com/tokenhub/backend/internal/adapter"
)

type PricingRepository interface {
	GetPricing(provider, model string) (*adapter.ModelPricing, error)
}

type CallEvent struct {
	EventID          string
	Timestamp        time.Time
	OrgID            string
	UserID           string
	DeptID           string
	ProjectID        string
	APIKeyID         string
	APIKeyPrefix     string
	RequestID        string
	Provider         string
	ModelName        string
	SceneTag         string
	PromptTokens     int64
	CompletionTokens int64
	TotalTokens      int64
	CacheHitTokens   int64
	InputCost        float64
	OutputCost       float64
	TotalCost        float64
	LatencyMs        int64
	TotalLatencyMs   int64
	StatusCode       int
	ErrorMessage     string
	RouteStrategy    string
	SafetyResult     string
	SafetyLabels     []string
}

type Engine struct {
	pricingRepo PricingRepository
}

func NewEngine(pricingRepo PricingRepository) *Engine {
	return &Engine{pricingRepo: pricingRepo}
}

func (e *Engine) CalculateCost(provider, modelName string, promptTokens, completionTokens, cacheHitTokens int64) (float64, float64, float64, error) {
	pricing, err := e.pricingRepo.GetPricing(provider, modelName)
	if err != nil {
		return 0, 0, 0, fmt.Errorf("get pricing: %w", err)
	}

	effectivePrompt := promptTokens - cacheHitTokens
	if effectivePrompt < 0 {
		effectivePrompt = 0
	}

	inputCost := float64(effectivePrompt) * pricing.InputPricePerToken
	outputCost := float64(completionTokens) * pricing.OutputPricePerToken

	if cacheHitTokens > 0 && pricing.FreeTokensPerMonth == 0 {
		inputCost += float64(cacheHitTokens) * pricing.InputPricePerToken * 0.3
	}

	totalCost := inputCost + outputCost
	totalCost = math.Round(totalCost*1e8) / 1e8
	inputCost = math.Round(inputCost*1e8) / 1e8
	outputCost = math.Round(outputCost*1e8) / 1e8

	return inputCost, outputCost, totalCost, nil
}
