package config_test

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/tokenhub/backend/pkg/config"
)

func TestLoadDefaults(t *testing.T) {
	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "config.yaml")
	content := `server:
  port: 9090
  mode: release
`
	os.WriteFile(configPath, []byte(content), 0644)

	cfg, err := config.Load(configPath)
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.Server.Port != 9090 {
		t.Errorf("expected port=9090, got %d", cfg.Server.Port)
	}
	if cfg.Server.Mode != "release" {
		t.Errorf("expected mode=release, got %s", cfg.Server.Mode)
	}
}

func TestLoadDefaultsMissingFile(t *testing.T) {
	_, err := config.Load("/nonexistent/config.yaml")
	if err == nil {
		t.Error("expected error for missing file")
	}
}

func TestDefaults(t *testing.T) {
	cfg := &config.Config{}
	configPath := filepath.Join(t.TempDir(), "minimal.yaml")
	os.WriteFile(configPath, []byte("server:\n  port: 8080\n"), 0644)

	cfg, err := config.Load(configPath)
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.Database.Host != "localhost" {
		t.Errorf("expected default db host=localhost, got %s", cfg.Database.Host)
	}
	if cfg.Database.Port != 5432 {
		t.Errorf("expected default db port=5432, got %d", cfg.Database.Port)
	}
	if cfg.Redis.Addr != "localhost:6379" {
		t.Errorf("expected default redis addr=localhost:6379, got %s", cfg.Redis.Addr)
	}
	if cfg.JWT.ExpireHour != 24 {
		t.Errorf("expected default jwt expire=24, got %d", cfg.JWT.ExpireHour)
	}
}

func TestEnvOverride(t *testing.T) {
	os.Setenv("SERVER_PORT", "9999")
	defer os.Unsetenv("SERVER_PORT")

	tmpDir := t.TempDir()
	configPath := filepath.Join(tmpDir, "config.yaml")
	os.WriteFile(configPath, []byte("server:\n  port: 8080\n"), 0644)

	cfg, err := config.Load(configPath)
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	if cfg.Server.Port != 9999 {
		t.Errorf("expected env override port=9999, got %d", cfg.Server.Port)
	}
}
