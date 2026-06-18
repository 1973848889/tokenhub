CREATE TABLE IF NOT EXISTS call_events (
    event_id        UUID,
    timestamp       DateTime64(3),
    org_id          String,
    user_id         String,
    dept_id         String,
    project_id      String,
    api_key_id      String,
    api_key_prefix  String,
    request_id      String,

    provider        LowCardinality(String),
    model_name      String,
    scene_tag       String,

    prompt_tokens       UInt64,
    completion_tokens   UInt64,
    total_tokens        UInt64,
    cache_hit_tokens    UInt64 DEFAULT 0,
    input_cost          Decimal64(8),
    output_cost         Decimal64(8),
    total_cost          Decimal64(8),

    latency_ms          UInt32,
    total_latency_ms    UInt32,
    status_code         UInt16,
    error_message       String DEFAULT '',

    route_strategy      LowCardinality(String),
    safety_result       LowCardinality(String),
    safety_labels       Array(String),

    tags                Map(String, String),

    INDEX idx_org_id     org_id     TYPE bloom_filter GRANULARITY 1,
    INDEX idx_user_id    user_id    TYPE bloom_filter GRANULARITY 1,
    INDEX idx_model_name model_name TYPE bloom_filter GRANULARITY 1,
    INDEX idx_timestamp  timestamp  TYPE minmax GRANULARITY 1
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (org_id, timestamp, model_name)
TTL timestamp + INTERVAL 180 DAY;

CREATE MATERIALIZED VIEW IF NOT EXISTS call_events_hourly
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (org_id, user_id, dept_id, model_name, timestamp)
AS SELECT
    toStartOfHour(timestamp) as timestamp,
    org_id,
    user_id,
    dept_id,
    project_id,
    model_name,
    count()                    as call_count,
    sum(total_tokens)          as total_tokens,
    sum(total_cost)            as total_cost,
    avg(latency_ms)            as avg_latency_ms
FROM call_events
GROUP BY timestamp, org_id, user_id, dept_id, project_id, model_name;

CREATE MATERIALIZED VIEW IF NOT EXISTS call_events_daily
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (org_id, dept_id, user_id, model_name, timestamp)
AS SELECT
    toStartOfDay(timestamp) as timestamp,
    org_id,
    dept_id,
    user_id,
    project_id,
    model_name,
    count()                    as call_count,
    sum(total_tokens)          as total_tokens,
    sum(total_cost)            as total_cost,
    quantile(0.5)(latency_ms)  as p50_latency,
    quantile(0.95)(latency_ms) as p95_latency
FROM call_events
GROUP BY timestamp, org_id, dept_id, user_id, project_id, model_name;
