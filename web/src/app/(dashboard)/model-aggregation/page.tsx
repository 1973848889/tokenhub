'use client';

import React from 'react';
import { Card, Empty, Descriptions, Tag, Space, Typography } from 'antd';
import { ApiOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { MODEL_LIST, PROVIDER_COLORS } from '@/lib/constants';

const { Title, Text } = Typography;

export default function ModelAggregationPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>模型聚合</h1>

      <Card title="已接入模型">
        <Space wrap>
          {MODEL_LIST.map((m) => (
            <Card key={m.value} size="small" style={{ width: 200 }} hoverable>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag color={PROVIDER_COLORS[m.provider] || 'default'}>{m.provider}</Tag>
                <div>
                  <div style={{ fontWeight: 500 }}>{m.label}</div>
                  <Text type="secondary" style={{ fontSize: 11 }}>{m.value}</Text>
                </div>
              </div>
            </Card>
          ))}
        </Space>
      </Card>

      <Card title="聚合能力">
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="统一API格式">OpenAI 兼容格式，一套密钥调用全部模型</Descriptions.Item>
          <Descriptions.Item label="流式支持">全模型支持 SSE 流式输出</Descriptions.Item>
          <Descriptions.Item label="Token计数">自动统计各模型Token消耗</Descriptions.Item>
          <Descriptions.Item label="容灾切换">模型不可用时秒级Fallback</Descriptions.Item>
          <Descriptions.Item label="协议支持">RESTful / WebSocket / gRPC</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
