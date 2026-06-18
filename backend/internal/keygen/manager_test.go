package keygen_test

import (
	"strings"
	"testing"

	"github.com/tokenhub/backend/internal/keygen"
)

func TestCreateKey(t *testing.T) {
	km := keygen.NewKeyManager()
	req := &keygen.CreateKeyRequest{
		Name:         "测试Key",
		UserID:       "user-001",
		OrgID:        "org-001",
		DeptID:       "dept-001",
		DailyBudget:  100,
		RateLimitRPM: 60,
	}

	key, err := km.CreateKey(req)
	if err != nil {
		t.Fatalf("CreateKey() error = %v", err)
	}

	if key.APIKey == "" {
		t.Error("api key should not be empty")
	}
	if !strings.HasPrefix(key.APIKey, "sk-tok-") {
		t.Errorf("api key should start with sk-tok-, got %s", key.APIKey)
	}
	if key.KeyPrefix == "" {
		t.Error("key prefix should not be empty")
	}
	if key.ID == "" {
		t.Error("key ID should not be empty")
	}
}

func TestCreateKeyUniqueness(t *testing.T) {
	km := keygen.NewKeyManager()
	keys := make(map[string]bool)
	for i := 0; i < 10; i++ {
		key, err := km.CreateKey(&keygen.CreateKeyRequest{
			Name:   "test",
			UserID: "user-001",
			OrgID:  "org-001",
			DeptID: "dept-001",
		})
		if err != nil {
			t.Fatalf("CreateKey() error = %v", err)
		}
		if keys[key.APIKey] {
			t.Errorf("duplicate key generated: %s", key.APIKey)
		}
		keys[key.APIKey] = true
	}
}

func TestHashKey(t *testing.T) {
	km := keygen.NewKeyManager()
	hash1 := km.HashKey("sk-tok-test-key-12345")
	hash2 := km.HashKey("sk-tok-test-key-12345")
	hash3 := km.HashKey("sk-tok-different-key")

	if hash1 != hash2 {
		t.Error("same key should produce same hash")
	}
	if hash1 == hash3 {
		t.Error("different keys should produce different hashes")
	}
	if len(hash1) != 64 {
		t.Errorf("SHA256 hash should be 64 chars, got %d", len(hash1))
	}
}

func TestKeyPrefixLength(t *testing.T) {
	km := keygen.NewKeyManager()
	key, _ := km.CreateKey(&keygen.CreateKeyRequest{
		Name:   "test",
		UserID: "user-001",
		OrgID:  "org-001",
		DeptID: "dept-001",
	})

	if len(key.KeyPrefix) != 11 {
		t.Errorf("key prefix should be 11 chars (sk-tok-xxxxx), got %d: %s", len(key.KeyPrefix), key.KeyPrefix)
	}
}
