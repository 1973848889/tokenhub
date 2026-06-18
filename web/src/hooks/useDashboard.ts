import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import type { DashboardOverview } from '@/types/dashboard';

interface UseDashboardOptions {
  orgId: string;
  start: string;
  end: string;
  deptId?: string;
}

export function useDashboard(options: UseDashboardOptions) {
  const { orgId, start, end, deptId } = options;

  return useQuery<DashboardOverview>({
    queryKey: ['dashboard', 'overview', orgId, start, end, deptId].filter(Boolean),
    queryFn: async ({ signal }) => {
      const params: Record<string, string> = { org_id: orgId, start, end };
      if (deptId) params.dept_id = deptId;
      const { data } = await apiClient.get('/api/v1/admin/dashboard/overview', { params, signal });
      return data;
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
    placeholderData: (prev: any) => prev,
    refetchOnWindowFocus: true,
  });
}
