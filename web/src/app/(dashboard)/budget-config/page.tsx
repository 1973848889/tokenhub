'use client';

import React, { useEffect } from 'react';
import { Card, Form, InputNumber, Switch, Button, Slider, message, Typography, Row, Col, Statistic, Alert, Spin } from 'antd';
import { DollarOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { formatCost } from '@/lib/formatters';
import { usePermission } from '@/hooks/usePermission';

const { Title } = Typography;

interface Settings {
  budget: { org_monthly_budget: number; default_key_budget: number; alert_threshold: number; auto_block_agent: boolean };
  organization: { plan: string; status: string };
}

export default function BudgetConfigPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const { isAdmin } = usePermission();

  const { data, isLoading } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: async ({ signal }) => { const { data } = await apiClient.get('/api/v1/admin/settings', { signal }); return data; },
  });

  useEffect(() => { if (data?.budget) form.setFieldsValue(data.budget); }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: any) => { await apiClient.put('/api/v1/admin/settings', { budget: values }); },
    onSuccess: () => { message.success('预算配置已保存'); queryClient.invalidateQueries({ queryKey: ['settings'] }); },
    onError: () => message.error('保存失败'),
  });

  if (isLoading) return <Spin style={{ padding: 40 }} />;

  const plan = data?.organization?.plan || '专业版';
  const status = data?.organization?.status === 'active' ? '运行中' : '已停用';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>预算配置</h1>

      <Row gutter={16}>
        <Col xs={24} sm={8}><Card size="small"><Statistic title="当前计划" value={plan} /></Card></Col>
        <Col xs={24} sm={8}><Card size="small"><Statistic title="状态" value={status} /></Card></Col>
        <Col xs={24} sm={8}><Card size="small"><Statistic title="月度预算" value={`¥${formatCost(data?.budget?.org_monthly_budget ?? 0)}`} /></Card></Col>
      </Row>

      <Alert message="预算配置修改后立即生效，所有Key的调用将受新规则约束" type="warning" showIcon style={{ maxWidth: 600 }} />

      <Card title="预算参数">
        <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v)} style={{ maxWidth: 500 }}>
          <Form.Item name="org_monthly_budget" label="组织月度预算 (元)" tooltip="公司整体月度AI调用预算上限">
            <InputNumber min={0} max={10000000} step={1000} style={{ width: '100%' }} addonAfter="元/月" disabled={!isAdmin} />
          </Form.Item>
          <Form.Item name="default_key_budget" label="默认Key日预算 (元)" tooltip="新创建Key的默认每日预算">
            <InputNumber min={0} max={100000} step={10} style={{ width: '100%' }} addonAfter="元/天" disabled={!isAdmin} />
          </Form.Item>
          <Form.Item name="alert_threshold" label="告警阈值" tooltip="预算使用率达到此值触发告警">
            <Slider min={0.5} max={1.0} step={0.05} disabled={!isAdmin} marks={{ 0.5: '50%', 0.7: '70%', 0.8: '80%', 0.9: '90%', 1.0: '100%' }} />
          </Form.Item>
          <Form.Item name="auto_block_agent" label="Agent异常自动阻断" valuePropName="checked" tooltip="检测到死循环/费用突增时自动阻断Agent">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" disabled={!isAdmin} />
          </Form.Item>
          {isAdmin && (
            <Form.Item>
              <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={saveMutation.isPending}>保存配置</Button>
            </Form.Item>
          )}
        </Form>
      </Card>
    </div>
  );
}
