'use client';

import React, { useState } from 'react';
import {
  Card, Table, Button, Tag, Space, Modal, Form, Input, Select, Switch,
  message, Popconfirm, Typography,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

const { Title } = Typography;

const CATEGORY_OPTIONS = [
  { value: '研发技术', label: '研发技术' },
  { value: '产品设计', label: '产品设计' },
  { value: '运营市场', label: '运营市场' },
  { value: '财务法务', label: '财务法务' },
  { value: '人力资源', label: '人力资源' },
  { value: '通用办公', label: '通用办公' },
];

export default function ExpertManagementPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const { data: experts, isLoading } = useQuery({
    queryKey: ['market', 'experts', ''],
    queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/market/experts'); return data.data; },
  });

  const createMutation = useMutation({
    mutationFn: (values: any) => apiClient.post('/api/v1/admin/market/experts', values),
    onSuccess: () => { message.success('专家已创建'); closeModal(); queryClient.invalidateQueries({ queryKey: ['market','experts'] }); },
    onError: () => message.error('创建失败'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...values }: any) => apiClient.put(`/api/v1/admin/market/experts/${id}`, values),
    onSuccess: () => { message.success('专家已更新'); closeModal(); queryClient.invalidateQueries({ queryKey: ['market','experts'] }); },
    onError: () => message.error('更新失败'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/admin/market/experts/${id}`),
    onSuccess: () => { message.success('专家已删除'); queryClient.invalidateQueries({ queryKey: ['market','experts'] }); },
    onError: () => message.error('删除失败'),
  });

  const closeModal = () => { setModalOpen(false); setEditingId(null); form.resetFields(); };

  const handleCreate = () => { form.resetFields(); setEditingId(null); setModalOpen(true); };

  const handleEdit = (expert: any) => { form.setFieldsValue(expert); setEditingId(expert.id); setModalOpen(true); };

  const handleSubmit = (values: any) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...values });
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>专家管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>上架专家</Button>
      </div>

      <Card>
        <Table
          dataSource={experts}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          size="middle"
          columns={[
            { title: '名称', dataIndex: 'name', width: 180, render: (v: string, r: any) => <><span style={{ marginRight: 6 }}>{r.avatar}</span>{v}</> },
            { title: '分类', dataIndex: 'category', width: 100, render: (v: string) => <Tag color="blue">{v}</Tag> },
            { title: '作者', dataIndex: 'author', width: 80 },
            { title: '评分', dataIndex: 'rating', width: 80, render: (v: number) => v > 0 ? v.toFixed(1) : '-' },
            { title: '使用', dataIndex: 'usage_count', width: 80 },
            { title: '官方', dataIndex: 'is_official', width: 70, render: (v: boolean) => v ? <Tag color="gold">官方</Tag> : <Tag>社区</Tag> },
            { title: '订阅', dataIndex: 'subscribed', width: 70, render: (v: boolean) => v ? <Tag color="blue">已订阅</Tag> : <Tag>未订阅</Tag> },
            { title: '创建时间', dataIndex: 'created_at', width: 110, render: (v: string) => new Date(v).toLocaleDateString('zh-CN') },
            {
              title: '操作', key: 'actions', width: 120,
              render: (_: any, r: any) => (
                <Space>
                  <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>编辑</Button>
                  <Popconfirm title="确定删除？" onConfirm={() => deleteMutation.mutate(r.id)}>
                    <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={editingId ? '编辑专家' : '上架专家'}
        open={modalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={640}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ is_official: false, skills: [], connectors: [], tasks: [] }}>
          <Form.Item name="name" label="专家名称" rules={[{ required: true }]}><Input placeholder="如：代码审查专家" /></Form.Item>
          <Form.Item name="avatar" label="头像 (Emoji)" rules={[{ required: true }]}><Input placeholder="如：💻" maxLength={4} /></Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select options={CATEGORY_OPTIONS} placeholder="选择分类" />
          </Form.Item>
          <Form.Item name="description" label="描述" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="简要描述专家能力" />
          </Form.Item>
          <Form.Item name="persona" label="人设 (System Prompt)">
            <Input.TextArea rows={3} placeholder="专家的系统提示词/人设" />
          </Form.Item>
          <Form.Item name="author" label="作者" rules={[{ required: true }]}>
            <Input placeholder="如：官方 / 张三" />
          </Form.Item>
          <Form.Item name="is_official" label="官方专家" valuePropName="checked">
            <Switch checkedChildren="官方" unCheckedChildren="社区" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
