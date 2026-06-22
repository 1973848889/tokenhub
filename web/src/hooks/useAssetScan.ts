import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export interface ScanFinding {
  dimension: string;
  severity: string;
  title: string;
  description: string;
  suggestion: string;
}

export interface SkillScanResult {
  skill_id: string;
  skill_name: string;
  status: string;
  score: number;
  findings: ScanFinding[];
}

export interface AssetScanReport {
  asset_id: string;
  asset_type: string;
  asset_name: string;
  overall_risk: string;
  overall_score: number;
  skill_results: SkillScanResult[];
  scanned_at: string;
}

export interface AssetTypeStat {
  type: string;
  total: number;
  scanned: number;
  safe: number;
  risk: number;
  blocked: number;
}

export interface AssetScanOverview {
  total_assets: number;
  scanned_assets: number;
  safe_count: number;
  risk_count: number;
  blocked_count: number;
  by_type: AssetTypeStat[];
  scan_interval_h: number;
  last_scan_at: string | null;
}

interface AssetScanResultsQuery {
  type?: string;
  risk?: string;
  page?: number;
  page_size?: number;
}

export function useAssetScanOverview() {
  return useQuery<AssetScanOverview>({
    queryKey: ['asset-scan', 'overview'],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get('/api/v1/admin/asset-scan/overview', { signal });
      return data;
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useAssetScanResults(params: AssetScanResultsQuery) {
  return useQuery<{ data: AssetScanReport[]; total: number; page: number; page_size: number }>({
    queryKey: ['asset-scan', 'results', params],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get('/api/v1/admin/asset-scan/results', { params, signal });
      return data;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useAssetScanResult(assetId: string | null) {
  return useQuery<AssetScanReport>({
    queryKey: ['asset-scan', 'result', assetId],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get(`/api/v1/admin/asset-scan/results/${assetId}`, { signal });
      return data;
    },
    enabled: !!assetId,
    staleTime: 60_000,
  });
}

export function useTriggerAssetScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/api/v1/admin/asset-scan/scan');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-scan'] });
    },
  });
}

export function useAssetScanConfig() {
  return useQuery<{ scan_interval_h: number }>({
    queryKey: ['asset-scan', 'config'],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get('/api/v1/admin/asset-scan/config', { signal });
      return data;
    },
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });
}

export function useUpdateAssetScanConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (scanIntervalH: number) => {
      const { data } = await apiClient.put('/api/v1/admin/asset-scan/config', { scan_interval_h: scanIntervalH });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-scan', 'config'] });
    },
  });
}
