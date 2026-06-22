'use client';

import React, { useState } from 'react';
import { Card, Row, Col, Tag, Button, Space, Typography, Select, Switch, Rate, message, Popconfirm, Empty, Input, Upload, Modal, Form, Alert, Segmented } from 'antd';
import { DownloadOutlined, StarFilled, SettingOutlined, SearchOutlined, UploadOutlined, InboxOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

const { Text, Title } = Typography;
const CATEGORIES = ['办公效率','数据分析','文件处理','网络工具','开发工具','通信集成'];

export default function SkillRepositoryPage() {
  const [tab, setTab] = useState('marketplace');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploadName, setUploadName] = useState('');
  const [uploadCat, setUploadCat] = useState('开发工具');
  const [uploadDesc, setUploadDesc] = useState('');
  const [localSkills, setLocalSkills] = useState<any[]>([]);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['market', 'skills', category],
    queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/market/skills', { params: { category: category || '' } }); return data.data; },
  });

  const installMutation = useMutation({ mutationFn: (id: string) => apiClient.post(`/api/v1/admin/market/skills/${id}/install`), onSuccess: () => { message.success('已安装'); queryClient.invalidateQueries({ queryKey: ['market','skills'] }); } });
  const toggleMutation = useMutation({ mutationFn: (id: string) => apiClient.put(`/api/v1/admin/market/skills/${id}/toggle`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['market','skills'] }); } });
  const uninstallMutation = useMutation({ mutationFn: (id: string) => apiClient.delete(`/api/v1/admin/market/skills/${id}`), onSuccess: () => { message.success('已卸载'); queryClient.invalidateQueries({ queryKey: ['market','skills'] }); } });

  const allSkills = [...(data || []), ...localSkills];

  const filterBySearch = (skills: any[]) => {
    if (!search) return skills;
    const s = search.toLowerCase();
    return skills.filter((sk: any) =>
      sk.name.toLowerCase().includes(s) || sk.description.toLowerCase().includes(s) || sk.category.toLowerCase().includes(s)
    );
  };

  const installed = filterBySearch(allSkills.filter((s: any) => s.installed));
  const marketplace = filterBySearch(allSkills.filter((s: any) => !s.installed));

  const handleUpload = () => {
    if (!uploadName.trim()) { message.warning('请输入技能名称'); return; }
    const newSkill = {
      id: `local-${Date.now()}`,
      name: uploadName,
      description: uploadDesc || '用户上传技能包',
      category: uploadCat,
      version: '1.0.0',
      author: '本地',
      is_official: false,
      downloads: 0,
      rating: 0,
      installed: true,
      enabled: true,
    };
    setLocalSkills([...localSkills, newSkill]);
    setUploadModalOpen(false);
    setUploadName(''); setUploadDesc(''); setUploadCat('开发工具'); setFileList([]);
    message.success('技能包已上传并安装');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>技能仓库</h1>
        <Space>
          <Input.Search
            placeholder="搜索技能名称或描述"
            value={search} onChange={(e) => setSearch(e.target.value)} onSearch={setSearch} allowClear
            style={{ width: 220 }} prefix={<SearchOutlined />}
          />
          <Button type="primary" icon={<UploadOutlined />} onClick={() => setUploadModalOpen(true)}>上传技能</Button>
        </Space>
      </div>

      <Segmented
        value={tab} onChange={setTab}
        options={[
          { label: `技能市场 (${marketplace.length})`, value: 'marketplace' },
          { label: `已安装 (${installed.length})`, value: 'installed' },
        ]}
        style={{ marginBottom: 8 }}
      />

      {tab === 'marketplace' && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Tag color={category === '' ? 'blue' : 'default'} style={{ cursor: 'pointer', padding: '4px 12px', borderRadius: 16, fontSize: 13 }} onClick={() => setCategory('')}>全部</Tag>
            {CATEGORIES.map(c => (
              <Tag key={c} color={category === c ? 'blue' : 'default'} style={{ cursor: 'pointer', padding: '4px 12px', borderRadius: 16, fontSize: 13 }} onClick={() => setCategory(c)}>{c}</Tag>
            ))}
          </div>
          <Row gutter={[16, 16]}>
            {marketplace.map((skill: any) => (
              <Col xs={24} sm={12} lg={8} key={skill.id}>
                <Card size="small" hoverable style={{ borderRadius: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <Text strong>{skill.name}</Text>
                      <Tag style={{ marginLeft: 8 }}>{skill.category}</Tag>
                      {skill.is_official && <Tag color="gold">官方</Tag>}
                    </div>
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

      {tab === 'installed' && (
        <>
          {installed.length === 0 ? <Empty description="暂无已安装技能" /> : (
            <Row gutter={[16, 16]}>
              {installed.map((skill: any) => (
                <Col xs={24} sm={12} lg={8} key={skill.id}>
                  <Card size="small" style={{ borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <Text strong>{skill.name}</Text>
                        <Tag style={{ marginLeft: 8 }}>{skill.category}</Tag>
                      </div>
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
          )}
        </>
      )}

      <Modal title="上传技能包" open={uploadModalOpen} onCancel={() => setUploadModalOpen(false)} onOk={handleUpload} okText="上传并安装" confirmLoading={false} width={480}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          <div>
            <Text strong>技能名称</Text>
            <Input placeholder="如：图片压缩工具" value={uploadName} onChange={(e) => setUploadName(e.target.value)} style={{ marginTop: 4 }} />
          </div>
          <div>
            <Text strong>分类</Text>
            <Select value={uploadCat} onChange={setUploadCat} style={{ width: '100%', marginTop: 4 }} options={CATEGORIES.map(c => ({ value: c, label: c }))} />
          </div>
          <div>
            <Text strong>描述（可选）</Text>
            <Input.TextArea placeholder="简单描述技能功能" value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} rows={2} style={{ marginTop: 4 }} />
          </div>
          <Upload.Dragger
            fileList={fileList}
            onChange={({ fileList: fl }) => setFileList(fl)}
            beforeUpload={(file) => { if (!uploadName) setUploadName(file.name.replace(/\.zip$/i, '')); return false; }}
            accept=".zip"
            maxCount={1}
          >
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">点击或拖拽技能包到此区域</p>
            <p className="ant-upload-hint">支持 .zip 格式，最大 50MB</p>
          </Upload.Dragger>

          <Alert
            message="技能包格式要求"
            description={
              <div>
                <p>1. 文件夹或 .zip 包内必须包含 <code>SKILL.md</code> 文件</p>
                <p>2. <code>SKILL.md</code> 文件需包含 YAML 格式的技能名称和描述</p>
              </div>
            }
            type="info"
            showIcon
          />
        </div>
      </Modal>
    </div>
  );
}
