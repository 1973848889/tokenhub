package budget

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/go-redis/redis/v8"
)

type AgentGuard struct {
	redis *redis.Client
}

func NewAgentGuard(redisClient *redis.Client) *AgentGuard {
	return &AgentGuard{redis: redisClient}
}

type AnomalyRule struct {
	Name           string
	WindowDuration time.Duration
	Threshold      float64
}

var defaultRules = []AnomalyRule{
	{Name: "cost_spike", WindowDuration: 5 * time.Minute, Threshold: 500},
	{Name: "loop_detection", WindowDuration: 1 * time.Minute, Threshold: 50},
	{Name: "same_prompt_loop", WindowDuration: 5 * time.Minute, Threshold: 10},
}

type AnomalyAlert struct {
	Rule      string
	KeyID     string
	Message   string
	Timestamp time.Time
}

func (g *AgentGuard) Check(ctx context.Context, keyID string, cost float64, promptHash string) ([]*AnomalyAlert, error) {
	alerts := make([]*AnomalyAlert, 0)
	now := time.Now()

	for _, rule := range defaultRules {
		alert, err := g.checkRule(ctx, &rule, keyID, cost, promptHash, now)
		if err != nil {
			continue
		}
		if alert != nil {
			alerts = append(alerts, alert)
		}
	}

	return alerts, nil
}

func (g *AgentGuard) checkRule(ctx context.Context, rule *AnomalyRule, keyID string, cost float64, promptHash string, now time.Time) (*AnomalyAlert, error) {
	switch rule.Name {
	case "cost_spike":
		key := fmt.Sprintf("agent:cost_spike:%s", keyID)
		windowStart := now.Add(-rule.WindowDuration)
		g.redis.ZAdd(ctx, key, &redis.Z{Score: float64(now.UnixNano()), Member: fmt.Sprintf("%f", cost)})
		g.redis.ZRemRangeByScore(ctx, key, "0", fmt.Sprintf("%d", windowStart.UnixNano()))

		members, _ := g.redis.ZRangeByScoreWithScores(ctx, key, &redis.ZRangeBy{
			Min: fmt.Sprintf("%d", windowStart.UnixNano()),
			Max: "+inf",
		}).Result()

		totalCost := 0.0
		for _, m := range members {
			if v, err := parseFloat(m.Member); err == nil {
				totalCost += v
			}
		}

		if totalCost > rule.Threshold {
			g.redis.Set(ctx, fmt.Sprintf("breaker:%s", keyID), string(StateBlocked), 30*time.Minute)
			return &AnomalyAlert{
				Rule: rule.Name, KeyID: keyID,
				Message:   fmt.Sprintf("5分钟内花费%.2f元，触发阻断", totalCost),
				Timestamp: now,
			}, nil
		}

	case "loop_detection":
		key := fmt.Sprintf("agent:call_count:%s", keyID)
		count, err := g.redis.Incr(ctx, key).Result()
		if err != nil {
			return nil, err
		}
		g.redis.Expire(ctx, key, rule.WindowDuration)
		if float64(count) > rule.Threshold {
			return &AnomalyAlert{
				Rule:      rule.Name,
				KeyID:     keyID,
				Message:   fmt.Sprintf("1分钟内调用%d次，触发限速", count),
				Timestamp: now,
			}, nil
		}

	case "same_prompt_loop":
		if promptHash == "" {
			return nil, nil
		}
		key := fmt.Sprintf("agent:prompt:%s:%s", keyID, promptHash)
		count, err := g.redis.Incr(ctx, key).Result()
		if err != nil {
			return nil, err
		}
		g.redis.Expire(ctx, key, rule.WindowDuration)
		if float64(count) > rule.Threshold {
			g.redis.Set(ctx, fmt.Sprintf("breaker:%s", keyID), string(StateBlocked), 15*time.Minute)
			return &AnomalyAlert{
				Rule:      rule.Name,
				KeyID:     keyID,
				Message:   "相同提示词重复过多，可能存在死循环，已阻断",
				Timestamp: now,
			}, nil
		}
	}
	return nil, nil
}

func parseFloat(s interface{}) (float64, error) {
	switch v := s.(type) {
	case string:
		return 0, fmt.Errorf("unexpected string")
	case float64:
		return v, nil
	default:
		return 0, fmt.Errorf("unknown type")
	}
}

var _ = math.Abs(0)
