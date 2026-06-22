'use client';

import React, { useState } from 'react';
import { Card, Table, Tag, Button, Modal, Form, Input, Select, message, Space, Switch, Popconfirm, Typography } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ApiOutlined, ReloadOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

const { Text } = Typography;

interface MCPTool {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  author: string;
  is_official: boolean;
  config: string;
  status: string;
  installed: boolean;
  created_at: string;
  updated_at: string;
}

export default function MCPManagementPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['mcp-tools'],
    queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/market/mcp'); return data.data as MCPTool[]; },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      if (editId) {
        const { data } = await apiClient.put(`/api/v1/admin/market/mcp/${editId}`, values);
        return data;
      }
      const { data } = await apiClient.post('/api/v1/admin/market/mcp', values);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mcp-tools'] });
      message.success(editId ? '更新成功' : '创建成功');
      setModalOpen(false);
      setEditId(null);
      form.resetFields();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => { await apiClient.post(`/api/v1/admin/market/mcp/${id}/toggle`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mcp-tools'] }); message.success('状态已切换'); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiClient.delete(`/api/v1/admin/market/mcp/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mcp-tools'] }); message.success('已删除'); },
  });

  const handleEdit = (tool: MCPTool) => {
    setEditId(tool.id);
    form.setFieldsValue(tool);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditId(null);
    form.resetFields();
    setModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>MCP 工具管理</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => qc.invalidateQueries({ queryKey: ['mcp-tools'] })}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>创建 MCP 工具</Button>
        </Space>
      </div>

      <Card>
        <Table dataSource={data || []} rowKey="id" loading={isLoading}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: '名称', dataIndex: 'name', render: (v: string, r: MCPTool) => (
              <Space><ApiOutlined /><Text strong>{v}</Text>{r.is_official && <Tag color="blue" style={{ margin: 0 }}>官方</Tag>}</Space>
            )},
            { title: '分类', dataIndex: 'category', render: (v: string) => <Tag>{v}</Tag> },
            { title: '版本', dataIndex: 'version' },
            { title: '作者', dataIndex: 'author' },
            { title: '描述', dataIndex: 'description', ellipsis: true },
            { title: '状态', dataIndex: 'status', render: (v: string, r: MCPTool) => (
              <Switch checked={v === 'active'} onChange={() => toggleMutation.mutate(r.id)} size="small"
                checkedChildren="启用" unCheckedChildren="禁用" />
            )},
            { title: '创建时间', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleDateString('zh-CN') },
            { title: '操作', key: 'action', render: (_: any, r: MCPTool) => (
              <Space>
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>编辑</Button>
                <Button type="link" size="small" onClick={() => setDetailId(r.id)}>查看配置</Button>
                <Popconfirm title="确定删除此 MCP 工具？" onConfirm={() => deleteMutation.mutate(r.id)}><Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button></Popconfirm>
              </Space>
            )},
          ]}
        />
      </Card>

      <Modal title={editId ? '编辑 MCP 工具' : '创建 MCP 工具'} open={modalOpen} onCancel={() => { setModalOpen(false); setEditId(null); form.resetFields(); }}
        onOk={() => form.submit()} confirmLoading={createMutation.isPending} width={600}>
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input placeholder="MCP 工具名称" /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={2} placeholder="工具描述" /></Form.Item>
          <Form.Item name="category" label="分类" initialValue="系统工具">
            <Select options={[{ value: '系统工具', label: '系统工具' }, { value: '开发工具', label: '开发工具' }, { value: '数据工具', label: '数据工具' }, { value: '通信集成', label: '通信集成' }, { value: '办公效率', label: '办公效率' }]} />
          </Form.Item>
          <Form.Item name="version" label="版本" initialValue="1.0.0"><Input placeholder="1.0.0" /></Form.Item>
          <Form.Item name="author" label="作者" initialValue="管理员"><Input placeholder="作者" /></Form.Item>
          <Form.Item name="is_official" label="官方工具" valuePropName="checked" initialValue={false}><Switch /></Form.Item>
          <Form.Item name="config" label="MCP 配置 (JSON)">
            <Input.TextArea rows={6} placeholder='{"mcpServers":{"myserver":{"command":"npx","args":["-y","@scope/package"]}}}' />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="MCP 配置详情" open={!!detailId} onCancel={() => setDetailId(null)} footer={null} width={640}>
        {detailId && data && (() => {
          const tool = data.find((t: MCPTool) => t.id === detailId);
          return tool ? <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, maxHeight: 400, overflow: 'auto', fontSize: 13 }}>
            {(() => { try { return JSON.stringify(JSON.parse(tool.config), null, 2); } catch { return tool.config; } })()}
          </pre> : null;
        })()}
      </Modal>
    </div>
  );
}
