'use client';

import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Switch, Descriptions, Typography, Space, Badge,
  Form, InputNumber, Button, message, Spin, Empty, Segmented, Input, Modal, Select, Slider,
} from 'antd';
import {
  SafetyCertificateOutlined, ExperimentOutlined, StopOutlined, ScanOutlined,
  SaveOutlined, EditOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ClockCircleOutlined, SettingOutlined, HistoryOutlined, PlusOutlined, DeleteOutlined,
  ThunderboltOutlined, SearchOutlined, AuditOutlined, ApiOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import apiClient from '@/lib/api-client';
import { RISK_COLORS, RISK_LABELS } from '@/lib/constants';
import { Popconfirm } from 'antd';

const { Title, Text } = Typography;

export default function AccessControlPage() {
  const [activeTab, setActiveTab] = useState('engine');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>安全配置</h1>

      <Card bodyStyle={{ padding: 0 }}>
        <div style={{ padding: '16px 24px 0' }}>
          <Segmented value={activeTab} onChange={setActiveTab}
            options={[
              { label: '检测引擎', value: 'engine', icon: <ThunderboltOutlined /> },
              { label: '敏感词库', value: 'words', icon: <StopOutlined /> },
              { label: '沙箱策略', value: 'sandbox', icon: <ExperimentOutlined /> },
              { label: '资产扫描', value: 'asset_scan', icon: <ScanOutlined /> },
            ]}
          />
        </div>

        <div style={{ padding: 24 }}>
          {activeTab === 'engine' && <EngineTab />}
          {activeTab === 'words' && <SensitiveWordsTab />}
          {activeTab === 'sandbox' && <SandboxTab />}
          {activeTab === 'asset_scan' && <AssetScanTab />}
        </div>
      </Card>
    </div>
  );
}

// ==================== 检测引擎 ====================
function EngineTab() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async ({ signal }) => { const { data } = await apiClient.get('/api/v1/admin/settings', { signal }); return data; },
  });

  useEffect(() => { if (data?.security) form.setFieldsValue(data.security); }, [data, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: any) => { await apiClient.put('/api/v1/admin/settings', { security: values }); },
    onSuccess: () => { message.success('检测引擎配置已保存'); queryClient.invalidateQueries({ queryKey: ['settings'] }); },
    onError: () => message.error('保存失败'),
  });

  if (isLoading) return <Card loading />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>
      <Card title={<><ThunderboltOutlined /> 检测开关</>} size="small">
        <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v)} initialValues={{ injection_threshold: 0.7, pii_action: 'block', log_max_entries: 1000 }}>
          <Form.Item name="sensitive_filter_enabled" label="敏感词过滤" valuePropName="checked" tooltip="启用后实时检测输入/输出中的敏感词">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
          <Form.Item name="pii_mask_enabled" label="PII 脱敏检测" valuePropName="checked" tooltip="检测身份证/手机号/银行卡等个人信息">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
          <Form.Item name="injection_detect_enabled" label="注入攻击检测" valuePropName="checked" tooltip="检测提示注入/越狱攻击/命令注入">
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
          <Form.Item name="injection_threshold" label="注入检测阈值" tooltip="置信度≥此值视为注入攻击">
            <Slider min={0} max={1} step={0.05} marks={{ 0: '0', 0.5: '0.5', 0.7: '默认', 1: '1' }} />
          </Form.Item>
          <Form.Item name="pii_action" label="PII 动作策略" tooltip="检测到个人信息后的处理方式">
            <Select options={[{ value: 'block', label: '拦截' }, { value: 'mask', label: '脱敏(替换为***)' }, { value: 'warn', label: '告警(记录但放行)' }]} />
          </Form.Item>
          <Form.Item name="log_retention_days" label="日志保留天数" tooltip="检测记录在内存中保留的最大天数">
            <InputNumber min={7} max={365} step={7} addonAfter="天" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="log_max_entries" label="日志最大条数" tooltip="内存中保留的检测记录上限">
            <InputNumber min={100} max={100000} step={100} addonAfter="条" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item><Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={saveMutation.isPending}>保存配置</Button></Form.Item>
        </Form>
      </Card>
    </div>
  );
}

