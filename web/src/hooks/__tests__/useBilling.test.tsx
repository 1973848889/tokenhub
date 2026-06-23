import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/lib/api-client', () => ({
  default: { get: vi.fn() },
}));

import apiClient from '@/lib/api-client';
import { useBillingReport, useBillingSummary } from '@/hooks/useBilling';
import type { BillingReport, BillingSummary, BillingRow } from '@/hooks/useBilling';

const mockSummary: BillingSummary = {
  total_cost: 450.75,
  total_tokens: 12_500_000,
  total_calls: 3450,
  avg_cost_per_call: 0.13,
  active_users: 28,
  active_models: 5,
};

const mockRow: BillingRow = {
  dept_name: 'Engineering',
  user_name: 'Alice',
  model_name: 'gpt-4o',
  project_name: 'ChatBot',
  date: '2026-06-20',
  call_count: 150,
  prompt_tokens: 800_000,
  completion_tokens: 200_000,
  total_tokens: 1_000_000,
  total_cost: 32.5,
  avg_latency_ms: 420,
  p95_latency_ms: 1200,
  error_count: 3,
  error_rate: 0.02,
};

const mockReport: BillingReport = {
  summary: mockSummary,
  data: [mockRow],
  total: 1,
  page: 1,
  page_size: 20,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useBillingReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseParams = {
    org_id: 'org-001',
    start: '2026-06-01',
    end: '2026-06-15',
  };

  it('calls correct API endpoint with params', async () => {
    const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
    mockGet.mockResolvedValue({ data: mockReport });

    renderHook(() => useBillingReport(baseParams), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/billing/report', {
      params: baseParams,
      signal: expect.any(AbortSignal),
    });
  });

  it('returns report data on success', async () => {
    const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
    mockGet.mockResolvedValue({ data: mockReport });

    const { result } = renderHook(() => useBillingReport(baseParams), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockReport);
    expect(result.current.data?.summary.total_cost).toBe(450.75);
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.total).toBe(1);
    expect(result.current.data?.page).toBe(1);
    expect(result.current.data?.page_size).toBe(20);
  });

  it('handles API error', async () => {
    const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
    mockGet.mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useBillingReport(baseParams), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('passes additional params like page and page_size', async () => {
    const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
    mockGet.mockResolvedValue({ data: mockReport });

    const params = { ...baseParams, page: 2, page_size: 10, group_by: 'dept' };
    renderHook(() => useBillingReport(params), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/billing/report', {
      params,
      signal: expect.any(AbortSignal),
    });
  });

  it('passes minimal default params (org_id, start, end)', async () => {
    const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
    mockGet.mockResolvedValue({ data: mockReport });

    const minimalParams = { org_id: 'org-001', start: '2026-06-01', end: '2026-06-15' };
    renderHook(() => useBillingReport(minimalParams), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/billing/report', {
      params: minimalParams,
      signal: expect.any(AbortSignal),
    });
  });
});

describe('useBillingSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseParams = {
    org_id: 'org-001',
    start: '2026-06-01',
    end: '2026-06-15',
  };

  it('calls correct API endpoint with params', async () => {
    const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
    mockGet.mockResolvedValue({ data: mockSummary });

    renderHook(() => useBillingSummary(baseParams), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/billing/summary', {
      params: baseParams,
      signal: expect.any(AbortSignal),
    });
  });

  it('returns summary data on success', async () => {
    const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
    mockGet.mockResolvedValue({ data: mockSummary });

    const { result } = renderHook(() => useBillingSummary(baseParams), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSummary);
    expect(result.current.data?.total_cost).toBe(450.75);
    expect(result.current.data?.total_tokens).toBe(12_500_000);
    expect(result.current.data?.active_users).toBe(28);
  });

  it('handles API error', async () => {
    const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
    mockGet.mockRejectedValue(new Error('Server Error'));

    const { result } = renderHook(() => useBillingSummary(baseParams), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('passes optional group_by param', async () => {
    const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
    mockGet.mockResolvedValue({ data: mockSummary });

    const params = { ...baseParams, group_by: 'model' as const };
    renderHook(() => useBillingSummary(params), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/billing/summary', {
      params,
      signal: expect.any(AbortSignal),
    });
  });

  it('passes minimal default params (org_id, start, end)', async () => {
    const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
    mockGet.mockResolvedValue({ data: mockSummary });

    const minimalParams = { org_id: 'org-001', start: '2026-06-01', end: '2026-06-15' };
    renderHook(() => useBillingSummary(minimalParams), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    expect(mockGet).toHaveBeenCalledWith('/api/v1/admin/billing/summary', {
      params: minimalParams,
      signal: expect.any(AbortSignal),
    });
  });

  it('does not accept page or page_size params', async () => {
    const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
    mockGet.mockResolvedValue({ data: mockSummary });

    // TypeScript would catch this at compile time, but we test the runtime behavior
    const params = {
      org_id: 'org-001',
      start: '2026-06-01',
      end: '2026-06-15',
    };
    renderHook(() => useBillingSummary(params), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    const callParams = mockGet.mock.calls[0][1].params;
    expect(callParams).not.toHaveProperty('page');
    expect(callParams).not.toHaveProperty('page_size');
  });
});
