'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import AdminLayout from '@/components/layout/AdminLayout';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    if (!isAuthenticated) {
      login('dev-token', 'dev-refresh', { id: 'dev', name: '超级管理员', email: 'admin@example.com', role: 'super_admin' });
    }
  }, [isAuthenticated, login]);

  return <AdminLayout>{children}</AdminLayout>;
}
