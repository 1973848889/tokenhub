'use client';

import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Upload, Typography, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile, RcFile } from 'antd/es/upload';
import { useKnowledgeCategories } from '@/hooks/useKnowledge';

const { Text } = Typography;
const { Dragger } = Upload;

const ALLOWED_TYPES = ['.pdf', '.txt', '.md', '.docx', '.xlsx', '.pptx', '.csv', '.json'];
const MAX_SIZE = 50 * 1024 * 1024;

interface Props {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: { file: File; name: string; description: string; category: string }) => void;
  loading: boolean;
}

export function UploadKnowledgeModal({ open, onCancel, onSubmit, loading }: Props) {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const { data: categoriesData } = useKnowledgeCategories();
  const categories = categoriesData?.data || [];

  useEffect(() => {
    if (open) {
      form.resetFields();
      setFileList([]);
    }
  }, [open, form]);

  const beforeUpload = (file: RcFile) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_TYPES.includes(ext)) {
      message.error(`不支持的文件类型: ${ext}，支持: ${ALLOWED_TYPES.join(', ')}`);
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_SIZE) {
      message.error(`文件超过 50MB 限制`);
      return Upload.LIST_IGNORE;
    }
    setFileList([file as unknown as UploadFile]);
    return false;
  };

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const file = fileList[0]?.originFileObj as File;
      if (!file) {
        message.warning('请选择要上传的文件');
        return;
      }
      onSubmit({ file, name: values.name, description: values.description || '', category: values.category || '其他' });
    });
  };

  const handleRemove = () => {
    setFileList([]);
    return true;
  };

  return (
    <Modal
      title="上传知识库文件"
      open={open}
      onCancel={() => { form.resetFields(); setFileList([]); onCancel(); }}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={560}
      destroyOnClose
      okText="上传"
      cancelText="取消"
    >
      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        <Form.Item
          name="name"
          label="知识库名称"
          rules={[{ required: true, message: '请输入知识库名称' }, { max: 100 }]}
        >
          <Input placeholder="如：企业安全合规手册" />
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
          label="描述（选填）"
          rules={[{ max: 500 }]}
        >
          <Input.TextArea placeholder="知识库的用途和内容说明" rows={2} />
        </Form.Item>

        <Form.Item label="选择文件" required>
          <Dragger
            fileList={fileList}
            beforeUpload={beforeUpload}
            onRemove={handleRemove}
            maxCount={1}
            accept={ALLOWED_TYPES.join(',')}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持 PDF、TXT、MD、DOCX、XLSX、PPTX、CSV、JSON，最大 50MB
            </p>
          </Dragger>
        </Form.Item>

        <Text type="secondary" style={{ fontSize: 12 }}>
          ⚠️ 上传后将自动触发安全扫描，检测文件中的敏感内容和安全风险
        </Text>
      </Form>
    </Modal>
  );
}
