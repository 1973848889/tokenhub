'use client';

import React, { useEffect, useState } from 'react';
import {
  Card, Row, Col, Table, Tag, Switch, Descriptions, Typography, Space, Badge,
  Form, InputNumber, Button, message, Spin, Empty, Segmented, Input, Modal, Select,
} from 'antd';
import {
  SafetyCertificateOutlined, KeyOutlined, UserOutlined, TeamOutlined,
  SaveOutlined, EditOutlined, ExperimentOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
  SettingOutlined, HistoryOutlined, StopOutlined, PlusOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { RISK_COLORS, RISK_LABELS } from '@/lib/constants';
import { Popconfirm } from 'antd';

const { Title, Text } = Typography;

export default function AccessControlPage() {
  const [activeTab, setActiveTab] = useState('security');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>安全配置</h1>

      <Card bodyStyle={{ padding: 0 }}>
        <div style={{ padding: '16px 24px 0' }}>
          <Segmented value={activeTab} onChange={setActiveTab}
            options={[
              { label: '安全策略', value: 'security', icon: <SafetyCertificateOutlined /> },
              { label: 'API Key 策略', value: 'apikey', icon: <KeyOutlined /> },
              { label: '沙箱管理', value: 'sandbox', icon: <ExperimentOutlined /> },
              { label: '敏感词库', value: 'words', icon: <StopOutlined /> },
              { label: 'DLP 规则', value: 'dlp', icon: <SafetyCertificateOutlined /> },
            ]}
          />
        </div>

        <div style={{ padding: 24 }}>
          {activeTab === 'security' && <SecurityPolicyTab />}
          {activeTab === 'apikey' && <APIKeyPolicyTab />}
          {activeTab === 'sandbox' && <SandboxTab />}
          {activeTab === 'words' && <SensitiveWordsTab />}
          {activeTab === 'dlp' && <DLPTab />}
        </div>
      </Card>
    </div>
  );
}

function SecurityPolicyTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async ({ signal }) => { const { data } = await apiClient.get('/api/v1/admin/settings', { signal }); return data; },
  });

  useEffect(() => { if (data?.security) form.setFieldsValue(data.security); }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: any) => { await apiClient.put('/api/v1/admin/settings', { security: values }); },
    onSuccess: () => { message.success('安全策略已保存'); queryClient.invalidateQueries({ queryKey: ['settings'] }); },
    onError: () => message.error('保存失败'),
  });

  if (isLoading) return <Card loading />;

  return (
    <Card title={<><SafetyCertificateOutlined /> 检测开关</>}>
      <Form form={form} layout="inline" onFinish={(v) => saveMutation.mutate(v)} style={{ gap: 16, flexWrap: 'wrap' }}>
        <Form.Item name="sensitive_filter_enabled" label="敏感词过滤" valuePropName="checked">
          <Switch checkedChildren="启用" unCheckedChildren="禁用" />
        </Form.Item>
        <Form.Item name="pii_mask_enabled" label="PII脱敏" valuePropName="checked">
          <Switch checkedChildren="启用" unCheckedChildren="禁用" />
        </Form.Item>
        <Form.Item name="injection_detect_enabled" label="注入攻击检测" valuePropName="checked">
          <Switch checkedChildren="启用" unCheckedChildren="禁用" />
        </Form.Item>
        <Form.Item name="log_retention_days" label="日志保留(天)">
          <InputNumber min={30} max={365} style={{ width: 100 }} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={saveMutation.isPending}>保存</Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

function APIKeyPolicyTab() {
  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm();
  const [policies, setPolicies] = useState({
    default_expire_days: 365,
    force_rotate_days: 90,
    min_key_length: 32,
    require_ip_whitelist: false,
    max_keys_per_user: 10,
  });

  const handleSave = () => {
    const values = form.getFieldsValue();
    setPolicies(values);
    setEditing(false);
    message.success('API Key 策略已保存');
  };

  return (
    <Card
      title={<><KeyOutlined /> API Key 策略配置</>}
      extra={!editing ? <Button icon={<EditOutlined />} onClick={() => { form.setFieldsValue(policies); setEditing(true); }}>编辑</Button> : null}
    >
      {editing ? (
        <Form form={form} layout="vertical" initialValues={policies} onFinish={handleSave} style={{ maxWidth: 500 }}>
          <Form.Item name="default_expire_days" label="默认过期时间 (天)" tooltip="新创建Key的默认有效期">
            <InputNumber min={30} max={3650} step={30} style={{ width: '100%' }} addonAfter="天" />
          </Form.Item>
          <Form.Item name="force_rotate_days" label="强制轮换周期 (天)" tooltip="Key使用超过此天数强制要求轮换">
            <InputNumber min={30} max={365} step={30} style={{ width: '100%' }} addonAfter="天" />
          </Form.Item>
          <Form.Item name="min_key_length" label="密钥最小长度" tooltip="API Key随机字节数">
            <InputNumber min={16} max={64} style={{ width: '100%' }} addonAfter="字节" />
          </Form.Item>
          <Form.Item name="max_keys_per_user" label="每人最大Key数" tooltip="单个用户最多可创建的Key数量">
            <InputNumber min={1} max={50} style={{ width: '100%' }} addonAfter="个" />
          </Form.Item>
          <Form.Item name="require_ip_whitelist" label="强制IP白名单" valuePropName="checked" tooltip="新Key必须配置IP白名单">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>保存</Button>
              <Button onClick={() => setEditing(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      ) : (
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="默认过期时间">{policies.default_expire_days} 天</Descriptions.Item>
          <Descriptions.Item label="强制轮换周期">{policies.force_rotate_days} 天</Descriptions.Item>
          <Descriptions.Item label="密钥最小长度">{policies.min_key_length} 字节</Descriptions.Item>
          <Descriptions.Item label="每人最大Key数">{policies.max_keys_per_user} 个</Descriptions.Item>
          <Descriptions.Item label="Key 前缀">sk-tok-</Descriptions.Item>
          <Descriptions.Item label="强制IP白名单"><Badge status={policies.require_ip_whitelist ? 'success' : 'default'} text={policies.require_ip_whitelist ? '是' : '否'} /></Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  );
}

function SandboxTab() {
  const queryClient = useQueryClient();
  const [sandboxSubTab, setSandboxSubTab] = useState('queue');
  const [reviewFilter, setReviewFilter] = useState('pending');
  const [detailReview, setDetailReview] = useState<any>(null);
  const [note, setNote] = useState('');

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['sandbox', 'reviews', reviewFilter],
    queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/sandbox/reviews', { params: { status: reviewFilter === 'all' ? '' : reviewFilter } }); return data.data; },
    refetchInterval: 15000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/v1/admin/sandbox/reviews/${id}/approve`, { note }),
    onSuccess: () => { message.success('已通过'); setDetailReview(null); setNote(''); queryClient.invalidateQueries({ queryKey: ['sandbox', 'reviews'] }); },
  });
  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/v1/admin/sandbox/reviews/${id}/reject`, { note }),
    onSuccess: () => { message.success('已拒绝'); setDetailReview(null); setNote(''); queryClient.invalidateQueries({ queryKey: ['sandbox', 'reviews'] }); },
  });

  const riskColor: Record<string, string> = { high: 'red', medium: 'orange', low: 'green' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Segmented value={sandboxSubTab} onChange={(v) => setSandboxSubTab(v as string)}
        options={[
          { label: '审核队列', value: 'queue', icon: <ClockCircleOutlined /> },
          { label: '沙箱规则', value: 'rules', icon: <SettingOutlined /> },
          { label: '审核历史', value: 'history', icon: <HistoryOutlined /> },
        ]}
      />

      {sandboxSubTab === 'queue' && (
        <>
          <Segmented value={reviewFilter} onChange={(v) => setReviewFilter(v as string)}
            options={[{ label: '全部', value: 'all' }, { label: '待审核', value: 'pending' }, { label: '已通过', value: 'approved' }, { label: '已拒绝', value: 'rejected' }]} />
          <Table dataSource={reviews} rowKey="id" loading={reviewsLoading} pagination={false} size="middle"
            columns={[
              { title: 'Agent', dataIndex: 'agent_name' },
              { title: '风险', dataIndex: 'risk_level', render: (v: string) => <Tag color={riskColor[v] || 'default'}>{v === 'high' ? '高' : v === 'medium' ? '中' : v}</Tag> },
              { title: '提示词', dataIndex: 'user_prompt', ellipsis: true },
              { title: '状态', dataIndex: 'review_status', render: (v: string) => {
                const m: any = { pending: ['orange', '待审核'], approved: ['green', '已通过'], rejected: ['red', '已拒绝'] };
                return <Tag color={m[v]?.[0]}>{m[v]?.[1] || v}</Tag>;
              }},
              { title: '操作', key: 'action', render: (_: any, r: any) => <Button type="link" size="small" onClick={() => setDetailReview(r)}>查看详情</Button> },
            ]}
          />
          <Modal title="审核详情" open={!!detailReview} onCancel={() => setDetailReview(null)} width={680}
            footer={detailReview?.review_status === 'pending' ? [
              <Button key="reject" danger icon={<CloseCircleOutlined />} onClick={() => rejectMutation.mutate(detailReview.id)}>拒绝</Button>,
              <Button key="approve" type="primary" icon={<CheckCircleOutlined />} onClick={() => approveMutation.mutate(detailReview.id)}>通过</Button>,
            ] : [<Button key="close" onClick={() => setDetailReview(null)}>关闭</Button>]}
          >
            {detailReview && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Descriptions column={2} size="small" bordered>
                  <Descriptions.Item label="Agent">{detailReview.agent_name}</Descriptions.Item>
                  <Descriptions.Item label="风险"><Tag color={riskColor[detailReview.risk_level]}>{detailReview.risk_level}</Tag></Descriptions.Item>
                </Descriptions>
                <div><Text strong>用户提示词：</Text><div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, marginTop: 4 }}>{detailReview.user_prompt}</div></div>
                <div><Text strong>模型输出：</Text><div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, marginTop: 4, whiteSpace: 'pre-wrap' }}>{detailReview.model_output}</div></div>
                {detailReview.review_status === 'pending' && (
                  <div><Text strong>审核备注：</Text><Input.TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="输入审核意见" rows={2} /></div>
                )}
              </div>
            )}
          </Modal>
        </>
      )}

      {sandboxSubTab === 'rules' && <SandboxRulesTab />}
      {sandboxSubTab === 'history' && <SandboxHistoryTab />}
    </div>
  );
}

