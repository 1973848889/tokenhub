'use client';

import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Segmented, DatePicker, Space } from 'antd';
import { DollarOutlined, ThunderboltOutlined, ApiOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePermission } from '@/hooks/usePermission';
import { useBillingReport } from '@/hooks/useBilling';
import { BillingTable } from '@/components/billing/BillingTable';
import { ExportButton } from '@/components/billing/ExportButton';
import { formatCost, formatTokens, formatNumber } from '@/lib/formatters';

const { RangePicker } = DatePicker;

export default function BillingPage() {
  const currentOrgId = useAuthStore((s) => s.currentOrgId) || 'org-default';
  const { isAdmin } = usePermission();
  const [groupBy, setGroupBy] = useState('dept');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const queryParams = useMemo(() => ({
    org_id: currentOrgId,
    start: dateRange[0].format('YYYY-MM-DD'),
    end: dateRange[1].format('YYYY-MM-DD'),
    group_by: groupBy,
    page,
    page_size: pageSize,
  }), [currentOrgId, dateRange, groupBy, page, pageSize]);

  const { data, isLoading, refetch } = useBillingReport(queryParams);

  const summary = useMemo(() => {
    if (!data?.data) return null;
    return data.data.reduce(
      (acc: any, row: any) => ({
        cost: acc.cost + row.total_cost,
        tokens: acc.tokens + row.total_tokens,
        calls: acc.calls + row.call_count,
      }),
      { cost: 0, tokens: 0, calls: 0 }
    );
  }, [data]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>账单分析</h1>
        <Space size="middle" wrap>
          <Segmented value={groupBy} onChange={(v) => { setGroupBy(v as string); setPage(1); }}
            options={[
              { label: '按部门', value: 'dept' },
              { label: '按用户', value: 'user' },
              { label: '按模型', value: 'model' },
              { label: '按天', value: 'day' },
            ]}
          />
          <RangePicker value={dateRange} onChange={(d) => { if (d?.[0] && d[1]) setDateRange([d[0], d[1]]); }} allowClear={false} maxDate={dayjs()} />
          {isAdmin && (
            <>
              <ExportButton query={queryParams} disabled={isLoading} />
              <button onClick={() => refetch()} style={{ border: '1px solid #d9d9d9', borderRadius: 6, padding: '4px 12px', background: '#fff', cursor: 'pointer' }}>刷新</button>
            </>
          )}
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {[
          { title: '期间总费用', value: formatCost(summary?.cost ?? 0), icon: <DollarOutlined />, color: '#1677ff' },
          { title: '总Token消耗', value: formatTokens(summary?.tokens ?? 0), icon: <ThunderboltOutlined />, color: '#52c41a' },
          { title: '总调用次数', value: formatNumber(summary?.calls ?? 0), icon: <ApiOutlined />, color: '#faad14' },
        ].map((c) => (
          <Col xs={24} sm={8} key={c.title}>
            <Card size="small" loading={isLoading}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>{c.title}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: c.color }}>{c.value}</div>
                </div>
                <span style={{ fontSize: 20, color: c.color, opacity: 0.5 }}>{c.icon}</span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <BillingTable
        data={data?.data ?? []}
        loading={isLoading}
        groupBy={groupBy}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={(p, ps) => { setPage(p); setPageSize(ps); }}
      />
    </div>
  );
}
