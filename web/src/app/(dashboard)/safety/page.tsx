'use client';

import React, { useState } from 'react';
import { Card, Row, Col, Table, Tag, Segmented, Typography, Button, Input, Select, Popconfirm, message, Badge, Switch } from 'antd';
import { SafetyCertificateOutlined, StopOutlined, WarningOutlined, CheckCircleOutlined, SecurityScanOutlined, PlusOutlined, DeleteOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useSafetyOverview, useSafetyLogs } from '@/hooks/useSafety';
import { formatNumber } from '@/lib/formatters';
import { RISK_COLORS, RISK_LABELS } from '@/lib/constants';
import { usePermission } from '@/hooks/usePermission';
import apiClient from '@/lib/api-client';

const { Text } = Typography;

export default function SafetyPage() {
  const { isAdmin } = usePermission();
  const [activeTab, setActiveTab] = useState('overview');
  const [resultFilter, setResultFilter] = useState('all');
  const [page, setPage] = useState(1);

  const { data: overview, isLoading } = useSafetyOverview();
  const { data: logs } = useSafetyLogs({ safety_result: resultFilter === 'all' ? undefined : resultFilter, page, page_size: 20 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>运营安全</h1>
        <Segmented value={activeTab} onChange={setActiveTab}
          options={[
            { label: '安全概览', value: 'overview', icon: <SecurityScanOutlined /> },
            { label: '安全网关', value: 'gateway', icon: <ThunderboltOutlined /> },
          ]}
        />
      </div>

      {activeTab === 'overview' && <OverviewTab overview={overview} isLoading={isLoading} logs={logs} resultFilter={resultFilter} setResultFilter={setResultFilter} page={page} setPage={setPage} />}
      {activeTab === 'gateway' && <GatewayTab />}
    </div>
  );
}

function OverviewTab({ overview, isLoading, logs, resultFilter, setResultFilter, page, setPage }: any) {
  return (
    <>
      <Row gutter={[16, 16]}>
        {[
          { title: '总检测量', value: overview?.total_checks ?? 0, icon: <SecurityScanOutlined />, color: '#1677ff' },
          { title: '通过', value: overview?.passed ?? 0, icon: <CheckCircleOutlined />, color: '#52c41a' },
          { title: '拦截', value: overview?.blocked ?? 0, icon: <StopOutlined />, color: '#ff4d4f' },
          { title: '待审', value: overview?.review ?? 0, icon: <WarningOutlined />, color: '#faad14' },
        ].map((card) => (
          <Col xs={12} sm={6} key={card.title}><Card size="small" loading={isLoading}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${card.color}15` }}>
              <span style={{ fontSize: 20, color: card.color }}>{card.icon}</span>
            </div>
            <div><div style={{ fontSize: 12, color: '#8c8c8c' }}>{card.title}</div><div style={{ fontSize: 22, fontWeight: 700, color: card.color }}>{formatNumber(card.value)}</div></div>
          </div></Card></Col>
        ))}
      </Row>

      <Card title="检测日志" extra={<Segmented value={resultFilter} onChange={(v: string) => { setResultFilter(v); setPage(1); }} options={[{ label: '全部', value: 'all' }, { label: '拦截', value: 'block' }, { label: '待审', value: 'review' }]} />}>
        <Table dataSource={logs?.data} rowKey="event_id" pagination={{ current: page, pageSize: 20, total: logs?.total ?? 0, onChange: setPage }} size="small"
          columns={[
            { title: '时间', dataIndex: 'timestamp', render: (v: string) => new Date(v).toLocaleTimeString('zh-CN') },
            { title: '用户', dataIndex: 'user_id' },
            { title: '模型', dataIndex: 'model_name', render: (v: string) => <Tag>{v}</Tag> },
            { title: '结果', dataIndex: 'safety_result', render: (v: string) => {
              const m: any = { pass: ['green', '通过'], block: ['red', '拦截'], review: ['orange', '待审'] };
              return <Tag color={m[v]?.[0]}>{m[v]?.[1] || v}</Tag>;
            }},
            { title: '标签', dataIndex: 'safety_labels', render: (v: string[]) => v?.map((l: string) => <Tag key={l} color={RISK_COLORS[l]}>{RISK_LABELS[l] || l}</Tag>) },
          ]}
        />
      </Card>
    </>
  );
}

function GatewayTab() {
  const { data } = useQuery({
    queryKey: ['security', 'gateway'],
    queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/security/gateway'); return data; },
    refetchInterval: 10000,
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
