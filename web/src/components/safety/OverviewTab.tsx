'use client';

import React from 'react';
import { Card, Row, Col, Table, Tag, Segmented } from 'antd';
import { SafetyCertificateOutlined, StopOutlined, WarningOutlined, CheckCircleOutlined, SecurityScanOutlined } from '@ant-design/icons';
import { formatNumber } from '@/lib/formatters';
import { RISK_COLORS, RISK_LABELS } from '@/lib/constants';

interface Props {
  overview: any;
  isLoading: boolean;
  logs: any;
  resultFilter: string;
  setResultFilter: (v: string) => void;
  page: number;
  setPage: (p: number) => void;
}

export default function OverviewTab({ overview, isLoading, logs, resultFilter, setResultFilter, page, setPage }: Props) {
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

      <Card title="风险分布" size="small">
        {overview?.risk_categories?.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {overview.risk_categories.map((cat: any) => (
              <div key={cat.category} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Tag color={RISK_COLORS[cat.category] || 'default'}>{RISK_LABELS[cat.category] || cat.label}</Tag>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#262626' }}>{cat.count}次</span>
                <span style={{ fontSize: 12, color: '#8c8c8c' }}>({cat.percentage.toFixed(1)}%)</span>
              </div>
            ))}
          </div>
        ) : (
          <span style={{ color: '#8c8c8c' }}>暂无风险数据</span>
        )}
      </Card>

      <Card title="检测记录" extra={<Segmented value={resultFilter} onChange={(v: string) => { setResultFilter(v); setPage(1); }} options={[{ label: '全部', value: 'all' }, { label: '拦截', value: 'block' }, { label: '待审', value: 'review' }]} />}>
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
