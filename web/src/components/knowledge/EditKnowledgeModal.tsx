'use client';

import React, { useEffect } from 'react';
import { Modal, Form, Input, Select } from 'antd';
import type { KnowledgeEntry } from '@/hooks/useKnowledge';
import { useKnowledgeCategories } from '@/hooks/useKnowledge';

interface Props {
  open: boolean;
  entry: KnowledgeEntry | null;
  onCancel: () => void;
  onSubmit: (values: { name: string; description: string; category: string }) => void;
  loading: boolean;
}

export function EditKnowledgeModal({ open, entry, onCancel, onSubmit, loading }: Props) {
  const [form] = Form.useForm();
  const { data: categoriesData } = useKnowledgeCategories();
  const categories = categoriesData?.data || [];

  useEffect(() => {
    if (open && entry) {
      form.setFieldsValue({ name: entry.name, description: entry.description, category: entry.category });
    }
  }, [open, entry, form]);

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      onSubmit(values);
    });
  };

  return (
    <Modal
      title="编辑知识库"
      open={open}
      onCancel={() => { form.resetFields(); onCancel(); }}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={480}
      destroyOnClose
      okText="保存"
      cancelText="取消"
    >
      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        <Form.Item
          name="name"
          label="知识库名称"
          rules={[{ required: true, message: '请输入知识库名称' }, { max: 100 }]}
        >
          <Input placeholder="知识库名称" />
        </Form.Item>

        <Form.Item
          name="category"
          label="知识库分类"
          rules={[{ required: true, message: '请选择分类' }]}
        >
          <Select placeholder="选择知识库分类" options={categories.map((c) => ({ value: c, label: c }))} />
        </Form.Item>

        <Form.Item
          name="description"
          label="描述"
          rules={[{ max: 500 }]}
        >
          <Input.TextArea placeholder="知识库的用途和内容说明" rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
