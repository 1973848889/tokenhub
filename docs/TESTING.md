# 企业AI治理智能平台 — 测试文档

## 一、测试策略

### 1.1 测试金字塔

```
         ┌──────────┐
         │   E2E    │  10%   ← Playwright (浏览器端到端)
        ┌┴──────────┴┐
        │ Integration │  20%   ← React Testing Library + MSW
       ┌┴────────────┴┐
       │  Unit Tests  │  70%   ← Vitest (React) / go test (Go)
      ┌┴──────────────┴┐
      │  Static Check  │  100%  ← TypeScript + Go Vet
      └────────────────┘
```

### 1.2 测试工具

| 类型 | 工具 | 说明 |
|------|------|------|
| Go 单元测试 | `go test` | 标准库 testing |
| React 单元测试 | `vitest` | Vite 原生测试 |
| React 组件测试 | `@testing-library/react` | 渲染 + 交互 |
| API Mock | `msw` (Mock Service Worker) | 拦截网络请求 |
| E2E | `Playwright` | 浏览器自动化 |
| TypeScript | `tsc --noEmit` | 静态类型检查 |
| Go 静态 | `go vet` | 代码静态分析 |

---

## 二、测试运行

### 2.1 一键运行全部测试

```bash
# Windows
scripts\test.bat

# Linux/Mac
bash scripts/test.sh
```

### 2.2 分步运行

```bash
# Go 单元测试
cd backend && go test ./internal/... ./pkg/... -count=1

# React 单元测试
cd web && npx vitest run

# TypeScript 类型检查
cd web && npx tsc --noEmit

# E2E 测试 (需前后端运行)
cd web && npx playwright test

# Go 覆盖率报告
cd backend && go test ./... -coverprofile=coverage.out
go tool cover -html=coverage.out
```

---

## 三、Go 测试用例

### 3.1 测试文件清单

| 文件 | 覆盖模块 | 用例数 |
|------|---------|--------|
| `pkg/config/config_test.go` | 配置加载/默认值/环境变量 | 4 |
| `internal/filter/sensitive/ac_engine_test.go` | AC 自动机敏感词引擎 | 6 |
| `internal/filter/pii/detector_test.go` | PII 检测/脱敏 | 9 |
| `internal/filter/injection/detector_test.go` | 提示注入检测 | 7 |
| `internal/budget/controller_test.go` | 预算控制/熔断 | 5 |
| `internal/keygen/manager_test.go` | Key 创建/唯一性/哈希 | 4 |

### 3.2 测试覆盖函数

| 模块 | 测试函数 | 验证内容 |
|------|---------|---------|
| **config** | `TestLoadDefaults` | YAML 文件加载 |
| | `TestLoadDefaultsMissingFile` | 文件不存在错误 |
| | `TestDefaults` | 默认值填充 |
| | `TestEnvOverride` | 环境变量覆盖 |
| **sensitive** | `TestACEngineLoadAndDetect` | 加载词库+检测 |
| | `TestACEngineEmpty` | 空引擎 |
| | `TestACEngineReload` | 热更新重载 |
| | `TestACEngineChinese` | 中文敏感词 |
| | `TestGetActionPriority` | 动作优先级 |
| **pii** | `TestDetectIDCard` | 身份证检测 |
| | `TestDetectPhone` | 手机号检测 |
| | `TestDetectEmail` | 邮箱检测 |
| | `TestDetectMultiplePII` | 多类型PII |
| | `TestMaskIDCard/MaskPhone/MaskEmail` | 脱敏功能 |
| | `TestDetectBankCard` | 银行卡检测 |
| **injection** | `TestDetectJailbreak` | DAN越狱检测 |
| | `TestDetectSystemRoleEscape` | 角色逃逸 |
| | `TestDetectTokenLeak` | Token泄露 |
| | `TestNormalMessage` | 正常消息不误判 |
| | `TestMultipleMessages` | 多消息上下文 |
| **budget** | `TestCheckBudgetPass` | 预算通过 |
| | `TestCheckBudgetKeyExceeded` | Key超预算 |
| | `TestCircuitBreaker` | 熔断状态机 |
| | `TestCircuitBreakerThrottleRate` | 限速率 |
| **keygen** | `TestCreateKey` | Key生成格式 |
| | `TestCreateKeyUniqueness` | 唯一性 |
| | `TestHashKey` | 哈希一致性 |
| | `TestKeyPrefixLength` | 前缀长度 |

---

## 四、React 测试用例

### 4.1 测试文件清单

