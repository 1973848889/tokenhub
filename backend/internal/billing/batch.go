package billing

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/go-redis/redis/v8"
)

type BatchWriter struct {
	redis      *redis.Client
	streamKey  string
	batchSize  int
	flushEvery time.Duration
	buffer     []*CallEvent
	mu         sync.Mutex
}

func NewBatchWriter(redisClient *redis.Client) *BatchWriter {
	w := &BatchWriter{
		redis:      redisClient,
		streamKey:  "stream:billing:events",
		batchSize:  100,
		flushEvery: 5 * time.Second,
		buffer:     make([]*CallEvent, 0, 100),
	}
	go w.periodicFlush()
	return w
}

func (w *BatchWriter) Append(event *CallEvent) {
	w.mu.Lock()
	w.buffer = append(w.buffer, event)
	if len(w.buffer) >= w.batchSize {
		w.flush()
	}
	w.mu.Unlock()
}

func (w *BatchWriter) periodicFlush() {
	ticker := time.NewTicker(w.flushEvery)
	defer ticker.Stop()
	for range ticker.C {
		w.mu.Lock()
		w.flush()
		w.mu.Unlock()
	}
}

func (w *BatchWriter) flush() {
	if len(w.buffer) == 0 {
		return
	}
	batch := w.buffer
	w.buffer = make([]*CallEvent, 0, w.batchSize)

	ctx := context.Background()
	pipe := w.redis.Pipeline()
	for _, event := range batch {
		payload := fmt.Sprintf(
			`{"event_id":"%s","timestamp":"%s","org_id":"%s","user_id":"%s","dept_id":"%s","api_key_id":"%s","api_key_prefix":"%s","provider":"%s","model_name":"%s","scene_tag":"%s","prompt_tokens":%d,"completion_tokens":%d,"total_tokens":%d,"cache_hit_tokens":%d,"input_cost":%f,"output_cost":%f,"total_cost":%f,"latency_ms":%d,"total_latency_ms":%d,"status_code":%d,"error_message":"%s","route_strategy":"%s","safety_result":"%s"}`,
			event.EventID, event.Timestamp.Format(time.RFC3339Nano),
			event.OrgID, event.UserID, event.DeptID,
			event.APIKeyID, event.APIKeyPrefix,
			event.Provider, event.ModelName, event.SceneTag,
			event.PromptTokens, event.CompletionTokens, event.TotalTokens,
			event.CacheHitTokens,
			event.InputCost, event.OutputCost, event.TotalCost,
			event.LatencyMs, event.TotalLatencyMs,
			event.StatusCode, event.ErrorMessage,
			event.RouteStrategy, event.SafetyResult,
		)
		pipe.XAdd(ctx, &redis.XAddArgs{
			Stream: w.streamKey,
			Values: map[string]interface{}{"data": payload},
		})
	}
	if _, err := pipe.Exec(ctx); err != nil {
		log.Printf("[BatchWriter] Flush error: %v", err)
		return
	}
	log.Printf("[BatchWriter] Flushed %d events to Redis Stream", len(batch))
}
