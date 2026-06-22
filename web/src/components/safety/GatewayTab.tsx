'use client';

import React from 'react';
import { Card, Row, Col, Table, Tag, Switch } from 'antd';
import { SafetyCertificateOutlined, StopOutlined, WarningOutlined, CheckCircleOutlined, SecurityScanOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { formatNumber } from '@/lib/formatters';

export default function GatewayTab() {
  const { data } = useQuery({
    queryKey: ['security', 'gateway'],
    queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/security/gateway'); return data; },
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  });

  if (!data) return <Card loading style={{ minHeight: 400 }} />;

  return (
    <>
      <Row gutter={[16, 16]}>
        {[
          { title: '总检测量', value: formatNumber(data.total_requests), icon: <SecurityScanOutlined />, color: '#1677ff' },
          { title: '通过', value: formatNumber(data.passed), icon: <CheckCircleOutlined />, color: '#52c41a' },
          { title: '拦截', value: formatNumber(data.blocked), icon: <StopOutlined />, color: '#ff4d4f' },
          { title: '告警', value: formatNumber(data.warned), icon: <WarningOutlined />, color: '#faad14' },
        ].map((card) => (
          <Col xs={12} sm={6} key={card.title}>
            <Card size="small">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${card.color}15` }}>
                  <span style={{ fontSize: 20, color: card.color }}>{card.icon}</span>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>{card.title}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: card.color }}>{card.value}</div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="实时安检流">
            <Table dataSource={data.real_time_stream || []} rowKey="id" pagination={false} size="small"
              columns={[
                { title: '时间', dataIndex: 'timestamp', render: (v: string) => new Date(v).toLocaleTimeString('zh-CN') },
                { title: '来源', dataIndex: 'source' },
                { title: '模型', dataIndex: 'model', render: (v: string) => <Tag>{v}</Tag> },
                { title: '结果', dataIndex: 'action', render: (v: string) => {
                  const m: Record<string, [string, string]> = { passed: ['green', '通过'], blocked: ['red', '拦截'], warned: ['orange', '告警'] };
                  return <Tag color={m[v]?.[0]}>{m[v]?.[1] || v}</Tag>;
                }},
                { title: '原因', dataIndex: 'reason', ellipsis: true },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="网关规则">
            <Table dataSource={data.rules || []} rowKey="id" pagination={false} size="small"
              columns={[
                { title: '优先级', dataIndex: 'priority', width: 70, render: (v: number) => <Tag color="blue">P{v}</Tag> },
                { title: '规则名称', dataIndex: 'name' },
                { title: '条件', dataIndex: 'condition', ellipsis: true },
                { title: '动作', dataIndex: 'action', render: (v: string) => {
                  const m: Record<string, [string, string]> = { block: ['red', '拦截'], mask: ['orange', '脱敏'], throttle: ['gold', '限速'] };
                  return <Tag color={m[v]?.[0]}>{m[v]?.[1] || v}</Tag>;
                }},
                { title: '启用', dataIndex: 'enabled', render: (v: boolean) => <Switch checked={v} disabled size="small" /> },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}
