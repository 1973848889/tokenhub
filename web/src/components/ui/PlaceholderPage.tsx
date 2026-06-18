'use client';

import React from 'react';
import { Card, Empty } from 'antd';

const placeholderPages: Record<string, { title: string; icon: string }> = {
  'billing':     { title: '运营管理', icon: '💳' },
  'api-keys':    { title: 'API Key 管理', icon: '🔑' },
  'models':      { title: '模型推荐', icon: '🤖' },
  'safety':      { title: '运营安全监控', icon: '🛡️' },
  'agents':      { title: 'Agent 行为分析', icon: '📊' },
  'compliance':  { title: '合规报告', icon: '📋' },
  'settings':    { title: '系统设置', icon: '⚙️' },
};

export function PlaceholderPage({ pageKey }: { pageKey: string }) {
  const info = placeholderPages[pageKey] || { title: pageKey, icon: '📄' };
  return (
    <Card>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{info.icon}</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>{info.title}</h2>
            <p style={{ color: '#8c8c8c' }}>功能开发中，敬请期待...</p>
          </div>
        }
      />
    </Card>
  );
}
