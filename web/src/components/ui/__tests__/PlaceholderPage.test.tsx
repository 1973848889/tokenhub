import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlaceholderPage } from '../PlaceholderPage';

describe('PlaceholderPage', () => {
  it('should render with billing title', () => {
    render(<PlaceholderPage pageKey="billing" />);
    expect(screen.getByText('账单管理')).toBeInTheDocument();
    expect(screen.getByText('功能开发中，敬请期待...')).toBeInTheDocument();
  });

  it('should render with api-keys title', () => {
    render(<PlaceholderPage pageKey="api-keys" />);
    expect(screen.getByText('API Key 管理')).toBeInTheDocument();
  });

  it('should render with safety title', () => {
    render(<PlaceholderPage pageKey="safety" />);
    expect(screen.getByText('运营安全监控')).toBeInTheDocument();
  });

  it('should render with agents title', () => {
    render(<PlaceholderPage pageKey="agents" />);
    expect(screen.getByText('Agent 行为分析')).toBeInTheDocument();
  });

  it('should render with compliance title', () => {
    render(<PlaceholderPage pageKey="compliance" />);
    expect(screen.getByText('合规报告')).toBeInTheDocument();
  });

  it('should render with dashboard title', () => {
    render(<PlaceholderPage pageKey="models" />);
    expect(screen.getByText('模型推荐')).toBeInTheDocument();
  });

  it('should render with settings title', () => {
    render(<PlaceholderPage pageKey="settings" />);
    expect(screen.getByText('系统设置')).toBeInTheDocument();
  });

  it('should render fallback for unknown key', () => {
    render(<PlaceholderPage pageKey="unknown_page" />);
    expect(screen.getByText('unknown_page')).toBeInTheDocument();
  });

  it('should render with Card component', () => {
    const { container } = render(<PlaceholderPage pageKey="billing" />);
    expect(container.querySelector('.ant-card')).toBeInTheDocument();
  });
});
