import { describe, it, expect } from 'vitest';
import { generateCsv, parseCsvToMeasurements } from '../main.js';

describe('generateCsv', () => {
  it('空配列のときはヘッダー行のみ生成する', () => {
    expect(generateCsv([])).toBe('date,sys,dia,pulse\n');
  });

  it('1件のMeasurementを正しくCSV化する', () => {
    const measurements = [{ date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 }];
    expect(generateCsv(measurements)).toBe('date,sys,dia,pulse\n2024-01-15T09:05,120,80,60');
  });

  it('複数件のMeasurementを改行区切りでCSV化する', () => {
    const measurements = [
      { date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 },
      { date: '2024-01-16T10:30', sys: 130, dia: 85, pulse: 65 },
    ];
    const expected = 'date,sys,dia,pulse\n2024-01-15T09:05,120,80,60\n2024-01-16T10:30,130,85,65';
    expect(generateCsv(measurements)).toBe(expected);
  });

  it('先頭行は date,sys,dia,pulse の順のヘッダーになる', () => {
    const csv = generateCsv([{ date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 }]);
    expect(csv.split('\n')[0]).toBe('date,sys,dia,pulse');
  });
});

describe('parseCsvToMeasurements', () => {
  it('ヘッダーのみのCSVは空配列を返す', () => {
    expect(parseCsvToMeasurements('date,sys,dia,pulse\n')).toEqual([]);
  });

  it('1件のCSVを正しくMeasurementにパースする', () => {
    const csv = 'date,sys,dia,pulse\n2024-01-15T09:05,120,80,60';
    expect(parseCsvToMeasurements(csv)).toEqual([
      { date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 },
    ]);
  });

  it('複数件のCSVをパースする', () => {
    const csv = 'date,sys,dia,pulse\n2024-01-15T09:05,120,80,60\n2024-01-16T10:30,130,85,65';
    expect(parseCsvToMeasurements(csv)).toEqual([
      { date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 },
      { date: '2024-01-16T10:30', sys: 130, dia: 85, pulse: 65 },
    ]);
  });

  it('末尾の空行を無視する', () => {
    const csv = 'date,sys,dia,pulse\n2024-01-15T09:05,120,80,60\n\n';
    expect(parseCsvToMeasurements(csv)).toHaveLength(1);
  });

  it('数値フィールドを整数として返す', () => {
    const csv = 'date,sys,dia,pulse\n2024-01-15T09:05,120,80,60';
    const [measurement] = parseCsvToMeasurements(csv);
    expect(typeof measurement.sys).toBe('number');
    expect(typeof measurement.dia).toBe('number');
    expect(typeof measurement.pulse).toBe('number');
    expect(Number.isInteger(measurement.sys)).toBe(true);
  });

  it('generateCsv との往復変換でデータが保持される', () => {
    const original = [
      { date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 },
      { date: '2024-01-16T10:30', sys: 130, dia: 85, pulse: 65 },
    ];
    const csv = generateCsv(original);
    expect(parseCsvToMeasurements(csv)).toEqual(original);
  });
});
