'use client';

import React, { useState } from 'react';
import {
  Card, Row, Col, Tag, Button, Space, Typography, Segmented, Select, Switch, message, Popconfirm,
  Empty, Input, Upload, Modal, Form, Alert, Table, Badge,
} from 'antd';
import {
  DownloadOutlined, StarFilled, SearchOutlined, UploadOutlined, InboxOutlined,
  ApiOutlined, LinkOutlined, DisconnectOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePermission } from '@/hooks/usePermission';
import apiClient from '@/lib/api-client';

const { Text } = Typography;
const { TextArea } = Input;
const SKILL_CATEGORIES = ['办公效率','数据分析','文件处理','网络工具','开发工具','通信集成'];

export default function SkillRepositoryPage() {
  const [tab, setTab] = useState('skills');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>技能仓库</h1>
        <Segmented value={tab} onChange={setTab}
          options={[
            { label: '技能仓库', value: 'skills' },
            { label: '连接器', value: 'connectors' },
            { label: 'MCP工具', value: 'mcp' },
          ]}
        />
      </div>

      {tab === 'skills' && <SkillsTab />}
      {tab === 'connectors' && <ConnectorsTab />}
      {tab === 'mcp' && <MCPTab />}
    </div>
  );
}

// ==================== 技能仓库（技能市场 + 已安装） ====================
function SkillsTab() {
  const [subTab, setSubTab] = useState('marketplace');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [localSkills, setLocalSkills] = useState<any[]>([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadCat, setUploadCat] = useState('开发工具');
  const [uploadDesc, setUploadDesc] = useState('');
  const [fileList, setFileList] = useState<any[]>([]);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['market', 'skills', category],
    queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/market/skills', { params: { category: category || '' } }); return data.data; },
  });

  const installMutation = useMutation({ mutationFn: (id: string) => apiClient.post(`/api/v1/admin/market/skills/${id}/install`), onSuccess: () => { message.success('已安装'); queryClient.invalidateQueries({ queryKey: ['market','skills'] }); } });
  const toggleMutation = useMutation({ mutationFn: (id: string) => apiClient.put(`/api/v1/admin/market/skills/${id}/toggle`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['market','skills'] }); } });
  const uninstallMutation = useMutation({ mutationFn: (id: string) => apiClient.delete(`/api/v1/admin/market/skills/${id}`), onSuccess: () => { message.success('已卸载'); queryClient.invalidateQueries({ queryKey: ['market','skills'] }); } });

  const allSkills = [...(data || []), ...localSkills];
  const filtered = search
    ? allSkills.filter((s: any) => s.name.toLowerCase().includes(search.toLowerCase()) || s.description.toLowerCase().includes(search.toLowerCase()))
    : allSkills;
  const marketplace = filtered.filter((s: any) => !s.installed);
  const installed = filtered.filter((s: any) => s.installed);

  const handleUpload = () => {
    if (!uploadName.trim()) { message.warning('请输入技能名称'); return; }
    setLocalSkills([...localSkills, { id: `local-${Date.now()}`, name: uploadName, description: uploadDesc || '用户上传技能包', category: uploadCat, version: '1.0.0', author: '本地', is_official: false, downloads: 0, rating: 0, installed: true, enabled: true }]);
    setUploadModalOpen(false); setUploadName(''); setUploadDesc(''); setUploadCat('开发工具'); setFileList([]);
    message.success('技能包已上传并安装');
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Space wrap>
          <Input.Search placeholder="搜索技能" value={search} onChange={(e) => setSearch(e.target.value)} allowClear style={{ width: 200 }} prefix={<SearchOutlined />} />
          <Segmented value={subTab} onChange={setSubTab}
            options={[
              { label: `技能市场 (${marketplace.length})`, value: 'marketplace' },
              { label: `已安装 (${installed.length})`, value: 'installed' },
            ]}
          />
        </Space>
        <Button icon={<UploadOutlined />} onClick={() => setUploadModalOpen(true)}>上传技能</Button>
      </div>

      {subTab === 'marketplace' && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Tag color={category === '' ? 'blue' : 'default'} style={{ cursor: 'pointer', padding: '4px 12px', borderRadius: 16 }} onClick={() => setCategory('')}>全部</Tag>
            {SKILL_CATEGORIES.map(c => (
              <Tag key={c} color={category === c ? 'blue' : 'default'} style={{ cursor: 'pointer', padding: '4px 12px', borderRadius: 16 }} onClick={() => setCategory(c)}>{c}</Tag>
            ))}
          </div>
          <Row gutter={[16, 16]}>
            {marketplace.map((skill: any) => (
              <Col xs={24} sm={12} lg={8} key={skill.id}>
                <Card size="small" hoverable style={{ borderRadius: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div><Text strong>{skill.name}</Text><Tag style={{ marginLeft: 8 }}>{skill.category}</Tag>{skill.is_official && <Tag color="gold">官方</Tag>}</div>
                    <Button type="primary" size="small" icon={<DownloadOutlined />} onClick={() => installMutation.mutate(skill.id)}>安装</Button>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', margin: '8px 0' }} ellipsis>{skill.description}</Text>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span><StarFilled style={{ color: '#faad14', fontSize: 12 }} /> {skill.rating}</span>
                    <span style={{ fontSize: 12, color: '#8c8c8c' }}>{skill.downloads} 次下载</span>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </>
      )}

      {subTab === 'installed' && (installed.length === 0 ? <Empty description="暂无已安装技能" /> : (
        <Row gutter={[16, 16]}>
          {installed.map((skill: any) => (
            <Col xs={24} sm={12} lg={8} key={skill.id}>
              <Card size="small" style={{ borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div><Text strong>{skill.name}</Text><Tag style={{ marginLeft: 8 }}>{skill.category}</Tag></div>
                  <Switch checked={skill.enabled} onChange={() => toggleMutation.mutate(skill.id)} size="small" />
                </div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', margin: '8px 0' }} ellipsis>{skill.description}</Text>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span><StarFilled style={{ color: '#faad14', fontSize: 12 }} /> {skill.rating}</span>
                  <Space>
                    <span style={{ fontSize: 12, color: '#8c8c8c' }}>v{skill.version}</span>
                    <Popconfirm title="确定卸载？" onConfirm={() => uninstallMutation.mutate(skill.id)}>
                      <Button type="link" size="small" danger>卸载</Button>
                    </Popconfirm>
                  </Space>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      ))}

      <Modal title="上传技能包" open={uploadModalOpen} onCancel={() => setUploadModalOpen(false)} onOk={handleUpload} okText="上传并安装" width={480}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          <div><Text strong>技能名称</Text><Input placeholder="如：图片压缩工具" value={uploadName} onChange={(e) => setUploadName(e.target.value)} style={{ marginTop: 4 }} /></div>
          <div><Text strong>分类</Text><Select value={uploadCat} onChange={setUploadCat} style={{ width: '100%', marginTop: 4 }} options={SKILL_CATEGORIES.map(c => ({ value: c, label: c }))} /></div>
          <div><Text strong>描述（可选）</Text><TextArea placeholder="简单描述技能功能" value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} rows={2} style={{ marginTop: 4 }} /></div>
          <Upload.Dragger fileList={fileList} onChange={({ fileList: fl }) => setFileList(fl)} beforeUpload={(file) => { if (!uploadName) setUploadName(file.name.replace(/\.zip$/i, '')); return false; }} accept=".zip" maxCount={1}>
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">点击或拖拽技能包到此区域</p>
            <p className="ant-upload-hint">支持 .zip 格式，最大 50MB</p>
          </Upload.Dragger>
          <Alert message="技能包格式要求" description={<div><p>1. 文件夹或 .zip 包内必须包含 <code>SKILL.md</code> 文件</p><p>2. <code>SKILL.md</code> 文件需包含 YAML 格式的技能名称和描述</p></div>} type="info" showIcon />
        </div>
      </Modal>
    </>
  );
}

// ==================== 连接器 ====================
function ConnectorsTab() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [localConnectors, setLocalConnectors] = useState<any[]>([]);
  const [form] = Form.useForm();

  const { data } = useQuery({
    queryKey: ['market', 'connectors'],
    queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/market/connectors'); return data.data; },
  });

  const connectMutation = useMutation({ mutationFn: (id: string) => apiClient.post(`/api/v1/admin/market/connectors/${id}/connect`), onSuccess: () => { message.success('已连接'); queryClient.invalidateQueries({ queryKey: ['market','connectors'] }); } });
  const disconnectMutation = useMutation({ mutationFn: (id: string) => apiClient.post(`/api/v1/admin/market/connectors/${id}/disconnect`), onSuccess: () => { message.success('已断开'); queryClient.invalidateQueries({ queryKey: ['market','connectors'] }); } });

  const allConnectors = [...(data || []), ...localConnectors];

  const handleCreate = () => {
    form.validateFields().then((values) => {
      setLocalConnectors([...localConnectors, { id: `custom-${Date.now()}`, name: values.name, description: values.description || '自定义 MCP 连接器', category: '自定义', auth_type: values.auth_type || 'api_key', status: 'disconnected', is_official: false }]);
      setModalOpen(false); form.resetFields(); message.success('自定义连接器已创建');
    });
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>自定义连接器</Button>
      </div>
      <Row gutter={[16, 16]}>
        {allConnectors.map((c: any) => (
          <Col xs={24} sm={12} lg={8} key={c.id}>
            <Card size="small" style={{ borderRadius: 12, borderColor: c.status === 'connected' ? '#52c41a' : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Space><ApiOutlined style={{ color: '#1677ff' }} /><Text strong>{c.name}</Text><Badge status={c.status === 'connected' ? 'success' : 'default'} text={c.status === 'connected' ? '已连接' : '未连接'} /></Space>
                {c.id?.startsWith('custom') ? (
                  <Button size="small" danger onClick={() => { setLocalConnectors(localConnectors.filter(lc => lc.id !== c.id)); message.success('已删除'); }}>删除</Button>
                ) : c.status === 'connected' ? (
                  <Button size="small" icon={<DisconnectOutlined />} onClick={() => disconnectMutation.mutate(c.id)}>断开</Button>
                ) : (
                  <Button type="primary" size="small" icon={<LinkOutlined />} onClick={() => connectMutation.mutate(c.id)}>连接</Button>
                )}
              </div>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>{c.description}</Text>
              <div style={{ marginTop: 8 }}>
                <Tag>{c.category}</Tag>
                <Tag color="purple">{c.auth_type === 'oauth' ? 'OAuth 2.0' : c.auth_type === 'api_key' ? 'API Key' : c.auth_type}</Tag>
                {c.is_official && <Tag color="gold">官方</Tag>}
                {c.id?.startsWith('custom') && <Tag color="blue">自定义</Tag>}
              </div>
            </Card>
          </Col>
        ))}
      </Row>
      <Modal title="自定义 MCP 连接器" open={modalOpen} onCancel={() => { setModalOpen(false); form.resetFields(); }} onOk={handleCreate} okText="创建" width={560}>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="连接器名称" rules={[{ required: true }]}><Input placeholder="如：Jira 项目管理" /></Form.Item>
          <Form.Item name="description" label="描述"><TextArea rows={2} placeholder="连接器功能描述" /></Form.Item>
          <Form.Item name="auth_type" label="认证方式" initialValue="api_key">
            <Select style={{ width: 140 }} options={[{ value: 'api_key', label: 'API Key' }, { value: 'oauth', label: 'OAuth 2.0' }, { value: 'bearer', label: 'Bearer Token' }, { value: 'basic', label: 'Basic Auth' }]} />
          </Form.Item>
          <Form.Item name="mcp_config" label="MCP 配置 (JSON)">
            <TextArea rows={6} placeholder={`{\n  "mcpServers": {\n    "my-server": {\n      "command": "npx",\n      "args": ["-y", "@modelcontextprotocol/server-xxx"],\n      "env": { "API_KEY": "your-key" }\n    }\n  }\n}`} style={{ fontFamily: 'monospace', fontSize: 12 }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// ==================== MCP 工具（只读 + 管理） ====================
function MCPTab() {
  const { isAdmin } = usePermission();
  const [subTab, setSubTab] = useState('view');
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['mcp-tools'],
    queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/market/mcp'); return data.data; },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      if (editId) { const { data } = await apiClient.put(`/api/v1/admin/market/mcp/${editId}`, values); return data; }
      const { data } = await apiClient.post('/api/v1/admin/market/mcp', values); return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mcp-tools'] }); message.success(editId ? '更新成功' : '创建成功'); setModalOpen(false); setEditId(null); form.resetFields(); },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => { await apiClient.post(`/api/v1/admin/market/mcp/${id}/toggle`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mcp-tools'] }); message.success('状态已切换'); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiClient.delete(`/api/v1/admin/market/mcp/${id}`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mcp-tools'] }); message.success('已删除'); },
  });

  const handleEdit = (tool: any) => { setEditId(tool.id); form.setFieldsValue(tool); setModalOpen(true); };
  const handleCreate = () => { setEditId(null); form.resetFields(); setModalOpen(true); };

  const subTabOptions = [{ label: '工具列表', value: 'view' }];
  if (isAdmin) subTabOptions.push({ label: '管理', value: 'manage' });

  const cols = subTab === 'manage'
    ? [
        { title: '名称', dataIndex: 'name', render: (v: string, r: any) => <Space><ApiOutlined /><Text strong>{v}</Text>{r.is_official && <Tag color="blue">官方</Tag>}</Space> },
        { title: '分类', dataIndex: 'category', render: (v: string) => <Tag>{v}</Tag> },
        { title: '版本', dataIndex: 'version' },
        { title: '作者', dataIndex: 'author' },
        { title: '描述', dataIndex: 'description', ellipsis: true },
        { title: '状态', dataIndex: 'status', render: (v: string, r: any) => (
          <Switch checked={v === 'active'} onChange={() => toggleMutation.mutate(r.id)} size="small" checkedChildren="启用" unCheckedChildren="禁用" />
        )},
        { title: '创建时间', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleDateString('zh-CN') },
        { title: '操作', key: 'action', render: (_: any, r: any) => (
          <Space>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)}>编辑</Button>
            <Button type="link" size="small" onClick={() => setDetailId(r.id)}>配置</Button>
            <Popconfirm title="确定删除？" onConfirm={() => deleteMutation.mutate(r.id)}><Button type="link" size="small" danger icon={<DeleteOutlined />}>删除</Button></Popconfirm>
          </Space>
        )},
      ]
    : [
        { title: '名称', dataIndex: 'name', render: (v: string, r: any) => <Space><ApiOutlined /><Text strong>{v}</Text>{r.is_official && <Tag color="blue">官方</Tag>}</Space> },
        { title: '分类', dataIndex: 'category', render: (v: string) => <Tag>{v}</Tag> },
        { title: '版本', dataIndex: 'version' },
        { title: '作者', dataIndex: 'author' },
        { title: '描述', dataIndex: 'description', ellipsis: true },
        { title: '状态', dataIndex: 'status', render: (v: string) => <Badge status={v === 'active' ? 'success' : 'default'} text={v === 'active' ? '启用' : '禁用'} /> },
        { title: '操作', key: 'action', render: (_: any, r: any) => <Button type="link" size="small" onClick={() => setDetailId(r.id)}>查看配置</Button> },
      ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <Segmented value={subTab} onChange={setSubTab} options={subTabOptions} />
        {subTab === 'manage' && (
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => qc.invalidateQueries({ queryKey: ['mcp-tools'] })}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>创建 MCP 工具</Button>
          </Space>
        )}
      </div>

      <Card>
        <Table dataSource={data || []} rowKey="id" loading={isLoading} pagination={{ pageSize: 20 }} columns={cols} />
      </Card>

      <Modal title={editId ? '编辑 MCP 工具' : '创建 MCP 工具'} open={modalOpen} onCancel={() => { setModalOpen(false); setEditId(null); form.resetFields(); }}
        onOk={() => form.submit()} confirmLoading={saveMutation.isPending} width={600}>
        <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v)}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input placeholder="MCP 工具名称" /></Form.Item>
          <Form.Item name="description" label="描述"><TextArea rows={2} placeholder="工具描述" /></Form.Item>
          <Form.Item name="category" label="分类" initialValue="系统工具">
            <Select options={[{ value: '系统工具', label: '系统工具' }, { value: '开发工具', label: '开发工具' }, { value: '数据工具', label: '数据工具' }, { value: '通信集成', label: '通信集成' }, { value: '办公效率', label: '办公效率' }]} />
          </Form.Item>
          <Form.Item name="version" label="版本" initialValue="1.0.0"><Input placeholder="1.0.0" /></Form.Item>
          <Form.Item name="author" label="作者" initialValue="管理员"><Input placeholder="作者" /></Form.Item>
          <Form.Item name="is_official" label="官方工具" valuePropName="checked" initialValue={false}><Switch /></Form.Item>
          <Form.Item name="config" label="MCP 配置 (JSON)">
            <TextArea rows={6} placeholder='{"mcpServers":{"myserver":{"command":"npx","args":["-y","@scope/package"]}}}' />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="MCP 配置详情" open={!!detailId} onCancel={() => setDetailId(null)} footer={null} width={640}>
        {detailId && data && (() => {
          const tool = data.find((t: any) => t.id === detailId);
          return tool ? <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, maxHeight: 400, overflow: 'auto', fontSize: 13 }}>
            {(() => { try { return JSON.stringify(JSON.parse(tool.config), null, 2); } catch { return tool.config; } })()}
          </pre> : null;
        })()}
      </Modal>
    </>
  );
}
