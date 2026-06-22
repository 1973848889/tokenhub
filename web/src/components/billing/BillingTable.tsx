'use client';

import React, { useMemo } from 'react';
import { Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { formatTokens, formatCost, formatNumber } from '@/lib/formatters';
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
        title: '调用次数', dataIndex: 'call_count', key: 'call_count', width: 100, align: 'center',
        render: (v: number) => formatNumber(v),
        sorter: (a: BillingRow, b: BillingRow) => a.call_count - b.call_count,
      },
      {
        title: '输入Token', dataIndex: 'prompt_tokens', key: 'prompt_tokens', width: 110, align: 'center',
        render: (v: number) => formatTokens(v),
      },
      {
        title: '输出Token', dataIndex: 'completion_tokens', key: 'completion_tokens', width: 110, align: 'center',
        render: (v: number) => formatTokens(v),
      },
      {
        title: '总Token', dataIndex: 'total_tokens', key: 'total_tokens', width: 110, align: 'center',
        render: (v: number) => <span className="font-mono font-medium">{formatTokens(v)}</span>,
      },
      {
        title: '费用', dataIndex: 'total_cost', key: 'total_cost', width: 140, align: 'center',
        render: (v: number) => <span className="font-mono text-blue-600 font-medium">{formatCost(v)}</span>,
        sorter: (a: BillingRow, b: BillingRow) => a.total_cost - b.total_cost,
        defaultSortOrder: 'descend',
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
              <Table.Summary.Cell index={0} align="center">合计</Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="center">{totalCalls.toLocaleString()}</Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="center" />
              <Table.Summary.Cell index={3} align="center" />
              <Table.Summary.Cell index={4} align="center">{formatTokens(totalTokens)}</Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="center" className="text-blue-600">
                {formatCost(totalCost)}
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
      return { title: '部门', dataIndex: 'dept_name', key: 'dept_name', fixed: 'left' as const, width: 120, align: 'center' };
    case 'user':
      return { title: '用户', dataIndex: 'user_name', key: 'user_name', fixed: 'left' as const, width: 140, align: 'center' };
    case 'model':
      return {
        title: '模型', dataIndex: 'model_name', key: 'model_name', fixed: 'left' as const, width: 160, align: 'center',
        render: (v: string) => (
          <span>
            <Tag color={PROVIDER_COLORS[v?.split('-')[0]] || 'default'}>{v}</Tag>
          </span>
        ),
      };
    case 'project':
      return { title: '项目', dataIndex: 'project_name', key: 'project_name', fixed: 'left' as const, width: 130, align: 'center' };
    case 'day':
      return { title: '日期', dataIndex: 'date', key: 'date', fixed: 'left' as const, width: 120, align: 'center' };
    default:
      return { title: '模型', dataIndex: 'model_name', key: 'model_name', fixed: 'left' as const, width: 160, align: 'center' };
  }
}
