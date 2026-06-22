'use client';

import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, Popconfirm, Tag, Typography, Divider, message } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

const { Title } = Typography;

export default function DeptTab() {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editDept, setEditDept] = useState<any>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const orgID = 'default';

  const { data: orgs } = useQuery({ queryKey: ['orgs'], queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/orgs'); return data.data; } });

  const deptQuery = useQuery({
    queryKey: ['depts', orgID],
    queryFn: async () => {
      const orgs = (await apiClient.get('/api/v1/admin/orgs')).data.data;
      if (!orgs?.length) return [];
      const firstOrgID = orgs[0].id;
      const { data } = await apiClient.get(`/api/v1/admin/orgs/${firstOrgID}/depts`);
      return data.data;
    },
  });

  const deptUsersQuery = useQuery({
    queryKey: ['dept-users', editDept?.id],
    queryFn: async () => {
      if (!editDept?.id) return [];
      const orgsR = await apiClient.get('/api/v1/admin/orgs');
      const oid = orgsR.data.data[0]?.id;
      if (!oid) return [];
      const { data } = await apiClient.get(`/api/v1/admin/orgs/${oid}/users?dept_id=${editDept.id}`);
      return data.data;
    },
    enabled: !!editDept?.id,
  });

  const allUsersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const orgsR = await apiClient.get('/api/v1/admin/orgs');
      const oid = orgsR.data.data[0]?.id;
      if (!oid) return [];
      const { data } = await apiClient.get(`/api/v1/admin/orgs/${oid}/users`);
      return data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (v: any) => {
      const orgsCache = queryClient.getQueryData<any[]>(['orgs']);
      const oid = orgsCache?.[0]?.id || '';
      return apiClient.post('/api/v1/admin/depts', { ...v, org_id: oid });
    },
    onSuccess: () => { message.success('部门已创建'); setCreateModalOpen(false); createForm.resetFields(); queryClient.invalidateQueries({ queryKey: ['depts'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/admin/depts/${id}`),
    onSuccess: () => { message.success('已删除'); queryClient.invalidateQueries({ queryKey: ['depts'] }); },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => apiClient.put(`/api/v1/admin/depts/${id}`, { name }),
    onSuccess: () => { message.success('已更新'); handleCloseEdit(); queryClient.invalidateQueries({ queryKey: ['depts'] }); },
  });

  const moveUserMutation = useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      apiClient.delete(`/api/v1/admin/users/${userId}/dept`),
    onSuccess: () => { message.success('已移出'); queryClient.invalidateQueries({ queryKey: ['dept-users'] }); queryClient.invalidateQueries({ queryKey: ['depts'] }); },
  });

  const addUserMutation = useMutation({
    mutationFn: ({ userId, name, email, role, deptId }: any) =>
      apiClient.put(`/api/v1/admin/users/${userId}`, { name, email, role, dept_id: deptId }),
    onSuccess: () => { message.success('已添加'); setSelectedUserId(''); queryClient.invalidateQueries({ queryKey: ['dept-users'] }); queryClient.invalidateQueries({ queryKey: ['depts'] }); },
  });

  const handleOpenEdit = (dept: any) => {
    setEditDept(dept);
    editForm.setFieldsValue({ name: dept.name });
    setEditModalOpen(true);
  };

  const handleCloseEdit = () => {
    setEditModalOpen(false);
    setEditDept(null);
    setSelectedUserId('');
    editForm.resetFields();
  };

  const usersNotInDept = (allUsersQuery.data || []).filter(
    (u: any) => !(deptUsersQuery.data || []).some((du: any) => du.id === u.id || du.email === u.email)
  );

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
        <Title level={4} style={{ margin: 0 }}>部门列表</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>创建部门</Button>
      </div>
      <Table dataSource={deptQuery.data} rowKey="id" loading={deptQuery.isLoading} pagination={false} size="middle"
        columns={[
          { title: '名称', dataIndex: 'name', key: 'name' },
          { title: '人数', dataIndex: 'user_count', key: 'user_count', align: 'center' as const },
          { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleDateString('zh-CN') },
          { title: '操作', key: 'actions', width: 160, render: (_: any, r: any) => (
            <Space>
              <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(r)}>编辑</Button>
              <Popconfirm title="确定删除？" onConfirm={() => deleteMutation.mutate(r.id)}>
                <Button type="link" size="small" danger>删除</Button>
              </Popconfirm>
            </Space>
          )},
        ]}
      />
      <Modal title="创建部门" open={createModalOpen} onCancel={() => setCreateModalOpen(false)} onOk={() => createForm.submit()} confirmLoading={createMutation.isPending}>
        <Form form={createForm} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="name" label="部门名称" rules={[{ required: true }]}><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑部门"
        open={editModalOpen}
        onCancel={handleCloseEdit}
        width={640}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={handleCloseEdit}>取消</Button>
            <Button type="primary" loading={editMutation.isPending} onClick={() => editForm.submit()}>保存</Button>
          </div>
        }
      >
        <Form form={editForm} layout="vertical" onFinish={(v) => editMutation.mutate({ id: editDept?.id, name: v.name })}>
          <Form.Item name="name" label="部门名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        </Form>

        <Divider style={{ margin: '16px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Title level={5} style={{ margin: 0 }}>部门成员</Title>
          <Space>
            <Select
              placeholder="选择用户"
              style={{ width: 160 }}
              value={selectedUserId || undefined}
              onChange={setSelectedUserId}
              options={usersNotInDept.map((u: any) => ({ value: u.id, label: u.name }))}
              notFoundContent="暂无可添加的用户"
            />
            <Button
              type="primary"
              size="small"
              disabled={!selectedUserId}
              loading={addUserMutation.isPending}
              onClick={() => {
                const user = allUsersQuery.data?.find((u: any) => u.id === selectedUserId);
                if (user) addUserMutation.mutate({ userId: user.id, name: user.name, email: user.email, role: user.role, deptId: editDept?.id });
              }}
            >添加</Button>
          </Space>
        </div>

        <Table
          dataSource={deptUsersQuery.data}
          rowKey="id"
          loading={deptUsersQuery.isLoading}
          pagination={false}
          size="small"
          locale={{ emptyText: '暂无成员' }}
          columns={[
            { title: '姓名', dataIndex: 'name' },
            { title: '邮箱', dataIndex: 'email' },
            { title: '角色', dataIndex: 'role', render: (v: string) => { const m = roleMap[v] || { color: 'default', label: v }; return <Tag color={m.color}>{m.label}</Tag>; } },
            {
              title: '操作', key: 'actions', width: 80,
              render: (_: any, u: any) => (
                  <Popconfirm
                    title={`确定将 ${u.name} 移出本部门？`}
                    onConfirm={() => moveUserMutation.mutate({ userId: u.id })}
                  >
                    <Button type="link" size="small" danger>移出</Button>
                  </Popconfirm>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
}
