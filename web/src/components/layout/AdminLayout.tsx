'use client';

import React, { useState, useMemo } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Button, Space, Typography } from 'antd';
import {
  DashboardOutlined, DollarOutlined, KeyOutlined, ApiOutlined,
  SafetyCertificateOutlined, RobotOutlined, AuditOutlined, SettingOutlined,
  BellOutlined, LogoutOutlined, UserOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
  ThunderboltOutlined, ControlOutlined, FundOutlined,
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { usePermission } from '@/hooks/usePermission';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const allMenuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/api-keys', icon: <KeyOutlined />, label: 'API Key' },
  {
    key: 'app-group', icon: <ControlOutlined />, label: '应用管理',
    children: [
      {
        key: 'model-group', label: '模型方舟',
        children: [
          { key: '/model-aggregation', icon: <ApiOutlined />, label: '模型聚合' },
          { key: '/models', icon: <ThunderboltOutlined />, label: '模型推荐' },
          { key: '/model-management', icon: <SettingOutlined />, label: '模型管理' },
        ],
      },
      {
        key: 'market-group', label: '智能体市场',
        children: [
          { key: '/agent-marketplace', icon: <RobotOutlined />, label: '专家市场' },
          { key: '/expert-management', icon: <RobotOutlined />, label: '专家管理' },
          { key: '/skill-repository', icon: <ApiOutlined />, label: '技能仓库' },
          { key: '/connector-manager', icon: <ApiOutlined />, label: '连接器管理' },
          { key: '/mcp-management', icon: <ApiOutlined />, label: 'MCP 工具管理' },
        ],
      },
    ],
  },
  {
    key: 'billing-group', icon: <DollarOutlined />, label: '账单管理',
    children: [
      { key: '/billing', icon: <FundOutlined />, label: '账单分析' },
      { key: '/budget-config', icon: <DollarOutlined />, label: '预算配置' },
    ],
  },
  {
    key: 'safety-group', icon: <SafetyCertificateOutlined />, label: '安全治理',
    children: [
      { key: '/safety', icon: <SafetyCertificateOutlined />, label: '运营安全' },
      { key: '/compliance', icon: <AuditOutlined />, label: '合规报告' },
      { key: '/access-control', icon: <SafetyCertificateOutlined />, label: '安全配置' },
    ],
  },
  { key: '/settings', icon: <SettingOutlined />, label: '组织管理' },
];

const roleLabelMap: Record<string, string> = {
  super_admin: '超级管理员',
  dept_admin: '部门管理员',
  user: '普通用户',
  auditor: '审计员',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { canAccessSettings } = usePermission();

  const menuItems = useMemo(() => {
    if (canAccessSettings) return allMenuItems;
    return allMenuItems.filter((item) => item.key !== '/settings');
  }, [canAccessSettings]);

  const findSelectedAndOpen = (): { selected: string[]; open: string[] } => {
    const selected = pathname ? [pathname] : ['/dashboard'];
    const open: string[] = [];
    if (pathname) {
      for (const item of menuItems) {
        const checkChildren = (children: any[]) => {
          for (const child of children) {
            if (child.children) {
              if (pathname.startsWith(child.key)) { open.push(item.key); open.push(child.key); }
              checkChildren(child.children);
            } else if (pathname.startsWith(child.key)) {
              open.push(item.key);
            }
          }
        };
        if (item.children) checkChildren(item.children);
      }
    }
    return { selected, open };
  };

  const { selected, open } = findSelectedAndOpen();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} width={220} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 64, padding: '0 16px', borderBottom: '1px solid #f0f0f0', gap: 10, justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1677ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>TH</span>
          </div>
          {!collapsed && <Text strong style={{ fontSize: 16, whiteSpace: 'nowrap' }}>企业AI治理智能平台</Text>}
        </div>
        <Menu
          mode="inline"
          selectedKeys={selected}
          defaultOpenKeys={collapsed ? [] : open}
          onClick={({ key }) => { const isLeaf = !menuItems.some((m: any) => m.children?.some((c: any) => c.children?.some((gc: any) => gc.key === key) || c.key === key)); if (isLeaf) router.push(key); }}
          style={{ border: 'none' }}
          items={menuItems.map((item) => ({
            ...item,
            children: item.children?.map((child: any) => ({
              ...child,
              children: child.children?.map((grandchild: any) => ({
                ...grandchild,
                onClick: () => router.push(grandchild.key),
              })),
            })),
          }))}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: '#fff', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} />
          <Space size="middle">
            <Badge count={0} size="small"><Button type="text" icon={<BellOutlined />} /></Badge>
            <Dropdown menu={{ items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true, onClick: handleLogout }] }}>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar size="small" icon={<UserOutlined />} />
                <Text>{user?.name || '未知用户'} ({roleLabelMap[user?.role || 'user'] || '未知'})</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ padding: 24, background: '#f5f5f5' }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
