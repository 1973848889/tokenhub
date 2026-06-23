import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { BillingTable } from '../BillingTable';
import type { BillingRow } from '@/hooks/useBilling';

const mockData: BillingRow[] = [
  {
    dept_name: '技术部',
    user_name: '张三',
    model_name: 'deepseek-chat',
    project_name: '项目A',
    date: '2026-06-01',
    call_count: 1500,
    prompt_tokens: 100000,
    completion_tokens: 50000,
    total_tokens: 150000,
    total_cost: 25.5,
    avg_latency_ms: 200,
    p95_latency_ms: 500,
    error_count: 0,
    error_rate: 0,
  },
  {
    dept_name: '产品部',
    user_name: '李四',
    model_name: 'qwen-max',
    project_name: '项目B',
    date: '2026-06-02',
    call_count: 800,
    prompt_tokens: 60000,
    completion_tokens: 30000,
    total_tokens: 90000,
    total_cost: 15.0,
    avg_latency_ms: 300,
    p95_latency_ms: 700,
    error_count: 1,
    error_rate: 0.01,
  },
];

const defaultProps = {
  groupBy: 'model',
  total: 2,
  page: 1,
  pageSize: 20,
  onPageChange: vi.fn(),
};

function renderTable(overrides = {}) {
  return render(
    <BillingTable
      data={mockData}
      loading={false}
      {...defaultProps}
      {...overrides}
    />,
  );
}

function getHeaderCell(container: HTMLElement, text: string) {
  const thead = container.querySelector('.ant-table-thead');
  if (!thead) throw new Error('thead not found');
  return within(thead).getByText(text);
}

describe('BillingTable', () => {
  it('should render column headers and data rows', () => {
    const { container } = renderTable();

    expect(getHeaderCell(container, '调用次数')).toBeInTheDocument();
    expect(getHeaderCell(container, '输入Token')).toBeInTheDocument();
    expect(getHeaderCell(container, '输出Token')).toBeInTheDocument();
    expect(getHeaderCell(container, '总Token')).toBeInTheDocument();
    expect(getHeaderCell(container, '费用')).toBeInTheDocument();

    expect(screen.getByText('1,500')).toBeInTheDocument();
    expect(screen.getByText('800')).toBeInTheDocument();
    expect(screen.getByText('100.0K')).toBeInTheDocument();
    expect(screen.getByText('60.0K')).toBeInTheDocument();
    expect(screen.getByText('50.0K')).toBeInTheDocument();
    expect(screen.getByText('30.0K')).toBeInTheDocument();
    expect(screen.getByText('150.0K')).toBeInTheDocument();
    expect(screen.getByText('90.0K')).toBeInTheDocument();
    expect(screen.getByText('¥25.50')).toBeInTheDocument();
    expect(screen.getByText('¥15.00')).toBeInTheDocument();
  });

  it('should show loading state when loading is true', () => {
    const { container } = renderTable({ loading: true });

    expect(container.querySelector('.ant-spin-spinning')).toBeInTheDocument();
  });

  it('should show empty state when data is empty', () => {
    const { container } = renderTable({ data: [], total: 0 });

    expect(container.querySelector('.ant-empty')).toBeInTheDocument();
  });

  it('should show pagination with total count', () => {
    renderTable({ total: 100 });

    expect(screen.getByText(/共 100 条/)).toBeInTheDocument();
  });

  it('should render summary row with totals', () => {
    renderTable();

    expect(screen.getByText('合计')).toBeInTheDocument();
    expect(screen.getByText('2,300')).toBeInTheDocument();
    expect(screen.getByText('240.0K')).toBeInTheDocument();
    expect(screen.getByText('¥40.50')).toBeInTheDocument();
  });

  it('should show department column when groupBy is dept', () => {
    const { container } = renderTable({ groupBy: 'dept' });

    expect(getHeaderCell(container, '部门')).toBeInTheDocument();
    expect(screen.getByText('技术部')).toBeInTheDocument();
    expect(screen.getByText('产品部')).toBeInTheDocument();
  });

  it('should show user column when groupBy is user', () => {
    const { container } = renderTable({ groupBy: 'user' });

    expect(getHeaderCell(container, '用户')).toBeInTheDocument();
    expect(screen.getByText('张三')).toBeInTheDocument();
    expect(screen.getByText('李四')).toBeInTheDocument();
  });

  it('should show model column with Tag when groupBy is model', () => {
    const { container } = renderTable({ groupBy: 'model' });

    expect(getHeaderCell(container, '模型')).toBeInTheDocument();
    const tags = container.querySelectorAll('.ant-tag');
    expect(tags).toHaveLength(2);
    expect(screen.getByText('deepseek-chat')).toBeInTheDocument();
    expect(screen.getByText('qwen-max')).toBeInTheDocument();
  });

  it('should have default descending sort on 费用 column', () => {
    const { container } = renderTable();

    const costHeader = getHeaderCell(container, '费用').closest('th');
    expect(costHeader).toBeInTheDocument();
    expect(costHeader!.querySelector('.ant-table-column-sorter')).toBeInTheDocument();
    expect(costHeader!.classList.contains('ant-table-column-sort')).toBe(true);
  });

  it('should show project column when groupBy is project', () => {
    const { container } = renderTable({ groupBy: 'project' });

    expect(getHeaderCell(container, '项目')).toBeInTheDocument();
    expect(screen.getByText('项目A')).toBeInTheDocument();
    expect(screen.getByText('项目B')).toBeInTheDocument();
  });

  it('should show date column when groupBy is day', () => {
    const { container } = renderTable({ groupBy: 'day' });

    expect(getHeaderCell(container, '日期')).toBeInTheDocument();
    expect(screen.getByText('2026-06-01')).toBeInTheDocument();
    expect(screen.getByText('2026-06-02')).toBeInTheDocument();
  });

  it('should fallback to model column for unknown groupBy', () => {
    const { container } = renderTable({ groupBy: 'unknown' });

    expect(getHeaderCell(container, '模型')).toBeInTheDocument();
  });
});
