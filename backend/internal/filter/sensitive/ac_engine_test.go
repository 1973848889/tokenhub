package sensitive_test

import (
	"testing"

	"github.com/tokenhub/backend/internal/filter/sensitive"
)

func TestACEngineLoadAndDetect(t *testing.T) {
	engine := sensitive.NewACEngine()
	words := []*sensitive.SensitiveWord{
		{Word: "敏感词", Category: "political", Level: "block", Action: "block"},
		{Word: "测试", Category: "test", Level: "warn", Action: "mask"},
		{Word: "暴力", Category: "violence", Level: "block", Action: "block"},
	}
	engine.Load(words)

	tests := []struct {
		name         string
		text         string
		minResults   int
		wantAction   string
	}{
		{
			name:       "detect single sensitive word",
			text:       "这是敏感词汇总检索测试",
			minResults: 1,
			wantAction: "block",
		},
		{
			name:       "detect multiple sensitive words",
			text:       "敏感词和暴力内容都需要检测",
			minResults: 2,
			wantAction: "block",
		},
		{
			name:       "no sensitive words",
			text:       "这是普通文本内容",
			minResults: 0,
			wantAction: "pass",
		},
		{
			name:       "detect test word with mask action",
			text:       "这是一条测试文本",
			minResults: 1,
			wantAction: "warn",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			results := engine.Detect(tt.text)
			if len(results) < tt.minResults {
				t.Errorf("Detect(%q) got %d results, want >= %d", tt.text, len(results), tt.minResults)
			}
			action := engine.GetAction(results)
			if action != tt.wantAction {
				t.Errorf("GetAction() = %s, want %s", action, tt.wantAction)
			}
		})
	}
}

func TestACEngineEmpty(t *testing.T) {
	engine := sensitive.NewACEngine()
	results := engine.Detect("任意文本")
	if len(results) != 0 {
		t.Errorf("empty engine should produce no results, got %d", len(results))
	}
	action := engine.GetAction(results)
	if action != "pass" {
		t.Errorf("empty engine should return pass, got %s", action)
	}
}

func TestACEngineReload(t *testing.T) {
	engine := sensitive.NewACEngine()
	words1 := []*sensitive.SensitiveWord{
		{Word: "旧词", Category: "old", Level: "block", Action: "block"},
	}
	engine.Load(words1)

	r1 := engine.Detect("包含旧词的文本")
	if len(r1) == 0 {
		t.Error("should detect old word before reload")
	}

	words2 := []*sensitive.SensitiveWord{
		{Word: "新词", Category: "new", Level: "block", Action: "block"},
	}
	engine.Reload(words2)

	r2 := engine.Detect("包含旧词的文本")
	if len(r2) > 0 {
		t.Error("should not detect old word after reload")
	}

	r3 := engine.Detect("包含新词的文本")
	if len(r3) == 0 {
		t.Error("should detect new word after reload")
	}
}

func TestACEngineChinese(t *testing.T) {
	engine := sensitive.NewACEngine()
	words := []*sensitive.SensitiveWord{
		{Word: "赌博", Category: "gambling", Level: "block", Action: "block"},
		{Word: "涉黄", Category: "porn", Level: "block", Action: "block"},
	}
	engine.Load(words)

	results := engine.Detect("网络赌博严重危害社会，打击涉黄平台")
	if len(results) != 2 {
		t.Errorf("expected 2 results for Chinese text, got %d", len(results))
	}
}

func TestGetActionPriority(t *testing.T) {
	engine := sensitive.NewACEngine()
	words := []*sensitive.SensitiveWord{
		{Word: "block词", Category: "high", Level: "block", Action: "block"},
		{Word: "mask词", Category: "low", Level: "warn", Action: "mask"},
	}
	engine.Load(words)

	results := engine.Detect("包含mask词和block词的测试")
	action := engine.GetAction(results)
	if action != "block" {
		t.Errorf("block should have priority over mask, got %s", action)
	}

	results2 := engine.Detect("包含mask词")
	action2 := engine.GetAction(results2)
	if action2 != "warn" {
		t.Errorf("mask-only should return warn, got %s", action2)
	}
}
