CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    billing_plan    VARCHAR(50) NOT NULL DEFAULT 'pay_as_you_go',
    monthly_budget  DECIMAL(12,4),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE departments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID REFERENCES organizations(id),
    name            VARCHAR(255) NOT NULL,
    monthly_budget  DECIMAL(12,4),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE projects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID REFERENCES organizations(id),
    dept_id         UUID REFERENCES departments(id),
    name            VARCHAR(255) NOT NULL,
    monthly_budget  DECIMAL(12,4),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID REFERENCES organizations(id),
    dept_id         UUID REFERENCES departments(id),
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE,
    role            VARCHAR(50) NOT NULL DEFAULT 'user',
    daily_budget    DECIMAL(12,4),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash        VARCHAR(64) UNIQUE NOT NULL,
    key_prefix      VARCHAR(16) NOT NULL,
    user_id         UUID REFERENCES users(id),
    org_id          UUID REFERENCES organizations(id),
    dept_id         UUID REFERENCES departments(id),
    project_id      UUID REFERENCES projects(id),
    name            VARCHAR(255) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    daily_budget    DECIMAL(12,4),
    rate_limit_rpm  INT DEFAULT 60,
    allowed_models  TEXT[],
    allowed_ips     TEXT[],
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    last_used_at    TIMESTAMPTZ
);

CREATE TABLE model_pricing (
    id              SERIAL PRIMARY KEY,
    provider        VARCHAR(50) NOT NULL,
    model_name      VARCHAR(100) NOT NULL,
    input_price     DECIMAL(12,8) NOT NULL,
    output_price    DECIMAL(12,8) NOT NULL,
    cache_hit_price DECIMAL(12,8),
    currency        VARCHAR(10) DEFAULT 'CNY',
    effective_from  DATE NOT NULL,
    effective_to    DATE,
    UNIQUE(provider, model_name, effective_from)
);

CREATE TABLE budget_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID REFERENCES organizations(id),
    scope_type      VARCHAR(20) NOT NULL,
    scope_id        UUID NOT NULL,
    budget_type     VARCHAR(20) NOT NULL,
    max_amount      DECIMAL(12,4) NOT NULL,
    action          VARCHAR(20) NOT NULL DEFAULT 'block',
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sensitive_words (
    id              SERIAL PRIMARY KEY,
    word            VARCHAR(255) NOT NULL,
    category        VARCHAR(50) NOT NULL,
    level           VARCHAR(20) NOT NULL DEFAULT 'block',
    action          VARCHAR(20) NOT NULL DEFAULT 'block',
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE compliance_reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID REFERENCES organizations(id),
    report_type     VARCHAR(50) NOT NULL,
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    data            JSONB,
    generated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_org ON api_keys(org_id);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_status ON api_keys(status);
CREATE INDEX idx_sensitive_words_category ON sensitive_words(category);
CREATE INDEX idx_budget_configs_scope ON budget_configs(scope_type, scope_id);
