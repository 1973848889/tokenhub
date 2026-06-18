'use client';

import React, { useMemo } from 'react';
import { Table, Tag, Tooltip, Progress } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { formatTokens, formatCost, formatLatency, formatNumber } from '@/lib/formatters';
import { PROVIDER_COLORS } from '@/lib/constants';
import type { BillingRow } from '@/hooks/useBilling';

interface Props {
  data: BillingRow[];
  loading: boolean;
  groupBy: string;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
}

export function BillingTable({ data, loading, groupBy, total, page, pageSize, onPageChange }: Props) {
  const columns: ColumnsType<BillingRow> = useMemo(() => {
    const groupCol = getGroupColumn(groupBy);
    return [
      groupCol,
      {
        title: '调用次数', dataIndex: 'call_count', key: 'call_count', width: 100, align: 'right',
        render: (v: number) => formatNumber(v),
        sorter: (a: BillingRow, b: BillingRow) => a.call_count - b.call_count,
      },
      {
        title: '输入Token', dataIndex: 'prompt_tokens', key: 'prompt_tokens', width: 110, align: 'right',
        render: (v: number) => formatTokens(v),
      },
      {
        title: '输出Token', dataIndex: 'completion_tokens', key: 'completion_tokens', width: 110, align: 'right',
        render: (v: number) => formatTokens(v),
      },
      {
        title: '总Token', dataIndex: 'total_tokens', key: 'total_tokens', width: 110, align: 'right',
        render: (v: number) => <span className="font-mono font-medium">{formatTokens(v)}</span>,
      },
      {
        title: '费用', dataIndex: 'total_cost', key: 'total_cost', width: 140, align: 'right',
        render: (v: number) => <span className="font-mono text-blue-600 font-medium">¥{formatCost(v)}</span>,
        sorter: (a: BillingRow, b: BillingRow) => a.total_cost - b.total_cost,
        defaultSortOrder: 'descend',
      },
      {
        title: '平均延迟', dataIndex: 'avg_latency_ms', key: 'avg_latency_ms', width: 100, align: 'right',
        render: (v: number) => formatLatency(v),
        responsive: ['lg'],
      },
      {
        title: '错误率', key: 'error_rate', width: 100, align: 'right',
        render: (_: unknown, r: BillingRow) => (
          <Tooltip title={`${r.error_count} 次错误`}>
            <span className="text-xs">
              <Tag color={r.error_rate > 0.05 ? 'red' : r.error_rate > 0.01 ? 'orange' : 'green'}>
                {(r.error_rate * 100).toFixed(2)}%
              </Tag>
            </span>
          </Tooltip>
        ),
        responsive: ['md'],
      },
    ];
  }, [groupBy]);

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey={(_, idx) => String(idx)}
      loading={loading}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        showTotal: (t) => `共 ${t} 条`,
        pageSizeOptions: ['10', '20', '50'],
        onChange: onPageChange,
      }}
      scroll={{ x: 1000 }}
      size="middle"
      summary={(pageData) => {
        const totalCost = pageData.reduce((s, r) => s + r.total_cost, 0);
        const totalTokens = pageData.reduce((s, r) => s + r.total_tokens, 0);
        const totalCalls = pageData.reduce((s, r) => s + r.call_count, 0);
        return (
          <Table.Summary fixed>
            <Table.Summary.Row className="font-bold bg-gray-50">
              <Table.Summary.Cell index={0}>合计</Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">{totalCalls.toLocaleString()}</Table.Summary.Cell>
              <Table.Summary.Cell index={2} />
              <Table.Summary.Cell index={3} />
              <Table.Summary.Cell index={4} align="right">{formatTokens(totalTokens)}</Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right" className="text-blue-600">
                ¥{formatCost(totalCost)}
              </Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        );
      }}
    />
  );
}

function getGroupColumn(groupBy: string): any {
  switch (groupBy) {
    case 'dept':
      return { title: '部门', dataIndex: 'dept_name', key: 'dept_name', fixed: 'left' as const, width: 120 };
    case 'user':
      return { title: '用户', dataIndex: 'user_name', key: 'user_name', fixed: 'left' as const, width: 140 };
    case 'model':
      return {
        title: '模型', dataIndex: 'model_name', key: 'model_name', fixed: 'left' as const, width: 160,
        render: (v: string) => (
          <span>
            <Tag color={PROVIDER_COLORS[v?.split('-')[0]] || 'default'}>{v}</Tag>
          </span>
        ),
      };
    case 'project':
      return { title: '项目', dataIndex: 'project_name', key: 'project_name', fixed: 'left' as const, width: 130 };
    case 'day':
      return { title: '日期', dataIndex: 'date', key: 'date', fixed: 'left' as const, width: 120 };
    default:
      return { title: '模型', dataIndex: 'model_name', key: 'model_name', fixed: 'left' as const, width: 160 };
  }
}
