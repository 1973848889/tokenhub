import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export interface BillingQueryParams {
  org_id: string;
  start: string;
  end: string;
  group_by?: string;
  dept_id?: string;
  user_id?: string;
  model?: string;
  page?: number;
  page_size?: number;
}

export interface BillingRow {
  dept_name?: string;
  user_name?: string;
  model_name?: string;
  project_name?: string;
  date?: string;
  call_count: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  total_cost: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  error_count: number;
  error_rate: number;
}

export interface BillingSummary {
  total_cost: number;
  total_tokens: number;
  total_calls: number;
  avg_cost_per_call: number;
  active_users: number;
  active_models: number;
}

export interface BillingReport {
  summary: BillingSummary;
  data: BillingRow[];
  total: number;
  page: number;
  page_size: number;
}

export function useBillingReport(params: BillingQueryParams) {
  return useQuery<BillingReport>({
    queryKey: ['billing', 'report', params],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get('/api/v1/admin/billing/report', {
        params,
        signal,
      });
      return data;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useBillingSummary(params: Omit<BillingQueryParams, 'page' | 'page_size'>) {
  return useQuery<BillingSummary>({
    queryKey: ['billing', 'summary', params],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get('/api/v1/admin/billing/summary', {
        params,
        signal,
      });
      return data;
    },
    staleTime: 60_000,
  });
}
