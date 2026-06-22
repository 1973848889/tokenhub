'use client';

import React from 'react';
import { Card, Row, Col, Table, Tag, Typography } from 'antd';
import { TeamOutlined, AuditOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

const { Title } = Typography;

export default function AuditTab() {
  const { data: accessData } = useQuery({
    queryKey: ['security', 'access-control'],
    queryFn: async () => { const { data } = await apiClient.get('/api/v1/admin/security/access-control'); return data; },
  });

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Title level={4} style={{ margin: 0 }}>权限审计</Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={<><TeamOutlined /> 角色权限矩阵</>}>
            <Table dataSource={accessData?.roles || []} rowKey="name" pagination={false} size="middle"
              columns={[
                { title: '角色', dataIndex: 'name', render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
                { title: '权限', dataIndex: 'permissions', render: (v: string[]) => v?.map((p: string) => <Tag key={p} color="blue">{p}</Tag>) },
                { title: '人数', dataIndex: 'user_count', align: 'center' as const },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<><AuditOutlined /> 登录审计</>}>
            <Table dataSource={accessData?.login_logs || []} rowKey="id" pagination={false} size="small"
              columns={[
                { title: '用户', dataIndex: 'user' },
                { title: '时间', dataIndex: 'time', render: (v: string) => new Date(v).toLocaleString('zh-CN') },
                { title: 'IP', dataIndex: 'ip' },
                { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === 'success' ? 'green' : 'red'}>{v === 'success' ? '成功' : '失败'}</Tag> },
                { title: '位置', dataIndex: 'location' },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
