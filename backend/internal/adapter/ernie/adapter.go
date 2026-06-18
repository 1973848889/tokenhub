package ernie

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/tokenhub/backend/internal/adapter"
)

type Adapter struct {
	baseURL, apiKey, modelName string
	httpClient                 *http.Client
}

func New(baseURL, apiKey, modelName string) *Adapter {
	return &Adapter{baseURL: baseURL, apiKey: apiKey, modelName: modelName, httpClient: &http.Client{Timeout: 120 * time.Second, Transport: &http.Transport{MaxIdleConns: 100, MaxIdleConnsPerHost: 20, IdleConnTimeout: 90 * time.Second}}}
}

func (a *Adapter) ProviderName() string                               { return "ernie" }
func (a *Adapter) ModelName() string                                  { return a.modelName }
func (a *Adapter) Capabilities() adapter.Capabilities                 { return adapter.Capabilities{SupportsStreaming: true, SupportsVision: false, SupportsToolCalling: true, MaxContextTokens: 32768, MaxOutputTokens: 4096} }
func (a *Adapter) Pricing() *adapter.ModelPricing                     { return &adapter.ModelPricing{InputPricePerToken: 0.000002, OutputPricePerToken: 0.000006, Currency: "CNY"} }
func (a *Adapter) HealthCheck(ctx context.Context) error              { return nil }

func (a *Adapter) ChatCompletion(ctx context.Context, req *adapter.ChatRequest) (*adapter.ChatResponse, error) {
	return a.doRequest(ctx, req, false)
}

func (a *Adapter) ChatCompletionStream(ctx context.Context, req *adapter.ChatRequest) (<-chan *adapter.StreamChunk, error) {
	resp, err := a.doHTTP(ctx, req, true)
	if err != nil {
		return nil, err
	}
	ch := make(chan *adapter.StreamChunk, 100)
	go func() {
		defer close(ch)
		defer resp.Body.Close()
		scanner := bufio.NewScanner(resp.Body)
		scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
		for scanner.Scan() {
			line := scanner.Text()
			if !strings.HasPrefix(line, "data: ") {
				continue
			}
			data := strings.TrimPrefix(line, "data: ")
			if data == "[DONE]" {
				return
			}
			var chunk adapter.StreamChunk
			if err := json.Unmarshal([]byte(data), &chunk); err == nil {
				ch <- &chunk
			}
		}
	}()
	return ch, nil
}

func (a *Adapter) doRequest(ctx context.Context, req *adapter.ChatRequest, stream bool) (*adapter.ChatResponse, error) {
	resp, err := a.doHTTP(ctx, req, stream)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("ernie api error %d: %s", resp.StatusCode, string(body))
	}
	var chatResp adapter.ChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	return &chatResp, nil
}

func (a *Adapter) doHTTP(ctx context.Context, req *adapter.ChatRequest, stream bool) (*http.Response, error) {
	body := map[string]interface{}{"model": a.modelName, "messages": req.Messages, "stream": stream}
	if req.MaxTokens > 0 { body["max_tokens"] = req.MaxTokens }
	if req.Temperature > 0 { body["temperature"] = req.Temperature }
	payload, _ := json.Marshal(body)
	httpReq, _ := http.NewRequestWithContext(ctx, "POST", a.baseURL+"/v1/chat/completions", bytes.NewReader(payload))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+a.apiKey)
	return a.httpClient.Do(httpReq)
}
