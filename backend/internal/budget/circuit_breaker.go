package budget

import (
	"context"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
)

type CircuitBreaker struct {
	redis *redis.Client
}

func NewCircuitBreaker(redisClient *redis.Client) *CircuitBreaker {
	return &CircuitBreaker{redis: redisClient}
}

type BreakerStatus string

const (
	StateNormal    BreakerStatus = "normal"
	StateThrottled BreakerStatus = "throttled"
	StateBlocked   BreakerStatus = "blocked"
)

func (cb *CircuitBreaker) CheckAndUpdate(ctx context.Context, keyID string, currentDailyCost, dailyBudget float64) BreakerStatus {
	if dailyBudget <= 0 {
		return StateNormal
	}

	usageRate := currentDailyCost / dailyBudget
	key := fmt.Sprintf("breaker:%s", keyID)

	switch {
	case usageRate >= 1.0:
		cb.redis.Set(ctx, key, string(StateBlocked), 24*time.Hour)
		return StateBlocked
	case usageRate >= 0.9:
		cb.redis.Set(ctx, key, string(StateThrottled), 1*time.Hour)
		return StateThrottled
	case usageRate >= 0.8:
		cb.redis.Set(ctx, key, string(StateThrottled), 1*time.Hour)
		return StateThrottled
	default:
		cb.redis.Del(ctx, key)
		return StateNormal
	}
}

func (cb *CircuitBreaker) GetStatus(ctx context.Context, keyID string) BreakerStatus {
	key := fmt.Sprintf("breaker:%s", keyID)
	val, err := cb.redis.Get(ctx, key).Result()
	if err != nil {
		return StateNormal
	}
	return BreakerStatus(val)
}

func (cb *CircuitBreaker) GetThrottleRate(status BreakerStatus) float64 {
	switch status {
	case StateBlocked:
		return 0
	case StateThrottled:
		return 0.1
	default:
		return 1.0
	}
}
