'use client';

import React from 'react';
import { Table, Tag, Alert, Spin } from 'antd';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export default function FilingTab() {
  const { data, isLoading } = useQuery<any>({ queryKey: ['compliance', { type: 'algorithm_filing' }], queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/compliance/report', { params: { type: 'algorithm_filing' } }); return data; } });
  if (isLoading) return <Spin style={{ padding: 40 }} />;

  return (
    <div style={{ padding: 24 }}><Alert message="根据《生成式AI管理办法》完成备案" type="info" showIcon style={{ marginBottom: 16 }} />
      <Table dataSource={data?.models} rowKey="name" size="small" pagination={false}
        columns={[
          { title: '模型', dataIndex: 'name' }, { title: '版本', dataIndex: 'version' }, { title: '用途', dataIndex: 'purpose' },
          { title: '备案', dataIndex: 'is_filed', render: (v: boolean) => v ? <Tag color="green">已备案</Tag> : <Tag color="orange">未备案</Tag> },
          { title: '时间', dataIndex: 'filing_date', render: (v: string) => v || '-' },
        ]}
      />
    </div>
  );
}
