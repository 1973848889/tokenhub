import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export interface AgentStats {
  today_calls: number;
  today_tokens: number;
  today_cost: number;
  week_calls: number;
  week_tokens: number;
  week_cost: number;
  month_calls: number;
  month_tokens: number;
  month_cost: number;
  avg_latency_ms: number;
  error_rate: number;
  preferred_model: string;
  top_scene: string;
  active_hours: number[];
  cost_trend: string;
  cost_change_rate: number;
  blocked_calls: number;
}

export interface AgentProfile {
  key_id: string;
  key_prefix: string;
  key_name: string;
  owner_name: string;
  owner_email: string;
  owner_role: string;
  dept_name: string;
  status: string;
  stats: AgentStats;
  anomaly_flags: string[];
}

export interface AnomalyRecord {
  id: string;
  key_id: string;
  key_prefix: string;
  owner_name: string;
  anomaly_type: string;
  description: string;
  severity: string;
  timestamp: string;
  status: string;
}

export function useAgentRanking(params: { sort_by?: string } = {}) {
  return useQuery<{ data: AgentProfile[]; total: number }>({
    queryKey: ['agents', 'ranking', params],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get('/api/v1/admin/agents/ranking', { params, signal });
      return data;
    },
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useAgentProfile(keyId: string) {
  return useQuery<AgentProfile>({
    queryKey: ['agents', 'profile', keyId],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get(`/api/v1/admin/agents/${keyId}/profile`, { signal });
      return data;
    },
    enabled: !!keyId,
  });
}

export function useAgentAnomalies() {
  return useQuery<{ data: AnomalyRecord[]; total: number }>({
    queryKey: ['agents', 'anomalies'],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get('/api/v1/admin/agents/anomalies', { signal });
      return data;
    },
    refetchInterval: 15_000,
  });
}
