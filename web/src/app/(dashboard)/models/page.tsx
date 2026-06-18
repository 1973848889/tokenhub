'use client';

import React, { useState } from 'react';
import {
  Card, Input, Button, Tag, Progress, Row, Col, Space, Empty,
  Descriptions, Select, Tooltip, Badge, Statistic, Segmented,
} from 'antd';
import {
  SearchOutlined, ThunderboltOutlined, DollarOutlined, RocketOutlined,
  StarFilled, StarOutlined, SendOutlined, ExperimentOutlined,
} from '@ant-design/icons';
import { useRecommend } from '@/hooks/useRecommend';
import type { ModelRecommendation, RecommendResult } from '@/hooks/useRecommend';
import { PROVIDER_COLORS } from '@/lib/constants';
import { formatCost } from '@/lib/formatters';

const { TextArea } = Input;

export default function ModelsPage() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'recommend' | 'playground'>('recommend');
  const mutation = useRecommend();

  const handleSubmit = () => {
    if (query.trim().length >= 2) mutation.mutate(query.trim());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>模型推荐</h1>
        <Segmented value={activeTab} onChange={(v) => setActiveTab(v as 'recommend' | 'playground')}
          options={[{ label: '智能推荐', value: 'recommend', icon: <ThunderboltOutlined /> }, { label: '体验场', value: 'playground', icon: <ExperimentOutlined /> }]} />
      </div>

      {activeTab === 'recommend' ? (
        <RecommendView query={query} setQuery={setQuery} handleSubmit={handleSubmit} mutation={mutation} />
      ) : (
        <PlaygroundView />
      )}
    </div>
  );
}

function RecommendView({ query, setQuery, handleSubmit, mutation }: {
  query: string;
  setQuery: (v: string) => void;
  handleSubmit: () => void;
  mutation: ReturnType<typeof useRecommend>;
}) {
  const result = mutation.data;

  return (
    <>
      <Card>
        <div style={{ display: 'flex', gap: 12 }}>
          <TextArea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="描述你的使用场景，AI 将智能推荐最适合的模型...&#10;&#10;例如：帮我写一段 Python 数据分析代码、起草一份市场分析报告"
            autoSize={{ minRows: 2, maxRows: 4 }}
            style={{ flex: 1 }}
            onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          />
          <Button type="primary" icon={<SendOutlined />} onClick={handleSubmit} loading={mutation.isPending} style={{ height: 'auto' }}>
            分析推荐
          </Button>
        </div>

        {mutation.isError && (
          <div style={{ marginTop: 12, color: '#ff4d4f', fontSize: 13 }}>
            {mutation.error?.message || '分析失败，请重试'}
          </div>
        )}

        {result && (
          <div style={{ marginTop: 20 }}>
            <SceneBadge result={result} />
          </div>
        )}
      </Card>

      {!result && !mutation.isPending && (
        <Card>
          <Empty description="输入场景描述，获取模型推荐">
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              {['帮我写Python代码', '起草市场分析报告', '分析销售数据趋势', '翻译技术文档', '创作品牌广告语'].map((q) => (
                <Tag key={q} style={{ cursor: 'pointer' }} onClick={() => { setQuery(q); setTimeout(handleSubmit, 100); }}>{q}</Tag>
              ))}
            </div>
          </Empty>
        </Card>
      )}

      {result && (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <RecommendationCards recommendations={result.recommendations} />
          </Col>
          <Col xs={24} lg={8}>
            <ModelComparison recommendations={result.recommendations} />
          </Col>
        </Row>
      )}

      {result && (
        <SceneList allScenes={result.all_scenes} />
      )}
    </>
  );
}

function SceneBadge({ result }: { result: RecommendResult }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0', borderBottom: '1px solid #f0f0f0' }}>
      <span style={{ fontSize: 48 }}>{result.scene_icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 20, fontWeight: 700 }}>{result.scene_name}</span>
          <Tooltip title={`置信度 ${result.confidence}%`}>
            <Progress type="circle" percent={result.confidence} size={28} strokeColor={result.confidence > 60 ? '#52c41a' : result.confidence > 30 ? '#faad14' : '#ff4d4f'} format={() => ''} />
          </Tooltip>
          <Tag color="blue">{result.confidence}% 匹配</Tag>
        </div>
        <span style={{ color: '#8c8c8c', fontSize: 13 }}>{result.scene_desc}</span>
      </div>
    </div>
  );
}

function RecommendationCards({ recommendations }: { recommendations: ModelRecommendation[] }) {
  return (
    <Card title="推荐模型" size="small">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {recommendations.map((rec, idx) => (
          <ModelCard key={rec.model} rec={rec} rank={idx + 1} />
        ))}
      </div>
    </Card>
  );
}

