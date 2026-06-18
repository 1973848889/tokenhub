package injection

import (
	"regexp"
	"strings"

	"github.com/tokenhub/backend/internal/adapter"
)

type Detector struct {
	patterns []InjectionPattern
}

type InjectionPattern struct {
	Name    string
	Pattern *regexp.Regexp
	Score   float64
}

type InjectionResult struct {
	IsInjection bool
	Score       float64
	Triggers    []string
	Action      string
}

func NewDetector() *Detector {
	return &Detector{
		patterns: []InjectionPattern{
			{
				Name: "ignore_previous",
				Pattern: regexp.MustCompile(`(?i)(ignore|forget|disregard|override)\s+(all\s+)?(previous|above|prior|system)\s+(instructions?|prompts?|messages?)`),
				Score: 0.9,
			},
			{
				Name: "system_role_escape",
				Pattern: regexp.MustCompile(`(?i)(you\s+are\s+now|act\s+as|pretend\s+to\s+be).*?(new\s+role|new\s+identity)`),
				Score: 0.8,
			},
			{
				Name: "jailbreak_keywords",
				Pattern: regexp.MustCompile(`(?i)(DAN\s|jailbreak|developer\s*mode|god\s*mode|switch\s*roles)`),
				Score: 0.95,
			},
			{
				Name: "token_leak",
				Pattern: regexp.MustCompile(`(?i)(repeat|output|print|show|echo)\s+(your|the|system)\s+(prompt|instructions?|messages?)`),
				Score: 0.9,
			},
		},
	}
}

func (d *Detector) Detect(messages []adapter.Message) *InjectionResult {
	maxScore := 0.0
	triggers := make([]string, 0)

	for _, msg := range messages {
		for _, pattern := range d.patterns {
			if pattern.Pattern.MatchString(strings.ToLower(msg.Content)) {
				if pattern.Score > maxScore {
					maxScore = pattern.Score
				}
				triggers = append(triggers, pattern.Name)
			}
		}
	}

	action := "pass"
	if maxScore > 0.8 {
		action = "block"
	} else if maxScore > 0.5 {
		action = "review"
	}

	return &InjectionResult{
		IsInjection: maxScore > 0.7,
		Score:       maxScore,
		Triggers:    triggers,
		Action:      action,
	}
}
