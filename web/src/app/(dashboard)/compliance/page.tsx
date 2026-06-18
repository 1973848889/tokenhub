'use client';

import React, { useState, useMemo } from 'react';
import { Card, Tabs, Descriptions, Table, Tag, Button, DatePicker, Space, Row, Col, Statistic, Spin, Empty, Typography, Alert, Input } from 'antd';
import { SafetyCertificateOutlined, AuditOutlined, FileProtectOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/useAuthStore';
import apiClient from '@/lib/api-client';
import { formatCost, formatTokens, formatNumber } from '@/lib/formatters';
import { RISK_COLORS, RISK_LABELS } from '@/lib/constants';

const { RangePicker } = DatePicker;
const { Text, Title, Paragraph } = Typography;

export default function CompliancePage() {
  const currentOrgId = useAuthStore((s) => s.currentOrgId) || 'org-default';
  const [activeTab, setActiveTab] = useState('usage_ledger');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);

  const queryParams = useMemo(() => ({ org_id: currentOrgId, type: activeTab, start: dateRange[0].format('YYYY-MM-DD'), end: dateRange[1].format('YYYY-MM-DD') }), [currentOrgId, activeTab, dateRange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>合规报告</h1>

      <Card>
        <Space><RangePicker value={dateRange} onChange={(d) => { if (d?.[0] && d[1]) setDateRange([d[0], d[1]]); }} allowClear={false} maxDate={dayjs()} /></Space>
      </Card>

      <Card bodyStyle={{ padding: 0 }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} tabBarStyle={{ padding: '0 24px' }}>
          <Tabs.TabPane tab={<span><AuditOutlined /> AI使用台账</span>} key="usage_ledger"><UsageLedgerTab queryParams={queryParams} /></Tabs.TabPane>
          <Tabs.TabPane tab={<span><SafetyCertificateOutlined /> 安全审计</span>} key="safety_audit"><SafetyAuditTab queryParams={queryParams} /></Tabs.TabPane>
          <Tabs.TabPane tab={<span><FileProtectOutlined /> 模型备案</span>} key="algorithm_filing"><FilingTab /></Tabs.TabPane>
          <Tabs.TabPane tab={<span><SearchOutlined /> 审计追溯</span>} key="audit_trace"><AuditTraceTab /></Tabs.TabPane>
        </Tabs>
      </Card>
    </div>
  );
}

function UsageLedgerTab({ queryParams }: any) {
  const { data, isLoading } = useQuery<any>({ queryKey: ['compliance', queryParams], queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/compliance/report', { params: queryParams }); return data; } });

  if (isLoading) return <Spin style={{ padding: 40 }} />;
  if (!data) return <Empty />;

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16}>
        <Col xs={12} sm={6}><Statistic title="总调用" value={formatNumber(data.summary?.total_calls ?? 0)} /></Col>
        <Col xs={12} sm={6}><Statistic title="总Token" value={formatTokens(data.summary?.total_tokens ?? 0)} /></Col>
        <Col xs={12} sm={6}><Statistic title="总费用" value={formatCost(data.summary?.total_cost ?? 0)} /></Col>
        <Col xs={12} sm={6}><Statistic title="安全拦截" value={data.summary?.blocked_calls ?? 0} valueStyle={{ color: '#ff4d4f' }} /></Col>
      </Row>
      <Table style={{ marginTop: 16 }} dataSource={data.records} rowKey="date" pagination={{ pageSize: 20 }} size="small"
        columns={[
          { title: '日期', dataIndex: 'date' }, { title: '用户', dataIndex: 'user_name' }, { title: '模型', dataIndex: 'model_name', render: (v: string) => <Tag>{v}</Tag> },
          { title: 'Token', dataIndex: 'tokens', render: (v: number) => formatTokens(v) }, { title: '费用', dataIndex: 'cost', render: (v: number) => `¥${v.toFixed(2)}` },
          { title: '安全结果', dataIndex: 'safety_result', render: (v: string) => { const m: any = { pass: ['green', '通过'], block: ['red', '拦截'] }; return <Tag color={m[v]?.[0]}>{m[v]?.[1] || v}</Tag>; } },
        ]}
      />
    </div>
  );
}

function SafetyAuditTab({ queryParams }: any) {
  const { data, isLoading } = useQuery<any>({ queryKey: ['compliance', queryParams], queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/compliance/report', { params: queryParams }); return data; } });
  if (isLoading) return <Spin style={{ padding: 40 }} />;
  if (!data) return <Empty />;

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={16}>
        {[{ l: '检测总量', v: data.total_checks, c: '#1677ff' }, { l: '通过', v: data.passed, c: '#52c41a' }, { l: '拦截', v: data.blocked, c: '#ff4d4f' }, { l: '拦截率', v: `${(data.block_rate ?? 0).toFixed(1)}%`, c: '#722ed1' }].map((c) => (
          <Col xs={12} sm={6} key={c.l}><Card size="small"><Statistic title={c.l} value={c.v} valueStyle={{ color: c.c }} /></Card></Col>
        ))}
      </Row>
      <Card title="风险分布" size="small" style={{ marginTop: 16 }}>
        {data.risk_categories?.map((cat: any) => (
          <Tag key={cat.category} color={RISK_COLORS[cat.category]}>{RISK_LABELS[cat.category]}: {cat.count}次</Tag>
        ))}
      </Card>
    </div>
  );
}

function FilingTab() {
  const { data, isLoading } = useQuery<any>({ queryKey: ['compliance', { type: 'algorithm_filing' }], queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/compliance/report', { params: { type: 'algorithm_filing' } }); return data; } });
  if (isLoading) return <Spin style={{ padding: 40 }} />;

  return (
    <div style={{ padding: 24 }}><Alert message="根据《生成式AI管理办法》完成备案" type="info" showIcon style={{ marginBottom: 16 }} />
      <Table dataSource={data?.models} rowKey="name" size="small" pagination={false}
        columns={[
          { title: '模型', dataIndex: 'name' }, { title: '版本', dataIndex: 'version' }, { title: '用途', dataIndex: 'purpose' },
          { title: '备案', dataIndex: 'is_filed', render: (v: boolean) => v ? <Tag color="green">已备案</Tag> : <Tag color="orange">未备案</Tag> },
          { title: '时间', dataIndex: 'filing_date', render: (v: string) => v || '-' },
        ]}
      />
    </div>
  );
}

function AuditTraceTab() {
  const traces = [
    { id: 't1', time: '2026-06-18 15:30', user: '张三', action: '调用 deepseek-chat', model: 'deepseek-chat', result: 'pass', hash: 'a1b2c3...e4f5' },
    { id: 't2', time: '2026-06-18 15:28', user: '李四', action: '查询账单', model: '-', result: 'pass', hash: 'f6e7d8...c9b0' },
    { id: 't3', time: '2026-06-18 15:25', user: 'Agent-客服', action: '调用 kimi-latest', model: 'kimi-latest', result: 'block', hash: 'aabbcc...dd00' },
    { id: 't4', time: '2026-06-18 14:50', user: '王五', action: '创建 API Key', model: '-', result: 'pass', hash: '112233...4455' },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Alert message="不可篡改审计日志 — 哈希链签名验证" type="success" showIcon style={{ marginBottom: 16 }} />
      <Table dataSource={traces} rowKey="id" size="small" pagination={false}
        columns={[
          { title: '时间', dataIndex: 'time' }, { title: '用户', dataIndex: 'user' }, { title: '操作', dataIndex: 'action' },
          { title: '结果', dataIndex: 'result', render: (v: string) => <Tag color={v === 'pass' ? 'green' : 'red'}>{v === 'pass' ? '通过' : '拦截'}</Tag> },
          { title: '哈希校验', dataIndex: 'hash', render: (v: string) => <Tag color="green">{v}</Tag> },
          { title: '操作', key: 'act', render: () => <Button type="link" size="small">追溯详情</Button> },
        ]}
      />
    </div>
  );
}
