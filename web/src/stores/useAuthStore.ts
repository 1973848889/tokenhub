import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'dept_admin' | 'user' | 'auditor';
}

interface Organization {
  id: string;
  name: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  currentOrgId: string | null;
  availableOrgs: Organization[];
  isAuthenticated: boolean;

  login: (token: string, refreshToken: string, user: User) => void;
  logout: () => void;
  setCurrentOrg: (orgId: string) => void;
  setAvailableOrgs: (orgs: Organization[]) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      currentOrgId: null,
      availableOrgs: [],
      isAuthenticated: false,

      login: (token, refreshToken, user) =>
        set({ token, refreshToken, user, isAuthenticated: true }),

      logout: () =>
        set({ token: null, refreshToken: null, user: null, isAuthenticated: false }),

      setCurrentOrg: (orgId) => set({ currentOrgId: orgId }),

      setAvailableOrgs: (orgs) => set({ availableOrgs: orgs }),
    }),
    {
      name: 'tokenhub-auth',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        currentOrgId: state.currentOrgId,
        availableOrgs: state.availableOrgs,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
