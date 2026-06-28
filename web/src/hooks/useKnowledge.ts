import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export interface KnowledgeScanFinding {
  dimension: string;
  severity: string;
  title: string;
  description: string;
}

export interface KnowledgeScanResult {
  scanned_at: string;
  risk_level: string;
  findings: KnowledgeScanFinding[];
}

export interface KnowledgeEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  file_name: string;
  file_size: number;
  file_type: string;
  status: string;
  scan_result: KnowledgeScanResult | null;
  created_at: string;
  updated_at: string;
}

export function useKnowledgeList(keyword?: string, category?: string) {
  return useQuery<{ data: KnowledgeEntry[]; total: number }>({
    queryKey: ['knowledge', 'list', keyword, category],
    queryFn: async ({ signal }) => {
      const params: Record<string, string> = {};
      if (keyword) params.keyword = keyword;
      if (category) params.category = category;
      const { data } = await apiClient.get('/api/v1/admin/knowledge', {
        params,
        signal,
      });
      return data;
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
}

export function useKnowledgeDetail(id: string) {
  return useQuery<{ data: KnowledgeEntry }>({
    queryKey: ['knowledge', 'detail', id],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get(`/api/v1/admin/knowledge/${id}`, { signal });
      return data;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    enabled: !!id,
  });
}

interface UploadKnowledgeInput {
  file: File;
  name: string;
  description: string;
  category: string;
}

export function useUploadKnowledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, name, description, category }: UploadKnowledgeInput) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('description', description);
      formData.append('category', category);
      const { data } = await apiClient.post('/api/v1/admin/knowledge/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge'] });
    },
  });
}

interface UpdateKnowledgeInput {
  id: string;
  name: string;
  description: string;
  category: string;
}

export function useUpdateKnowledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name, description, category }: UpdateKnowledgeInput) => {
      const { data } = await apiClient.put(`/api/v1/admin/knowledge/${id}`, { name, description, category });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge'] });
    },
  });
}

export function useDeleteKnowledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(`/api/v1/admin/knowledge/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['knowledge'] });
    },
  });
}

export function getDownloadUrl(id: string) {
  return `${apiClient.defaults.baseURL}/api/v1/admin/knowledge/${id}/download`;
}

export function useKnowledgeCategories() {
  return useQuery<{ data: string[] }>({
    queryKey: ['knowledge', 'categories'],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get('/api/v1/admin/knowledge/categories/list', { signal });
      return data;
    },
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });
}
