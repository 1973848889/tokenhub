import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/api-client', () => ({
  default: { get: vi.fn() },
}));

import apiClient from '@/lib/api-client';
import { useSafetyOverview, useSafetyLogs } from '@/hooks/useSafety';

const mockOverview = {
  total_checks: 5000,
  passed: 4200,
  blocked: 500,
  review: 300,
  pii_findings: 120,
  injection_attempts: 45,
  block_rate: 0.1,
  risk_categories: [
    { category: 'pii', label: 'PII 泄露', count: 120, percentage: 24 },
    { category: 'injection', label: '注入攻击', count: 45, percentage: 9 },
    { category: 'harmful', label: '有害内容', count: 335, percentage: 67 },
  ],
};

const mockLogs = {
  data: [
    {
      event_id: 'evt-001',
      timestamp: '2026-06-22T10:00:00Z',
      user_id: 'user-001',
      model_name: 'gpt-4',
      input_summary: 'test input',
      total_tokens: 1500,
      safety_result: 'block',
      safety_labels: ['harmful_content'],
      sensitive_words: ['hack', 'exploit'],
      pii_findings: 2,
      injection_score: 0.85,
    },
    {
      event_id: 'evt-002',
      timestamp: '2026-06-22T11:00:00Z',
      user_id: 'user-002',
      model_name: 'gpt-4',
      input_summary: 'normal input',
      total_tokens: 800,
      safety_result: 'pass',
      safety_labels: [],
      sensitive_words: [],
      pii_findings: 0,
      injection_score: 0.1,
    },
  ],
  total: 2,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useSafetyOverview', () => {
  it('calls correct API endpoint', async () => {
    const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
    mockGet.mockResolvedValue({ data: mockOverview });

    renderHook(() => useSafetyOverview(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/api/v1/admin/safety/overview',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });

  it('returns data on success', async () => {
    const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
    mockGet.mockResolvedValue({ data: mockOverview });

    const { result } = renderHook(() => useSafetyOverview(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockOverview);
    expect(result.current.data?.total_checks).toBe(5000);
    expect(result.current.data?.block_rate).toBe(0.1);
    expect(result.current.data?.risk_categories).toHaveLength(3);
  });

  it('handles API error', async () => {
    const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
    mockGet.mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useSafetyOverview(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});

describe('useSafetyLogs', () => {
  it('calls correct API endpoint', async () => {
    const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
    mockGet.mockResolvedValue({ data: mockLogs });

    renderHook(() => useSafetyLogs({ safety_result: 'block', page: 1, page_size: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/api/v1/admin/safety/logs',
        expect.objectContaining({
          params: { safety_result: 'block', page: 1, page_size: 10 },
          signal: expect.any(AbortSignal),
        }),
      );
    });
  });

  it('returns data on success', async () => {
    const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
    mockGet.mockResolvedValue({ data: mockLogs });

    const { result } = renderHook(() => useSafetyLogs({ page: 1, page_size: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockLogs);
    expect(result.current.data?.data).toHaveLength(2);
    expect(result.current.data?.total).toBe(2);
    expect(result.current.data?.data[0].safety_result).toBe('block');
    expect(result.current.data?.data[1].safety_result).toBe('pass');
  });

  it('filters by safety_result', async () => {
    const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
    const filteredLogs = {
      data: [mockLogs.data[0]],
      total: 1,
    };
    mockGet.mockResolvedValue({ data: filteredLogs });

    const { result } = renderHook(() => useSafetyLogs({ safety_result: 'block', page: 1, page_size: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith(
      '/api/v1/admin/safety/logs',
      expect.objectContaining({ params: { safety_result: 'block', page: 1, page_size: 10 } }),
    );
    expect(result.current.data?.data).toHaveLength(1);
    expect(result.current.data?.data.every((log) => log.safety_result === 'block')).toBe(true);
  });

  it('calls API with default empty params', async () => {
    const mockGet = apiClient.get as ReturnType<typeof vi.fn>;
    mockGet.mockResolvedValue({ data: mockLogs });

    renderHook(() => useSafetyLogs({}), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        '/api/v1/admin/safety/logs',
        expect.objectContaining({ params: {} }),
      );
    });
  });
});
