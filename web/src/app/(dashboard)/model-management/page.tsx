'use client';

import React, { useEffect } from 'react';
import { Card, Radio, Button, Select, InputNumber, Form, message, Tag, Row, Col, Badge, Typography, Spin } from 'antd';
import { ApiOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { MODEL_LIST, PROVIDER_COLORS } from '@/lib/constants';
import { usePermission } from '@/hooks/usePermission';

const { Title } = Typography;

interface Settings {
  models: { default_strategy: string; enabled_models: string[]; max_tokens_per_call: number };
}

export default function ModelManagementPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const { isAdmin } = usePermission();

  const { data, isLoading } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get('/api/v1/admin/settings', { signal });
      return data;
    },
  });

  useEffect(() => {
    if (data?.models) form.setFieldsValue(data.models);
  }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      await apiClient.put('/api/v1/admin/settings', { models: values });
    },
    onSuccess: () => { message.success('模型配置已保存'); queryClient.invalidateQueries({ queryKey: ['settings'] }); },
    onError: () => message.error('保存失败'),
  });

  if (isLoading) return <Spin style={{ padding: 40 }} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>模型管理</h1>

      <Card title="路由策略">
        <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v)} style={{ maxWidth: 600 }}>
          <Form.Item name="default_strategy" label="默认路由策略">
            <Radio.Group disabled={!isAdmin}>
              <Radio.Button value="cost_optimized">成本优先</Radio.Button>
              <Radio.Button value="balanced">均衡策略</Radio.Button>
              <Radio.Button value="quality_optimized">质量优先</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="enabled_models" label="启用的模型">
            <Select mode="multiple" placeholder="选择模型" options={MODEL_LIST} disabled={!isAdmin} />
          </Form.Item>
          <Form.Item name="max_tokens_per_call" label="单次调用Token上限">
            <InputNumber min={1000} max={1000000} step={10000} style={{ width: '100%' }} addonAfter="tokens" disabled={!isAdmin} />
          </Form.Item>
          {isAdmin && (
            <Form.Item>
              <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={saveMutation.isPending}>保存配置</Button>
            </Form.Item>
          )}
        </Form>
      </Card>

      <Card title={<><ApiOutlined /> 模型状态</>}>
        <Row gutter={[12, 12]}>
          {MODEL_LIST.map((m) => (
            <Col key={m.value} xs={24} sm={12} md={8}>
              <Card size="small">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag color={PROVIDER_COLORS[m.provider] || 'default'}>{m.provider}</Tag>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{m.label}</div>
                    <div style={{ fontSize: 11, color: '#8c8c8c' }}>{m.value}</div>
                  </div>
                  <Badge status={data?.models?.enabled_models?.includes(m.value) ? 'success' : 'default'} text={data?.models?.enabled_models?.includes(m.value) ? '已启用' : '已禁用'} />
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
}