// ==================== 敏感词库 ====================
function SensitiveWordsTab() {
  const [words, setWords] = useState([
    { word: '敏感词A', category: 'political', level: 'block' },
    { word: '违禁品', category: 'drug', level: 'block' },
    { word: '赌博', category: 'gambling', level: 'block' },
    { word: '色情', category: 'porn', level: 'block' },
    { word: '暴力', category: 'violence', level: 'block' },
    { word: '诈骗', category: 'fraud', level: 'block' },
    { word: '广告', category: 'spam', level: 'warn' },
  ]);
  const [newWord, setNewWord] = useState('');
  const [newCat, setNewCat] = useState('political');
  const [newLevel, setNewLevel] = useState('block');

  const addWord = () => {
    if (!newWord) return;
    setWords([...words, { word: newWord, category: newCat, level: newLevel }]);
    setNewWord(''); message.success('已添加');
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Input placeholder="输入敏感词" value={newWord} onChange={(e) => setNewWord(e.target.value)} style={{ width: 160 }} />
        <Select value={newCat} onChange={setNewCat} style={{ width: 120 }} options={Object.entries(RISK_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
        <Select value={newLevel} onChange={setNewLevel} style={{ width: 100 }} options={[{ value: 'block', label: '拦截' }, { value: 'warn', label: '告警' }]} />
        <Button type="primary" icon={<PlusOutlined />} onClick={addWord}>添加</Button>
        <Button icon={<SearchOutlined />}>批量导入</Button>
      </div>
      <Table dataSource={words} rowKey="word" pagination={false} size="middle"
        columns={[
          { title: '敏感词', dataIndex: 'word' },
          { title: '分类', dataIndex: 'category', render: (v: string) => <Tag color={RISK_COLORS[v] || 'default'}>{RISK_LABELS[v] || v}</Tag> },
          { title: '级别', dataIndex: 'level', render: (v: string) => <Tag color={v === 'block' ? 'red' : 'orange'}>{v === 'block' ? '拦截' : '告警'}</Tag> },
          { title: '操作', key: 'action', render: (_: any, r: any) => (
            <Popconfirm title="确定删除？" onConfirm={() => { setWords(words.filter(w => w.word !== r.word)); message.success('已删除'); }}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          )},
        ]}
      />
    </div>
  );
}

// ==================== 沙箱策略 ====================
function SandboxTab() {
  const queryClient = useQueryClient();
  const [sandboxSubTab, setSandboxSubTab] = useState('rules');
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

  // 沙箱规则表单
  const [rules, setRules] = useState({ auto_by_risk_critical: true, auto_by_risk_high: false, token_threshold: 50000, call_rate_threshold: 100, safety_block_threshold: 10, auto_approve_days: 7 });
  const saveRulesMutation = useMutation({
    mutationFn: (v: any) => apiClient.put('/api/v1/admin/sandbox/rules', v),
    onSuccess: () => message.success('沙箱策略已保存'),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Segmented value={sandboxSubTab} onChange={(v) => setSandboxSubTab(v as string)}
        options={[
          { label: '沙箱策略', value: 'rules', icon: <SettingOutlined /> },
          { label: '审核队列', value: 'queue', icon: <ClockCircleOutlined /> },
          { label: '审核历史', value: 'history', icon: <HistoryOutlined /> },
        ]}
      />

      {sandboxSubTab === 'rules' && (
        <Card title="沙箱自动策略" size="small">
          <Space direction="vertical" style={{ width: '100%', maxWidth: 500 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Agent 风险等级 = 严重 → 自动沙箱</span>
              <Switch checked={rules.auto_by_risk_critical} onChange={(v) => setRules({ ...rules, auto_by_risk_critical: v })} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Agent 风险等级 = 高 → 自动沙箱</span>
              <Switch checked={rules.auto_by_risk_high} onChange={(v) => setRules({ ...rules, auto_by_risk_high: v })} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>单次调用 Token 异常阈值（超过推沙箱）</span>
              <InputNumber min={1000} max={500000} step={1000} value={rules.token_threshold} onChange={(v) => setRules({ ...rules, token_threshold: v || 50000 })} addonAfter="Token" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>调用频率异常阈值（超频推沙箱）</span>
              <InputNumber min={10} max={1000} step={10} value={rules.call_rate_threshold} onChange={(v) => setRules({ ...rules, call_rate_threshold: v || 100 })} addonAfter="次/分钟" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>日安全拦截上限（超限推沙箱）</span>
              <InputNumber min={1} max={100} step={1} value={rules.safety_block_threshold} onChange={(v) => setRules({ ...rules, safety_block_threshold: v || 10 })} addonAfter="次/天" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>审核超时自动通过（0=不自动）</span>
              <InputNumber min={0} max={30} step={1} value={rules.auto_approve_days} onChange={(v) => setRules({ ...rules, auto_approve_days: v || 0 })} addonAfter="天" />
            </div>
            <Button type="primary" icon={<SaveOutlined />} onClick={() => saveRulesMutation.mutate(rules)} loading={saveRulesMutation.isPending}>保存策略</Button>
          </Space>
        </Card>
      )}

      {sandboxSubTab === 'queue' && (
        <Card title="审核队列" extra={
          <Segmented value={reviewFilter} onChange={(v) => setReviewFilter(v as string)}
            options={[{ label: '全部', value: 'all' }, { label: '待审核', value: 'pending' }, { label: '已通过', value: 'approved' }, { label: '已拒绝', value: 'rejected' }]} />
        }>
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
        </Card>
      )}

      {sandboxSubTab === 'history' && (
        <SandboxHistoryTab />
      )}
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

// ==================== 资产扫描 ====================
function AssetScanTab() {
  const qc = useQueryClient();
  const { data: scanConfig } = useQuery({
    queryKey: ['asset-scan', 'config'],
    queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/asset-scan/config'); return data; },
  });
  const { data: overview } = useQuery({
    queryKey: ['asset-scan', 'overview'],
    queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/asset-scan/overview'); return data; },
    refetchInterval: 60000,
  });

  const [interval, setInterval_] = useState(24);
  const [scanners, setScanners] = useState({ injection: true, permission: true, compliance: true, supply_chain: true });
  const [debounce, setDebounce_] = useState(10);

  useEffect(() => { if (scanConfig?.scan_interval_h) setInterval_(scanConfig.scan_interval_h); }, [scanConfig]);

  const updateConfig = useMutation({
    mutationFn: async () => { await apiClient.put('/api/v1/admin/asset-scan/config', { scan_interval_h: interval }); },
    onSuccess: () => { message.success('资产扫描配置已保存'); qc.invalidateQueries({ queryKey: ['asset-scan', 'config'] }); },
  });

  const triggerScan = useMutation({
    mutationFn: async () => { await apiClient.post('/api/v1/admin/asset-scan/scan'); },
    onSuccess: () => { message.success('全量扫描已启动'); qc.invalidateQueries({ queryKey: ['asset-scan', 'overview'] }); },
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
      <Card title={<><ScanOutlined /> 扫描调度</>} size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 400 }}>
            <span>定时扫描间隔</span>
            <Select value={interval} onChange={(v) => setInterval_(v)} style={{ width: 160 }}
              options={[{ value: 1, label: '1 小时' }, { value: 6, label: '6 小时' }, { value: 12, label: '12 小时' }, { value: 24, label: '24 小时 (推荐)' }, { value: 48, label: '48 小时' }, { value: 72, label: '72 小时' }]} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 400 }}>
            <span>上次扫描时间</span>
            <Text>{overview?.last_scan_at ? new Date(overview.last_scan_at).toLocaleString('zh-CN') : '未扫描'}</Text>
          </div>
          <Space><Button type="primary" icon={<SaveOutlined />} onClick={() => updateConfig.mutate()} loading={updateConfig.isPending}>保存</Button><Button icon={<ReloadOutlined />} onClick={() => triggerScan.mutate()} loading={triggerScan.isPending}>立即扫描</Button></Space>
        </Space>
      </Card>

      <Card title={<><AuditOutlined /> 扫描器开关</>} size="small">
        <Space direction="vertical" style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span><ApiOutlined /> Agent 注入扫描器</span>
            <Switch checked={scanners.injection} onChange={(v) => setScanners({ ...scanners, injection: v })} checkedChildren="启用" unCheckedChildren="禁用" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span><SafetyCertificateOutlined /> 权限审计器</span>
            <Switch checked={scanners.permission} onChange={(v) => setScanners({ ...scanners, permission: v })} checkedChildren="启用" unCheckedChildren="禁用" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span><AuditOutlined /> 合规检查器</span>
            <Switch checked={scanners.compliance} onChange={(v) => setScanners({ ...scanners, compliance: v })} checkedChildren="启用" unCheckedChildren="禁用" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span><SearchOutlined /> 供应链漏洞扫描器</span>
            <Switch checked={scanners.supply_chain} onChange={(v) => setScanners({ ...scanners, supply_chain: v })} checkedChildren="启用" unCheckedChildren="禁用" />
          </div>
        </Space>
      </Card>

      <Card title={<><ClockCircleOutlined /> 事件变更防抖</>} size="small">
        <Space direction="vertical" style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>资产变更后延迟扫描</span>
            <InputNumber min={5} max={120} step={5} value={debounce} onChange={(v) => setDebounce_(v || 10)} addonAfter="秒" />
          </div>
          <Text type="secondary">Agent/Skill/MCP 注册或更新后，延迟此时间再触发增量扫描，避免频繁扫描</Text>
          <Button type="primary" icon={<SaveOutlined />} onClick={() => message.success('事件防抖配置已保存（演示模式）')}>保存</Button>
        </Space>
      </Card>
    </div>
  );
}
