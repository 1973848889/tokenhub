'use client';

import React, { useState } from 'react';
import { Modal, Button, Typography, Space, message, Alert } from 'antd';
import { CopyOutlined, CheckOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface Props {
  open: boolean;
  apiKey: string;
  keyPrefix: string;
  keyId: string;
  onClose: () => void;
}

export function NewKeyRevealModal({ open, apiKey, keyPrefix, keyId, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(true);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      message.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      message.error('复制失败，请手动复制');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([apiKey], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tokenhub-key-${keyId.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      title="Key 创建成功"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>我已安全保存，关闭</Button>,
      ]}
      closable={false}
      maskClosable={false}
      width={560}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Alert
          message="此密钥仅显示一次"
          description="关闭此窗口后，系统将不再显示完整密钥。请立即复制并安全保存。"
          type="warning"
          showIcon
        />

        <div style={{ padding: '14px 16px', background: '#1e1e1e', borderRadius: 8 }}>
          <Text
            style={{ color: visible ? '#73d13d' : '#8c8c8c', fontFamily: 'monospace', fontSize: 14, wordBreak: 'break-all', userSelect: 'all' }}
          >
            {visible ? apiKey : (keyPrefix + '●'.repeat(Math.min(apiKey.length - 11, 30)))}
          </Text>
        </div>

        <Space>
          <Button icon={copied ? <CheckOutlined /> : <CopyOutlined />} onClick={handleCopy} type={copied ? 'default' : 'primary'}>
            {copied ? '已复制' : '复制到剪贴板'}
          </Button>
          <Button onClick={handleDownload}>下载为文件</Button>
          <Button icon={visible ? <EyeInvisibleOutlined /> : <EyeOutlined />} onClick={() => setVisible(!visible)} type="text">
            {visible ? '隐藏' : '显示'}
          </Button>
        </Space>

        <div style={{ fontSize: 12, color: '#8c8c8c' }}>
          <p>前缀: <Text code style={{ fontSize: 12 }}>{keyPrefix}</Text></p>
          <p>ID: <Text code style={{ fontSize: 12 }}>{keyId}</Text></p>
        </div>
      </div>
    </Modal>
  );
}
