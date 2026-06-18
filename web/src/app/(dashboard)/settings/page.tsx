'use client';

import React, { useState, useEffect } from 'react';
import {
  Card, Tabs, Table, Button, Modal, Form, Input, Select, Popconfirm,
  Space, Tag, message, Empty, Typography, Alert, Tooltip, Divider, Row, Col,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, TeamOutlined, BankOutlined, UserOutlined,
  KeyOutlined, CopyOutlined, EditOutlined, AuditOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { usePermission } from '@/hooks/usePermission';

const { Title } = Typography;

export default function OrgManagementPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>组织管理</h1>
      <Card bodyStyle={{ padding: 0 }}>
        <Tabs tabPosition="left" style={{ minHeight: 500 }}
          items={[
            { key: 'orgs', label: <span><BankOutlined /> 组织</span>, children: <OrgTab /> },
            { key: 'depts', label: <span><TeamOutlined /> 部门</span>, children: <DeptTab /> },
            { key: 'users', label: <span><UserOutlined /> 用户</span>, children: <UserTab /> },
            { key: 'audit', label: <span><AuditOutlined /> 权限审计</span>, children: <AuditTab /> },
          ]}
        />
      </Card>
    </div>
  );
}

function OrgTab() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<any>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({ queryKey: ['orgs'], queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/orgs'); return data.data; } });

  const createMutation = useMutation({
    mutationFn: (v: any) => apiClient.post('/api/v1/admin/orgs', v),
    onSuccess: () => { message.success('组织已创建'); setModalOpen(false); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['orgs'] }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...v }: any) => apiClient.put(`/api/v1/admin/orgs/${id}`, v),
    onSuccess: () => { message.success('组织已更新'); setEditModalOpen(false); setEditingOrg(null); queryClient.invalidateQueries({ queryKey: ['orgs'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/admin/orgs/${id}`),
    onSuccess: () => { message.success('已删除'); queryClient.invalidateQueries({ queryKey: ['orgs'] }); },
  });

  const handleOpenEdit = (org: any) => { setEditingOrg(org); form.setFieldsValue({ name: org.name }); setEditModalOpen(true); };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Title level={4} style={{ margin: 0 }}>组织列表</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>创建组织</Button>
      </div>
      <Table dataSource={data} rowKey="id" loading={isLoading} pagination={false} size="middle"
        columns={[
          { title: '名称', dataIndex: 'name', key: 'name' },
          { title: '创建时间', dataIndex: 'created_at', key: 'created_at', render: (v: string) => new Date(v).toLocaleDateString('zh-CN') },
          { title: '操作', key: 'actions', width: 130, render: (_: any, r: any) => (
            <Space>
              <Button type="text" icon={<EditOutlined />} size="small" onClick={() => handleOpenEdit(r)} />
              <Popconfirm title="确定删除？" onConfirm={() => deleteMutation.mutate(r.id)}>
                <Button type="text" danger icon={<DeleteOutlined />} size="small" />
              </Popconfirm>
            </Space>
          )},
        ]}
      />
      <Modal title="创建组织" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} confirmLoading={createMutation.isPending}>
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)}>
          <Form.Item name="name" label="组织名称" rules={[{ required: true }]}><Input /></Form.Item>
        </Form>
      </Modal>
      <Modal
        title="修改组织"
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); setEditingOrg(null); }}
        onOk={() => form.submit()}
        confirmLoading={updateMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={(v) => updateMutation.mutate({ id: editingOrg.id, ...v })}>
          <Form.Item name="name" label="组织名称" rules={[{ required: true }]}><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function DeptTab() {
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
    onSuccess: () => { message.success('已更新'); queryClient.invalidateQueries({ queryKey: ['depts'] }); },
  });

  const moveUserMutation = useMutation({
    mutationFn: ({ userId, name, email, role, deptId }: any) =>
      apiClient.put(`/api/v1/admin/users/${userId}`, { name, email, role, dept_id: deptId }),
    onSuccess: () => { message.success('已移出'); queryClient.invalidateQueries({ queryKey: ['dept-users', 'depts'] }); },
  });

  const addUserMutation = useMutation({
    mutationFn: ({ userId, name, email, role, deptId }: any) =>
      apiClient.put(`/api/v1/admin/users/${userId}`, { name, email, role, dept_id: deptId }),
    onSuccess: () => { message.success('已添加'); setSelectedUserId(''); queryClient.invalidateQueries({ queryKey: ['dept-users', 'depts'] }); },
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
  };

  const otherDepts = (deptQuery.data || []).filter((d: any) => d.id !== editDept?.id);
  const usersNotInDept = (allUsersQuery.data || []).filter(
    (u: any) => !(deptUsersQuery.data || []).some((du: any) => du.id === u.id)
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
        footer={null}
        width={640}
      >
        <Form form={editForm} layout="vertical" onFinish={(v) => editMutation.mutate({ id: editDept?.id, name: v.name })}>
          <Form.Item name="name" label="部门名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={editMutation.isPending}>保存名称</Button>
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
              render: (_: any, u: any) => {
                if (otherDepts.length === 0) {
                  return <Tooltip title="没有其他部门可移入"><Button type="link" size="small" danger disabled>移出</Button></Tooltip>;
                }
                const targetDept = otherDepts[0];
                return (
                  <Popconfirm
                    title={`确定将 ${u.name} 移出本部门？将移入「${targetDept.name}」`}
                    onConfirm={() => moveUserMutation.mutate({ userId: u.id, name: u.name, email: u.email, role: u.role, deptId: targetDept.id })}
                  >
                    <Button type="link" size="small" danger>移出</Button>
                  </Popconfirm>
                );
              },
            },
          ]}
        />
      </Modal>
    </div>
  );
}

function UserTab() {
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
      queryClient.invalidateQueries({ queryKey: ['users','depts'] });
      if (res.data?.password) { setPasswordData({ name: res.data.name, password: res.data.password }); setPasswordModalOpen(true); }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...v }: any) => apiClient.put(`/api/v1/admin/users/${id}`, v),
    onSuccess: () => { message.success('已更新'); setModalOpen(false); setEditingUser(null); form.resetFields(); queryClient.invalidateQueries({ queryKey: ['users','depts'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/admin/users/${id}`),
    onSuccess: () => { message.success('已删除'); queryClient.invalidateQueries({ queryKey: ['users','depts'] }); },
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
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical" onFinish={(v) => editingUser ? updateMutation.mutate({ id: editingUser.id, ...v }) : createMutation.mutate(v)}>
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

function AuditTab() {
  const { data: accessData } = useQuery({
    queryKey: ['security', 'access-control'],
    queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/security/access-control'); return data; },
  });

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Title level={4} style={{ margin: 0 }}>权限审计</Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={<><TeamOutlined /> 角色权限矩阵</>}>
            <Table dataSource={accessData?.roles || []} rowKey="name" pagination={false} size="middle"
              columns={[
                { title: '角色', dataIndex: 'name', render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
                { title: '权限', dataIndex: 'permissions', render: (v: string[]) => v?.map((p: string) => <Tag key={p} color="blue">{p}</Tag>) },
                { title: '人数', dataIndex: 'user_count', align: 'center' as const },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<><AuditOutlined /> 登录审计</>}>
            <Table dataSource={accessData?.login_logs || []} rowKey="id" pagination={false} size="small"
              columns={[
                { title: '用户', dataIndex: 'user' },
                { title: '时间', dataIndex: 'time', render: (v: string) => new Date(v).toLocaleString('zh-CN') },
                { title: 'IP', dataIndex: 'ip' },
                { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === 'success' ? 'green' : 'red'}>{v === 'success' ? '成功' : '失败'}</Tag> },
                { title: '位置', dataIndex: 'location' },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
