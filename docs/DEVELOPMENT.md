# 企业AI治理智能平台 — 开发文档

## 一、项目概述

### 1.1 产品定位

企业AI治理智能平台是一个面向企业客户的 AI 应用与治理中台，提供模型聚合接入、预算管控、安全过滤、合规审计、Agent 分析、智能体市场等全栈能力。

### 1.2 技术栈

| 层次 | 技术 | 版本 |
|------|------|------|
| 后端语言 | Go | 1.22+ |
| 后端框架 | Gin | v1.10 |
| 前端框架 | React / Next.js | 19 / 15 |
| UI 库 | Ant Design | 5.x |
| 图表 | Recharts | 2.x |
| 状态管理 | Zustand + React Query | — |
| 数据库 | PostgreSQL + ClickHouse + Redis | — |
| 测试 | Go test / Vitest / Playwright | — |

### 1.3 项目结构

```
Tokenhub/
├── backend/                    # Go 后端
│   ├── cmd/gateway/main.go     # 入口文件
│   ├── internal/
│   │   ├── adapter/            # 8个模型适配器 (deepseek/qwen/doubao/glm/kimi/ernie/hunyuan/zhipu)
│   │   ├── agent/              # Agent 分析服务
│   │   ├── billing/            # 计费引擎 + 批量写入
│   │   ├── budget/             # 预算管控 + 熔断 + Agent防护
│   │   ├── compliance/         # 合规报告生成
│   │   ├── dashboard/          # 仪表盘数据查询
│   │   ├── filter/             # 内容安全 (敏感词/PII/注入检测)
│   │   ├── gateway/            # HTTP 处理器 + 中间件 + 路由
│   │   ├── keygen/             # API Key 管理
│   │   ├── marketplace/        # 智能体市场 (专家/技能/连接器)
│   │   ├── organization/       # 组织/部门/用户管理
│   │   ├── router/             # 智能路由 + 健康检查 + 模型推荐
│   │   ├── sandbox/            # 沙箱管理
│   │   ├── security/           # 安全网关 + 访问控制
│   │   └── ws/                 # WebSocket Hub
│   ├── pkg/                    # 公共库
│   ├── config/config.yaml      # 配置文件
│   └── migrations/             # 数据库迁移
│
├── web/                        # React 前端
│   ├── src/app/                # Next.js App Router 页面
│   │   ├── (dashboard)/        # 仪表盘路由组
│   │   │   ├── dashboard/      # 仪表盘
│   │   │   ├── billing/        # 账单分析 (含Agent排行榜分页)
│   │   │   ├── api-keys/       # API Key 管理
│   │   │   ├── models/         # 模型推荐
│   │   │   ├── model-aggregation/  # 模型聚合
│   │   │   ├── model-management/   # 模型管理
│   │   │   ├── safety/         # 运营安全
│   │   │   ├── compliance/     # 合规报告
│   │   │   ├── access-control/ # 安全配置
│   │   │   ├── agent-marketplace/ # 专家市场
│   │   │   ├── skill-repository/  # 技能仓库
│   │   │   ├── connector-manager/ # 连接器管理
│   │   │   ├── sandbox/        # 沙箱管理
│   │   │   ├── budget-config/  # 预算配置
│   │   │   └── settings/       # 组织管理
│   │   ├── login/              # 登录页
│   │   └── layout.tsx          # 根布局
│   ├── src/components/         # 公共组件
│   ├── src/hooks/              # 自定义 Hooks
│   ├── src/stores/             # Zustand 状态
│   ├── src/lib/                # 工具库
│   └── src/types/              # TypeScript 类型
│
├── docker-compose.yml          # Docker 基础设施
├── scripts/                    # 构建/测试脚本
└── .gitignore
```

---

## 二、架构设计

### 2.1 系统架构

