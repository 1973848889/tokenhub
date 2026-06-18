package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	"github.com/tokenhub/backend/internal/adapter"
	"github.com/tokenhub/backend/internal/adapter/deepseek"
	"github.com/tokenhub/backend/internal/adapter/doubao"
	"github.com/tokenhub/backend/internal/adapter/glm"
	"github.com/tokenhub/backend/internal/adapter/kimi"
	"github.com/tokenhub/backend/internal/adapter/qwen"
	"github.com/tokenhub/backend/internal/adapter/zhipu"
	"github.com/tokenhub/backend/internal/gateway"
	"github.com/tokenhub/backend/internal/keygen"
	"github.com/tokenhub/backend/internal/ws"
	"github.com/tokenhub/backend/pkg/config"
)

func main() {
	cfg, err := config.Load("config/config.yaml")
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	redisClient := redis.NewClient(&redis.Options{
		Addr:     cfg.Redis.Addr,
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	})
	if err := redisClient.Ping(context.Background()).Err(); err != nil {
		log.Printf("WARNING: Redis not available: %v", err)
	} else {
		log.Println("Redis connected")
	}

	initAdapters()
	log.Println("Model adapters initialized")

	km := keygen.GetManager()
	km.SeedDemoKeys()
	log.Println("Demo API keys seeded")

	hub := ws.NewHub(redisClient)
	go hub.Run()
	log.Println("WebSocket Hub started")

	gin.SetMode(cfg.Server.Mode)
	r := gin.New()
	r.Use(gin.Recovery())

	gatewayHandler := gateway.NewHandler(cfg)
	gatewayHandler.RegisterRoutes(r)

	r.GET("/ws/dashboard", func(c *gin.Context) {
		hub.ServeWS(c.Writer, c.Request)
	})

	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Server.Port),
		Handler: r,
	}

	go func() {
		log.Printf("企业AI治理智能平台 Gateway starting on :%d", cfg.Server.Port)
		log.Printf("  Health: http://localhost:%d/health", cfg.Server.Port)
		log.Printf("  Chat:   http://localhost:%d/v1/chat/completions", cfg.Server.Port)
		log.Printf("  WS:     ws://localhost:%d/ws/dashboard", cfg.Server.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	hub.Shutdown()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Shutdown error: %v", err)
	}
	log.Println("企业AI治理智能平台 stopped")
}

func initAdapters() {
	registry := adapter.GetRegistry()

	deployBase := os.Getenv("DEPLOY_BASE_URL")
	if deployBase == "" {
		deployBase = "http://localhost:11434"
	}

	deepseekKey := os.Getenv("DEEPSEEK_API_KEY")
	if deepseekKey == "" {
		deepseekKey = "sk-placeholder"
	}
	deepseekBase := os.Getenv("DEEPSEEK_BASE_URL")
	if deepseekBase == "" {
		deepseekBase = "https://api.deepseek.com"
	}
	registry.Register("deepseek", "deepseek-chat", deepseek.New(deepseekBase, deepseekKey, "deepseek-chat"))
	registry.Register("deepseek", "deepseek-reasoner", deepseek.New(deepseekBase, deepseekKey, "deepseek-reasoner"))

	qwenKey := os.Getenv("QWEN_API_KEY")
	if qwenKey == "" {
		qwenKey = "sk-placeholder"
	}
	qwenBase := os.Getenv("QWEN_BASE_URL")
	if qwenBase == "" {
		qwenBase = "https://dashscope.aliyuncs.com/compatible-mode/v1"
	}
	registry.Register("qwen", "qwen-max", qwen.New(qwenBase, qwenKey, "qwen-max"))
	registry.Register("qwen", "qwen-plus", qwen.New(qwenBase, qwenKey, "qwen-plus"))

	doubaoKey := os.Getenv("DOUBAO_API_KEY")
	if doubaoKey == "" {
		doubaoKey = "sk-placeholder"
	}
	doubaoBase := os.Getenv("DOUBAO_BASE_URL")
	if doubaoBase == "" {
		doubaoBase = "https://ark.cn-beijing.volces.com/api/v3"
	}
	registry.Register("doubao", "doubao-pro-256k", doubao.New(doubaoBase, doubaoKey, "doubao-pro-256k"))

	glmKey := os.Getenv("GLM_API_KEY")
	if glmKey == "" {
		glmKey = "sk-placeholder"
	}
	glmBase := os.Getenv("GLM_BASE_URL")
	if glmBase == "" {
		glmBase = "https://open.bigmodel.cn/api/paas/v4"
	}
	registry.Register("glm", "glm-5", glm.New(glmBase, glmKey, "glm-5"))
	registry.Register("glm", "glm-5-flash", glm.New(glmBase, glmKey, "glm-5-flash"))

	kimiKey := os.Getenv("KIMI_API_KEY")
	if kimiKey == "" {
		kimiKey = "sk-placeholder"
	}
	kimiBase := os.Getenv("KIMI_BASE_URL")
	if kimiBase == "" {
		kimiBase = "https://api.moonshot.cn/v1"
	}
	registry.Register("kimi", "kimi-latest", kimi.New(kimiBase, kimiKey, "kimi-latest"))

	zhipuKey := os.Getenv("ZHIPU_API_KEY")
	if zhipuKey == "" {
		zhipuKey = "sk-placeholder"
	}
	zhipuBase := os.Getenv("ZHIPU_BASE_URL")
	if zhipuBase == "" {
		zhipuBase = "https://open.bigmodel.cn/api/paas/v4"
	}
	registry.Register("zhipu", "glm-4-plus", zhipu.New(zhipuBase, zhipuKey, "glm-4-plus"))

	log.Printf("Registered %d models", len(registry.List()))
}
