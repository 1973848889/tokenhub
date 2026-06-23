import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockData = {
  data: [
    { dept_name: '研发部', call_count: 100, prompt_tokens: 500000, completion_tokens: 300000, total_tokens: 800000, total_cost: 250.5 },
    { dept_name: '产品部', call_count: 50, prompt_tokens: 200000, completion_tokens: 100000, total_tokens: 300000, total_cost: 120.3 },
  ],
  total: 2,
  page: 1,
  page_size: 20,
};

const { mockUseBillingReport } = vi.hoisted(() => ({
  mockUseBillingReport: vi.fn(),
}));

vi.mock('@/stores/useAuthStore', () => {
  const state = {
    token: 'mock-token',
    user: {
      id: '1',
      name: '管理员',
      email: 'admin@test.com',
      role: 'super_admin' as const,
    },
    currentOrgId: 'org-default',
    isAuthenticated: true,
    logout: vi.fn(),
  };
  return {
    useAuthStore: (selector?: (s: typeof state) => unknown) =>
      selector ? selector(state) : state,
  };
});

vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({
    role: 'super_admin' as const,
    isAdmin: true,
    isReadonly: false,
    canAccessSettings: true,
  }),
}));

vi.mock('@/hooks/useBilling', () => ({
  useBillingReport: mockUseBillingReport,
  useBillingSummary: vi.fn(),
}));

vi.mock('@/components/billing/BillingTable', () => ({
  BillingTable: vi.fn(({ data, loading }: { data: any[]; loading: boolean }) => (
    <div data-testid="billing-table" className="ant-table">
      {loading ? 'Loading...' : `Rows: ${data.length}`}
    </div>
  )),
}));

vi.mock('@/components/billing/ExportButton', () => ({
  ExportButton: vi.fn(() => <button>导出报表</button>),
}));

import BillingPage from '../page';

describe('BillingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBillingReport.mockReturnValue({
      data: mockData,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  it('renders page title', () => {
    render(<BillingPage />);
    expect(screen.getByText('账单分析')).toBeInTheDocument();
  });

  it('renders grouped segmented filter', () => {
    render(<BillingPage />);
    expect(screen.getByText('按部门')).toBeInTheDocument();
    expect(screen.getByText('按用户')).toBeInTheDocument();
    expect(screen.getByText('按模型')).toBeInTheDocument();
    expect(screen.getByText('按天')).toBeInTheDocument();
  });

  it('renders date range picker', () => {
    const { container } = render(<BillingPage />);
    expect(container.querySelector('.ant-picker-range')).toBeInTheDocument();
  });

  it('renders stat cards', () => {
    render(<BillingPage />);
    expect(screen.getByText('期间总费用')).toBeInTheDocument();
    expect(screen.getByText('总Token消耗')).toBeInTheDocument();
    expect(screen.getByText('总调用次数')).toBeInTheDocument();
  });

  it('renders table', () => {
    const { container } = render(<BillingPage />);
    expect(container.querySelector('.ant-table')).toBeInTheDocument();
  });

  it('calls useBillingReport on mount', () => {
    render(<BillingPage />);
    expect(mockUseBillingReport).toHaveBeenCalledTimes(1);
    expect(mockUseBillingReport).toHaveBeenCalledWith(
      expect.objectContaining({
        org_id: 'org-default',
        group_by: 'dept',
        page: 1,
        page_size: 20,
        start: expect.any(String),
        end: expect.any(String),
      })
    );
  });

  it('changing groupBy triggers new API call', () => {
    render(<BillingPage />);
    expect(mockUseBillingReport).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('按用户'));

    expect(mockUseBillingReport).toHaveBeenCalledTimes(2);
    expect(mockUseBillingReport).toHaveBeenCalledWith(
      expect.objectContaining({
        group_by: 'user',
        page: 1,
      })
    );
  });
});