function SandboxRulesTab() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['sandbox', 'rules'],
    queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/sandbox/rules'); return data; },
  });
  const [localRules, setLocalRules] = useState<any>(null);
  React.useEffect(() => { if (data) setLocalRules({ ...data }); }, [data]);
  const saveMutation = useMutation({
    mutationFn: (v: any) => apiClient.put('/api/v1/admin/sandbox/rules', v),
    onSuccess: () => { message.success('规则已保存'); queryClient.invalidateQueries({ queryKey: ['sandbox', 'rules'] }); },
  });
  if (!localRules) return <Empty />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card title="自动触发条件" size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 400 }}>
            <span>Agent 风险等级 = 严重 → 自动沙箱</span>
            <Switch checked={localRules.auto_by_risk_critical} onChange={(v) => setLocalRules({ ...localRules, auto_by_risk_critical: v })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 400 }}>
            <span>Agent 风险等级 = 高 → 自动沙箱</span>
            <Switch checked={localRules.auto_by_risk_high} onChange={(v) => setLocalRules({ ...localRules, auto_by_risk_high: v })} />
          </div>
        </Space>
        <Button type="primary" onClick={() => saveMutation.mutate(localRules)} loading={saveMutation.isPending} style={{ marginTop: 12 }}>保存规则</Button>
      </Card>
      <Card title="Agent 沙箱状态" size="small">
        <Table dataSource={Object.entries(localRules.agent_sandbox_status || {}).map(([k, v]) => ({ id: k, enabled: v }))} rowKey="id" pagination={false} size="small"
          columns={[
            { title: 'Agent ID', dataIndex: 'id' },
            { title: '沙箱', dataIndex: 'enabled', render: (v: boolean) => <Tag color={v ? 'red' : 'green'}>{v ? '已开启' : '已关闭'}</Tag> },
          ]}
        />
      </Card>
    </div>
  );
}

