'use client';

import React, { useState } from 'react';
import { Card, Row, Col, Tag, Button, Space, Typography, Badge, message, Modal, Form, Input, Select } from 'antd';
import { ApiOutlined, LinkOutlined, DisconnectOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

const { Text, Title } = Typography;
const { TextArea } = Input;

const CATEGORIES = ['办公效率','开发工具','通信集成','数据分析','文件处理'];

export default function ConnectorManagerPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [localConnectors, setLocalConnectors] = useState<any[]>([]);
  const [form] = Form.useForm();

  const { data } = useQuery({
    queryKey: ['market', 'connectors'],
    queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/market/connectors'); return data.data; },
  });

  const connectMutation = useMutation({ mutationFn: (id: string) => apiClient.post(`/api/v1/admin/market/connectors/${id}/connect`), onSuccess: () => { message.success('已连接'); queryClient.invalidateQueries({ queryKey: ['market','connectors'] }); } });
  const disconnectMutation = useMutation({ mutationFn: (id: string) => apiClient.post(`/api/v1/admin/market/connectors/${id}/disconnect`), onSuccess: () => { message.success('已断开'); queryClient.invalidateQueries({ queryKey: ['market','connectors'] }); } });

  const allConnectors = [...(data || []), ...localConnectors];

  const handleCreate = () => {
    form.validateFields().then((values) => {
      const newConn = {
        id: `custom-${Date.now()}`,
        name: values.name,
        description: values.description || '自定义 MCP 连接器',
        category: '自定义',
        auth_type: values.auth_type || 'api_key',
        status: 'disconnected',
        is_official: false,
      };
      setLocalConnectors([...localConnectors, newConn]);
      setModalOpen(false);
      form.resetFields();
      message.success('自定义连接器已创建');
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>连接器管理</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>自定义连接器</Button>
      </div>

      <Row gutter={[16, 16]}>
        {allConnectors.map((c: any) => (
          <Col xs={24} sm={12} lg={8} key={c.id}>
            <Card size="small" style={{ borderRadius: 12, borderColor: c.status === 'connected' ? '#52c41a' : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Space>
                    <ApiOutlined style={{ color: '#1677ff' }} />
                    <Text strong>{c.name}</Text>
                    <Badge status={c.status === 'connected' ? 'success' : 'default'} text={c.status === 'connected' ? '已连接' : '未连接'} />
                  </Space>
                </div>
                {c.id?.startsWith('custom') ? (
                  <Button size="small" danger onClick={() => { setLocalConnectors(localConnectors.filter(lc => lc.id !== c.id)); message.success('已删除'); }}>删除</Button>
                ) : c.status === 'connected' ? (
                  <Button size="small" icon={<DisconnectOutlined />} onClick={() => disconnectMutation.mutate(c.id)}>断开</Button>
                ) : (
                  <Button type="primary" size="small" icon={<LinkOutlined />} onClick={() => connectMutation.mutate(c.id)}>连接</Button>
                )}
              </div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>{c.description}</Text>
              <div style={{ marginTop: 8 }}>
                <Tag>{c.category}</Tag>
                <Tag color="purple">{c.auth_type === 'oauth' ? 'OAuth 2.0' : c.auth_type === 'api_key' ? 'API Key' : c.auth_type}</Tag>
                {c.is_official && <Tag color="gold">官方</Tag>}
                {c.id?.startsWith('custom') && <Tag color="blue">自定义</Tag>}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal title="自定义 MCP 连接器" open={modalOpen} onCancel={() => { setModalOpen(false); form.resetFields(); }} onOk={handleCreate} okText="创建" width={560}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="连接器名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="如：Jira 项目管理" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <TextArea rows={2} placeholder="连接器功能描述" />
          </Form.Item>
          <Space size="large">
            <Form.Item name="auth_type" label="认证方式" initialValue="api_key">
              <Select style={{ width: 140 }} options={[{ value: 'api_key', label: 'API Key' }, { value: 'oauth', label: 'OAuth 2.0' }, { value: 'bearer', label: 'Bearer Token' }, { value: 'basic', label: 'Basic Auth' }]} />
            </Form.Item>
          </Space>
          <Form.Item name="mcp_config" label="MCP 配置 (JSON)">
            <TextArea
              rows={6}
              placeholder={`{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-xxx"],
      "env": {
        "API_KEY": "your-key"
      }
    }
  }
}`}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
