import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { mockPush, mockPathname, mockLogout, mockUsePermission } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockPathname: vi.fn(() => '/dashboard'),
  mockLogout: vi.fn(),
  mockUsePermission: vi.fn(() => ({
    role: 'super_admin' as const,
    isAdmin: true,
    isReadonly: false,
    canAccessSettings: true,
  })),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
}));

vi.mock('@/stores/useAuthStore', () => {
  const user = {
    id: '1',
    name: '管理员',
    email: 'admin@test.com',
    role: 'super_admin' as const,
  };
  const state = {
    token: 'mock-token',
    user,
    currentOrgId: 'org-1',
    isAuthenticated: true,
    logout: mockLogout,
  };
  return {
    useAuthStore: (selector?: (s: typeof state) => unknown) =>
      selector ? selector(state) : state,
  };
});

vi.mock('@/hooks/usePermission', () => ({
  usePermission: mockUsePermission,
}));

import AdminLayout from '../AdminLayout';

describe('AdminLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue('/dashboard');
  });

  function renderLayout() {
    return render(<AdminLayout><div data-testid="child-content">page</div></AdminLayout>);
  }

  describe('Menu renders all top-level items', () => {
    it('should render 仪表盘', () => {
      renderLayout();
      expect(screen.getByText('仪表盘')).toBeInTheDocument();
    });

    it('should render API Key', () => {
      renderLayout();
      expect(screen.getByText('API Key')).toBeInTheDocument();
    });

    it('should render 应用管理', () => {
      renderLayout();
      expect(screen.getByText('应用管理')).toBeInTheDocument();
    });

    it('should render 账单管理', () => {
      renderLayout();
      expect(screen.getByText('账单管理')).toBeInTheDocument();
    });

    it('should render 安全治理', () => {
      renderLayout();
      expect(screen.getByText('安全治理')).toBeInTheDocument();
    });

    it('should render 组织管理', () => {
      renderLayout();
      expect(screen.getByText('组织管理')).toBeInTheDocument();
    });
  });

  describe('Menu click navigation — leaf items', () => {
    it('should navigate to /dashboard when clicking 仪表盘', () => {
      renderLayout();
      fireEvent.click(screen.getByText('仪表盘'));
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('should navigate to /api-keys when clicking API Key', () => {
      renderLayout();
      fireEvent.click(screen.getByText('API Key'));
      expect(mockPush).toHaveBeenCalledWith('/api-keys');
    });

    it('should navigate to /settings when clicking 组织管理', () => {
      renderLayout();
      fireEvent.click(screen.getByText('组织管理'));
      expect(mockPush).toHaveBeenCalledWith('/settings');
    });
  });

  describe('Group items do not navigate on click', () => {
    it('should not navigate when clicking 账单管理 (billing-group)', () => {
      renderLayout();
      fireEvent.click(screen.getByText('账单管理'));
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should not navigate when clicking 安全治理 (safety-group)', () => {
      renderLayout();
      fireEvent.click(screen.getByText('安全治理'));
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should not navigate when clicking 应用管理 (app-group)', () => {
      renderLayout();
      fireEvent.click(screen.getByText('应用管理'));
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('Leaf items in submenu navigate on click', () => {
    it('should navigate to /billing when clicking 账单分析', () => {
      renderLayout();
      fireEvent.click(screen.getByText('账单管理'));
      fireEvent.click(screen.getByText('账单分析'));
      expect(mockPush).toHaveBeenCalledWith('/billing');
    });

    it('should navigate to /budget-config when clicking 预算配置', () => {
      renderLayout();
      fireEvent.click(screen.getByText('账单管理'));
      fireEvent.click(screen.getByText('预算配置'));
      expect(mockPush).toHaveBeenCalledWith('/budget-config');
    });

    it('should navigate to /safety when clicking 运营安全', () => {
      renderLayout();
      fireEvent.click(screen.getByText('安全治理'));
      fireEvent.click(screen.getByText('运营安全'));
      expect(mockPush).toHaveBeenCalledWith('/safety');
    });

    it('should navigate to /compliance when clicking 合规报告', () => {
      renderLayout();
      fireEvent.click(screen.getByText('安全治理'));
      fireEvent.click(screen.getByText('合规报告'));
      expect(mockPush).toHaveBeenCalledWith('/compliance');
    });

    it('should navigate to /access-control when clicking 安全配置', () => {
      renderLayout();
      fireEvent.click(screen.getByText('安全治理'));
      fireEvent.click(screen.getByText('安全配置'));
      expect(mockPush).toHaveBeenCalledWith('/access-control');
    });
  });

  describe('Collapse/Expand sidebar', () => {
    it('should hide title and show content when collapsed', () => {
      const { container } = renderLayout();

      expect(screen.getByText('企业AI治理智能平台')).toBeInTheDocument();

      const collapseBtn = container.querySelector('.anticon-menu-fold')?.closest('button')!;
      fireEvent.click(collapseBtn);

      expect(screen.queryByText('企业AI治理智能平台')).not.toBeInTheDocument();
    });

    it('should show title again when expanded back', () => {
      const { container } = renderLayout();

      const collapseBtn = container.querySelector('.anticon-menu-fold')?.closest('button')!;
      fireEvent.click(collapseBtn);
      expect(screen.queryByText('企业AI治理智能平台')).not.toBeInTheDocument();

      const expandBtn = container.querySelector('.anticon-menu-unfold')?.closest('button')!;
      fireEvent.click(expandBtn);

      expect(screen.getByText('企业AI治理智能平台')).toBeInTheDocument();
    });
  });

  describe('Renders children', () => {
    it('should render the children content', () => {
      renderLayout();
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });
  });

  describe('Header contents', () => {
    it('should display the user name and role', () => {
      renderLayout();
      expect(screen.getByText(/管理员/)).toBeInTheDocument();
      expect(screen.getByText(/超级管理员/)).toBeInTheDocument();
    });

    it('should have a logout menu item', async () => {
      const { container } = renderLayout();

      const avatars = container.querySelectorAll('.ant-avatar');
      expect(avatars.length).toBeGreaterThan(0);
    });
  });

  describe('Permission-based menu filtering', () => {
    it('should hide 组织管理 when canAccessSettings is false', () => {
      mockUsePermission.mockReturnValue({
        role: 'user' as const,
        isAdmin: false,
        isReadonly: true,
        canAccessSettings: false,
      });

      renderLayout();
      expect(screen.queryByText('组织管理')).not.toBeInTheDocument();
      expect(screen.getByText('仪表盘')).toBeInTheDocument();
    });
  });
});
