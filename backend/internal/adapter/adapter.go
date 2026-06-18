package adapter

import (
	"context"
	"time"
)

type ModelAdapter interface {
	ProviderName() string
	ModelName() string
	ChatCompletion(ctx context.Context, req *ChatRequest) (*ChatResponse, error)
	ChatCompletionStream(ctx context.Context, req *ChatRequest) (<-chan *StreamChunk, error)
	Capabilities() Capabilities
	Pricing() *ModelPricing
	HealthCheck(ctx context.Context) error
}

type ChatRequest struct {
	Model       string          `json:"model"`
	Messages    []Message       `json:"messages"`
	Stream      bool            `json:"stream,omitempty"`
	MaxTokens   int             `json:"max_tokens,omitempty"`
	Temperature float64         `json:"temperature,omitempty"`
	TopP        float64         `json:"top_p,omitempty"`
	Tools       []ToolDef       `json:"tools,omitempty"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ToolDef struct {
	Type     string       `json:"type"`
	Function FunctionDef  `json:"function"`
}

type FunctionDef struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters,omitempty"`
}

type ChatResponse struct {
	ID      string      `json:"id"`
	Object  string      `json:"object"`
	Model   string      `json:"model"`
	Choices []Choice    `json:"choices"`
	Usage   ChatUsage   `json:"usage"`
}

type Choice struct {
	Index        int     `json:"index"`
	Message      Message `json:"message"`
	FinishReason string  `json:"finish_reason"`
}

type ChatUsage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

type StreamChunk struct {
	ID      string          `json:"id"`
	Object  string          `json:"object"`
	Model   string          `json:"model"`
	Choices []StreamChoice  `json:"choices"`
	Usage   *ChatUsage      `json:"usage,omitempty"`
}

type StreamChoice struct {
	Index        int              `json:"index"`
	Delta        StreamDelta      `json:"delta"`
	FinishReason string           `json:"finish_reason"`
}

type StreamDelta struct {
	Role    string `json:"role,omitempty"`
	Content string `json:"content,omitempty"`
}

type Capabilities struct {
	SupportsStreaming   bool
	SupportsVision      bool
	SupportsToolCalling bool
	MaxContextTokens    int
	MaxOutputTokens     int
}

type ModelPricing struct {
	InputPricePerToken  float64 `json:"input_price_per_token"`
	OutputPricePerToken float64 `json:"output_price_per_token"`
	Currency            string  `json:"currency"`
	FreeTokensPerMonth  int64   `json:"free_tokens_per_month"`
}

type HealthStatus struct {
	Available        bool          `json:"available"`
	LatencyP50       time.Duration `json:"latency_p50"`
	LatencyP95       time.Duration `json:"latency_p95"`
	ErrorRate        float64       `json:"error_rate"`
	LastChecked      time.Time     `json:"last_checked"`
	ConsecutiveFails int           `json:"consecutive_fails"`
}
