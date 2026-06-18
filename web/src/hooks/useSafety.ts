import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export interface RiskCategory {
  category: string;
  label: string;
  count: number;
  percentage: number;
}

export interface SafetyOverview {
  total_checks: number;
  passed: number;
  blocked: number;
  review: number;
  pii_findings: number;
  injection_attempts: number;
  block_rate: number;
  risk_categories: RiskCategory[];
}

export interface SafetyLog {
  event_id: string;
  timestamp: string;
  user_id: string;
  model_name: string;
  input_summary: string;
  total_tokens: number;
  safety_result: string;
  safety_labels: string[];
  sensitive_words: string[];
  pii_findings: number;
  injection_score: number;
}

interface SafetyQuery {
  safety_result?: string;
  page?: number;
  page_size?: number;
}

export function useSafetyOverview() {
  return useQuery<SafetyOverview>({
    queryKey: ['safety', 'overview'],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get('/api/v1/admin/safety/overview', { signal });
      return data;
    },
    refetchInterval: 15_000,
    placeholderData: (prev) => prev,
  });
}

export function useSafetyLogs(params: SafetyQuery) {
  return useQuery<{ data: SafetyLog[]; total: number }>({
    queryKey: ['safety', 'logs', params],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get('/api/v1/admin/safety/logs', { params, signal });
      return data;
    },
    staleTime: 10_000,
  });
}
