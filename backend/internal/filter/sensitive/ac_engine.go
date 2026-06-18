package sensitive

import (
	"sync"
)

type SensitiveWord struct {
	Word     string
	Category string
	Level    string
	Action   string
}

type DetectionResult struct {
	Word     string
	Category string
	Level    string
	Action   string
	Position int
}

type ACEngine struct {
	words     []*SensitiveWord
	trie      *TrieNode
	mu        sync.RWMutex
}

type TrieNode struct {
	children map[rune]*TrieNode
	isEnd    bool
	word     *SensitiveWord
}

func NewACEngine() *ACEngine {
	return &ACEngine{
		trie: &TrieNode{children: make(map[rune]*TrieNode)},
	}
}

func (e *ACEngine) Load(words []*SensitiveWord) {
	e.mu.Lock()
	defer e.mu.Unlock()

	e.words = words
	e.trie = &TrieNode{children: make(map[rune]*TrieNode)}

	for _, w := range words {
		node := e.trie
		for _, ch := range w.Word {
			if node.children[ch] == nil {
				node.children[ch] = &TrieNode{children: make(map[rune]*TrieNode)}
			}
			node = node.children[ch]
		}
		node.isEnd = true
		node.word = w
	}
}

func (e *ACEngine) Reload(words []*SensitiveWord) {
	e.Load(words)
}

func (e *ACEngine) Detect(text string) []*DetectionResult {
	e.mu.RLock()
	defer e.mu.RUnlock()

	results := make([]*DetectionResult, 0)
	runes := []rune(text)

	for i := 0; i < len(runes); i++ {
		node := e.trie
		for j := i; j < len(runes); j++ {
			child, ok := node.children[runes[j]]
			if !ok {
				break
			}
			node = child
			if node.isEnd {
				results = append(results, &DetectionResult{
					Word:     node.word.Word,
					Category: node.word.Category,
					Level:    node.word.Level,
					Action:   node.word.Action,
					Position: i,
				})
				break
			}
		}
	}

	return results
}

func (e *ACEngine) GetAction(results []*DetectionResult) string {
	for _, r := range results {
		if r.Action == "block" {
			return "block"
		}
	}
	for _, r := range results {
		if r.Action == "mask" || r.Action == "warn" {
			return "warn"
		}
	}
	return "pass"
}