function SandboxHistoryTab() {
  const { data } = useQuery({
    queryKey: ['sandbox', 'reviews', 'all'],
    queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/sandbox/reviews', { params: { status: '' } }); return data.data; },
  });
  return (
    <Table dataSource={data} rowKey="id" pagination={false} size="middle"
      columns={[
        { title: '时间', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString('zh-CN') },
        { title: 'Agent', dataIndex: 'agent_name' },
        { title: '审核人', dataIndex: 'reviewer', render: (v: string) => v || '-' },
        { title: '结果', dataIndex: 'review_status', render: (v: string) => {
          const m: any = { approved: ['green', '通过'], rejected: ['red', '拒绝'], pending: ['orange', '待审'] };
          return <Tag color={m[v]?.[0]}>{m[v]?.[1] || v}</Tag>;
        }},
        { title: '备注', dataIndex: 'review_note', render: (v: string) => v || '-' },
      ]}
    />
  );
}

function SensitiveWordsTab() {
  const [words, setWords] = useState([
    { word: '敏感词A', category: 'political', level: 'block' },
    { word: '违禁品', category: 'drug', level: 'block' },
    { word: '赌博', category: 'gambling', level: 'block' },
    { word: '色情', category: 'porn', level: 'block' },
    { word: '暴力', category: 'violence', level: 'block' },
    { word: '诈骗', category: 'fraud', level: 'block' },
  ]);
  const [newWord, setNewWord] = useState('');
  const [newCat, setNewCat] = useState('political');

  const addWord = () => {
    if (!newWord) return;
    setWords([...words, { word: newWord, category: newCat, level: 'block' }]);
    setNewWord(''); message.success('已添加（演示模式）');
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Input placeholder="输入敏感词" value={newWord} onChange={(e) => setNewWord(e.target.value)} style={{ width: 200 }} />
        <Select value={newCat} onChange={setNewCat} style={{ width: 120 }} options={Object.entries(RISK_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
        <Button type="primary" icon={<PlusOutlined />} onClick={addWord}>添加</Button>
      </div>
      <Table dataSource={words} rowKey="word" pagination={false} size="middle"
        columns={[
          { title: '敏感词', dataIndex: 'word' },
          { title: '分类', dataIndex: 'category', render: (v: string) => <Tag color={RISK_COLORS[v]}>{RISK_LABELS[v] || v}</Tag> },
          { title: '级别', dataIndex: 'level', render: (v: string) => <Tag color={v === 'block' ? 'red' : 'orange'}>{v === 'block' ? '拦截' : '告警'}</Tag> },
          { title: '操作', key: 'action', render: (_: any, r: any) => (
            <Popconfirm title="确定删除？" onConfirm={() => { setWords(words.filter(w => w.word !== r.word)); message.success('已删除（演示模式）'); }}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )},
        ]}
      />
    </div>
  );
}

function DLPTab() {
  const rules = [
    { id: 1, name: '身份证号脱敏', category: 'PII', level: 'L2-内部', action: 'mask', enabled: true, hits: 89 },
    { id: 2, name: '手机号脱敏', category: 'PII', level: 'L2-内部', action: 'mask', enabled: true, hits: 156 },
    { id: 3, name: '银行卡号拦截', category: '金融', level: 'L3-机密', action: 'block', enabled: true, hits: 12 },
    { id: 4, name: '公司机密文档检测', category: '商业机密', level: 'L4-绝密', action: 'block', enabled: true, hits: 5 },
    { id: 5, name: '竞品名称过滤', category: '商业敏感', level: 'L2-内部', action: 'warn', enabled: false, hits: 0 },
  ];

  return (
    <Table dataSource={rules} rowKey="id" pagination={false} size="middle"
      columns={[
        { title: '规则名称', dataIndex: 'name' },
        { title: '分类', dataIndex: 'category', render: (v: string) => <Tag>{v}</Tag> },
        { title: '数据级别', dataIndex: 'level', render: (v: string) => <Tag color={v.includes('绝密') ? 'red' : v.includes('机密') ? 'orange' : 'blue'}>{v}</Tag> },
        { title: '动作', dataIndex: 'action', render: (v: string) => <Tag color={v === 'block' ? 'red' : v === 'mask' ? 'orange' : 'gold'}>{v === 'block' ? '拦截' : v === 'mask' ? '脱敏' : '告警'}</Tag> },
        { title: '命中次数', dataIndex: 'hits' },
        { title: '启用', dataIndex: 'enabled', render: (v: boolean) => <Badge status={v ? 'success' : 'default'} text={v ? '已启用' : '已禁用'} /> },
      ]}
    />
  );
}
