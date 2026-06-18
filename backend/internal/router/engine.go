package router

import (
	"context"
	"fmt"
	"sort"
	"sync"

	"github.com/tokenhub/backend/internal/adapter"
)

type RouteRequest struct {
	ModelName    string
	Strategy     RouteStrategy
	DeptID       string
	BudgetLimit  float64
}

type RouteDecision struct {
	Adapter   adapter.ModelAdapter
	Fallbacks []adapter.ModelAdapter
	Reason    string
}

type RouteStrategy string

const (
	StrategyCostOptimized    RouteStrategy = "cost_optimized"
	StrategyQualityOptimized RouteStrategy = "quality_optimized"
	StrategyBalanced         RouteStrategy = "balanced"
)

type RoutingEngine struct {
	registry   *adapter.AdapterRegistry
	health     *HealthChecker
	mu         sync.RWMutex
}

func NewEngine(registry *adapter.AdapterRegistry) *RoutingEngine {
	e := &RoutingEngine{
		registry: registry,
		health:   NewHealthChecker(registry),
	}
	go e.health.Start(context.Background())
	return e
}

func (e *RoutingEngine) Route(ctx context.Context, req *RouteRequest) (*RouteDecision, error) {
	candidates := e.registry.List()

	available := make([]adapter.ModelAdapter, 0)
	for _, a := range candidates {
		if status := e.health.GetStatus(a.ProviderName() + ":" + a.ModelName()); status != nil && status.Available {
			available = append(available, a)
		}
	}

	if len(available) == 0 {
		return nil, fmt.Errorf("no available models")
	}

	switch req.Strategy {
	case StrategyCostOptimized:
		sort.Slice(available, func(i, j int) bool {
			pi := available[i].Pricing()
			pj := available[j].Pricing()
			return pi.InputPricePerToken+pi.OutputPricePerToken < pj.InputPricePerToken+pj.OutputPricePerToken
		})
	case StrategyQualityOptimized:
		sort.Slice(available, func(i, j int) bool {
			return available[i].Capabilities().MaxContextTokens > available[j].Capabilities().MaxContextTokens
		})
	}

	primary := available[0]
	fallbacks := available[1:]
	if len(fallbacks) > 3 {
		fallbacks = fallbacks[:3]
	}

	return &RouteDecision{
		Adapter:   primary,
		Fallbacks: fallbacks,
		Reason:    fmt.Sprintf("strategy=%s, available=%d", req.Strategy, len(available)),
	}, nil
}
