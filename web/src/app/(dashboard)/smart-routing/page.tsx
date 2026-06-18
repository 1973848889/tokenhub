'use client';

import React, { useState, useEffect } from 'react';
import {
  Card, Radio, Button, Table, Tag, Space, InputNumber,
  message, Steps, Descriptions, Switch, Typography, Row, Col, Slider, Divider, Alert,
} from 'antd';
import {
  ThunderboltOutlined, DollarOutlined, SafetyCertificateOutlined,
  NodeIndexOutlined, SaveOutlined, CheckCircleOutlined, ApiOutlined,
  ArrowUpOutlined, ArrowDownOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { PROVIDER_COLORS } from '@/lib/constants';
import { usePermission } from '@/hooks/usePermission';

const { Title, Text } = Typography;

interface ModelPreference {
  provider: string;
  model: string;
  priority: number;
  enabled: boolean;
}

interface RoutingConfig {
  default_strategy: string;
  model_preferences: ModelPreference[];
  health_check_interval: number;
  max_retries: number;
}

export default function SmartRoutingPage() {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<RoutingConfig | null>(null);
  const { isAdmin } = usePermission();

  const { data, isLoading } = useQuery<RoutingConfig>({
    queryKey: ['routing', 'config'],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get('/api/v1/admin/routing/config', { signal });
      return data;
    },
  });

  useEffect(() => {
    if (data) setConfig({ ...data });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (cfg: RoutingConfig) => {
      await apiClient.put('/api/v1/admin/routing/config', cfg);
    },
    onSuccess: () => {
      message.success('路由策略已保存');
      queryClient.invalidateQueries({ queryKey: ['routing', 'config'] });
    },
    onError: () => message.error('保存失败'),
  });

  const setDefaultStrategy = (key: string) => {
    if (!config) return;
    setConfig({ ...config, default_strategy: key });
  };

  const toggleModel = (model: string, checked: boolean) => {
    if (!config) return;
    setConfig({
      ...config,
      model_preferences: config.model_preferences.map((m) =>
        m.model === model ? { ...m, enabled: checked } : m
      ),
    });
  };

  const movePriority = (model: string, delta: number) => {
    if (!config) return;
    const list = [...config.model_preferences];
    const idx = list.findIndex((m) => m.model === model);
    if (idx === -1) return;
    const newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= list.length) return;
    [list[idx], list[newIdx]] = [list[newIdx], list[idx]];
    const reordered = list.map((m, i) => ({ ...m, priority: i + 1 }));
    setConfig({ ...config, model_preferences: reordered });
  };

  if (isLoading || !config) return <Card loading style={{ minHeight: 400 }} />;

  const strategyList = [
    { key: 'cost_optimized', label: '成本优先', desc: '自动选成本最低模型，适合批量任务', icon: <DollarOutlined />, color: '#52c41a' },
    { key: 'balanced', label: '均衡策略', desc: '综合成本和质量，自动平衡性价比', icon: <NodeIndexOutlined />, color: '#1677ff' },
    { key: 'quality_optimized', label: '质量优先', desc: '选综合评分最高模型，适合高精度任务', icon: <SafetyCertificateOutlined />, color: '#faad14' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>智能路由</h1>
        {isAdmin && (
          <Button type="primary" icon={<SaveOutlined />} onClick={() => saveMutation.mutate(config)} loading={saveMutation.isPending}>
            保存配置
          </Button>
        )}
      </div>

      <Alert message="勾选启用策略 → 选择默认策略 → 排序模型优先级 → 点击保存" type="info" showIcon />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title={<><ThunderboltOutlined /> 策略配置</>}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {strategyList.map((s) => {
                const isDefault = config.default_strategy === s.key;
                return (
                  <div
                    key={s.key}
                    style={{
                      border: `2px solid ${isDefault ? '#1677ff' : '#f0f0f0'}`,
                      borderRadius: 8, padding: '16px 20px', cursor: isAdmin ? 'pointer' : 'default',
                      background: isDefault ? '#f0f5ff' : '#fff',
                      opacity: isAdmin ? 1 : 0.7,
                    }}
                    onClick={() => isAdmin && setDefaultStrategy(s.key)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 18, color: s.color }}>{s.icon}</span>
                          <Text strong style={{ fontSize: 16 }}>{s.label}</Text>
                          {isDefault && <Tag color="blue">当前策略</Tag>}
                        </div>
                        <Text type="secondary" style={{ fontSize: 13 }}>{s.desc}</Text>
                      </div>
                      <Radio checked={isDefault} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="路由流程">
            <Steps
              direction="vertical" size="small" current={-1}
              items={[
                { title: '策略层', description: `根据${config.default_strategy === 'cost_optimized' ? '成本优先' : config.default_strategy === 'quality_optimized' ? '质量优先' : '均衡策略'}选择路由逻辑` },
                { title: '过滤层', description: '功能匹配 → 预算检查 → 健康检查 → 合规过滤' },
                { title: '选择层', description: `候选模型排序，最多 ${config.max_retries} 次 Fallback` },
              ]}
            />
            <Divider />
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="健康检查间隔">{config.health_check_interval}s</Descriptions.Item>
              <Descriptions.Item label="最大重试">{config.max_retries} 次</Descriptions.Item>
              <Descriptions.Item label="当前策略">{config.default_strategy === 'cost_optimized' ? '成本优先' : config.default_strategy === 'quality_optimized' ? '质量优先' : '均衡策略'}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Card title={<><ApiOutlined /> 模型优先级（拖拽排序）</>}>
        <Table
          dataSource={config.model_preferences}
          rowKey="model"
          pagination={false}
          size="middle"
          columns={[
            { title: '优先级', dataIndex: 'priority', key: 'priority', width: 80, align: 'center', render: (v: number) => <Tag color="blue">#{v}</Tag> },
            { title: '模型', dataIndex: 'model', key: 'model', width: 200, render: (v: string, r: ModelPreference) => <Tag color={PROVIDER_COLORS[r.provider] || 'default'}>{v}</Tag> },
            { title: '厂商', dataIndex: 'provider', key: 'provider', width: 100, render: (v: string) => <Tag>{v}</Tag> },
            {
              title: '启用', dataIndex: 'enabled', key: 'enabled', width: 80, align: 'center',
              render: (v: boolean, r: ModelPreference) => <Switch size="small" checked={v} disabled={!isAdmin} onChange={(checked) => toggleModel(r.model, checked)} />,
            },
            {
              title: '排序', key: 'actions', width: 120,
              render: (_: any, r: ModelPreference) => (
                <Space>
                  <Button size="small" icon={<ArrowUpOutlined />} disabled={!isAdmin || r.priority <= 1} onClick={() => movePriority(r.model, -1)} />
                  <Button size="small" icon={<ArrowDownOutlined />} disabled={!isAdmin || r.priority >= config.model_preferences.length} onClick={() => movePriority(r.model, 1)} />
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
