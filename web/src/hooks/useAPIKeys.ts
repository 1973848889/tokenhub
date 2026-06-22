import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { message } from 'antd';

export interface APIKey {
  id: string;
  key_prefix: string;
  api_key?: string;
  name: string;
  user_name: string;
  user_id?: string;
  dept_name: string;
  org_id: string;
  dept_id: string;
  status: 'active' | 'suspended' | 'revoked' | 'expired';
  daily_budget: number;
  rate_limit_rpm: number;
  allowed_models: string[];
  allowed_ips: string[];
  today_cost: number;
  today_tokens: number;
  today_calls: number;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
}

export interface CreateKeyRequest {
  name: string;
  user_id: string;
  org_id: string;
  dept_id: string;
  project_id?: string;
  daily_budget?: number;
  rate_limit_rpm?: number;
  allowed_models?: string[];
  allowed_ips?: string[];
  expires_days?: number;
}

export interface CreatedKey {
  id: string;
  api_key: string;
  key_prefix: string;
}

interface ListKeysParams {
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}

interface KeyListResult {
  data: APIKey[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export function useAPIKeys(params: ListKeysParams = {}) {
  return useQuery<KeyListResult>({
    queryKey: ['api-keys', params],
    queryFn: async ({ signal }) => {
      const { data } = await apiClient.get('/api/v1/admin/keys', { params, signal });
      return data;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useCreateKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: CreateKeyRequest) => {
      const payload = {
        ...values,
        org_id: 'org-001',
        dept_id: values.dept_id || 'dept-rd',
        user_id: values.user_id || 'user-001',
      };
      const { data } = await apiClient.post('/api/v1/admin/keys', payload);
      return data as CreatedKey;
    },
    onSuccess: () => {
      message.success('Key 创建成功');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.message || '创建失败');
    },
  });
}

export function useRevokeKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyId: string) => {
      await apiClient.delete(`/api/v1/admin/keys/${keyId}`);
    },
    onMutate: async (keyId) => {
      await queryClient.cancelQueries({ queryKey: ['api-keys'] });
      const prev = queryClient.getQueryData<KeyListResult>(['api-keys']);
      if (prev) {
        queryClient.setQueryData<KeyListResult>(['api-keys'], {
          ...prev,
          data: prev.data.map((k) => (k.id === keyId ? { ...k, status: 'revoked' as const } : k)),
        });
      }
      return { prev };
    },
    onError: (_err, _keyId, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['api-keys'], ctx.prev);
      message.error('吊销失败');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}

export function useUpdateKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ keyId, values }: { keyId: string; values: Partial<CreateKeyRequest> }) => {
      const { data } = await apiClient.put(`/api/v1/admin/keys/${keyId}`, values);
      return data as APIKey;
    },
    onSuccess: (_data, variables) => {
      message.success('Key 已更新');
      queryClient.setQueryData<KeyListResult>(['api-keys'], (prev) => {
        if (!prev) return prev;
        const updatedList = prev.data.map((k) => (k.id === variables.keyId ? { ...k, ..._data } : k));
        const editedKey = updatedList.find((k) => k.id === variables.keyId);
        const others = updatedList.filter((k) => k.id !== variables.keyId);
        return { ...prev, data: editedKey ? [editedKey, ...others] : prev.data };
      });
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: () => {
      message.error('更新失败');
    },
  });
}

export function useToggleKeyStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ keyId, status }: { keyId: string; status: string }) => {
      await apiClient.put(`/api/v1/admin/keys/${keyId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: () => {
      message.error('操作失败');
    },
  });
}
