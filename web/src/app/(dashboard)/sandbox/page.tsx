'use client';

import React, { useState } from 'react';
import { Card, Table, Tag, Button, Modal, Input, Space, Segmented, Descriptions, Switch, InputNumber, Row, Col, Typography, message, Empty } from 'antd';
import { SafetyCertificateOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, SettingOutlined, HistoryOutlined, ExperimentOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

const { TextArea } = Input;
const { Text, Title } = Typography;

export default function SandboxPage() {
  const [activeTab, setActiveTab] = useState('queue');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>沙箱管理</h1>
      <Card bodyStyle={{ padding: 0 }}>
        <div style={{ padding: '16px 24px 0' }}>
          <Segmented value={activeTab} onChange={setActiveTab}
            options={[
              { label: '审核队列', value: 'queue', icon: <ClockCircleOutlined /> },
              { label: '沙箱规则', value: 'rules', icon: <SettingOutlined /> },
              { label: '审核历史', value: 'history', icon: <HistoryOutlined /> },
            ]}
          />
        </div>
        <div style={{ padding: 24 }}>
          {activeTab === 'queue' && <ReviewQueue />}
          {activeTab === 'rules' && <SandboxRules />}
          {activeTab === 'history' && <ReviewHistory />}
        </div>
      </Card>
    </div>
  );
}

