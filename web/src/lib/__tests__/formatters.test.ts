import { describe, it, expect } from 'vitest';
import {
  formatTokens,
  formatCost,
  formatNumber,
  formatLatency,
  formatChange,
  formatRelativeTime,
  formatDate,
  formatDateTime,
} from '../formatters';

describe('formatTokens', () => {
  it('should return string for numbers under 1000', () => {
    expect(formatTokens(0)).toBe('0');
    expect(formatTokens(500)).toBe('500');
    expect(formatTokens(999)).toBe('999');
  });
  it('should format thousands as K', () => {
    expect(formatTokens(1000)).toBe('1.0K');
    expect(formatTokens(5000)).toBe('5.0K');
    expect(formatTokens(999999)).toBe('1000.0K');
  });
  it('should format millions as M', () => {
    expect(formatTokens(1000000)).toBe('1.0M');
    expect(formatTokens(5000000)).toBe('5.0M');
    expect(formatTokens(999999999)).toBe('1000.0M');
  });
  it('should format billions as B', () => {
    expect(formatTokens(1000000000)).toBe('1.0B');
    expect(formatTokens(5000000000)).toBe('5.0B');
  });
});

describe('formatCost', () => {
  it('should show <0.001 for very small amounts', () => {
    expect(formatCost(0.0001)).toBe('¥<0.001');
    expect(formatCost(0.0005)).toBe('¥<0.001');
  });
  it('should show 4 decimals for amounts under 1', () => {
    expect(formatCost(0.5678)).toBe('¥0.5678');
    expect(formatCost(0.1)).toBe('¥0.1000');
  });
  it('should show 2 decimals for amounts under 1000', () => {
    expect(formatCost(45.678)).toBe('¥45.68');
    expect(formatCost(100)).toBe('¥100.00');
  });
  it('should show comma formatting for large numbers', () => {
    expect(formatCost(12345.67)).toBe('¥12,345.67');
  });
  it('should support custom currency symbol', () => {
    expect(formatCost(100, '$')).toBe('$100.00');
  });
});

describe('formatNumber', () => {
  it('should show Wan for large numbers', () => {
    expect(formatNumber(10000)).toBe('1.0万');
    expect(formatNumber(50000)).toBe('5.0万');
  });
  it('should show Yi for very large numbers', () => {
    expect(formatNumber(100000000)).toBe('1.00亿');
  });
  it('should use locale for smaller numbers', () => {
    expect(formatNumber(5000)).toBe('5,000');
  });
});

describe('formatLatency', () => {
  it('should show ms for under 1s', () => {
    expect(formatLatency(0)).toBe('0ms');
    expect(formatLatency(500)).toBe('500ms');
    expect(formatLatency(999)).toBe('999ms');
  });
  it('should show seconds with 1 decimal', () => {
    expect(formatLatency(1000)).toBe('1.0s');
    expect(formatLatency(1500)).toBe('1.5s');
    expect(formatLatency(2345)).toBe('2.3s');
  });
});

describe('formatChange', () => {
  it('should format positive change', () => {
    const result = formatChange(0.15);
    expect(result.text).toBe('+15.0%');
    expect(result.trend).toBe('up');
  });
  it('should format negative change', () => {
    const result = formatChange(-0.05);
    expect(result.text).toBe('-5.0%');
    expect(result.trend).toBe('down');
  });
  it('should format flat change', () => {
    const result = formatChange(0);
    expect(result.text).toBe('持平');
    expect(result.trend).toBe('flat');
  });
  it('should treat tiny change as flat', () => {
    const result = formatChange(0.0005);
    expect(result.trend).toBe('flat');
  });
  it('should format with one decimal', () => {
    const result = formatChange(0.1234);
    expect(result.text).toBe('+12.3%');
  });
});

describe('formatDate', () => {
  it('should format ISO string to date', () => {
    const result = formatDate('2026-06-14T10:30:00Z');
    expect(result).toBe('2026-06-14');
  });
});

describe('formatDateTime', () => {
  it('should format ISO string to datetime', () => {
    const result = formatDateTime('2026-06-14T10:30:00Z');
    expect(result).toContain('2026-06-14');
    expect(result.length).toBeGreaterThanOrEqual(16);
  });
});
