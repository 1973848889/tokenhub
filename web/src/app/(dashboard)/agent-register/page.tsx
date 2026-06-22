'use client';

import React, { useState } from 'react';
import { Card, Table, Button, Tag, Space, Modal, Form, Input, Select, Switch, InputNumber, message, Popconfirm, Typography, Descriptions, Badge } from 'antd';
import { PlusOutlined, EditOutlined, PauseCircleOutlined, PlayCircleOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { formatCost, formatTokens, formatNumber } from '@/lib/formatters';
import { MODEL_LIST } from '@/lib/constants';

const { TextArea } = Input;
const { Title, Text } = Typography;

export default function AgentRegisterPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [detailAgent, setDetailAgent] = useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({ queryKey: ['agents', 'registered'], queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/agents/registered'); return data.data; }, refetchInterval: 15000 });

  const createMutation = useMutation({ mutationFn: (v: any) => apiClient.post('/api/v1/admin/agents/register', v), onSuccess: () => { message.success('Agent 已注册'); setModalOpen(false); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['agents', 'registered'] }); } });
  const updateMutation = useMutation({ mutationFn: ({ id, ...v }: any) => apiClient.put(`/api/v1/admin/agents/registered/${id}`, v), onSuccess: () => { message.success('已更新'); setModalOpen(false); setEditingAgent(null); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['agents', 'registered'] }); } });
  const suspendMutation = useMutation({ mutationFn: (id: string) => apiClient.post(`/api/v1/admin/agents/registered/${id}/suspend`), onSuccess: () => { message.success('已暂停'); queryClient.invalidateQueries({ queryKey: ['agents', 'registered'] }); } });
  const activateMutation = useMutation({ mutationFn: (id: string) => apiClient.post(`/api/v1/admin/agents/registered/${id}/activate`), onSuccess: () => { message.success('已激活'); queryClient.invalidateQueries({ queryKey: ['agents', 'registered'] }); } });
  const deleteMutation = useMutation({ mutationFn: (id: string) => apiClient.delete(`/api/v1/admin/agents/registered/${id}`), onSuccess: () => { message.success('已注销'); queryClient.invalidateQueries({ queryKey: ['agents', 'registered'] }); } });

  const riskMap: Record<string, { color: string; label: string }> = { low: { color: 'green', label: '低风险' }, medium: { color: 'orange', label: '中风险' }, high: { color: 'red', label: '高风险' }, critical: { color: '#ff4d4f', label: '严重' } };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Agent 注册</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingAgent(null); form.resetFields(); setModalOpen(true); }}>注册 Agent</Button>
      </div>

      <Card>
        <Table dataSource={data} rowKey="id" loading={isLoading} pagination={false} size="middle"
          columns={[
            { title: 'Agent', dataIndex: 'name', render: (v: string, r: any) => <a onClick={() => setDetailAgent(r)}>{v}</a> },
            { title: '负责人', dataIndex: 'owner_name' },
            { title: '部门', dataIndex: 'dept_name' },
            { title: '风险等级', dataIndex: 'risk_level', render: (v: string) => <Tag color={riskMap[v]?.color}>{riskMap[v]?.label || v}</Tag> },
            { title: '关联Key', key: 'keys', render: (_: any, r: any) => <Tag>{r.linked_key_ids?.length || 0} 个</Tag> },
            { title: '今日费用', dataIndex: 'today_cost', render: (v: number) => <span style={{ fontWeight: 600, color: '#1677ff' }}>{formatCost(v)}</span> },
            { title: '今日调用', dataIndex: 'today_calls', render: (v: number) => formatNumber(v) },
            { title: '状态', dataIndex: 'status', render: (v: string) => <Badge status={v === 'active' ? 'success' : 'warning'} text={v === 'active' ? '已激活' : '已暂停'} /> },
            {
              title: '操作', key: 'actions', width: 250,
              render: (_: any, r: any) => (
                <Space>
                  <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditingAgent(r); form.setFieldsValue(r); setModalOpen(true); }}>编辑</Button>
                  {r.status === 'active' ? <Button type="link" size="small" icon={<PauseCircleOutlined />} onClick={() => suspendMutation.mutate(r.id)}>暂停</Button> : <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={() => activateMutation.mutate(r.id)}>激活</Button>}
                  <Popconfirm title="确定注销？" onConfirm={() => deleteMutation.mutate(r.id)}><Button type="link" size="small" danger icon={<DeleteOutlined />}>注销</Button></Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal title={editingAgent ? '编辑 Agent' : '注册 Agent'} open={modalOpen} onCancel={() => { setModalOpen(false); setEditingAgent(null); form.resetFields(); }} onOk={() => form.submit()} confirmLoading={createMutation.isPending || updateMutation.isPending} width={600}>
        <Form form={form} layout="vertical" onFinish={(v) => editingAgent ? updateMutation.mutate({ id: editingAgent.id, ...v }) : createMutation.mutate(v)}>
          <Form.Item name="name" label="Agent 名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="用途描述" rules={[{ required: true }]}><TextArea rows={2} /></Form.Item>
          <Form.Item name="owner_name" label="负责人" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="owner_email" label="负责人邮箱"><Input /></Form.Item>
          <Form.Item name="dept_name" label="所属部门"><Input /></Form.Item>
          <Form.Item name="risk_level" label="风险等级" rules={[{ required: true }]}>
            <Select options={[{ value: 'low', label: '低风险' }, { value: 'medium', label: '中风险' }, { value: 'high', label: '高风险' }, { value: 'critical', label: '严重' }]} />
          </Form.Item>
          <Form.Item name="allowed_models" label="允许模型"><Select mode="multiple" options={MODEL_LIST} placeholder="全部" /></Form.Item>
          <Form.Item name="daily_budget" label="日预算 (元)"><InputNumber min={0} max={100000} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="sandbox_required" label="需要沙箱" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>

      <Modal title="Agent 详情" open={!!detailAgent} onCancel={() => setDetailAgent(null)} footer={null} width={560}>
        {detailAgent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="名称">{detailAgent.name}</Descriptions.Item>
              <Descriptions.Item label="用途">{detailAgent.description}</Descriptions.Item>
              <Descriptions.Item label="负责人">{detailAgent.owner_name} ({detailAgent.owner_email})</Descriptions.Item>
              <Descriptions.Item label="部门">{detailAgent.dept_name}</Descriptions.Item>
              <Descriptions.Item label="风险等级"><Tag color={riskMap[detailAgent.risk_level]?.color}>{riskMap[detailAgent.risk_level]?.label}</Tag></Descriptions.Item>
              <Descriptions.Item label="状态"><Badge status={detailAgent.status === 'active' ? 'success' : 'warning'} text={detailAgent.status === 'active' ? '已激活' : '已暂停'} /></Descriptions.Item>
              <Descriptions.Item label="沙箱">{detailAgent.sandbox_required ? '需要' : '不需要'}</Descriptions.Item>
              <Descriptions.Item label="允许模型">{detailAgent.allowed_models?.length ? detailAgent.allowed_models.map((m: string) => <Tag key={m}>{m}</Tag>) : '全部'}</Descriptions.Item>
              <Descriptions.Item label="日预算">{detailAgent.daily_budget > 0 ? `¥${detailAgent.daily_budget}` : '无限制'}</Descriptions.Item>
              <Descriptions.Item label="今日费用">{formatCost(detailAgent.today_cost)}</Descriptions.Item>
              <Descriptions.Item label="今日调用">{formatNumber(detailAgent.today_calls)} 次</Descriptions.Item>
              <Descriptions.Item label="今日Token">{formatTokens(detailAgent.today_tokens)}</Descriptions.Item>
              <Descriptions.Item label="关联Key">{detailAgent.linked_key_ids?.length || 0} 个</Descriptions.Item>
              <Descriptions.Item label="注册时间">{new Date(detailAgent.created_at).toLocaleString('zh-CN')}</Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
}
