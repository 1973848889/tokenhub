'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Card, Tabs, Spin } from 'antd';
import { TeamOutlined, BankOutlined, UserOutlined, AuditOutlined } from '@ant-design/icons';

const OrgTab = dynamic(() => import('@/components/settings/OrgTab'), { ssr: false, loading: () => <Spin style={{ display: 'block', padding: 48, textAlign: 'center' }} /> });
const DeptTab = dynamic(() => import('@/components/settings/DeptTab'), { ssr: false, loading: () => <Spin style={{ display: 'block', padding: 48, textAlign: 'center' }} /> });
const UserTab = dynamic(() => import('@/components/settings/UserTab'), { ssr: false, loading: () => <Spin style={{ display: 'block', padding: 48, textAlign: 'center' }} /> });
const AuditTab = dynamic(() => import('@/components/settings/AuditTab'), { ssr: false, loading: () => <Spin style={{ display: 'block', padding: 48, textAlign: 'center' }} /> });

export default function OrgManagementPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>组织管理</h1>
      <Card bodyStyle={{ padding: 0 }}>
        <Tabs tabPosition="left" style={{ minHeight: 500 }}
          items={[
            { key: 'orgs', label: <span><BankOutlined /> 组织</span>, children: <OrgTab /> },
            { key: 'depts', label: <span><TeamOutlined /> 部门</span>, children: <DeptTab /> },
            { key: 'users', label: <span><UserOutlined /> 用户</span>, children: <UserTab /> },
            { key: 'audit', label: <span><AuditOutlined /> 权限审计</span>, children: <AuditTab /> },
          ]}
        />
      </Card>
    </div>
  );
}
