'use client';

import React, { useState } from 'react';
import { Button, Input, Select, Space, Typography, message } from 'antd';
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { KnowledgeTable } from '@/components/knowledge/KnowledgeTable';
import { UploadKnowledgeModal } from '@/components/knowledge/UploadKnowledgeModal';
import { EditKnowledgeModal } from '@/components/knowledge/EditKnowledgeModal';
import {
  useKnowledgeList,
  useKnowledgeCategories,
  useUploadKnowledge,
  useUpdateKnowledge,
  useDeleteKnowledge,
  type KnowledgeEntry,
} from '@/hooks/useKnowledge';

const { Title } = Typography;

export default function KnowledgePage() {
  const qc = useQueryClient();

  const [keyword, setKeyword] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [category, setCategory] = useState<string>('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);

  const { data: categoriesData } = useKnowledgeCategories();
  const categories = categoriesData?.data || [];
  const { data, isLoading } = useKnowledgeList(keyword, category);
  const uploadMutation = useUploadKnowledge();
  const updateMutation = useUpdateKnowledge();
  const deleteMutation = useDeleteKnowledge();

  const handleSearch = (value: string) => {
    setKeyword(value);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
  };

  const handleUpload = (values: { file: File; name: string; description: string; category: string }) => {
    uploadMutation.mutate(values, {
      onSuccess: () => {
        message.success('上传成功，文件正在安全扫描中');
        setUploadOpen(false);
      },
      onError: (err: Error) => {
        message.error('上传失败: ' + err.message);
      },
    });
  };

  const handleEdit = (entry: KnowledgeEntry) => {
    setEditingEntry(entry);
    setEditOpen(true);
  };

  const handleEditSubmit = (values: { name: string; description: string; category: string }) => {
    if (!editingEntry) return;
    updateMutation.mutate(
      { id: editingEntry.id, ...values },
      {
        onSuccess: () => {
          message.success('更新成功');
          setEditOpen(false);
          setEditingEntry(null);
        },
        onError: (err: Error) => {
          message.error('更新失败: ' + err.message);
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        message.success('删除成功');
      },
      onError: (err: Error) => {
        message.error('删除失败: ' + err.message);
      },
    });
  };

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['knowledge'] });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>知识库管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setUploadOpen(true)}>
          上传知识库
        </Button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Input.Search
            placeholder="搜索名称、描述、文件名"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onSearch={handleSearch}
            enterButton={<SearchOutlined />}
            allowClear
            style={{ width: 320 }}
          />
          <Select
            placeholder="筛选分类"
            value={category || undefined}
            onChange={handleCategoryChange}
            allowClear
            style={{ width: 140 }}
            options={categories.map((c) => ({ value: c, label: c }))}
          />
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>
            刷新
          </Button>
        </Space>
      </div>

      <KnowledgeTable
        data={data?.data || []}
        loading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <UploadKnowledgeModal
        open={uploadOpen}
        onCancel={() => setUploadOpen(false)}
        onSubmit={handleUpload}
        loading={uploadMutation.isPending}
      />

      <EditKnowledgeModal
        open={editOpen}
        entry={editingEntry}
        onCancel={() => { setEditOpen(false); setEditingEntry(null); }}
        onSubmit={handleEditSubmit}
        loading={updateMutation.isPending}
      />
    </div>
  );
}
