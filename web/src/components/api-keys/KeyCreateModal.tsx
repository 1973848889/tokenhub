'use client';

import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, Space, Divider } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { MODEL_LIST } from '@/lib/constants';

interface Props {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: any) => void;
  loading: boolean;
  initialValues?: Record<string, any>;
}

export function KeyCreateModal({ open, onCancel, onSubmit, loading, initialValues }: Props) {
  const [form] = Form.useForm();
  const isEdit = !!initialValues;

  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue(initialValues);
      } else {
        form.resetFields();
        form.setFieldsValue({ rate_limit_rpm: 60, allowed_models: MODEL_LIST.map((m) => m.value) });
      }
    }
  }, [open, initialValues, form]);

  const handleFinish = (values: any) => {
    onSubmit(values);
    form.resetFields();
  };

  return (
    <Modal
      title={isEdit ? "编辑 API Key" : "创建 API Key"}
      open={open}
      onCancel={() => { form.resetFields(); onCancel(); }}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={640}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          name="name"
          label="Key 名称"
          rules={[{ required: true, message: '请输入名称' }, { max: 50 }]}
        >
          <Input placeholder="如：张三-代码生成、AI客服Agent" />
        </Form.Item>

        <Space size="large">
          <Form.Item name="dept_id" label="所属部门" rules={[{ required: true }]}>
            <Select
              placeholder="选择部门"
              options={[
                { value: 'dept-rd', label: '研发部' },
                { value: 'dept-product', label: '产品部' },
                { value: 'dept-ops', label: '运营部' },
                { value: 'dept-data', label: '数据部' },
                { value: 'dept-mkt', label: '市场部' },
              ]}
              style={{ width: 180 }}
            />
          </Form.Item>
          <Form.Item name="user_id" label="所属用户" rules={[{ required: true }]}>
            <Select
              placeholder="选择用户"
              options={[
                { value: 'user-001', label: '张三' },
                { value: 'user-002', label: '李四' },
                { value: 'user-003', label: '王五' },
                { value: 'agent-001', label: '数据分析Agent' },
                { value: 'agent-002', label: '代码审查Bot' },
              ]}
              style={{ width: 180 }}
            />
          </Form.Item>
        </Space>

        <Divider plain>权限控制</Divider>

        <Space size="large" wrap>
          <Form.Item
            name="daily_budget"
            label="每日预算 (元)"
            tooltip={{ title: '超过将触发告警或阻断', icon: <InfoCircleOutlined /> }}
          >
            <InputNumber min={0} max={100000} step={10} precision={2} placeholder="不限制" style={{ width: 160 }} addonAfter="元/天" />
          </Form.Item>
          <Form.Item name="rate_limit_rpm" label="频率限制" tooltip={{ title: '每分钟最大请求数', icon: <InfoCircleOutlined /> }}>
            <InputNumber min={1} max={10000} step={10} style={{ width: 140 }} addonAfter="RPM" />
          </Form.Item>
          <Form.Item name="expires_days" label="有效期 (天)" tooltip={{ title: '留空则永不过期', icon: <InfoCircleOutlined /> }}>
            <InputNumber min={1} max={3650} placeholder="永不过期" style={{ width: 140 }} addonAfter="天" />
          </Form.Item>
        </Space>

        <Form.Item name="allowed_models" label="可用模型" tooltip={{ title: '限制此Key可调用的模型', icon: <InfoCircleOutlined /> }}>
          <Select mode="multiple" placeholder="默认全部" options={MODEL_LIST} allowClear />
        </Form.Item>

        <Form.Item name="allowed_ips" label="IP白名单" tooltip={{ title: '限制调用来源IP', icon: <InfoCircleOutlined /> }}>
          <Select mode="tags" placeholder="输入IP后按回车（留空不限制）" tokenSeparators={[',', ' ']} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
