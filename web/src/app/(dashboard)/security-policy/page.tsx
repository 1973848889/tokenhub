'use client';

import React, { useEffect } from 'react';
import { Card, Form, InputNumber, Switch, Button, message, Typography, Spin } from 'antd';
import { SafetyCertificateOutlined, SaveOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { usePermission } from '@/hooks/usePermission';

const { Title } = Typography;

interface Settings {
  security: { sensitive_filter_enabled: boolean; pii_mask_enabled: boolean; injection_detect_enabled: boolean; log_retention_days: number };
}

export default function SecurityPolicyPage() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const { isAdmin } = usePermission();

  const { data, isLoading } = useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: async ({ signal }) => { const { data } = await apiClient.get('/api/v1/admin/settings', { signal }); return data; },
  });

  useEffect(() => { if (data?.security) form.setFieldsValue(data.security); }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: any) => { await apiClient.put('/api/v1/admin/settings', { security: values }); },
    onSuccess: () => { message.success('安全策略已保存'); queryClient.invalidateQueries({ queryKey: ['settings'] }); },
    onError: () => message.error('保存失败'),
  });

  if (isLoading) return <Spin style={{ padding: 40 }} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>安全策略</h1>

      <Card title={<><SafetyCertificateOutlined /> 检测开关</>}>
        <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v)} style={{ maxWidth: 500 }}>
          <Form.Item name="sensitive_filter_enabled" label="敏感词过滤" valuePropName="checked" tooltip="启用基于AC自动机的实时敏感词检测">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" disabled={!isAdmin} />
          </Form.Item>
          <Form.Item name="pii_mask_enabled" label="PII检测脱敏" valuePropName="checked" tooltip="自动检测并脱敏身份证/手机号/银行卡/邮箱等个人信息">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" disabled={!isAdmin} />
          </Form.Item>
          <Form.Item name="injection_detect_enabled" label="注入攻击检测" valuePropName="checked" tooltip="检测Prompt Injection等攻击行为">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" disabled={!isAdmin} />
          </Form.Item>
          <Form.Item name="log_retention_days" label="日志保留天数" tooltip="安全日志和调用日志的保留时长">
            <InputNumber min={30} max={365} style={{ width: '100%' }} addonAfter="天" disabled={!isAdmin} />
          </Form.Item>
          {isAdmin && (
            <Form.Item>
              <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={saveMutation.isPending}>保存策略</Button>
            </Form.Item>
          )}
        </Form>
      </Card>
    </div>
  );
}
