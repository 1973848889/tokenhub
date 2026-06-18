'use client';

import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Segmented, DatePicker, Space, Table, Tag, Badge, Descriptions, Typography, Tooltip, Progress, Drawer, Divider } from 'antd';
import { DollarOutlined, ThunderboltOutlined, ApiOutlined, RobotOutlined, WarningOutlined, StopOutlined, FundOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePermission } from '@/hooks/usePermission';
import { useBillingReport } from '@/hooks/useBilling';
import { useAgentRanking, useAgentProfile, useAgentAnomalies } from '@/hooks/useAgentAnalysis';
import { BillingTable } from '@/components/billing/BillingTable';
import { ExportButton } from '@/components/billing/ExportButton';
import { formatCost, formatTokens, formatNumber, formatLatency } from '@/lib/formatters';
import { PROVIDER_COLORS } from '@/lib/constants';
import type { AgentProfile } from '@/hooks/useAgentAnalysis';

const { Text } = Typography;
const { RangePicker } = DatePicker;

export default function BillingPage() {
  const [tab, setTab] = useState('billing');
  const currentOrgId = useAuthStore((s) => s.currentOrgId) || 'org-default';
  const { isAdmin } = usePermission();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>账单分析</h1>
        <Segmented value={tab} onChange={setTab}
          options={[
            { label: '账单分析', value: 'billing', icon: <FundOutlined /> },
            { label: 'Agent排行榜', value: 'agent', icon: <RobotOutlined /> },
          ]}
        />
      </div>

      {tab === 'billing' && <BillingTab />}
      {tab === 'agent' && <AgentRankingTab />}
    </div>
  );
}

function BillingTab() {
  const currentOrgId = useAuthStore((s) => s.currentOrgId) || 'org-default';
  const { isAdmin } = usePermission();
  const [groupBy, setGroupBy] = useState('dept');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const queryParams = useMemo(() => ({ org_id: currentOrgId, start: dateRange[0].format('YYYY-MM-DD'), end: dateRange[1].format('YYYY-MM-DD'), group_by: groupBy, page, page_size: pageSize }), [currentOrgId, dateRange, groupBy, page, pageSize]);
  const { data, isLoading, refetch } = useBillingReport(queryParams);
  const summary = useMemo(() => {
    if (!data?.data) return null;
    return data.data.reduce((acc: any, row: any) => ({ cost: acc.cost + row.total_cost, tokens: acc.tokens + row.total_tokens, calls: acc.calls + row.call_count }), { cost: 0, tokens: 0, calls: 0 });
  }, [data]);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <Segmented value={groupBy} onChange={(v) => { setGroupBy(v as string); setPage(1); }} options={[{ label: '按部门', value: 'dept' }, { label: '按用户', value: 'user' }, { label: '按模型', value: 'model' }, { label: '按天', value: 'day' }]} />
        <RangePicker value={dateRange} onChange={(d) => { if (d?.[0] && d[1]) setDateRange([d[0], d[1]]); }} allowClear={false} maxDate={dayjs()} />
        {isAdmin && <><ExportButton query={queryParams} disabled={isLoading} /><button onClick={() => refetch()} style={{ border: '1px solid #d9d9d9', borderRadius: 6, padding: '4px 12px', background: '#fff', cursor: 'pointer' }}>刷新</button></>}
      </div>
      <Row gutter={[16, 16]}>
        {[{ title: '期间总费用', value: formatCost(summary?.cost ?? 0), icon: <DollarOutlined />, color: '#1677ff' }, { title: '总Token消耗', value: formatTokens(summary?.tokens ?? 0), icon: <ThunderboltOutlined />, color: '#52c41a' }, { title: '总调用次数', value: formatNumber(summary?.calls ?? 0), icon: <ApiOutlined />, color: '#faad14' }, { title: '数据来源', value: '演示数据', icon: <ApiOutlined />, color: '#8b5cf6' }].map((c) => (
          <Col xs={24} sm={12} lg={6} key={c.title}><Card size="small" loading={isLoading}><div style={{ display: 'flex', justifyContent: 'space-between' }}><div><div style={{ fontSize: 12, color: '#8c8c8c' }}>{c.title}</div><div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div></div><span style={{ fontSize: 20, color: c.color, opacity: 0.5 }}>{c.icon}</span></div></Card></Col>
        ))}
      </Row>
      <BillingTable data={data?.data ?? []} loading={isLoading} groupBy={groupBy} total={data?.total ?? 0} page={page} pageSize={pageSize} onPageChange={(p, ps) => { setPage(p); setPageSize(ps); }} />
    </>
  );
}

