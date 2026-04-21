import { describe, it, expect } from 'vitest';
import { formatDate, getLocalDatetimeValue } from './helpers.js';

describe('formatDate', () => {
  it('通常の日付を正しくフォーマットする', () => {
    expect(formatDate('2024-01-15T09:05')).toBe('1/15 09:05');
  });

  it('年末の日付をフォーマットする', () => {
    expect(formatDate('2024-12-31T23:59')).toBe('12/31 23:59');
  });

  it('深夜0時をフォーマットする', () => {
    expect(formatDate('2024-06-01T00:00')).toBe('6/1 00:00');
  });

  it('月・日はゼロ埋めしない', () => {
    expect(formatDate('2024-03-05T10:30')).toBe('3/5 10:30');
  });

  it('時刻の時をゼロ埋めする', () => {
    expect(formatDate('2024-06-15T01:30')).toBe('6/15 01:30');
  });

  it('時刻の分をゼロ埋めする', () => {
    expect(formatDate('2024-06-15T10:05')).toBe('6/15 10:05');
  });

  it('真夜中(00:00)の分をゼロ埋めする', () => {
    expect(formatDate('2024-09-10T00:00')).toBe('9/10 00:00');
  });
});

describe('getLocalDatetimeValue', () => {
  it('YYYY-MM-DDTHH:mm 形式の文字列を返す', () => {
    const result = getLocalDatetimeValue();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  it('16文字の文字列を返す', () => {
    expect(getLocalDatetimeValue()).toHaveLength(16);
  });

  it('UTC環境では UTC時刻をそのまま返す', () => {
    const now = new Date('2024-06-15T10:30:00Z');
    expect(getLocalDatetimeValue(now)).toBe('2024-06-15T10:30');
  });

  it('datetime-local入力値として有効な日付になる', () => {
    const result = getLocalDatetimeValue();
    expect(new Date(result).toString()).not.toBe('Invalid Date');
  });

  it('引数のDateオブジェクトを破壊的変更しない', () => {
    const original = new Date('2024-06-15T10:30:00Z');
    const originalTime = original.getTime();
    getLocalDatetimeValue(original);
    expect(original.getTime()).toBe(originalTime);
  });
});