function ModelCard({ rec, rank }: { rec: ModelRecommendation; rank: number }) {
  const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  return (
    <div style={{
      border: '1px solid #f0f0f0', borderRadius: 8, padding: '16px 20px',
      background: rank === 1 ? 'linear-gradient(135deg, #f0f5ff 0%, #fff 100%)' : '#fff',
      borderColor: rank === 1 ? '#1677ff' : '#f0f0f0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: medalColors[rank - 1] || '#8c8c8c' }}>#{rank}</span>
            <span style={{ fontSize: 16, fontWeight: 600 }}>{rec.display_name}</span>
            <Tag color={PROVIDER_COLORS[rec.provider] || 'default'}>{rec.provider}</Tag>
          </div>
          <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 8 }}>{rec.description}</div>
          <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
            <span>质量: <span style={{ fontWeight: 600, color: '#1677ff' }}>{rec.quality_score}</span></span>
            <span>成本: <span style={{ fontWeight: 600, color: '#52c41a' }}>{rec.cost_score}</span></span>
            <span>速度: <span style={{ fontWeight: 600, color: '#faad14' }}>{rec.speed_score}</span></span>
            <span style={{ color: '#8c8c8c' }}>
              价格: ¥{rec.input_price}/M in + ¥{rec.output_price}/M out
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'center', minWidth: 60 }}>
          <Progress type="circle" percent={rec.total_score} size={52} strokeColor="#1677ff" format={(p) => <span style={{ fontSize: 14, fontWeight: 700 }}>{p}</span>} />
          <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4 }}>综合评分</div>
        </div>
      </div>
    </div>
  );
}

function ModelComparison({ recommendations }: { recommendations: ModelRecommendation[] }) {
  if (recommendations.length < 2) return null;

  const a = recommendations[0];
  const b = recommendations[1];

  return (
    <Card title="模型对比" size="small">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <span style={{ fontSize: 12, color: '#8c8c8c' }}>综合评分</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12 }}>{a.display_name.split(' ')[0]}</span>
            <Progress percent={a.total_score} size="small" style={{ flex: 1 }} strokeColor="#1677ff" />
            <span style={{ fontSize: 12, fontWeight: 600 }}>{a.total_score}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12 }}>{b.display_name.split(' ')[0]}</span>
            <Progress percent={b.total_score} size="small" style={{ flex: 1 }} strokeColor="#52c41a" />
            <span style={{ fontSize: 12, fontWeight: 600 }}>{b.total_score}</span>
          </div>
        </div>
        <CompareBar label="质量评分" a={a.quality_score} b={b.quality_score} />
        <CompareBar label="成本评分" a={a.cost_score} b={b.cost_score} />
        <CompareBar label="速度评分" a={a.speed_score} b={b.speed_score} />

        <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 6, fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>成本估算 (百万Token)</div>
          <div>输入: ¥{formatCost(a.input_price)} vs ¥{formatCost(b.input_price)}</div>
          <div>输出: ¥{formatCost(a.output_price)} vs ¥{formatCost(b.output_price)}</div>
        </div>
      </div>
    </Card>
  );
}

function CompareBar({ label, a, b }: { label: string; a: number; b: number }) {
  const max = Math.max(a, b);
  return (
    <div>
      <span style={{ fontSize: 12, color: '#8c8c8c' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ width: `${(a / max) * 100}%`, height: 6, borderRadius: 3, background: '#1677ff', minWidth: 4, transition: 'width 0.3s' }} />
        <span style={{ fontSize: 11, fontWeight: 600 }}>{a}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ width: `${(b / max) * 100}%`, height: 6, borderRadius: 3, background: '#52c41a', minWidth: 4, transition: 'width 0.3s' }} />
        <span style={{ fontSize: 11, fontWeight: 600 }}>{b}</span>
      </div>
    </div>
  );
}

function SceneList({ allScenes }: { allScenes: SceneInfo[] }) {
  return (
    <Card title="支持的场景" size="small">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {allScenes.map((s) => (
          <Tag key={s.tag} style={{ padding: '4px 12px', fontSize: 13, borderRadius: 20 }}>
            {s.icon} {s.name}
          </Tag>
        ))}
      </div>
    </Card>
  );
}

function PlaygroundView() {
  const [playQuery, setPlayQuery] = useState('');
  const [response, setResponse] = useState('');

  return (
    <Card title="模型体验场" extra={<Tag color="blue">即将开放</Tag>}>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <TextArea
            value={playQuery}
            onChange={(e) => setPlayQuery(e.target.value)}
            placeholder="输入提示词测试模型效果..."
            autoSize={{ minRows: 6, maxRows: 12 }}
          />
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
            <Select placeholder="选择模型" style={{ width: 200 }} options={[
              { value: 'deepseek-chat', label: 'DeepSeek Chat' },
              { value: 'qwen-max', label: '通义千问 Max' },
              { value: 'doubao-pro-256k', label: '豆包 Pro' },
              { value: 'glm-5', label: 'GLM-5' },
              { value: 'kimi-latest', label: 'Kimi' },
            ]} />
            <Button type="primary" disabled>发送测试</Button>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ border: '1px solid #d9d9d9', borderRadius: 8, padding: 16, minHeight: 200, background: '#fafafa' }}>
            <Empty description="模型响应将显示在这里" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        </div>
      </div>
    </Card>
  );
}

import type { SceneInfo } from '@/hooks/useRecommend';
