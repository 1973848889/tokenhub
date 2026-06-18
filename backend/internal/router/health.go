package router

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/tokenhub/backend/internal/adapter"
)

type HealthChecker struct {
	registry *adapter.AdapterRegistry
	mu       sync.RWMutex
	statuses map[string]*adapter.HealthStatus
}

func NewHealthChecker(registry *adapter.AdapterRegistry) *HealthChecker {
	return &HealthChecker{
		registry: registry,
		statuses: make(map[string]*adapter.HealthStatus),
	}
}

func (h *HealthChecker) GetStatus(key string) *adapter.HealthStatus {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.statuses[key]
}

func (h *HealthChecker) Start(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			h.checkAll(ctx)
		}
	}
}

func (h *HealthChecker) checkAll(ctx context.Context) {
	adapters := h.registry.List()
	for _, a := range adapters {
		key := a.ProviderName() + ":" + a.ModelName()
		start := time.Now()
		err := a.HealthCheck(ctx)
		latency := time.Since(start)

		h.mu.Lock()
		status, ok := h.statuses[key]
		if !ok {
			status = &adapter.HealthStatus{Available: true}
			h.statuses[key] = status
		}

		if err != nil {
			status.ConsecutiveFails++
			if status.ConsecutiveFails >= 3 {
				status.Available = false
			}
			log.Printf("[Health] %s check failed: %v (fails=%d)", key, err, status.ConsecutiveFails)
		} else {
			status.Available = true
			status.ConsecutiveFails = 0
			status.LatencyP95 = latency
		}
		status.LastChecked = time.Now()
		h.mu.Unlock()
	}
}