```
┌──────────────────────────────────────────────────────┐
│                  React Frontend (:3000)               │
│          Next.js 15 App Router + Ant Design 5          │
└──────────────────────┬───────────────────────────────┘
                       │ /api/v1/* (代理)
┌──────────────────────┴───────────────────────────────┐
│                 Go API Gateway (:8080)                 │
│                     Gin Router                        │
├──────────┬──────────┬──────────┬────────────────────┤
│ 模型适配器│ 路由引擎  │ 计费引擎  │  内容安全引擎        │
├──────────┴──────────┴──────────┴────────────────────┤
│          PostgreSQL + ClickHouse + Redis              │
└──────────────────────────────────────────────────────┘
```

### 2.2 请求处理流程

```
HTTP 请求 → Gin Router → 中间件链 → Handler
                                    ├── 路由决策 (router)
                                    ├── 适配器转发 (adapter)
                                    ├── 计费记录 (billing)
                                    └── 安全检测 (filter)
```

### 2.3 适配器模式

所有模型适配器实现统一接口 `ModelAdapter`：

```go
type ModelAdapter interface {
    ProviderName() string
    ModelName() string
    ChatCompletion(ctx, req) (*ChatResponse, error)
    ChatCompletionStream(ctx, req) (<-chan *StreamChunk, error)
    Capabilities() Capabilities
    Pricing() *ModelPricing
    HealthCheck(ctx) error
}
```

---

## 三、模块说明

### 3.1 API 网关 (gateway)

**功能：** 统一 API 入口，OpenAI 兼容格式路由

| 端点 | 说明 |
|------|------|
| `POST /v1/chat/completions` | Chat Completion |
| `GET /v1/models` | 模型列表 |

### 3.2 模型广场

| 页面 | 路由 | 功能 |
|------|------|------|
| 模型聚合 | `/model-aggregation` | 已接入模型展示 + 聚合能力说明 |
| 模型推荐 | `/models` | 场景识别 + 智能推荐 + 体验场 |
| 模型管理 | `/model-management` | 路由策略 + 模型启用/禁用 |

### 3.3 账单管理

| 页面 | 路由 | 功能 |
|------|------|------|
| 账单分析 | `/billing` | 多维度账单表格 + Agent排行榜分页 |
| 预算配置 | `/budget-config` | 月度预算/告警阈值/熔断配置 |

### 3.4 API Key 管理

| 页面 | 路由 | 功能 |
|------|------|------|
| Key 列表 | `/api-keys` | 创建/吊销/详情/编辑/搜索 |

### 3.5 安全治理

| 页面 | 路由 | 功能 |
|------|------|------|
| 运营安全 | `/safety` | 安全概览 + 安全网关 + DLP规则 |
| 合规报告 | `/compliance` | 台账/审计/备案/审计追溯 |
| 安全配置 | `/access-control` | 安全策略/API Key策略/越权检测/沙箱管理/敏感词库/DLP规则 |
| 沙箱管理 | 集成在安全配置内 | 审核队列/规则/历史 |

### 3.6 智能体市场

| 页面 | 路由 | 功能 |
|------|------|------|
| 专家市场 | `/agent-marketplace` | 分类浏览/订阅/Key生成/我的专家 |
| 技能仓库 | `/skill-repository` | 搜索/分类/安装/上传 |
| 连接器管理 | `/connector-manager` | 官方连接器/自定义MCP连接器 |

### 3.7 组织管理

| 页面 | 路由 | 功能 |
|------|------|------|
| 组织管理 | `/settings` | 组织/部门/用户 CRUD + 密码管理 |

---

## 四、API 接口清单

### 4.1 Dashboard

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/admin/dashboard/overview` | 仪表盘概览数据 |

### 4.2 Billing

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/admin/billing/report` | 多维度账单报表 |
| `GET` | `/api/v1/admin/billing/summary` | 账单汇总 |
| `GET` | `/api/v1/admin/billing/export` | 导出 CSV/JSON |

### 4.3 API Keys

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/admin/keys` | Key 列表 |
| `POST` | `/api/v1/admin/keys` | 创建 Key |
| `GET` | `/api/v1/admin/keys/:id` | Key 详情 |
| `PUT` | `/api/v1/admin/keys/:id` | 更新 Key |
| `DELETE` | `/api/v1/admin/keys/:id` | 吊销 Key |

### 4.4 Safety

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/admin/safety/overview` | 安全概览 |
| `GET` | `/api/v1/admin/safety/logs` | 检测日志 |

