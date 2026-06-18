package adapter

import (
	"fmt"
	"sync"
)

type AdapterRegistry struct {
	mu       sync.RWMutex
	adapters map[string]ModelAdapter
}

var globalRegistry = &AdapterRegistry{
	adapters: make(map[string]ModelAdapter),
}

func GetRegistry() *AdapterRegistry {
	return globalRegistry
}

func (r *AdapterRegistry) Register(provider, model string, adapter ModelAdapter) {
	r.mu.Lock()
	defer r.mu.Unlock()
	key := fmt.Sprintf("%s:%s", provider, model)
	r.adapters[key] = adapter
}

func (r *AdapterRegistry) Get(provider, model string) (ModelAdapter, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	key := fmt.Sprintf("%s:%s", provider, model)
	a, ok := r.adapters[key]
	return a, ok
}

func (r *AdapterRegistry) List() []ModelAdapter {
	r.mu.RLock()
	defer r.mu.RUnlock()
	result := make([]ModelAdapter, 0, len(r.adapters))
	for _, a := range r.adapters {
		result = append(result, a)
	}
	return result
}

func (r *AdapterRegistry) FindByName(modelName string) (ModelAdapter, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for key, a := range r.adapters {
		if key == modelName {
			return a, true
		}
	}
	return nil, false
}

func (r *AdapterRegistry) ListModels() []map[string]interface{} {
	r.mu.RLock()
	defer r.mu.RUnlock()
	models := make([]map[string]interface{}, 0, len(r.adapters))
	for key, a := range r.adapters {
		caps := a.Capabilities()
		models = append(models, map[string]interface{}{
			"id":              key,
			"object":          "model",
			"owned_by":        a.ProviderName(),
			"max_context":     caps.MaxContextTokens,
			"max_output":      caps.MaxOutputTokens,
			"supports_stream": caps.SupportsStreaming,
		})
	}
	return models
}
