'use client';

import React from 'react';
import { Card, Space, Tag, Typography } from 'antd';
import { ApiOutlined } from '@ant-design/icons';
import { MODEL_LIST, INDUSTRY_MODEL_LIST, PROVIDER_COLORS } from '@/lib/constants';

const { Title, Text } = Typography;

export default function ModelAggregationPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>模型方舟</h1>

      <Card title="通用大模型">
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

      <Card title="行业大模型">
        <Space wrap>
          {INDUSTRY_MODEL_LIST.map((m) => (
            <Card key={m.value} size="small" style={{ width: 200 }} hoverable>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag color={PROVIDER_COLORS[m.provider] || 'default'}>{m.desc}</Tag>
                <div>
                  <div style={{ fontWeight: 500 }}>{m.label}</div>
                  <Text type="secondary" style={{ fontSize: 11 }}>{m.value}</Text>
                </div>
              </div>
            </Card>
          ))}
        </Space>
      </Card>
    </div>
  );
}