function ReviewQueue() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('pending');
  const [detailReview, setDetailReview] = useState<any>(null);
  const [note, setNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['sandbox', 'reviews', filter],
    queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/sandbox/reviews', { params: { status: filter === 'all' ? '' : filter } }); return data.data; },
    refetchInterval: 15000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/v1/admin/sandbox/reviews/${id}/approve`, { note }),
    onSuccess: () => { message.success('已通过'); setDetailReview(null); setNote(''); queryClient.invalidateQueries({ queryKey: ['sandbox', 'reviews'] }); },
  });
  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/v1/admin/sandbox/reviews/${id}/reject`, { note }),
    onSuccess: () => { message.success('已拒绝'); setDetailReview(null); setNote(''); queryClient.invalidateQueries({ queryKey: ['sandbox', 'reviews'] }); },
  });

  const riskColor: Record<string, string> = { high: 'red', medium: 'orange', low: 'green' };

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Segmented value={filter} onChange={(v) => setFilter(v as string)}
          options={[{ label: '全部', value: 'all' }, { label: '待审核', value: 'pending' }, { label: '已通过', value: 'approved' }, { label: '已拒绝', value: 'rejected' }]} />
      </div>

      <Table dataSource={data} rowKey="id" loading={isLoading} pagination={false} size="middle"
        columns={[
          { title: 'Agent', dataIndex: 'agent_name' },
          { title: '风险', dataIndex: 'risk_level', render: (v: string) => <Tag color={riskColor[v] || 'default'}>{v === 'high' ? '高' : v === 'medium' ? '中' : v}</Tag> },
          { title: '提示词', dataIndex: 'user_prompt', ellipsis: true, render: (v: string) => <Text style={{ maxWidth: 200 }} ellipsis>{v}</Text> },
          { title: '状态', dataIndex: 'review_status', render: (v: string) => {
            const m: any = { pending: ['orange', '待审核'], approved: ['green', '已通过'], rejected: ['red', '已拒绝'] };
            return <Tag color={m[v]?.[0]}>{m[v]?.[1] || v}</Tag>;
          }},
          { title: '时间', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleTimeString('zh-CN') },
          { title: '操作', key: 'action', render: (_: any, r: any) => (
            <Button type="link" size="small" onClick={() => setDetailReview(r)}>查看详情</Button>
          )},
        ]}
      />

      <Modal title="审核详情" open={!!detailReview} onCancel={() => setDetailReview(null)} width={680}
        footer={detailReview?.review_status === 'pending' ? [
          <Button key="reject" danger icon={<CloseCircleOutlined />} onClick={() => rejectMutation.mutate(detailReview.id)} loading={rejectMutation.isPending}>拒绝</Button>,
          <Button key="approve" type="primary" icon={<CheckCircleOutlined />} onClick={() => approveMutation.mutate(detailReview.id)} loading={approveMutation.isPending}>通过</Button>,
        ] : [<Button key="close" onClick={() => setDetailReview(null)}>关闭</Button>]}
      >
        {detailReview && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="Agent">{detailReview.agent_name}</Descriptions.Item>
              <Descriptions.Item label="风险"><Tag color={riskColor[detailReview.risk_level]}>{detailReview.risk_level}</Tag></Descriptions.Item>
              <Descriptions.Item label="状态"><Tag>{detailReview.review_status}</Tag></Descriptions.Item>
              <Descriptions.Item label="审核人">{detailReview.reviewer || '-'}</Descriptions.Item>
            </Descriptions>
            <div><Text strong>用户提示词：</Text><div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, marginTop: 4 }}>{detailReview.user_prompt}</div></div>
            <div><Text strong>模型输出：</Text><div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, marginTop: 4, whiteSpace: 'pre-wrap' }}>{detailReview.model_output}</div></div>
            {detailReview.review_status === 'pending' && (
              <div><Text strong>审核备注：</Text><TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="输入审核意见（可选）" rows={2} style={{ marginTop: 4 }} /></div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

function SandboxRules() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['sandbox', 'rules'],
    queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/sandbox/rules'); return data; },
  });
  const [localRules, setLocalRules] = useState<any>(null);

  React.useEffect(() => { if (data) setLocalRules({ ...data }); }, [data]);

  const saveMutation = useMutation({
    mutationFn: (v: any) => apiClient.put('/api/v1/admin/sandbox/rules', v),
    onSuccess: () => { message.success('规则已保存'); queryClient.invalidateQueries({ queryKey: ['sandbox', 'rules'] }); },
  });

  if (!localRules) return <Empty />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card title="自动触发条件">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 400 }}>
            <span>Agent 风险等级 = 严重 → 自动沙箱</span>
            <Switch checked={localRules.auto_by_risk_critical} onChange={(v) => setLocalRules({ ...localRules, auto_by_risk_critical: v })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 400 }}>
            <span>Agent 风险等级 = 高 → 自动沙箱</span>
            <Switch checked={localRules.auto_by_risk_high} onChange={(v) => setLocalRules({ ...localRules, auto_by_risk_high: v })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 400 }}>
            <span>单次 Token {'>'} 阈值 → 自动沙箱</span>
            <InputNumber value={localRules.token_threshold} onChange={(v) => setLocalRules({ ...localRules, token_threshold: v })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 400 }}>
            <span>调用频次 {'>'} 阈值 → 自动沙箱</span>
            <InputNumber value={localRules.call_rate_threshold} onChange={(v) => setLocalRules({ ...localRules, call_rate_threshold: v })} addonAfter="次/分钟" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 400 }}>
            <span>安全拦截 {'>'} 阈值 → 自动沙箱</span>
            <InputNumber value={localRules.safety_block_threshold} onChange={(v) => setLocalRules({ ...localRules, safety_block_threshold: v })} addonAfter="次/天" />
          </div>
        </Space>
        <Button type="primary" onClick={() => saveMutation.mutate(localRules)} loading={saveMutation.isPending} style={{ marginTop: 16 }}>保存规则</Button>
      </Card>

      <Card title="Agent 沙箱状态">
        <Table dataSource={Object.entries(localRules.agent_sandbox_status || {}).map(([k, v]) => ({ id: k, enabled: v }))} rowKey="id" pagination={false} size="small"
          columns={[
            { title: 'Agent ID', dataIndex: 'id' },
            { title: '沙箱', dataIndex: 'enabled', render: (v: boolean) => <Tag color={v ? 'red' : 'green'}>{v ? '已开启' : '已关闭'}</Tag> },
          ]}
        />
      </Card>
    </div>
  );
}

function ReviewHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ['sandbox', 'reviews', 'all'],
    queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/sandbox/reviews', { params: { status: '' } }); return data.data; },
  });

  return (
    <Table dataSource={data} rowKey="id" loading={isLoading} pagination={false} size="middle"
      columns={[
        { title: '时间', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString('zh-CN') },
        { title: 'Agent', dataIndex: 'agent_name' },
        { title: '审核人', dataIndex: 'reviewer', render: (v: string) => v || '-' },
        { title: '结果', dataIndex: 'review_status', render: (v: string) => {
          const m: any = { approved: ['green', '通过'], rejected: ['red', '拒绝'], pending: ['orange', '待审'] };
          return <Tag color={m[v]?.[0]}>{m[v]?.[1] || v}</Tag>;
        }},
        { title: '备注', dataIndex: 'review_note', render: (v: string) => v || '-' },
      ]}
    />
  );
}
