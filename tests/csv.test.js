import { describe, it, expect } from 'vitest';
import { generateCsv, parseCsvToRecords } from '../main.js';

describe('generateCsv', () => {
  it('空配列のときはヘッダー行のみ生成する', () => {
    expect(generateCsv([])).toBe('date,sys,dia,pulse\n');
  });

  it('1件のレコードを正しくCSV化する', () => {
    const records = [{ date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 }];
    expect(generateCsv(records)).toBe('date,sys,dia,pulse\n2024-01-15T09:05,120,80,60');
  });

  it('複数件のレコードを改行区切りでCSV化する', () => {
    const records = [
      { date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 },
      { date: '2024-01-16T10:30', sys: 130, dia: 85, pulse: 65 },
    ];
    const expected = 'date,sys,dia,pulse\n2024-01-15T09:05,120,80,60\n2024-01-16T10:30,130,85,65';
    expect(generateCsv(records)).toBe(expected);
  });

  it('先頭行は date,sys,dia,pulse の順のヘッダーになる', () => {
    const csv = generateCsv([{ date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 }]);
    expect(csv.split('\n')[0]).toBe('date,sys,dia,pulse');
  });
});

describe('parseCsvToRecords', () => {
  it('ヘッダーのみのCSVは空配列を返す', () => {
    expect(parseCsvToRecords('date,sys,dia,pulse\n')).toEqual([]);
  });

  it('1件のCSVを正しくパースする', () => {
    const csv = 'date,sys,dia,pulse\n2024-01-15T09:05,120,80,60';
    expect(parseCsvToRecords(csv)).toEqual([
      { date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 },
    ]);
  });

  it('複数件のCSVをパースする', () => {
    const csv = 'date,sys,dia,pulse\n2024-01-15T09:05,120,80,60\n2024-01-16T10:30,130,85,65';
    expect(parseCsvToRecords(csv)).toEqual([
      { date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 },
      { date: '2024-01-16T10:30', sys: 130, dia: 85, pulse: 65 },
    ]);
  });

  it('末尾の空行を無視する', () => {
    const csv = 'date,sys,dia,pulse\n2024-01-15T09:05,120,80,60\n\n';
    expect(parseCsvToRecords(csv)).toHaveLength(1);
  });

  it('数値フィールドを整数として返す', () => {
    const csv = 'date,sys,dia,pulse\n2024-01-15T09:05,120,80,60';
    const [record] = parseCsvToRecords(csv);
    expect(typeof record.sys).toBe('number');
    expect(typeof record.dia).toBe('number');
    expect(typeof record.pulse).toBe('number');
    expect(Number.isInteger(record.sys)).toBe(true);
  });

  it('generateCsv との往復変換でデータが保持される', () => {
    const original = [
      { date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 },
      { date: '2024-01-16T10:30', sys: 130, dia: 85, pulse: 65 },
    ];
    const csv = generateCsv(original);
    expect(parseCsvToRecords(csv)).toEqual(original);
  });
});
