'use client';

import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, Space, Popconfirm, Typography, message } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

const { Title } = Typography;

export default function OrgTab() {
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
