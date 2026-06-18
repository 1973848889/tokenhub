'use client';

import React, { useState } from 'react';
import { Button, Dropdown, message } from 'antd';
import { DownloadOutlined, LoadingOutlined } from '@ant-design/icons';
import apiClient from '@/lib/api-client';

interface Props {
  query: Record<string, any>;
  disabled?: boolean;
}

export function ExportButton({ query, disabled }: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      const { data } = await apiClient.get('/api/v1/admin/billing/export', {
        params: { ...query, format },
        responseType: 'blob',
        timeout: 120_000,
      });

      const mimeMap: Record<string, string> = { csv: 'text/csv', json: 'application/json' };
      const now = new Date().toISOString().slice(0, 10);
      const blob = new Blob([data], { type: mimeMap[format] });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `billing_${query.group_by || 'report'}_${now}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      message.success(`已导出 ${format.toUpperCase()}`);
    } catch {
      message.error('导出失败，请稍后重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dropdown
      menu={{
        items: [
          { key: 'csv', label: '导出 CSV' },
          { key: 'json', label: '导出 JSON' },
        ],
        onClick: ({ key }) => handleExport(key as 'csv' | 'json'),
      }}
      disabled={disabled || exporting}
    >
      <Button icon={exporting ? <LoadingOutlined /> : <DownloadOutlined />}>
        {exporting ? '导出中...' : '导出报表'}
      </Button>
    </Dropdown>
  );
}
