package pii

import (
	"regexp"
	"strings"
)

type PIIRule struct {
	Type   string
	Action string
}

type PIIFinding struct {
	Type     string
	Position int
	Length   int
	Original string
	Action   string
}

type Detector struct {
	patterns map[string]*regexp.Regexp
}

func NewDetector() *Detector {
	return &Detector{
		patterns: map[string]*regexp.Regexp{
			"id_card":   regexp.MustCompile(`[1-9]\d{5}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]`),
			"phone":     regexp.MustCompile(`1[3-9]\d{9}`),
			"bank_card": regexp.MustCompile(`\b[1-9]\d{15,18}\b`),
			"email":     regexp.MustCompile(`[\w.\-]+@[\w\-]+\.[\w.]+`),
			"ip":        regexp.MustCompile(`\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}`),
		},
	}
}

func (d *Detector) Detect(text string) []PIIFinding {
	findings := make([]PIIFinding, 0)
	for piiType, pattern := range d.patterns {
		matches := pattern.FindAllStringIndex(text, -1)
		for _, match := range matches {
			findings = append(findings, PIIFinding{
				Type:     piiType,
				Position: match[0],
				Length:   match[1] - match[0],
				Original: text[match[0]:match[1]],
				Action:   "mask",
			})
		}
	}
	return findings
}

func (d *Detector) Mask(text string) (string, []PIIFinding) {
	findings := d.Detect(text)
	result := text

	for i := len(findings) - 1; i >= 0; i-- {
		f := findings[i]
		masked := doMask(f.Original, f.Type)
		result = result[:f.Position] + masked + result[f.Position+f.Length:]
	}

	return result, findings
}

func doMask(value string, piiType string) string {
	switch piiType {
	case "id_card":
		if len(value) >= 18 {
			return value[:6] + "********" + value[14:]
		}
		return "***"
	case "phone":
		if len(value) >= 11 {
			return value[:3] + "****" + value[7:]
		}
		return "***"
	case "bank_card":
		runes := []rune(value)
		if len(runes) >= 8 {
			return string(runes[:4]) + " **** **** " + string(runes[len(runes)-4:])
		}
		return "***"
	case "email":
		parts := strings.SplitN(value, "@", 2)
		if len(parts) == 2 && len(parts[0]) > 2 {
			return parts[0][:2] + "***@" + parts[1]
		}
		return "***@***"
	default:
		return "***"
	}
}
