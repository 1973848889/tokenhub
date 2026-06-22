'use client';

import React, { useState } from 'react';
import { Card, Row, Col, Tag, Button, Space, Typography, Segmented, Modal, Descriptions, message, Alert } from 'antd';
import { StarFilled, UserAddOutlined, CopyOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

const { Text, Title } = Typography;
const CATEGORIES = ['研发技术','产品设计','运营市场','财务法务','人力资源','通用办公'];

export default function AgentMarketplacePage() {
  const [tab, setTab] = useState('marketplace');
  const [category, setCategory] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['market', 'experts', category],
    queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/market/experts', { params: { category: category || '' } }); return data.data; },
  });

  const detailData = data?.find((e: any) => e.id === detailId);

  const subscribeMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/api/v1/admin/market/experts/${id}/subscribe`),
    onSuccess: (res: any) => {
      if (res.data?.api_key) {
        setNewApiKey(res.data.api_key);
      } else {
        message.success('操作成功');
      }
      queryClient.invalidateQueries({ queryKey: ['market','experts'] });
    },
    onError: () => message.error('操作失败'),
  });

  const copyKey = async (key: string) => { await navigator.clipboard.writeText(key); message.success('已复制'); };

  const allExperts = data || [];
  const marketplace = tab === 'marketplace' ? allExperts : allExperts.filter((e: any) => e.subscribed);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>专家市场</h1>
        <Segmented value={tab} onChange={setTab}
          options={[
            { label: '专家市场', value: 'marketplace' },
            { label: `我的专家 (${allExperts.filter((e: any) => e.subscribed).length})`, value: 'my' },
          ]}
        />
      </div>

      {tab === 'marketplace' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Tag color={category === '' ? 'blue' : 'default'} style={{ cursor: 'pointer', padding: '4px 12px', borderRadius: 16, fontSize: 13 }} onClick={() => setCategory('')}>全部</Tag>
          {CATEGORIES.map(c => (
            <Tag key={c} color={category === c ? 'blue' : 'default'} style={{ cursor: 'pointer', padding: '4px 12px', borderRadius: 16, fontSize: 13 }} onClick={() => setCategory(c)}>{c}</Tag>
          ))}
        </div>
      )}

      <Row gutter={[16, 16]}>
        {marketplace.map((expert: any) => (
          <Col xs={24} sm={12} lg={8} xl={6} key={expert.id}>
            <Card hoverable style={{ borderRadius: 12 }}
              onClick={() => setDetailId(expert.id)}
              extra={<span style={{ visibility: expert.subscribed ? 'visible' : 'hidden' }}><Tag color="blue">已订阅</Tag></span>}
            >
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 48 }}>{expert.avatar}</div>
                <Title level={5} style={{ margin: '8px 0 4px' }}>{expert.name}</Title>
                <Tag color="blue">{expert.category}</Tag>
                {expert.is_official && <Tag color="gold">官方</Tag>}
              </div>
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }} ellipsis>{expert.description}</Text>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span><StarFilled style={{ color: '#faad14' }} /> {expert.rating}</span>
                <span style={{ color: '#8c8c8c', fontSize: 12 }}>{expert.usage_count} 次使用</span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal title="专家详情" open={!!detailId} onCancel={() => setDetailId(null)} width={600}
        footer={detailData ? [
          <Button key="sub" type={detailData.subscribed ? 'default' : 'primary'} icon={<UserAddOutlined />}
            onClick={() => { subscribeMutation.mutate(detailData.id); if (detailData.subscribed) setDetailId(null); }} loading={subscribeMutation.isPending}>
            {detailData.subscribed ? '取消订阅' : '订阅专家'}
          </Button>,
          <Button key="close" onClick={() => setDetailId(null)}>关闭</Button>,
        ].filter(Boolean) : undefined}
      >
        {detailData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 48 }}>{detailData.avatar}</span>
              <div>
                <Title level={4} style={{ margin: 0 }}>{detailData.name}</Title>
                <Space><Tag color="blue">{detailData.category}</Tag>{detailData.is_official && <Tag color="gold">官方</Tag>}<span><StarFilled style={{ color: '#faad14' }} /> {detailData.rating}</span></Space>
              </div>
            </div>
            <Text>{detailData.description}</Text>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="人设">{detailData.persona}</Descriptions.Item>
              <Descriptions.Item label="作者">{detailData.author}</Descriptions.Item>
              <Descriptions.Item label="使用次数">{detailData.usage_count}</Descriptions.Item>
              <Descriptions.Item label="示例任务">{detailData.tasks?.join(' / ')}</Descriptions.Item>
            </Descriptions>
            {detailData.subscribed && detailData.api_key_prefix && (
              <Alert type="success" showIcon message="API Key 已生成" description={`前缀: ${detailData.api_key_prefix}... (订阅时返回完整Key，可在 API Key 管理页查看)`} />
            )}
          </div>
        )}
      </Modal>

      <Modal title="订阅成功 - API Key" open={!!newApiKey} onCancel={() => setNewApiKey(null)} footer={[<Button key="close" type="primary" onClick={() => setNewApiKey(null)}>我已保存，关闭</Button>]} width={560}>
        <Alert message="请立即复制 API Key，关闭后不再显示" type="warning" showIcon style={{ marginBottom: 16 }} />
        <div style={{ background: '#1e1e1e', padding: '14px 16px', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <code style={{ color: '#73d13d', fontSize: 14, wordBreak: 'break-all', userSelect: 'all', flex: 1 }}>{newApiKey}</code>
          <Button type="text" icon={<CopyOutlined />} style={{ color: '#73d13d' }} onClick={() => copyKey(newApiKey!)} />
        </div>
        <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 12 }}>
          使用此 Key 调用 /v1/chat/completions 即可自动注入专家人设
        </Text>
      </Modal>
    </div>
  );
}
