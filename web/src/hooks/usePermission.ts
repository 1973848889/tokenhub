import { useAuthStore } from '@/stores/useAuthStore';

export type UserRole = 'super_admin' | 'dept_admin' | 'user' | 'auditor';

const ADMIN_ROLES: UserRole[] = ['super_admin', 'dept_admin'];

export function usePermission() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role || 'user';

  const isAdmin = ADMIN_ROLES.includes(role as UserRole);
  const isReadonly = !isAdmin;
  const canAccessSettings = isAdmin;

  return { role, isAdmin, isReadonly, canAccessSettings } as const;
}