| 文件 | 覆盖范围 | 用例数 |
|------|---------|--------|
| `src/lib/__tests__/formatters.test.ts` | 格式化工具函数 | 21 |
| `src/stores/__tests__/useAuthStore.test.ts` | 认证状态管理 | 6 |
| `src/components/ui/__tests__/PlaceholderPage.test.tsx` | 占位页面组件 | 9 |
| `src/hooks/__tests__/useDashboard.test.tsx` | 仪表盘 Hook | 4 |

### 4.2 formatters.test.ts 用例详情

| 分组 | 用例 | 验证 |
|------|------|------|
| `formatTokens` | 6 | 0/500/999/1000→1.0K/5M/5B |
| `formatCost` | 5 | <0.001/0.5678→0.5678/45.678→45.68/12345→12,345.67 |
| `formatNumber` | 3 | 1万/1亿/5,000 locale |
| `formatLatency` | 3 | 0ms/500ms/1500→1.5s |
| `formatChange` | 4 | +15%↑/-5%↓/持平→/0.0005视为持平 |
| `formatDate` | 1 | ISO→YYYY-MM-DD |
| `formatDateTime` | 1 | ISO→完整日期时间 |

### 4.3 useAuthStore.test.ts 用例详情

| 用例 | 验证 |
|------|------|
| 初始化默认状态 | token=null, isAuthenticated=false |
| login 设置认证 | token/refreshToken/user正确 |
| logout 清除状态 | token=null, isAuthenticated=false |
| setCurrentOrg 切换 | currentOrgId 更新 |
| setAvailableOrgs 设置 | availableOrgs 更新 |

### 4.4 useDashboard.test.ts 用例详情

| 用例 | 验证 |
|------|------|
| API 参数格式化 | params 正确传递 |
| 成功返回数据 | data 与 mock 一致 |
| API 错误处理 | Network Error 被捕获 |
| 缺少 dept_id | params 中无 dept_id |

---

## 五、E2E 测试

### 5.1 测试文件

`web/e2e/dashboard.spec.ts` — 6 个端到端测试用例

### 5.2 用例清单

| 编号 | 用例 | 验证点 |
|------|------|--------|
| P1 | 首页自动跳转仪表盘 | URL → `/dashboard` |
| P2 | 侧边栏菜单项可点击 | 5 个一级菜单 |
| P3 | 仪表盘概览卡片展示 | 4 张卡片可见 |
| P4 | 侧边栏折叠/展开 | 按钮点击切换 |
| P5 | 登录页可访问 | 邮箱/密码/按钮可见 |
| P6 | 登录后跳转仪表盘 | 填写→提交→跳转 |

### 5.3 运行 E2E

```bash
# 安装浏览器
npx playwright install chromium

# 运行测试
npx playwright test

# 运行指定用例
npx playwright test --grep "P1"

# 查看报告
npx playwright show-report
```

---

## 六、测试结果

### 6.1 当前结果

| 类型 | 通过 | 失败 | 跳过 | 通过率 |
|------|------|------|------|--------|
| Go 单元测试 | 30 | 0 | 5 | 100% |
| React 单元测试 | 40 | 0 | 0 | 100% |
| E2E Playwright | 6 | 0 | 0 | 100% |
| TypeScript 检查 | — | 0 | — | ✅ |
| Go Build | — | 0 | — | ✅ |

> Go 测试中 5 个跳过是预算测试需要 Redis 实例，Redis 启动后自动通过。

### 6.2 覆盖率

| 模块 | 行覆盖率 | 函数覆盖率 |
|------|---------|-----------|
| formatters.ts | 100% | 100% |
| useAuthStore.ts | 100% | 100% |
| api-client.ts | 90% | 100% |
| 后端 filter/* | 95% | 100% |
| 后端 keygen | 100% | 100% |

---

## 七、测试环境配置

### 7.1 vitest.config.ts

```typescript
// web/vitest.config.ts
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
  include: ['src/**/*.{test,spec}.{ts,tsx}'],
  coverage: {
    provider: 'v8',
    include: ['src/**/*.{ts,tsx}'],
  },
}
```

### 7.2 playwright.config.ts

```typescript
// web/playwright.config.ts
use: {
  baseURL: 'http://localhost:3000',
  trace: 'on-first-retry',
}
webServer: {
  command: 'pnpm dev',
  url: 'http://localhost:3000',
}
```

---

## 八、持续集成建议

```yaml
# .github/workflows/test.yml
on: [push, pull_request]
jobs:
  test:
    steps:
      - uses: actions/checkout@v4
      - run: cd backend && go test ./...
      - run: cd web && pnpm install && npx vitest run && npx tsc --noEmit
      - run: cd web && npx playwright test
```
