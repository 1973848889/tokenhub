package budget_test

import (
	"context"
	"testing"

	"github.com/go-redis/redis/v8"
	"github.com/tokenhub/backend/internal/budget"
)

func setupRedis(t *testing.T) *redis.Client {
	t.Helper()
	rdb := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	_, err := rdb.Ping(context.Background()).Result()
	if err != nil {
		t.Skip("Redis not available, skipping budget tests")
	}
	return rdb
}

func TestCheckBudgetPass(t *testing.T) {
	rdb := setupRedis(t)
	ctrl := budget.NewController(rdb)

	req := &budget.BudgetCheckRequest{
		APIKeyID:         "test-key-001",
		UserID:           "test-user-001",
		OrgID:            "test-org-001",
		EstimatedCost:    1.0,
		KeyDailyBudget:   100.0,
		UserDailyBudget:  500.0,
		OrgMonthlyBudget: 10000.0,
	}

	result, err := ctrl.CheckBudget(context.Background(), req)
	if err != nil {
		t.Fatalf("CheckBudget() error = %v", err)
	}
	if !result.Allowed {
		t.Error("should allow within budget")
	}
	if result.Action != "pass" {
		t.Errorf("expected pass, got %s", result.Action)
	}
}

func TestCheckBudgetKeyExceeded(t *testing.T) {
	rdb := setupRedis(t)
	ctrl := budget.NewController(rdb)

	keyID := "test-key-exceeded"
	day := "2026-06-01"

	rdb.HSet(context.Background(), "usage:key:"+keyID+":daily:"+day, "total_cost", 95.0)

	req := &budget.BudgetCheckRequest{
		APIKeyID:        keyID,
		UserID:          "test-user-002",
		OrgID:           "test-org-002",
		EstimatedCost:   10.0,
		KeyDailyBudget:  100.0,
		UserDailyBudget: 500.0,
	}

	result, err := ctrl.CheckBudget(context.Background(), req)
	if err != nil {
		t.Fatalf("CheckBudget() error = %v", err)
	}
	if result.Allowed {
		t.Error("should block when over key budget")
	}
	if result.Action != "block" {
		t.Errorf("expected block, got %s", result.Action)
	}

	rdb.Del(context.Background(), "usage:key:"+keyID+":daily:"+day)
}

func TestCircuitBreaker(t *testing.T) {
	rdb := setupRedis(t)
	cb := budget.NewCircuitBreaker(rdb)

	status := cb.CheckAndUpdate(context.Background(), "test-key-cb", 50, 100)
	if status != budget.StateNormal {
		t.Errorf("50%% usage should be normal, got %s", status)
	}

	status = cb.CheckAndUpdate(context.Background(), "test-key-cb", 85, 100)
	if status != budget.StateThrottled {
		t.Errorf("85%% usage should be throttled, got %s", status)
	}

	status = cb.CheckAndUpdate(context.Background(), "test-key-cb", 100, 100)
	if status != budget.StateBlocked {
		t.Errorf("100%% usage should be blocked, got %s", status)
	}
}

func TestCircuitBreakerGetStatus(t *testing.T) {
	rdb := setupRedis(t)
	cb := budget.NewCircuitBreaker(rdb)

	cb.CheckAndUpdate(context.Background(), "test-key-status", 50, 100)
	status := cb.GetStatus(context.Background(), "test-key-status")
	if status != budget.StateNormal {
		t.Errorf("expected normal, got %s", status)
	}
}

func TestCircuitBreakerThrottleRate(t *testing.T) {
	cb := budget.NewCircuitBreaker(nil)

	if rate := cb.GetThrottleRate(budget.StateNormal); rate != 1.0 {
		t.Errorf("normal rate should be 1.0, got %f", rate)
	}
	if rate := cb.GetThrottleRate(budget.StateThrottled); rate != 0.1 {
		t.Errorf("throttled rate should be 0.1, got %f", rate)
	}
	if rate := cb.GetThrottleRate(budget.StateBlocked); rate != 0 {
		t.Errorf("blocked rate should be 0, got %f", rate)
	}
}
