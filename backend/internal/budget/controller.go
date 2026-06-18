package budget

import (
	"context"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
)

type Controller struct {
	redis *redis.Client
}

func NewController(redisClient *redis.Client) *Controller {
	return &Controller{redis: redisClient}
}

type BudgetCheckRequest struct {
	APIKeyID         string
	UserID           string
	OrgID            string
	DeptID           string
	EstimatedCost    float64
	KeyDailyBudget   float64
	UserDailyBudget  float64
	OrgMonthlyBudget float64
}

type BudgetCheckResult struct {
	Allowed bool
	Action  string
	Reason  string
}

func (c *Controller) CheckBudget(ctx context.Context, req *BudgetCheckRequest) (*BudgetCheckResult, error) {
	today := time.Now().UTC().Format("2006-01-02")

	script := `
		local function check_level(key, cost, limit)
			if tonumber(limit) <= 0 then return 1 end
			local current = redis.call('HGET', key, 'total_cost')
			if not current then return 1 end
			current = tonumber(current)
			if current + cost > limit then
				return 0
			end
			return 1
		end

		local today = ARGV[1]
		local keyID = ARGV[2]
		local userID = ARGV[3]
		local orgID = ARGV[4]
		local cost = tonumber(ARGV[5])
		local keyBudget = tonumber(ARGV[6])
		local userBudget = tonumber(ARGV[7])
		local orgBudget = tonumber(ARGV[8])

		if keyBudget > 0 and check_level('usage:key:' .. keyID .. ':daily:' .. today, cost, keyBudget) == 0 then
			return {'block', 'api_key_budget_exceeded'}
		end
		if userBudget > 0 and check_level('usage:user:' .. userID .. ':daily:' .. today, cost, userBudget) == 0 then
			return {'alert', 'user_budget_exceeded'}
		end
		if orgBudget > 0 and check_level('usage:org:' .. orgID .. ':monthly:' .. today, cost, orgBudget) == 0 then
			return {'block', 'org_budget_exceeded'}
		end

		return {'pass', ''}
	`

	result, err := c.redis.Eval(ctx, script, []string{},
		today,
		req.APIKeyID,
		req.UserID,
		req.OrgID,
		fmt.Sprintf("%f", req.EstimatedCost),
		fmt.Sprintf("%f", req.KeyDailyBudget),
		fmt.Sprintf("%f", req.UserDailyBudget),
		fmt.Sprintf("%f", req.OrgMonthlyBudget),
	).Result()

	if err != nil {
		return nil, fmt.Errorf("check budget: %w", err)
	}

	parts := result.([]interface{})
	return &BudgetCheckResult{
		Allowed: parts[0].(string) != "block",
		Action:  parts[0].(string),
		Reason:  parts[1].(string),
	}, nil
}
