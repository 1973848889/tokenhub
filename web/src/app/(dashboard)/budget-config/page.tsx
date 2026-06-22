'use client';

import React, { useEffect, useState } from 'react';
import { Card, Form, InputNumber, Switch, Button, Slider, message, Typography, Alert, Spin, Table, Input, Checkbox } from 'antd';
import { DollarOutlined, SaveOutlined, TeamOutlined, UserOutlined, EditOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { formatCost } from '@/lib/formatters';

export default function BudgetConfigPage() {
  const [tab, setTab] = useState('dept');
  const [deptBudgets, setDeptBudgets] = useState<Record<string, number>>({});
  const [userBudgets, setUserBudgets] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState(false);
  const [origDept, setOrigDept] = useState<Record<string, number>>({});
  const [origUser, setOrigUser] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const [form] = Form.useForm();

  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async ({ signal }) => { const { data } = await apiClient.get('/api/v1/admin/settings', { signal }); return data; },
  });

  useEffect(() => { if (settingsData?.budget) form.setFieldsValue(settingsData.budget); }, [settingsData, form]);

  const handleStartEdit = () => {
    setOrigDept({ ...deptBudgets });
    setOrigUser({ ...userBudgets });
    setEditing(true);
  };

  const handleCancelEdit = async () => {
    setSaving(true);
    try {
      const revertPromises: Promise<any>[] = [];
      Object.entries(origDept).forEach(([id, budget]) => {
        if (deptBudgets[id] !== budget) {
          revertPromises.push(apiClient.put(`/api/v1/admin/depts/${id}/budget`, { monthly_budget: budget }));
        }
      });
      Object.entries(origUser).forEach(([id, budget]) => {
        if (userBudgets[id] !== budget) {
          revertPromises.push(apiClient.put(`/api/v1/admin/users/${id}/budget`, { monthly_budget: budget }));
        }
      });
      if (revertPromises.length > 0) await Promise.all(revertPromises);

      setDeptBudgets({ ...origDept });
      setUserBudgets({ ...origUser });
      form.setFieldsValue(settingsData?.budget || {});
      queryClient.invalidateQueries({ queryKey: ['depts'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    } catch {
      message.error('还原失败');
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await apiClient.put('/api/v1/admin/settings', { budget: form.getFieldsValue() });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      message.success('预算配置已保存');
      setEditing(false);
    } catch (e: any) {
      message.error(e?.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeptBudgetSave = async (id: string, budget: number) => {
    setDeptBudgets(prev => ({ ...prev, [id]: budget }));
    try {
      await apiClient.put(`/api/v1/admin/depts/${id}/budget`, { monthly_budget: budget });
      queryClient.invalidateQueries({ queryKey: ['depts'] });
    } catch {
      message.error('保存失败');
    }
  };

  const handleUserBudgetSave = async (id: string, budget: number) => {
    setUserBudgets(prev => ({ ...prev, [id]: budget }));
    try {
      await apiClient.put(`/api/v1/admin/users/${id}/budget`, { monthly_budget: budget });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch {
      message.error('保存失败');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>预算配置</h1>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {!editing ? (
          <Button type="primary" icon={<EditOutlined />} onClick={handleStartEdit}>编辑</Button>
        ) : (
          <>
            <Button onClick={handleCancelEdit} loading={saving}>取消编辑</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveAll} loading={saving}>保存全局配置</Button>
          </>
        )}
        <Checkbox checked={tab === 'dept'} disabled={!editing} onChange={() => setTab('dept')}>
          <TeamOutlined /> 按部门月度预算
        </Checkbox>
        <Checkbox checked={tab === 'user'} disabled={!editing} onChange={() => setTab('user')}>
          <UserOutlined /> 按用户月度预算
        </Checkbox>
      </div>
      <div style={{ display: tab === 'dept' ? 'block' : 'none' }}>
        <DeptBudgetTab
          budgets={deptBudgets}
          setBudgets={setDeptBudgets}
          editing={editing}
          onSave={handleDeptBudgetSave}
        />
      </div>
      <div style={{ display: tab === 'user' ? 'block' : 'none' }}>
        <UserBudgetTab
          budgets={userBudgets}
          setBudgets={setUserBudgets}
          editing={editing}
          onSave={handleUserBudgetSave}
        />
      </div>
      <GlobalSettingsSection editing={editing} form={form} settingsData={settingsData} isLoading={settingsLoading} />
    </div>
  );
}

function DeptBudgetTab({ budgets, setBudgets, editing, onSave }: {
  budgets: Record<string, number>;
  setBudgets: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  editing: boolean;
  onSave: (id: string, budget: number) => void;
}) {
  const { data: orgs } = useQuery({
    queryKey: ['orgs'],
    queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/orgs'); return data.data; },
  });

  const oid = orgs?.[0]?.id;

  const { data: depts, isLoading } = useQuery({
    queryKey: ['depts'],
    queryFn: async () => {
      if (!oid) return [];
      const { data } = await apiClient.get(`/api/v1/admin/orgs/${oid}/depts`);
      return data.data;
    },
    enabled: !!oid,
  });

  useEffect(() => {
    if (depts && Object.keys(budgets).length === 0) {
      const map: Record<string, number> = {};
      depts.forEach((d: any) => { map[d.id] = d.monthly_budget || 0; });
      setBudgets(map);
    }
  }, [depts]);

  const formatTokensFromBudget = (budget: number) => {
    const tokens = Math.round(budget * 1000);
    return tokens > 0 ? `${(tokens / 10000).toFixed(1)} 万` : '-';
  };

  return (
    <Card title="按部门月度预算">
      <Table dataSource={depts} rowKey="id" loading={isLoading} pagination={false} size="middle"
        columns={[
          { title: '部门', dataIndex: 'name', key: 'name' },
          { title: '人数', dataIndex: 'user_count', key: 'user_count', align: 'center' as const },
          {
            title: 'Token 数', key: 'tokens', align: 'center' as const,
            render: (_: any, r: any) => formatTokensFromBudget(budgets[r.id] ?? r.monthly_budget ?? 0),
          },
          {
            title: '月度预算', dataIndex: 'monthly_budget', key: 'budget', width: 260,
            render: (_v: number, r: any) => (
              <InlineBudgetEditor
                value={budgets[r.id] ?? r.monthly_budget ?? 0}
                onSave={(val) => onSave(r.id, val)}
                disabled={!editing}
              />
            ),
          },
        ]}
      />
    </Card>
  );
}

function UserBudgetTab({ budgets, setBudgets, editing, onSave }: {
  budgets: Record<string, number>;
  setBudgets: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  editing: boolean;
  onSave: (id: string, budget: number) => void;
}) {
  const { data: orgs } = useQuery({
    queryKey: ['orgs'],
    queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/orgs'); return data.data; },
  });

  const oid = orgs?.[0]?.id;

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      if (!oid) return [];
      const { data } = await apiClient.get(`/api/v1/admin/orgs/${oid}/users`);
      return data.data;
    },
    enabled: !!oid,
  });

  const { data: depts } = useQuery({
    queryKey: ['depts'],
    queryFn: async () => {
      if (!oid) return [];
      const { data } = await apiClient.get(`/api/v1/admin/orgs/${oid}/depts`);
      return data.data;
    },
    enabled: !!oid,
  });

  useEffect(() => {
    if (users && Object.keys(budgets).length === 0) {
      const map: Record<string, number> = {};
      users.forEach((u: any) => { map[u.id] = u.monthly_budget || 0; });
      setBudgets(map);
    }
  }, [users]);

  const formatTokensFromBudget = (budget: number) => {
    const tokens = Math.round(budget * 1000);
    return tokens > 0 ? `${(tokens / 10000).toFixed(1)} 万` : '-';
  };

  return (
    <Card title="按用户月度预算">
      <Table dataSource={users} rowKey="id" loading={isLoading} pagination={false} size="middle"
        columns={[
          { title: '用户', dataIndex: 'name', key: 'name' },
          {
            title: '部门', dataIndex: 'dept_id', key: 'dept',
            render: (v: string) => { const d = depts?.find((x: any) => x.id === v); return d?.name || v; },
          },
          { title: '角色', dataIndex: 'role', key: 'role' },
          {
            title: 'Token 数', key: 'tokens', align: 'center' as const,
            render: (_: any, r: any) => formatTokensFromBudget(budgets[r.id] ?? r.monthly_budget ?? 0),
          },
          {
            title: '月度预算', dataIndex: 'monthly_budget', key: 'budget', width: 260,
            render: (_v: number, r: any) => (
              <InlineBudgetEditor
                value={budgets[r.id] ?? r.monthly_budget ?? 0}
                onSave={(val) => onSave(r.id, val)}
                disabled={!editing}
              />
            ),
          },
        ]}
      />
    </Card>
  );
}

function InlineBudgetEditor({ value, onSave, disabled }: { value: number; onSave: (v: number) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState(value || 0);
  const [displayVal, setDisplayVal] = useState(value || 0);

  useEffect(() => { setVal(value || 0); setDisplayVal(value || 0); }, [value]);

  const handleSave = () => {
    setDisplayVal(val);
    onSave(val);
    setOpen(false);
  };

  if (!open) {
    return (
      <span style={{ cursor: disabled ? 'default' : 'pointer' }} onClick={() => !disabled && setOpen(true)}>
        {displayVal ? formatCost(displayVal) : <span style={{ color: '#bfbfbf' }}>未设置</span>}
      </span>
    );
  }

  return (
    <Input.Group compact>
      <InputNumber
        min={0} max={10000000} step={1000}
        value={val}
        onChange={(v) => setVal(v || 0)}
        style={{ width: 150 }}
        addonBefore="¥"
        autoFocus
      />
      <Button type="primary" size="small" onClick={handleSave}>保存</Button>
      <Button size="small" onClick={() => { setVal(value || 0); setOpen(false); }}>取消</Button>
    </Input.Group>
  );
}

function GlobalSettingsSection({ editing, form, settingsData, isLoading }: { editing: boolean; form: any; settingsData: any; isLoading: boolean }) {
  useEffect(() => { if (settingsData?.budget) form.setFieldsValue(settingsData.budget); }, [settingsData, form]);

  if (isLoading) return <Spin />;

  return (
    <>
      <Alert message="预算配置修改后立即生效，所有Key的调用将受新规则约束" type="warning" showIcon />
      <Card title="全局参数">
        <Form form={form} layout="vertical" style={{ maxWidth: 500 }}>
          <Form.Item name="alert_threshold" label="告警阈值" tooltip="预算使用率达到此值触发告警">
            <Slider min={0.5} max={1.0} step={0.05} disabled={!editing} marks={{ 0.5: '50%', 0.7: '70%', 0.8: '80%', 0.9: '90%', 1.0: '100%' }} />
          </Form.Item>
          <Form.Item name="auto_block_agent" label="Agent异常自动阻断" valuePropName="checked" tooltip="检测到死循环/费用突增时自动阻断Agent">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" disabled={!editing} />
          </Form.Item>
        </Form>
      </Card>
    </>
  );
}
