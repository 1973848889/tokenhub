'use client';

import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, Popconfirm, Tag, Typography, Alert, Tooltip, message } from 'antd';
import { PlusOutlined, KeyOutlined, CopyOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

const { Title } = Typography;

export default function UserTab() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordData, setPasswordData] = useState<{ name: string; password: string } | null>(null);
  const [form] = Form.useForm();

  const userQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const orgs = (await apiClient.get('/api/v1/admin/orgs')).data.data;
      if (!orgs?.length) return [];
      const oid = orgs[0].id;
      const { data } = await apiClient.get(`/api/v1/admin/orgs/${oid}/users`);
      return data.data;
    },
  });

  const deptQuery = useQuery({
    queryKey: ['depts'],
    queryFn: async () => {
      const orgs = (await apiClient.get('/api/v1/admin/orgs')).data.data;
      if (!orgs?.length) return [];
      const oid = orgs[0].id;
      const { data } = await apiClient.get(`/api/v1/admin/orgs/${oid}/depts`);
      return data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (v: any) => {
      const orgsCache = queryClient.getQueryData<any[]>(['orgs']);
      const oid = orgsCache?.[0]?.id || '';
      return apiClient.post('/api/v1/admin/users', { ...v, org_id: oid });
    },
    onSuccess: (res: any) => {
      message.success('用户已创建');
      setModalOpen(false); setEditingUser(null); form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['depts'] });
      if (res.data?.password) { setPasswordData({ name: res.data.name, password: res.data.password }); setPasswordModalOpen(true); }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...v }: any) => apiClient.put(`/api/v1/admin/users/${id}`, v),
    onSuccess: () => { message.success('已更新'); setModalOpen(false); setEditingUser(null); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['users'] }); queryClient.invalidateQueries({ queryKey: ['depts'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/admin/users/${id}`),
    onSuccess: () => { message.success('已删除'); queryClient.invalidateQueries({ queryKey: ['users'] }); queryClient.invalidateQueries({ queryKey: ['depts'] }); },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/v1/admin/users/${id}/reset-password`),
    onSuccess: (res: any) => {
      message.success('密码已重置');
      if (res.data?.password) { setPasswordData({ name: res.data.name, password: res.data.password }); setPasswordModalOpen(true); }
    },
  });

  const handleOpenCreate = () => { setEditingUser(null); form.resetFields(); setModalOpen(true); };
  const handleOpenEdit = (u: any) => { setEditingUser(u); form.setFieldsValue(u); setModalOpen(true); };
  const copyPassword = async (pwd: string) => { await navigator.clipboard.writeText(pwd); message.success('已复制到剪贴板'); };

  const roleMap: Record<string, { color: string; label: string }> = {
    super_admin: { color: 'red', label: '超级管理员' },
    dept_admin: { color: 'orange', label: '部门管理员' },
    admin: { color: 'red', label: '管理员' },
    user: { color: 'blue', label: '普通用户' },
    auditor: { color: 'green', label: '审计员' },
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Title level={4} style={{ margin: 0 }}>用户列表</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>添加用户</Button>
      </div>
      <Table dataSource={userQuery.data} rowKey="id" loading={userQuery.isLoading} pagination={false} size="middle"
        columns={[
          { title: '姓名', dataIndex: 'name', key: 'name', render: (v: string, r: any) => <a onClick={() => handleOpenEdit(r)}>{v}</a> },
          { title: '邮箱', dataIndex: 'email', key: 'email' },
          { title: '部门', dataIndex: 'dept_id', key: 'dept', render: (v: string) => { const d = deptQuery.data?.find((x: any) => x.id === v); return d?.name || v; } },
          { title: '角色', dataIndex: 'role', key: 'role', render: (v: string) => { const m = roleMap[v] || { color: 'default', label: v }; return <Tag color={m.color}>{m.label}</Tag>; } },
          { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleDateString('zh-CN') },
          {
            title: '操作', key: 'actions', width: 220,
            render: (_: any, r: any) => (
              <Space>
                <Button type="link" size="small" onClick={() => handleOpenEdit(r)}>编辑</Button>
                <Popconfirm title="确定重置密码？" description={`将为用户 ${r.name} 重新生成密码`} onConfirm={() => resetPasswordMutation.mutate(r.id)} okText="确认重置" cancelText="取消">
                  <Button type="link" size="small" icon={<KeyOutlined />} loading={resetPasswordMutation.isPending}>重置密码</Button>
                </Popconfirm>
                <Popconfirm title="确定删除？" onConfirm={() => deleteMutation.mutate(r.id)}>
                  <Button type="link" size="small" danger>删除</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditingUser(null); form.resetFields(); }}
        width={520}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => { setModalOpen(false); setEditingUser(null); form.resetFields(); }}>取消</Button>
            <Button type="primary" loading={createMutation.isPending || updateMutation.isPending} onClick={() => form.submit()}>保存</Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={(v) => { if (editingUser?.id) { updateMutation.mutate({ id: editingUser.id, ...v }); } else { createMutation.mutate(v); } }}>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label="邮箱" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="dept_id" label="部门" rules={[{ required: true }]}>
            <Select options={deptQuery.data?.map((d: any) => ({ value: d.id, label: d.name })) || []} />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select options={[
              { value: 'super_admin', label: '超级管理员' },
              { value: 'dept_admin', label: '部门管理员' },
              { value: 'user', label: '普通用户' },
              { value: 'auditor', label: '审计员' },
            ]} />
          </Form.Item>
          {!editingUser && <Alert message="创建后将自动生成初始密码" type="info" showIcon style={{ marginBottom: 16 }} />}
        </Form>
      </Modal>

      <Modal
        title="初始密码"
        open={passwordModalOpen}
        onCancel={() => setPasswordModalOpen(false)}
        footer={[<Button key="close" type="primary" onClick={() => setPasswordModalOpen(false)}>关闭</Button>]}
        width={480}
      >
        {passwordData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Alert message={`用户 ${passwordData.name} 的初始密码，请妥善保管`} type="warning" showIcon />
            <div style={{ padding: '12px 16px', background: '#1e1e1e', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <code style={{ color: '#73d13d', fontSize: 20, fontFamily: 'monospace', letterSpacing: 2, userSelect: 'all' }}>{passwordData.password}</code>
              <Tooltip title="复制密码"><Button type="text" icon={<CopyOutlined />} style={{ color: '#73d13d' }} onClick={() => copyPassword(passwordData.password)} /></Tooltip>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
