'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, Row, Col, DatePicker, Space, Tag, Tooltip, Progress, Empty, Table, Spin } from 'antd';
import {
  DollarOutlined, ThunderboltOutlined, ApiOutlined,
  ArrowUpOutlined, ArrowDownOutlined, MinusOutlined, WarningFilled,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useDashboard } from '@/hooks/useDashboard';
import { formatTokens, formatCost, formatNumber, formatChange } from '@/lib/formatters';
import type { Alert } from '@/types/dashboard';

const { RangePicker } = DatePicker;

const TrendChart = dynamic(() => import('@/components/charts/TrendChart'), { loading: () => <Card loading style={{ height: 340 }} /> });
const ModelPieChart = dynamic(() => import('@/components/charts/ModelPieChart'), { loading: () => <Card loading style={{ height: 340 }} /> });

function ChartFallback() {
  return <Card loading style={{ height: 340 }} />;
}

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);
  const [trendMetric, setTrendMetric] = useState<'cost' | 'tokens'>('cost');

  const { data, isLoading, error } = useDashboard({
    orgId: 'org-default',
    start: dateRange[0].format('YYYY-MM-DD'),
    end: dateRange[1].format('YYYY-MM-DD'),
  });

  if (error) return <Card><Empty description="数据加载失败" /></Card>;
  if (!data && isLoading) return <Card loading style={{ minHeight: 400 }} />;
  if (!data) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>仪表盘</h1>
        <RangePicker value={dateRange} onChange={(d) => d?.[0] && d[1] && setDateRange([d[0], d[1]])} allowClear={false} maxDate={dayjs()} />
      </div>

      <Row gutter={[16, 16]}>
        {[
          { k: 'cost', title: '今日费用', v: formatCost(data.today.cost), c: data.today.cost_change_rate, icon: <DollarOutlined />, color: '#1677ff' },
          { k: 'tokens', title: '今日Token', v: formatTokens(data.today.tokens), c: data.today.tokens_change_rate, icon: <ThunderboltOutlined />, color: '#52c41a' },
          { k: 'calls', title: '今日调用', v: formatNumber(data.today.calls), c: data.today.calls_change_rate, icon: <ApiOutlined />, color: '#faad14' },
          { k: 'budget', title: '月度预算使用', v: `${(data.month.budget_usage_rate * 100).toFixed(1)}%`, c: null, icon: <DollarOutlined />, color: '#722ed1' },
        ].map((card) => {
          const ch = typeof card.c === 'number' ? formatChange(card.c) : null;
          return (
            <Col xs={24} sm={12} lg={6} key={card.k}>
              <Card size="small">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>{card.title}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: card.color }}>{card.v}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontSize: 22, color: card.color, opacity: 0.4 }}>{card.icon}</span>
                    {ch && (
                      <span style={{ fontSize: 11, color: ch.trend === 'up' ? '#ff4d4f' : ch.trend === 'down' ? '#52c41a' : '#8c8c8c' }}>
                        {ch.trend === 'up' ? <ArrowUpOutlined /> : ch.trend === 'down' ? <ArrowDownOutlined /> : <MinusOutlined />} {ch.text}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <TrendChart data={data.daily_trend} metric={trendMetric} onMetricChange={setTrendMetric} />
        </Col>
        <Col xs={24} lg={8}>
          <Card title="月度预算">
            <div style={{ textAlign: 'center' }}>
              <Progress type="dashboard" percent={+(data.month.budget_usage_rate * 100).toFixed(1)}
                strokeColor={{'0%':'#1677ff','80%':'#faad14','95%':'#ff4d4f'}} size={160}
                format={(p) => <div><div style={{fontSize:24,fontWeight:700}}>{p}%</div><div style={{fontSize:11,color:'#8c8c8c'}}>已使用</div></div>} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
              <div style={{background:'#f5f5f5',padding:8,borderRadius:6,textAlign:'center'}}><div style={{fontSize:10,color:'#8c8c8c'}}>已用</div><div style={{fontWeight:700,fontSize:14}}>¥{formatCost(data.month.cost)}</div></div>
              <div style={{background:'#f5f5f5',padding:8,borderRadius:6,textAlign:'center'}}><div style={{fontSize:10,color:'#8c8c8c'}}>预算</div><div style={{fontWeight:700,fontSize:14}}>¥{formatCost(data.month.budget)}</div></div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <ModelPieChart data={data.model_distribution} />
        </Col>
        <Col xs={24} lg={12}>
          <Card title="部门排行">
            <Table dataSource={data.top_depts} rowKey="dept_id" pagination={false} size="small"
              columns={[
                {title:'部门',dataIndex:'dept_name'},
                {title:'费用',dataIndex:'cost',render:(v:number)=><span style={{fontWeight:600}}>¥{formatCost(v)}</span>},
                {title:'Token',dataIndex:'tokens',render:(v:number)=>formatTokens(v)},
                {title:'用户',dataIndex:'user_count',align:'center' as const},
                {title:'趋势',dataIndex:'cost_change_rate',render:(v:number)=>{const ch=formatChange(v);return <span style={{color:ch.trend==='up'?'#ff4d4f':ch.trend==='down'?'#52c41a':'#8c8c8c'}}>{ch.text}</span>}},
              ]} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="用户排行">
            <Table dataSource={data.top_users} rowKey="user_id" pagination={false} size="small"
              columns={[
                {title:'用户',dataIndex:'user_name'},
                {title:'费用',dataIndex:'cost',render:(v:number)=><span style={{fontWeight:600}}>¥{formatCost(v)}</span>},
                {title:'Token',dataIndex:'tokens',render:(v:number)=>formatTokens(v)},
              ]} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="告警列表">
            {data.alerts.length === 0 ? <Empty description="暂无告警" /> : (
              data.alerts.map((a: Alert) => (
                <div key={a.id} style={{padding:'10px 0',borderBottom:'1px solid #f0f0f0',display:'flex',alignItems:'flex-start',gap:8}}>
                  {a.level === 'critical' ? <WarningFilled style={{color:'#ff4d4f',marginTop:2}} /> : a.level === 'warning' ? <WarningFilled style={{color:'#faad14',marginTop:2}} /> : <span style={{color:'#1677ff',marginTop:2}}>ℹ</span>}
                  <div>
                    <div style={{fontWeight:500,fontSize:13}}>{a.title}</div>
                    <div style={{fontSize:12,color:'#8c8c8c'}}>{a.message}</div>
                    <div style={{fontSize:11,color:'#bfbfbf'}}>{new Date(a.timestamp).toLocaleString('zh-CN')}</div>
                  </div>
                </div>
              ))
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
