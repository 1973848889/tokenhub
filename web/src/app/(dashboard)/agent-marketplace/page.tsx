'use client';

import React, { useState } from 'react';
import {
  Card, Row, Col, Tag, Button, Space, Typography, Segmented, Modal, Descriptions,
  Table, Form, Input, Select, Switch, message, Alert, Popconfirm,
} from 'antd';
import {
  StarFilled, UserAddOutlined, CopyOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import apiClient from '@/lib/api-client';

const { Text, Title } = Typography;
const CATEGORIES = ['研发技术','产品设计','运营市场','财务法务','人力资源','通用办公'];
const CATEGORY_OPTIONS = CATEGORIES.map(c => ({ value: c, label: c }));

export default function AgentMarketplacePage() {
  const { isAdmin } = usePermission();
  const [tab, setTab] = useState('marketplace');
  const [category, setCategory] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['market', 'experts', category],
    queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/market/experts', { params: { category: category || '' } }); return data.data; },
  });

  const detailData = data?.find((e: any) => e.id === detailId);

  const subscribeMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/v1/admin/market/experts/${id}/subscribe`),
    onSuccess: (res: any) => {
      if (res.data?.api_key) { setNewApiKey(res.data.api_key); } else { message.success('操作成功'); }
      queryClient.invalidateQueries({ queryKey: ['market','experts'] });
    },
    onError: () => message.error('操作失败'),
  });

  const copyKey = async (key: string) => { await navigator.clipboard.writeText(key); message.success('已复制'); };

  const allExperts = data || [];
  const marketplace = tab === 'marketplace' ? allExperts : allExperts.filter((e: any) => e.subscribed);

  const tabOptions = [
    { label: '专家市场', value: 'marketplace' },
    { label: `我的专家 (${allExperts.filter((e: any) => e.subscribed).length})`, value: 'my' },
  ];
  if (isAdmin) tabOptions.push({ label: '管理', value: 'manage' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>专家市场</h1>
        <Segmented value={tab} onChange={setTab} options={tabOptions} />
      </div>

      {tab === 'marketplace' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Tag color={category === '' ? 'blue' : 'default'} style={{ cursor: 'pointer', padding: '4px 12px', borderRadius: 16, fontSize: 13 }} onClick={() => setCategory('')}>全部</Tag>
          {CATEGORIES.map(c => (
            <Tag key={c} color={category === c ? 'blue' : 'default'} style={{ cursor: 'pointer', padding: '4px 12px', borderRadius: 16, fontSize: 13 }} onClick={() => setCategory(c)}>{c}</Tag>
          ))}
        </div>
      )}

      {(tab === 'marketplace' || tab === 'my') && (
        <Row gutter={[16, 16]}>
          {marketplace.map((expert: any) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={expert.id}>
              <Card hoverable style={{ borderRadius: 12 }}
                onClick={() => setDetailId(expert.id)}
                extra={<span style={{ visibility: expert.subscribed ? 'visible' : 'hidden' }}><Tag color="blue">已订阅</Tag></span>}
              >
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 48 }}>{expert.avatar}</div>
                  <Title level={5} style={{ margin: '8px 0 4px' }}>{expert.name}</Title>
                  <Tag color="blue">{expert.category}</Tag>
                  {expert.is_official && <Tag color="gold">官方</Tag>}
                </div>
                <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }} ellipsis>{expert.description}</Text>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span><StarFilled style={{ color: '#faad14' }} /> {expert.rating}</span>
                  <span style={{ color: '#8c8c8c', fontSize: 12 }}>{expert.usage_count} 次使用</span>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {tab === 'manage' && isAdmin && <ManageTab />}

      <Modal title="专家详情" open={!!detailId} onCancel={() => setDetailId(null)} width={600}
        footer={detailData ? [
          <Button key="sub" type={detailData.subscribed ? 'default' : 'primary'} icon={<UserAddOutlined />}
            onClick={() => { subscribeMutation.mutate(detailData.id); if (detailData.subscribed) setDetailId(null); }} loading={subscribeMutation.isPending}>
            {detailData.subscribed ? '取消订阅' : '订阅专家'}
          </Button>,
          <Button key="close" onClick={() => setDetailId(null)}>关闭</Button>,
        ].filter(Boolean) : undefined}
      >
        {detailData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 48 }}>{detailData.avatar}</span>
              <div>
                <Title level={4} style={{ margin: 0 }}>{detailData.name}</Title>
                <Space><Tag color="blue">{detailData.category}</Tag>{detailData.is_official && <Tag color="gold">官方</Tag>}<span><StarFilled style={{ color: '#faad14' }} /> {detailData.rating}</span></Space>
              </div>
            </div>
            <Text>{detailData.description}</Text>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="人设">{detailData.persona}</Descriptions.Item>
              <Descriptions.Item label="作者">{detailData.author}</Descriptions.Item>
              <Descriptions.Item label="使用次数">{detailData.usage_count}</Descriptions.Item>
              <Descriptions.Item label="示例任务">{detailData.tasks?.join(' / ')}</Descriptions.Item>
            </Descriptions>
            {detailData.subscribed && detailData.api_key_prefix && (
              <Alert type="success" showIcon message="API Key 已生成" description={`前缀: ${detailData.api_key_prefix}... (订阅时返回完整Key，可在 API Key 管理页查看)`} />
            )}
          </div>
        )}
      </Modal>

      <Modal title="订阅成功 - API Key" open={!!newApiKey} onCancel={() => setNewApiKey(null)} footer={[<Button key="close" type="primary" onClick={() => setNewApiKey(null)}>我已保存，关闭</Button>]} width={560}>
        <Alert message="请立即复制 API Key，关闭后不再显示" type="warning" showIcon style={{ marginBottom: 16 }} />
        <div style={{ background: '#1e1e1e', padding: '14px 16px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <code style={{ color: '#73d13d', fontSize: 14, wordBreak: 'break-all', userSelect: 'all', flex: 1 }}>{newApiKey}</code>
          <Button type="text" icon={<CopyOutlined />} style={{ color: '#73d13d' }} onClick={() => copyKey(newApiKey!)} />
        </div>
        <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 12 }}>
          使用此 Key 调用 /v1/chat/completions 即可自动注入专家人设
        </Text>
      </Modal>
    </div>
  );
}

function ManageTab() {
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
  const handleSubmit = (values: any) => { editingId ? updateMutation.mutate({ id: editingId, ...values }) : createMutation.mutate(values); };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ is_official: false }}>
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
    </>
  );
}