### 4.5 Agents

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/admin/agents/ranking` | Agent 排行 |
| `GET` | `/api/v1/admin/agents/registered` | 已注册 Agent 列表 |
| `POST` | `/api/v1/admin/agents/register` | 注册 Agent |

### 4.6 Compliance

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/admin/compliance/report` | 合规报告 (type: usage_ledger/safety_audit/algorithm_filing) |

### 4.7 Settings

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/admin/settings` | 获取配置 |
| `PUT` | `/api/v1/admin/settings` | 更新配置 |

### 4.8 Organization

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET/POST/DELETE` | `/api/v1/admin/orgs` | 组织 CRUD |
| `GET/POST/DELETE` | `/api/v1/admin/depts` | 部门 CRUD |
| `GET/POST/PUT/DELETE` | `/api/v1/admin/users` | 用户 CRUD |
| `POST` | `/api/v1/admin/users/:id/reset-password` | 重置密码 |

### 4.9 Sandbox

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/admin/sandbox/reviews` | 审核队列 |
| `POST` | `/api/v1/admin/sandbox/reviews/:id/approve` | 审批通过 |
| `POST` | `/api/v1/admin/sandbox/reviews/:id/reject` | 拒绝 |
| `GET/PUT` | `/api/v1/admin/sandbox/rules` | 沙箱规则 |

### 4.10 Marketplace

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/v1/admin/market/experts` | 专家列表 |
| `POST` | `/api/v1/admin/market/experts/:id/subscribe` | 订阅专家（自动创建Key） |
| `GET` | `/api/v1/admin/market/skills` | 技能列表 |
| `POST` | `/api/v1/admin/market/skills/:id/install` | 安装技能 |
| `PUT` | `/api/v1/admin/market/skills/:id/toggle` | 启用/关闭 |
| `DELETE` | `/api/v1/admin/market/skills/:id` | 卸载 |
| `GET` | `/api/v1/admin/market/connectors` | 连接器列表 |
| `POST` | `/api/v1/admin/market/connectors/:id/connect` | 连接 |
| `POST` | `/api/v1/admin/market/connectors/:id/disconnect` | 断开 |

---

## 五、开发环境搭建

### 5.1 前置依赖

```bash
Go 1.22+     # https://go.dev/dl/
Node.js 20+  # https://nodejs.org/
pnpm         # npm install -g pnpm
Docker Desktop  # 用于 PostgreSQL + ClickHouse + Redis
```

### 5.2 启动基础设施

```bash
docker compose up -d
```

### 5.3 启动后端

```bash
cd backend
go mod tidy
go run ./cmd/gateway
# 或双击 backend/start-dev.bat
```

### 5.4 启动前端

```bash
cd web
pnpm install
npx next dev -p 3000
# 或双击 web/start-dev.bat
```

### 5.5 API Key 配置

修改环境变量或 `backend/config/config.yaml`：

```bash
export DEEPSEEK_API_KEY=sk-xxx
export QWEN_API_KEY=sk-xxx
export DOUBAO_API_KEY=sk-xxx
export GLM_API_KEY=sk-xxx
export KIMI_API_KEY=sk-xxx
```

---

## 六、构建与部署

### 6.1 构建

```bash
# 后端
cd backend && go build -o gateway.exe ./cmd/gateway

# 前端
cd web && npx next build
```

### 6.2 Docker 部署

```bash
docker build -t tokenhub-backend -f backend/Dockerfile backend/
docker compose up -d
```

---

## 七、数据流说明

### 7.1 前端数据流

```
页面组件 → useXxx Hook (React Query) → apiClient (Axios) → Next.js Rewrite → Go Gateway API
                                                    ↓
                                         React Query 缓存 (30s stale)
                                                    ↓
                                         Zustand 全局状态 (Auth/Org)
```

### 7.2 后端数据流

```
Handler → Service (内存存储/演示数据) → c.JSON()
                ↓
         (未来) PostgreSQL / ClickHouse
```

> **注意：** 当前 Phase 1 使用内存存储 + 演示数据，Phase 2 将接入 PostgreSQL + ClickHouse。
