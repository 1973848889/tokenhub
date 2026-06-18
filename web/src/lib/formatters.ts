import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatCost(cost: number, currency = '¥'): string {
  if (cost < 0.001) return `${currency}<0.001`;
  if (cost < 1) return `${currency}${cost.toFixed(4)}`;
  if (cost < 1000) return `${currency}${cost.toFixed(2)}`;
  return `${currency}${cost.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`;
}

export function formatNumber(n: number): string {
  if (n >= 1_0000_0000) return `${(n / 1_0000_0000).toFixed(2)}亿`;
  if (n >= 1_0000) return `${(n / 1_0000).toFixed(1)}万`;
  return n.toLocaleString('zh-CN');
}

export function formatLatency(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatChange(rate: number): { text: string; trend: 'up' | 'down' | 'flat' } {
  if (Math.abs(rate) < 0.001) return { text: '持平', trend: 'flat' };
  if (rate > 0) return { text: `+${(rate * 100).toFixed(1)}%`, trend: 'up' };
  return { text: `${(rate * 100).toFixed(1)}%`, trend: 'down' };
}

export function formatRelativeTime(iso: string): string {
  return dayjs(iso).fromNow();
}

export function formatDate(iso: string): string {
  return dayjs(iso).format('YYYY-MM-DD');
}

export function formatDateTime(iso: string): string {
  return dayjs(iso).format('YYYY-MM-DD HH:mm:ss');
}
