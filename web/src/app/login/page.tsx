'use client';

import React from 'react';
import { Form, Input, Button, Card, Typography, message, Select } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import apiClient from '@/lib/api-client';

const { Title, Text } = Typography;

const ROLE_CREDENTIALS: Record<string, string> = {
  super_admin: 'zhangsan@company.com',
  dept_admin: 'lisi@company.com',
  user: 'wangwu@company.com',
  auditor: 'sunqi@company.com',
};

const ROLE_OPTIONS = [
  { value: 'super_admin', label: '超级管理员' },
  { value: 'dept_admin', label: '部门管理员' },
  { value: 'user', label: '普通用户' },
  { value: 'auditor', label: '审计员' },
];

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = React.useState(false);

  const onFinish = async (values: { email: string; password: string; role: string }) => {
    setLoading(true);
    try {
      const email = values.email || ROLE_CREDENTIALS[values.role] || ROLE_CREDENTIALS.user;
      const { data } = await apiClient.post('/api/v1/auth/login', {
        email,
        password: values.password || 'any',
      });
      login(data.token, data.refresh_token, data.user);
      message.success(`登录成功 — ${ROLE_OPTIONS.find((o) => o.value === data.user.role)?.label || data.user.role}`);
      router.push('/dashboard');
    } catch {
      message.error('登录失败，请检查凭证');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Card style={{ width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ margin: 0 }}>企业AI治理智能平台</Title>
          <Text type="secondary">企业AI治理智能平台</Text>
        </div>
        <Form onFinish={onFinish} size="large" initialValues={{ role: 'super_admin' }}>
          <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select options={ROLE_OPTIONS} />
          </Form.Item>
          <Form.Item name="email">
            <Input prefix={<UserOutlined />} placeholder="邮箱（留空使用角色默认邮箱）" />
          </Form.Item>
          <Form.Item name="password">
            <Input.Password prefix={<LockOutlined />} placeholder="密码（任意字符）" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>登录</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