function AgentRankingTab() {
  const [sortBy, setSortBy] = useState('cost');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: ranking } = useAgentRanking({ sort_by: sortBy });
  const { data: profile } = useAgentProfile(selectedId || '');
  const { data: anomalies } = useAgentAnomalies();

  const agentTotalCost = ranking?.data?.reduce((s: number, a: AgentProfile) => s + a.stats.today_cost, 0) ?? 0;
  const anomalyCount = anomalies?.data?.length ?? 0;
  const warningCount = ranking?.data?.filter((a: any) => a.status === 'warning').length ?? 0;

  return (
    <>
      <Row gutter={[16, 16]}>
        {[{ title: '活跃 Agent', value: ranking?.data?.length ?? 0, icon: <RobotOutlined />, color: '#1677ff' }, { title: '异常 Agent', value: anomalyCount, icon: <WarningOutlined />, color: anomalyCount > 0 ? '#ff4d4f' : '#52c41a' }, { title: 'Agent 总费用', value: `¥${formatCost(agentTotalCost)}`, icon: <ThunderboltOutlined />, color: '#722ed1' }, { title: '告警', value: warningCount, icon: <StopOutlined />, color: warningCount > 0 ? '#faad14' : '#52c41a' }].map((c) => (
          <Col xs={12} sm={6} key={c.title}><Card size="small"><div><Text type="secondary" style={{ fontSize: 12 }}>{c.title}</Text><div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div></div></Card></Col>
        ))}
      </Row>
      <Card title="Agent 排行榜">
        <Segmented value={sortBy} onChange={(v) => setSortBy(v as string)} options={[{ label: '费用', value: 'cost' }, { label: '调用量', value: 'calls' }, { label: '错误率', value: 'error_rate' }]} style={{ marginBottom: 16 }} />
        <Table dataSource={ranking?.data} rowKey="key_id" onRow={(r) => ({ onClick: () => setSelectedId(r.key_id), style: { cursor: 'pointer' } })} pagination={false} size="middle"
          columns={[
            { title: 'Agent', dataIndex: 'key_name', render: (v: string) => <><RobotOutlined style={{ color: '#1677ff', marginRight: 6 }} />{v}</> },
            { title: '用户', dataIndex: 'owner_name' },
            { title: '部门', dataIndex: 'dept_name' },
            { title: '调用', dataIndex: ['stats', 'today_calls'], render: (v: number) => formatNumber(v) },
            { title: '费用', dataIndex: ['stats', 'today_cost'], render: (v: number) => <span style={{ fontWeight: 600, color: '#1677ff' }}>¥{formatCost(v)}</span> },
            { title: '错误率', key: 'err', render: (_: any, r: any) => <Progress percent={Math.round(r.stats.error_rate * 100)} size="small" strokeColor={r.stats.error_rate > 0.05 ? '#ff4d4f' : '#52c41a'} /> },
            { title: '风险', key: 'risk', render: (_: any, r: any) => { const lv = r.anomaly_flags?.length ? 'high' : r.status === 'warning' ? 'medium' : 'low'; const m: any = { high: ['red', '高'], medium: ['orange', '中'], low: ['green', '低'] }; return <Tag color={m[lv]?.[0]}>{m[lv]?.[1]}</Tag>; }},
          ]}
        />
      </Card>
      <Drawer title="Agent 详情" open={!!selectedId} onClose={() => setSelectedId(null)} width={480}>
        {profile && <div>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Agent 名称">{profile.key_name}</Descriptions.Item>
            <Descriptions.Item label="状态"><Badge status={profile.status === 'normal' ? 'success' : 'error'} text={profile.status === 'normal' ? '正常' : profile.status} /></Descriptions.Item>
            <Descriptions.Item label="所属用户">{profile.owner_name}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{profile.owner_email || '-'}</Descriptions.Item>
            <Descriptions.Item label="部门">{profile.dept_name}</Descriptions.Item>
          </Descriptions>
          <Divider />
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="今日费用">¥{formatCost(profile.stats.today_cost)}</Descriptions.Item>
            <Descriptions.Item label="本月费用">¥{formatCost(profile.stats.month_cost)}</Descriptions.Item>
            <Descriptions.Item label="偏好模型"><Tag color={PROVIDER_COLORS[profile.stats.preferred_model?.split('-')[0]]}>{profile.stats.preferred_model}</Tag></Descriptions.Item>
            <Descriptions.Item label="异常标记">{profile.anomaly_flags?.length ? profile.anomaly_flags.map((f: string) => <Tag key={f} color="red">{f}</Tag>) : '无'}</Descriptions.Item>
          </Descriptions>
        </div>}
      </Drawer>
    </>
  );
}
