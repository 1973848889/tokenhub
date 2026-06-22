'use client';

import React, { useState } from 'react';
import { Card, Row, Col, Table, Tag, Button, Select, message, Drawer, Descriptions, Progress, Space, Typography } from 'antd';
import { StopOutlined, WarningOutlined, CheckCircleOutlined, ScanOutlined, ReloadOutlined, ExpandOutlined, SettingOutlined } from '@ant-design/icons';
import { useAssetScanOverview, useAssetScanResults, useAssetScanResult, useTriggerAssetScan, useAssetScanConfig, useUpdateAssetScanConfig } from '@/hooks/useAssetScan';
import { ASSET_RISK_COLORS, ASSET_RISK_LABELS, ASSET_TYPE_LABELS, SCAN_DIMENSION_LABELS, SEVERITY_COLORS } from '@/lib/constants';
import { formatNumber } from '@/lib/formatters';
import type { AssetScanReport, ScanFinding } from '@/hooks/useAssetScan';

const { Text } = Typography;

export default function AssetTab() {
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [detailAssetId, setDetailAssetId] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  const { data: overview, isLoading: overviewLoading } = useAssetScanOverview();
  const { data: results } = useAssetScanResults({ type: typeFilter || undefined, risk: riskFilter || undefined, page, page_size: 20 });
  const { data: detail } = useAssetScanResult(detailAssetId);
  const { data: scanConfig } = useAssetScanConfig();
  const triggerScan = useTriggerAssetScan();
  const updateConfig = useUpdateAssetScanConfig();

  const handleScan = () => {
    triggerScan.mutate(undefined, { onSuccess: () => message.success('全量扫描已启动') });
  };

  return (
    <>
      <Row gutter={[16, 16]}>
        {[
          { title: '资产总数', value: overview?.total_assets ?? 0, icon: <ScanOutlined />, color: '#1677ff' },
          { title: '已扫描', value: overview?.scanned_assets ?? 0, icon: <CheckCircleOutlined />, color: '#52c41a' },
          { title: '风险资产', value: overview?.risk_count ?? 0, icon: <WarningOutlined />, color: '#faad14' },
          { title: '拦截资产', value: overview?.blocked_count ?? 0, icon: <StopOutlined />, color: '#ff4d4f' },
        ].map((card) => (
          <Col xs={12} sm={6} key={card.title}><Card size="small" loading={overviewLoading}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${card.color}15` }}>
              <span style={{ fontSize: 20, color: card.color }}>{card.icon}</span>
            </div>
            <div><div style={{ fontSize: 12, color: '#8c8c8c' }}>{card.title}</div><div style={{ fontSize: 22, fontWeight: 700, color: card.color }}>{formatNumber(card.value)}</div></div>
          </div></Card></Col>
        ))}
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="资产分布" size="small">
            <Table dataSource={overview?.by_type || []} rowKey="type" pagination={false} size="small"
              columns={[
                { title: '类型', dataIndex: 'type', render: (v: string) => <Tag>{ASSET_TYPE_LABELS[v] || v}</Tag> },
                { title: '总数', dataIndex: 'total' },
                { title: '已扫描', dataIndex: 'scanned' },
                { title: '安全', dataIndex: 'safe', render: (v: number) => <Tag color="green">{v}</Tag> },
                { title: '风险', dataIndex: 'risk', render: (v: number) => v > 0 ? <Tag color="orange">{v}</Tag> : <Tag>{v}</Tag> },
                { title: '拦截', dataIndex: 'blocked', render: (v: number) => v > 0 ? <Tag color="red">{v}</Tag> : <Tag>{v}</Tag> },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="扫描配置" size="small" extra={
            <Space>
              <Button size="small" icon={<ReloadOutlined />} loading={triggerScan.isPending} onClick={handleScan}>手动扫描</Button>
              <Button size="small" icon={<SettingOutlined />} onClick={() => setConfigOpen(true)}>配置</Button>
            </Space>
          }>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="扫描间隔">{scanConfig?.scan_interval_h ?? 24} 小时</Descriptions.Item>
                <Descriptions.Item label="上次扫描">{overview?.last_scan_at ? new Date(overview.last_scan_at).toLocaleString('zh-CN') : '未扫描'}</Descriptions.Item>
                <Descriptions.Item label="安全 Agent">
                  <Tag color="green" icon={<CheckCircleOutlined />}>运行中</Tag>
                </Descriptions.Item>
              </Descriptions>
              <ConfigModal open={configOpen} onClose={() => setConfigOpen(false)} currentInterval={scanConfig?.scan_interval_h ?? 24} onSave={(h) => { updateConfig.mutate(h, { onSuccess: () => { message.success('扫描间隔已更新'); setConfigOpen(false); } }); }} />
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="资产扫描结果" extra={
        <Space>
          <Select placeholder="资产类型" allowClear value={typeFilter || undefined} onChange={(v) => { setTypeFilter(v || ''); setPage(1); }} style={{ width: 120 }}
            options={[{ value: 'agent', label: 'Agent' }, { value: 'skill', label: 'Skill' }, { value: 'mcp', label: 'MCP工具' }]} />
          <Select placeholder="风险等级" allowClear value={riskFilter || undefined} onChange={(v) => { setRiskFilter(v || ''); setPage(1); }} style={{ width: 120 }}
            options={[{ value: 'safe', label: '安全' }, { value: 'risky', label: '风险' }, { value: 'blocked', label: '拦截' }]} />
        </Space>
      }>
        <Table dataSource={results?.data} rowKey="asset_id" size="small"
          pagination={{ current: page, pageSize: 20, total: results?.total ?? 0, onChange: setPage }}
          columns={[
            { title: '资产名称', dataIndex: 'asset_name', render: (v: string) => <Text strong>{v}</Text> },
            { title: '类型', dataIndex: 'asset_type', render: (v: string) => <Tag>{ASSET_TYPE_LABELS[v] || v}</Tag> },
            { title: '风险等级', dataIndex: 'overall_risk', render: (v: string) => <Tag color={ASSET_RISK_COLORS[v]}>{ASSET_RISK_LABELS[v] || v}</Tag> },
            { title: '安全评分', dataIndex: 'overall_score', render: (v: number) => <Progress percent={v} size="small" strokeColor={v >= 80 ? '#52c41a' : v >= 50 ? '#faad14' : '#ff4d4f'} /> },
            { title: '风险维度', key: 'dimensions', render: (_: any, record: AssetScanReport) => {
              const dims = new Set<string>();
              record.skill_results?.forEach((sr) => sr.findings?.forEach((f) => dims.add(f.dimension)));
              return Array.from(dims).map((d) => <Tag key={d} color={SEVERITY_COLORS.info}>{SCAN_DIMENSION_LABELS[d] || d}</Tag>);
            }},
            { title: '扫描时间', dataIndex: 'scanned_at', render: (v: string) => new Date(v).toLocaleString('zh-CN') },
            { title: '操作', key: 'action', render: (_: any, record: AssetScanReport) => (
              <Button type="link" size="small" icon={<ExpandOutlined />} onClick={() => setDetailAssetId(record.asset_id)}>详情</Button>
            )},
          ]}
        />
      </Card>

      <Drawer title="资产安全扫描详情" open={!!detailAssetId} onClose={() => setDetailAssetId(null)} width={720}>
        {detail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="资产名称">{detail.asset_name}</Descriptions.Item>
              <Descriptions.Item label="资产类型"><Tag>{ASSET_TYPE_LABELS[detail.asset_type] || detail.asset_type}</Tag></Descriptions.Item>
              <Descriptions.Item label="安全评分">
                <Progress percent={detail.overall_score} size="small" strokeColor={detail.overall_score >= 80 ? '#52c41a' : detail.overall_score >= 50 ? '#faad14' : '#ff4d4f'} />
              </Descriptions.Item>
              <Descriptions.Item label="风险等级"><Tag color={ASSET_RISK_COLORS[detail.overall_risk]}>{ASSET_RISK_LABELS[detail.overall_risk] || detail.overall_risk}</Tag></Descriptions.Item>
              <Descriptions.Item label="扫描时间" span={2}>{new Date(detail.scanned_at).toLocaleString('zh-CN')}</Descriptions.Item>
            </Descriptions>

            {detail.skill_results?.map((sr) => (
              <Card key={sr.skill_id} size="small" title={
                <Space>
                  <Text strong>{sr.skill_name}</Text>
                  <Tag color={sr.status === 'pass' ? 'green' : sr.status === 'warning' ? 'orange' : 'red'}>
                    {sr.status === 'pass' ? '通过' : sr.status === 'warning' ? '告警' : '拦截'}
                  </Tag>
                  <Text type="secondary">评分: {sr.score}</Text>
                </Space>
              }>
                {sr.findings?.length > 0 ? (
                  <Table dataSource={sr.findings} rowKey={(_r: ScanFinding, i?: number) => `${sr.skill_id}-${i ?? 0}`} pagination={false} size="small"
                    columns={[
                      { title: '严重度', dataIndex: 'severity', width: 80, render: (v: string) => <Tag color={SEVERITY_COLORS[v]}>{v === 'critical' ? '严重' : v === 'high' ? '高' : v === 'medium' ? '中' : v === 'low' ? '低' : '信息'}</Tag> },
                      { title: '标题', dataIndex: 'title' },
                      { title: '描述', dataIndex: 'description', ellipsis: true },
                      { title: '修复建议', dataIndex: 'suggestion', ellipsis: true },
                    ]}
                  />
                ) : <Text type="secondary">未发现风险</Text>}
              </Card>
            ))}
          </div>
        )}
      </Drawer>
    </>
  );
}

function ConfigModal({ open, onClose, currentInterval, onSave }: { open: boolean; onClose: () => void; currentInterval: number; onSave: (h: number) => void }) {
  const [val, setVal] = useState(currentInterval);
  return (
    <Drawer title="扫描间隔配置" open={open} onClose={onClose} width={360}
      footer={<Space><Button onClick={onClose}>取消</Button><Button type="primary" onClick={() => onSave(val)}>保存</Button></Space>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Text>设置安全巡检 Agent 的全量扫描间隔</Text>
        <Select value={val} onChange={setVal} style={{ width: '100%' }}
          options={[
            { value: 1, label: '1 小时' },
            { value: 6, label: '6 小时' },
            { value: 12, label: '12 小时' },
            { value: 24, label: '24 小时 (推荐)' },
            { value: 48, label: '48 小时' },
            { value: 72, label: '72 小时' },
          ]}
        />
      </div>
    </Drawer>
  );
}
