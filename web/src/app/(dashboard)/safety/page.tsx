'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, Segmented, Spin } from 'antd';
import { useSafetyOverview, useSafetyLogs } from '@/hooks/useSafety';
import { usePermission } from '@/hooks/usePermission';
import { SecurityScanOutlined, ScanOutlined, FileProtectOutlined } from '@ant-design/icons';

const OverviewTab = dynamic(() => import('@/components/safety/OverviewTab'), { ssr: false, loading: () => <Card loading style={{ minHeight: 400 }} /> });
const AssetTab = dynamic(() => import('@/components/safety/AssetTab'), { ssr: false, loading: () => <Spin style={{ display: 'block', padding: 48, textAlign: 'center' }} /> });
const FilingTab = dynamic(() => import('@/components/safety/FilingTab'), { ssr: false, loading: () => <Spin style={{ display: 'block', padding: 48, textAlign: 'center' }} /> });

export default function SafetyPage() {
  const { isAdmin } = usePermission();
  const [activeTab, setActiveTab] = useState('overview');
  const [resultFilter, setResultFilter] = useState('all');
  const [labelFilter, setLabelFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data: overview, isLoading } = useSafetyOverview();
  const { data: logs } = useSafetyLogs({ safety_result: resultFilter === 'all' ? undefined : resultFilter, label: labelFilter || undefined, page, page_size: 20 });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>运营安全</h1>
        <Segmented value={activeTab} onChange={setActiveTab}
          options={[
            { label: '运行安全', value: 'overview', icon: <SecurityScanOutlined /> },
            { label: '资产安全', value: 'asset', icon: <ScanOutlined /> },
            { label: '模型备案', value: 'filing', icon: <FileProtectOutlined /> },
          ]}
        />
      </div>

      {activeTab === 'overview' && <OverviewTab overview={overview} isLoading={isLoading} logs={logs} resultFilter={resultFilter} setResultFilter={setResultFilter} labelFilter={labelFilter} setLabelFilter={setLabelFilter} page={page} setPage={setPage} />}
      {activeTab === 'asset' && <AssetTab />}
      {activeTab === 'filing' && <FilingTab />}
    </div>
  );
}
