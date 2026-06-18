package config

import (
	"os"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Server     ServerConfig     `yaml:"server"`
	Database   DatabaseConfig   `yaml:"database"`
	Redis      RedisConfig      `yaml:"redis"`
	ClickHouse ClickHouseConfig `yaml:"clickhouse"`
	JWT        JWTConfig        `yaml:"jwt"`
}

type ServerConfig struct {
	Port int    `yaml:"port"`
	Mode string `yaml:"mode"`
}

type DatabaseConfig struct {
	Host     string `yaml:"host"`
	Port     int    `yaml:"port"`
	User     string `yaml:"user"`
	Password string `yaml:"password"`
	DBName   string `yaml:"dbname"`
	SSLMode  string `yaml:"sslmode"`
}

type RedisConfig struct {
	Addr     string `yaml:"addr"`
	Password string `yaml:"password"`
	DB       int    `yaml:"db"`
}

type ClickHouseConfig struct {
	Addr     string `yaml:"addr"`
	Database string `yaml:"database"`
	Username string `yaml:"username"`
	Password string `yaml:"password"`
}

type JWTConfig struct {
	Secret     string `yaml:"secret"`
	ExpireHour int    `yaml:"expire_hour"`
}

func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	cfg := &Config{}
	cfg.setDefaults()

	if err := yaml.Unmarshal(data, cfg); err != nil {
		return nil, err
	}

	cfg.applyEnvOverrides()
	return cfg, nil
}

func (c *Config) setDefaults() {
	c.Server.Port = 8080
	c.Server.Mode = "debug"
	c.Database.Host = "localhost"
	c.Database.Port = 5432
	c.Database.User = "tokenhub"
	c.Database.Password = "tokenhub"
	c.Database.DBName = "tokenhub"
	c.Database.SSLMode = "disable"
	c.Redis.Addr = "localhost:6379"
	c.Redis.DB = 0
	c.ClickHouse.Addr = "localhost:9000"
	c.ClickHouse.Database = "tokenhub"
	c.ClickHouse.Username = "default"
	c.JWT.Secret = "tokenhub-dev-secret-change-in-production"
	c.JWT.ExpireHour = 24
}

func (c *Config) applyEnvOverrides() {
	if v := os.Getenv("SERVER_PORT"); v != "" {
		c.Server.Port = parseInt(v)
	}
	if v := os.Getenv("DB_HOST"); v != "" {
		c.Database.Host = v
	}
	if v := os.Getenv("REDIS_ADDR"); v != "" {
		c.Redis.Addr = v
	}
	if v := os.Getenv("JWT_SECRET"); v != "" {
		c.JWT.Secret = v
	}
}

func parseInt(s string) int {
	n := 0
	for _, c := range s {
		if c >= '0' && c <= '9' {
			n = n*10 + int(c-'0')
		}
	}
	return n
}
