import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/api-client', () => ({
  default: { get: vi.fn() },
}));

import apiClient from '@/lib/api-client';

const mockOverview = {
  today: { cost: 125.5, tokens: 5000000, calls: 1234, cost_change_rate: 0.15, tokens_change_rate: 0.1, calls_change_rate: -0.05 },
  month: { cost: 2500, budget: 5000, budget_usage_rate: 0.5, estimated_month_end: 4800 },
  model_distribution: [], top_depts: [], top_users: [], daily_trend: [], alerts: [],
};

describe('useDashboard Hook', () => {
  it('should format API params correctly', async () => {
    const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
    mockGet.mockResolvedValue({ data: mockOverview });

    await apiClient.get('/api/v1/admin/dashboard/overview', {
      params: { org_id: 'org-001', start: '2026-06-01', end: '2026-06-14', dept_id: 'dept-002' },
    });

    expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/dashboard/overview', {
      params: { org_id: 'org-001', start: '2026-06-01', end: '2026-06-14', dept_id: 'dept-002' },
    });
  });

  it('should return data on success', async () => {
    const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
    mockGet.mockResolvedValue({ data: mockOverview });

    const { data } = await apiClient.get('/api/v1/admin/dashboard/overview', {
      params: { org_id: 'org-001', start: '2026-06-01', end: '2026-06-14' },
    });

    expect(data).toEqual(mockOverview);
    expect(data.today.cost).toBe(125.5);
  });

  it('should handle API error', async () => {
    const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
    mockGet.mockRejectedValue(new Error('Network Error'));

    await expect(apiClient.get('/api/v1/admin/dashboard/overview')).rejects.toThrow('Network Error');
  });

  it('should pass default params without dept_id', async () => {
    const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
    mockGet.mockResolvedValue({ data: mockOverview });

    await apiClient.get('/api/v1/admin/dashboard/overview', {
      params: { org_id: 'org-001', start: '2026-06-01', end: '2026-06-14' },
    });

    expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/dashboard/overview', {
      params: { org_id: 'org-001', start: '2026-06-01', end: '2026-06-14' },
    });
  });
});
