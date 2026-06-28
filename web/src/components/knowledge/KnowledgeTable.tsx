'use client';

import React from 'react';
import { Table, Tag, Button, Space, Popconfirm, Tooltip, Typography } from 'antd';
import {
  DownloadOutlined, EditOutlined, DeleteOutlined,
  FilePdfOutlined, FileTextOutlined, FileExcelOutlined,
  FilePptOutlined, FileMarkdownOutlined, FileOutlined,
  SafetyCertificateOutlined, ExclamationCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { KnowledgeEntry } from '@/hooks/useKnowledge';
import { getDownloadUrl } from '@/hooks/useKnowledge';

const { Text } = Typography;

const fileIcons: Record<string, React.ReactNode> = {
  pdf: <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />,
  txt: <FileTextOutlined style={{ color: '#1890ff', fontSize: 18 }} />,
  md: <FileMarkdownOutlined style={{ color: '#722ed1', fontSize: 18 }} />,
  docx: <FileTextOutlined style={{ color: '#2f54eb', fontSize: 18 }} />,
  xlsx: <FileExcelOutlined style={{ color: '#52c41a', fontSize: 18 }} />,
  pptx: <FilePptOutlined style={{ color: '#fa8c16', fontSize: 18 }} />,
  csv: <FileExcelOutlined style={{ color: '#52c41a', fontSize: 18 }} />,
  json: <FileTextOutlined style={{ color: '#13c2c2', fontSize: 18 }} />,
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function renderStatusTag(status: string) {
  const config: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    safe: { color: 'success', icon: <SafetyCertificateOutlined />, label: '安全' },
    risky: { color: 'warning', icon: <ExclamationCircleOutlined />, label: '风险' },
    blocked: { color: 'error', icon: <CloseCircleOutlined />, label: '拦截' },
    pending_scan: { color: 'processing', icon: <ClockCircleOutlined />, label: '扫描中' },
  };
  const c = config[status] || { color: 'default', icon: null, label: status };
  return <Tag color={c.color} icon={c.icon}>{c.label}</Tag>;
}

interface Props {
  data: KnowledgeEntry[];
  loading: boolean;
  onEdit: (entry: KnowledgeEntry) => void;
  onDelete: (id: string) => void;
}

export function KnowledgeTable({ data, loading, onEdit, onDelete }: Props) {
  const columns: ColumnsType<KnowledgeEntry> = [
    {
      title: '名称', dataIndex: 'name', key: 'name', width: 180,
      render: (name: string, record: KnowledgeEntry) => (
        <Space>
          {fileIcons[record.file_type] || <FileOutlined style={{ fontSize: 18 }} />}
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: '分类', dataIndex: 'category', key: 'category', width: 100,
      render: (c: string) => <Tag color="blue">{c}</Tag>,
    },
    {
      title: '描述', dataIndex: 'description', key: 'description', width: 220,
      ellipsis: true,
      render: (desc: string) => (
        <Tooltip title={desc}>
          <Text type="secondary" ellipsis style={{ maxWidth: 200 }}>{desc || '-'}</Text>
        </Tooltip>
      ),
    },
    {
      title: '类型', dataIndex: 'file_type', key: 'file_type', width: 90,
      render: (t: string) => <Tag>{t.toUpperCase()}</Tag>,
    },
    {
      title: '大小', dataIndex: 'file_size', key: 'file_size', width: 100,
      render: (s: number) => formatFileSize(s),
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 110,
      render: (status: string) => renderStatusTag(status),
    },
    {
      title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 170,
      render: (t: string) => new Date(t).toLocaleString('zh-CN'),
    },
    {
      title: '操作', key: 'actions', width: 220, fixed: 'right',
      render: (_: unknown, record: KnowledgeEntry) => (
        <Space size="small">
          <Button
            type="link" size="small" icon={<DownloadOutlined />}
            href={getDownloadUrl(record.id)}
          >
            下载
          </Button>
          <Button
            type="link" size="small" icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此知识条目?"
            description="删除后文件将无法恢复"
            onConfirm={() => onDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="id"
      loading={loading}
      pagination={{
        showSizeChanger: true,
        showTotal: (t) => `共 ${t} 条`,
        pageSizeOptions: ['10', '20', '50'],
        defaultPageSize: 10,
      }}
      scroll={{ x: 1100 }}
      size="middle"
    />
  );
}
