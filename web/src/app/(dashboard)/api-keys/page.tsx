'use client';

import React, { useState, useCallback } from 'react';
import {
  Card, Table, Button, Tag, Space, Input, Select, Row, Col,
  Statistic, Popconfirm, Tooltip, Drawer, Descriptions, Progress,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, ReloadOutlined,
  DeleteOutlined, EyeOutlined, KeyOutlined, EditOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAPIKeys, useCreateKey, useRevokeKey, useUpdateKey, useToggleKeyStatus } from '@/hooks/useAPIKeys';
import { KeyCreateModal } from '@/components/api-keys/KeyCreateModal';
import { NewKeyRevealModal } from '@/components/api-keys/NewKeyRevealModal';
import { formatTokens, formatCost, formatRelativeTime } from '@/lib/formatters';
import { usePermission } from '@/hooks/usePermission';
import type { APIKey, CreatedKey } from '@/hooks/useAPIKeys';

export default function APIKeysPage() {
  const { isAdmin } = usePermission();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [searchText, setSearchText] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newKeyData, setNewKeyData] = useState<CreatedKey | null>(null);
  const [detailKey, setDetailKey] = useState<APIKey | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<APIKey | null>(null);

  const { data, isLoading, refetch } = useAPIKeys({ page, page_size: 20, status: statusFilter, search: searchText || undefined });
  const createMutation = useCreateKey();
  const revokeMutation = useRevokeKey();
  const updateMutation = useUpdateKey();
  const toggleStatus = useToggleKeyStatus();

  const handleCreate = useCallback((values: any) => {
    createMutation.mutate(values, {
      onSuccess: (result) => { setCreateModalOpen(false); setNewKeyData(result); },
    });
  }, [createMutation]);

  const handleEdit = useCallback((values: any) => {
    if (!editingKey) return;
    updateMutation.mutate({ keyId: editingKey.id, values }, {
      onSuccess: () => { setEditModalOpen(false); setEditingKey(null); setDetailKey(null); },
    });
  }, [editingKey, updateMutation]);

  const columns: ColumnsType<APIKey> = [
    {
      title: '名称 / 前缀', dataIndex: 'name', key: 'name', width: 200,
      render: (name, record) => (
        <Space>
          <KeyOutlined style={{ color: '#1677ff' }} />
          <div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>{name}</div>
            <span style={{ fontSize: 12, color: '#8c8c8c', fontFamily: 'monospace' }}>{record.key_prefix}...</span>
          </div>
        </Space>
      ),
    },
    { title: '用户', dataIndex: 'user_name', key: 'user_name', width: 80, ellipsis: true },
    { title: '部门', dataIndex: 'dept_name', key: 'dept_name', width: 80, ellipsis: true, responsive: ['md'] },
    {
      title: '今日用量', key: 'usage', width: 160,
      render: (_, r) => (
        <div>
          <div style={{ fontSize: 13 }}><span style={{ fontFamily: 'monospace' }}>{formatTokens(r.today_tokens)}</span></div>
          <div style={{ fontSize: 13, color: '#1677ff', fontFamily: 'monospace' }}>{formatCost(r.today_cost)}</div>
        </div>
      ),
    },
    {
      title: '日预算', dataIndex: 'daily_budget', key: 'daily_budget', width: 130,
      render: (budget, r) => {
        if (!budget) return <span style={{ color: '#8c8c8c' }}>无限制</span>;
        const pct = Math.min(r.today_cost / budget, 1);
        return (
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 13 }}>{formatCost(budget)}</div>
            {r.today_cost > 0 && <Progress percent={Math.round(pct * 100)} size="small" strokeColor={pct > 0.9 ? '#ff4d4f' : pct > 0.7 ? '#faad14' : '#1677ff'} />}
          </div>
        );
      },
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 90,
      render: (s: string) => {
        const m: Record<string, { color: string; label: string }> = { active: { color: 'green', label: '正常' }, suspended: { color: 'orange', label: '已停用' }, revoked: { color: 'red', label: '已删除' }, expired: { color: 'default', label: '已过期' } };
        return <Tag color={m[s]?.color}>{m[s]?.label || s}</Tag>;
      },
    },
    { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 110, render: (v: string) => new Date(v).toLocaleDateString('zh-CN'), responsive: ['lg'] },
    ...(isAdmin ? [{
      title: '操作', key: 'actions', width: 180, fixed: 'right' as const,
      render: (_: any, r: APIKey) => (
        <Space size="small">
          <Tooltip title="查看详情"><Button type="text" size="small" icon={<EyeOutlined />} onClick={() => setDetailKey(r)} /></Tooltip>
          {r.status === 'active' && (
            <Popconfirm title="确定停用此Key？" description="停用后该Key将无法调用" onConfirm={() => toggleStatus.mutate({ keyId: r.id, status: 'suspended' })} okText="确定" cancelText="取消">
              <Button type="text" size="small" danger>停用</Button>
            </Popconfirm>
          )}
          {r.status === 'suspended' && (
            <Popconfirm title="确定启用此Key？" onConfirm={() => toggleStatus.mutate({ keyId: r.id, status: 'active' })} okText="确定" cancelText="取消">
              <Button type="text" size="small" style={{ color: '#52c41a' }}>启用</Button>
            </Popconfirm>
          )}
          {(r.status === 'active' || r.status === 'suspended') && (
            <Popconfirm title="确定删除此Key？" description="删除后立即生效且不可恢复" onConfirm={() => revokeMutation.mutate(r.id)} okText="确定" cancelText="取消" okButtonProps={{ danger: true }}>
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    }] : []),
  ];

  const totalActive = data?.data?.filter((k) => k.status === 'active').length ?? 0;
  const totalCost = data?.data?.reduce((s, k) => s + k.today_cost, 0) ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>API Key 管理</h1>

      <Row gutter={16}>
        <Col xs={24} sm={8}><Card size="small"><Statistic title="活跃 Key" value={totalActive} /></Card></Col>
        <Col xs={24} sm={8}><Card size="small"><Statistic title="今日总调用" value={data?.data?.reduce((s, k) => s + k.today_calls, 0) ?? 0} /></Card></Col>
        <Col xs={24} sm={8}><Card size="small"><Statistic title="今日总费用" value={totalCost} prefix="¥" precision={2} /></Card></Col>
      </Row>

      <Card
        title="Key 列表"
        extra={
          <Space>
            <Input placeholder="搜索名称/用户" prefix={<SearchOutlined />} value={searchText} onChange={(e) => { setSearchText(e.target.value); setPage(1); }} allowClear style={{ width: 180 }} />
            <Select value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} placeholder="状态" allowClear style={{ width: 100 }} options={[{ value: 'active', label: '正常' }, { value: 'suspended', label: '已停用' }]} />
            {isAdmin && (
              <>
                <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>创建 Key</Button>
              </>
            )}
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={data?.data}
          rowKey="id"
          loading={isLoading}
          pagination={{ current: page, pageSize: 20, total: data?.total ?? 0, showSizeChanger: true, showTotal: (t) => `共 ${t} 条`, onChange: (p) => setPage(p) }}
          scroll={{ x: 1100 }}
          size="middle"
        />
      </Card>

      <KeyCreateModal open={createModalOpen} onCancel={() => setCreateModalOpen(false)} onSubmit={handleCreate} loading={createMutation.isPending} />

      {newKeyData && <NewKeyRevealModal open={!!newKeyData} apiKey={newKeyData.api_key} keyPrefix={newKeyData.key_prefix} keyId={newKeyData.id} onClose={() => setNewKeyData(null)} />}

      <Drawer title="Key 详情" open={!!detailKey} onClose={() => setDetailKey(null)} width={480}
        extra={
          isAdmin && detailKey?.status === 'active' ? (
            <Button type="primary" icon={<EditOutlined />} onClick={() => { setEditingKey(detailKey); setEditModalOpen(true); }}>
              编辑
            </Button>
          ) : undefined
        }
      >
        {detailKey && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="名称">{detailKey.name}</Descriptions.Item>
            <Descriptions.Item label="API Key">
              <code style={{ fontSize: 12, wordBreak: 'break-all', userSelect: 'all', background: '#f5f5f5', padding: '4px 8px', borderRadius: 4, display: 'block' }}>
                {detailKey.api_key || `${detailKey.key_prefix}...`}
              </code>
            </Descriptions.Item>
            <Descriptions.Item label="用户">{detailKey.user_name}</Descriptions.Item>
            <Descriptions.Item label="部门">{detailKey.dept_name}</Descriptions.Item>
            <Descriptions.Item label="状态"><Tag color={detailKey.status === 'active' ? 'green' : 'red'}>{detailKey.status === 'active' ? '正常' : detailKey.status}</Tag></Descriptions.Item>
            <Descriptions.Item label="日预算">{detailKey.daily_budget > 0 ? `¥${detailKey.daily_budget}` : '无限制'}</Descriptions.Item>
            <Descriptions.Item label="频率限制">{detailKey.rate_limit_rpm} RPM</Descriptions.Item>
            <Descriptions.Item label="可用模型">{detailKey.allowed_models?.length ? detailKey.allowed_models.map((m) => <Tag key={m}>{m}</Tag>) : '全部'}</Descriptions.Item>
            <Descriptions.Item label="今日用量">{formatTokens(detailKey.today_tokens)} tokens / {formatCost(detailKey.today_cost)}</Descriptions.Item>
            <Descriptions.Item label="今日调用">{detailKey.today_calls} 次</Descriptions.Item>
            <Descriptions.Item label="创建时间">{new Date(detailKey.created_at).toLocaleString('zh-CN')}</Descriptions.Item>
            {detailKey.expires_at && <Descriptions.Item label="过期时间">{new Date(detailKey.expires_at).toLocaleString('zh-CN')}</Descriptions.Item>}
          </Descriptions>
        )}
      </Drawer>

      <KeyCreateModal
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); setEditingKey(null); }}
        onSubmit={handleEdit}
        loading={updateMutation.isPending}
        initialValues={editingKey ? {
          name: editingKey.name,
          dept_id: editingKey.dept_id,
          user_id: editingKey.user_id || editingKey.user_name,
          daily_budget: editingKey.daily_budget,
          rate_limit_rpm: editingKey.rate_limit_rpm,
          allowed_models: editingKey.allowed_models,
          allowed_ips: editingKey.allowed_ips,
        } : undefined}
      />
    </div>
  );
}
