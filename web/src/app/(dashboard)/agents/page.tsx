'use client';

import React, { useState } from 'react';
import { Card, Row, Col, Table, Tag, Space, Segmented, Badge, Descriptions, Typography, Tooltip, Progress, Drawer, Divider } from 'antd';
import { RobotOutlined, WarningOutlined, StopOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useAgentRanking, useAgentProfile, useAgentAnomalies } from '@/hooks/useAgentAnalysis';
import { formatCost, formatTokens, formatNumber, formatLatency } from '@/lib/formatters';
import { PROVIDER_COLORS } from '@/lib/constants';
import type { AgentProfile } from '@/hooks/useAgentAnalysis';

const { Text } = Typography;

export default function AgentAnalysisPage() {
  const [sortBy, setSortBy] = useState('cost');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: ranking } = useAgentRanking({ sort_by: sortBy });
  const { data: profile } = useAgentProfile(selectedId || '');
  const { data: anomalies } = useAgentAnomalies();

  const totalCost = ranking?.data?.reduce((s: number, a: AgentProfile) => s + a.stats.today_cost, 0) ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Agent 分析</h1>
      <RankingTab sortBy={sortBy} setSortBy={setSortBy} ranking={ranking} totalCost={totalCost} anomalies={anomalies} setSelectedId={setSelectedId} profile={profile} selectedId={selectedId} setSelectedId2={setSelectedId} />
    </div>
  );
}

function RankingTab({ sortBy, setSortBy, ranking, totalCost, anomalies, setSelectedId, profile, selectedId, setSelectedId2 }: any) {
  const anomalyCount = anomalies?.data?.length ?? 0;
  const warningCount = ranking?.data?.filter((a: any) => a.status === 'warning').length ?? 0;

  return (
    <>
      <Row gutter={[16, 16]}>
        {[
          { title: '活跃 Agent', value: ranking?.data?.length ?? 0, icon: <RobotOutlined />, color: '#1677ff' },
          { title: '异常 Agent', value: anomalyCount, icon: <WarningOutlined />, color: anomalyCount > 0 ? '#ff4d4f' : '#52c41a' },
          { title: '总费用', value: formatCost(totalCost), icon: <ThunderboltOutlined />, color: '#722ed1' },
          { title: '告警', value: warningCount, icon: <StopOutlined />, color: warningCount > 0 ? '#faad14' : '#52c41a' },
        ].map((card) => (
          <Col xs={12} sm={6} key={card.title}><Card size="small">{/* same card style as before */}<div><Text type="secondary" style={{ fontSize: 12 }}>{card.title}</Text><div style={{ fontSize: 22, fontWeight: 700, color: card.color }}>{card.value}</div></div></Card></Col>
        ))}
      </Row>

      <Card title="Agent 排行榜">
        <Segmented value={sortBy} onChange={setSortBy} options={[{ label: '费用', value: 'cost' }, { label: '调用量', value: 'calls' }, { label: '错误率', value: 'error_rate' }]} style={{ marginBottom: 16 }} />
        <Table dataSource={ranking?.data} rowKey="key_id" onRow={(r) => ({ onClick: () => setSelectedId(r.key_id), style: { cursor: 'pointer' } })} pagination={false} size="middle"
          columns={[
            { title: 'Agent', dataIndex: 'key_name', render: (v: string) => <><RobotOutlined style={{ color: '#1677ff', marginRight: 6 }} />{v}</> },
            { title: '用户', dataIndex: 'owner_name' },
            { title: '部门', dataIndex: 'dept_name' },
            { title: '调用', dataIndex: ['stats', 'today_calls'], render: (v: number) => formatNumber(v) },
            { title: 'Token', dataIndex: ['stats', 'today_tokens'], render: (v: number) => formatTokens(v) },
            { title: '费用', dataIndex: ['stats', 'today_cost'], render: (v: number) => <span style={{ fontWeight: 600, color: '#1677ff' }}>{formatCost(v)}</span> },
            { title: '延迟', dataIndex: ['stats', 'avg_latency_ms'], render: (v: number) => formatLatency(v) },
            { title: '错误率', key: 'err', render: (_: any, r: any) => <Progress percent={Math.round(r.stats.error_rate * 100)} size="small" strokeColor={r.stats.error_rate > 0.05 ? '#ff4d4f' : '#52c41a'} /> },
            { title: '风险', key: 'risk', render: (_: any, r: any) => {
              const lv = r.anomaly_flags?.length ? 'high' : r.status === 'warning' ? 'medium' : 'low';
              const m: any = { high: ['red', '高'], medium: ['orange', '中'], low: ['green', '低'] };
              return <Tag color={m[lv]?.[0]}>{m[lv]?.[1]}</Tag>;
            }},
          ]}
        />
      </Card>

      <Drawer title="Agent 详情" open={!!selectedId} onClose={() => setSelectedId2(null)} width={480}>
        {profile && <div>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="Agent 名称">{profile.key_name}</Descriptions.Item>
            <Descriptions.Item label="状态"><Badge status={profile.status === 'normal' ? 'success' : 'error'} text={profile.status === 'normal' ? '正常' : profile.status} /></Descriptions.Item>
            <Descriptions.Item label="所属用户">{profile.owner_name}</Descriptions.Item>
            <Descriptions.Item label="邮箱">{profile.owner_email || '-'}</Descriptions.Item>
            <Descriptions.Item label="用户角色">
              {(() => {
                const m: Record<string, { color: string; label: string }> = {
                  super_admin: { color: 'red', label: '超级管理员' },
                  dept_admin: { color: 'orange', label: '部门管理员' },
                  user: { color: 'blue', label: '普通用户' },
                  auditor: { color: 'green', label: '审计员' },
                };
                const r = m[profile.owner_role];
                return r ? <Tag color={r.color}>{r.label}</Tag> : profile.owner_role || '-';
              })()}
            </Descriptions.Item>
            <Descriptions.Item label="部门">{profile.dept_name}</Descriptions.Item>
          </Descriptions>
          <Divider />
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="今日费用">{formatCost(profile.stats.today_cost)}</Descriptions.Item>
            <Descriptions.Item label="本月费用">{formatCost(profile.stats.month_cost)}</Descriptions.Item>
            <Descriptions.Item label="偏好模型"><Tag color={PROVIDER_COLORS[profile.stats.preferred_model?.split('-')[0]]}>{profile.stats.preferred_model}</Tag></Descriptions.Item>
            <Descriptions.Item label="今日调用">{formatNumber(profile.stats.today_calls)}</Descriptions.Item>
            <Descriptions.Item label="今日Token">{formatTokens(profile.stats.today_tokens)}</Descriptions.Item>
            <Descriptions.Item label="平均延迟">{formatLatency(profile.stats.avg_latency_ms)}</Descriptions.Item>
            <Descriptions.Item label="错误率">{Math.round(profile.stats.error_rate * 100)}%</Descriptions.Item>
            <Descriptions.Item label="异常标记">{profile.anomaly_flags?.length ? profile.anomaly_flags.map((f: string) => <Tag key={f} color="red">{f}</Tag>) : '无'}</Descriptions.Item>
          </Descriptions>
        </div>}
      </Drawer>
    </>
  );
}
