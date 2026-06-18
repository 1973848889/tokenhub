import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../useAuthStore';

describe('useAuthStore', () => {
  const mockUser = {
    id: 'user-001',
    name: '张三',
    email: 'zhangsan@example.com',
    role: 'dept_admin' as const,
  };

  beforeEach(() => {
    useAuthStore.setState({
      token: null,
      refreshToken: null,
      user: null,
      currentOrgId: null,
      availableOrgs: [],
      isAuthenticated: false,
    });
  });

  it('should initialize with default state', () => {
    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.currentOrgId).toBeNull();
    expect(state.availableOrgs).toEqual([]);
  });

  it('should set auth state on login', () => {
    useAuthStore.getState().login('token-abc', 'refresh-xyz', mockUser);

    const state = useAuthStore.getState();
    expect(state.token).toBe('token-abc');
    expect(state.refreshToken).toBe('refresh-xyz');
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(mockUser);
  });

  it('should clear auth state on logout', () => {
    useAuthStore.getState().login('token-abc', 'refresh-xyz', mockUser);
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });

  it('should switch organization', () => {
    useAuthStore.getState().setCurrentOrg('org-002');
    expect(useAuthStore.getState().currentOrgId).toBe('org-002');
  });

  it('should set available orgs', () => {
    const orgs = [
      { id: 'org-001', name: '公司A' },
      { id: 'org-002', name: '公司B' },
    ];
    useAuthStore.getState().setAvailableOrgs(orgs);
    expect(useAuthStore.getState().availableOrgs).toEqual(orgs);
  });

  it('should handle multiple logins', () => {
    useAuthStore.getState().login('token1', 'refresh1', mockUser);
    useAuthStore.getState().login('token2', 'refresh2', { ...mockUser, name: '李四' });

    const state = useAuthStore.getState();
    expect(state.token).toBe('token2');
    expect(state.user?.name).toBe('李四');
  });
});
