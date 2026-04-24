import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import Dexie from 'dexie';
import { addMeasurement, updateMeasurement, deleteMeasurement, fetchMeasurements, importMeasurements } from '../main.js';

function createDb() {
  const db = new Dexie('BloodPressureDB', {
    indexedDB: new IDBFactory(),
    IDBKeyRange,
  });
  db.version(1).stores({ records: '++id, date, sys, dia, pulse' });
  return db;
}

describe('Database CRUD', () => {
  let db;

  beforeEach(() => {
    db = createDb();
  });

  afterEach(async () => {
    await db.close();
  });

  it('レコードを追加して取得できる', async () => {
    const id = await db.records.add({ date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 });
    expect(typeof id).toBe('number');

    const measurement = await db.records.get(id);
    expect(measurement).toEqual({ id, date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 });
  });

  it('空のDBはレコード0件を返す', async () => {
    const measurements = await db.records.toArray();
    expect(measurements).toEqual([]);
  });

  it('レコードを日付の昇順で取得できる', async () => {
    await db.records.bulkAdd([
      { date: '2024-01-17T09:00', sys: 130, dia: 85, pulse: 65 },
      { date: '2024-01-15T09:00', sys: 120, dia: 80, pulse: 60 },
      { date: '2024-01-16T09:00', sys: 125, dia: 82, pulse: 62 },
    ]);
    const measurements = await db.records.orderBy('date').toArray();
    expect(measurements.map(m => m.date)).toEqual([
      '2024-01-15T09:00',
      '2024-01-16T09:00',
      '2024-01-17T09:00',
    ]);
  });

  it('レコードを日付の降順（一覧表示）で取得できる', async () => {
    await db.records.bulkAdd([
      { date: '2024-01-15T09:00', sys: 120, dia: 80, pulse: 60 },
      { date: '2024-01-17T09:00', sys: 130, dia: 85, pulse: 65 },
      { date: '2024-01-16T09:00', sys: 125, dia: 82, pulse: 62 },
    ]);
    const measurements = await db.records.orderBy('date').reverse().toArray();
    expect(measurements.map(m => m.date)).toEqual([
      '2024-01-17T09:00',
      '2024-01-16T09:00',
      '2024-01-15T09:00',
    ]);
  });

  it('レコードを更新できる', async () => {
    const id = await db.records.add({ date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 });
    await db.records.update(id, { sys: 135, dia: 90, pulse: 70 });

    const updated = await db.records.get(id);
    expect(updated.sys).toBe(135);
    expect(updated.dia).toBe(90);
    expect(updated.pulse).toBe(70);
    expect(updated.date).toBe('2024-01-15T09:05');
  });

  it('レコードを削除できる', async () => {
    const id = await db.records.add({ date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 });
    await db.records.delete(id);

    const measurement = await db.records.get(id);
    expect(measurement).toBeUndefined();
  });

  it('削除後も他のレコードは残る', async () => {
    const id1 = await db.records.add({ date: '2024-01-15T09:00', sys: 120, dia: 80, pulse: 60 });
    const id2 = await db.records.add({ date: '2024-01-16T09:00', sys: 130, dia: 85, pulse: 65 });
    await db.records.delete(id1);

    const remaining = await db.records.toArray();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(id2);
  });

  it('bulkAdd で複数件を一括追加できる', async () => {
    await db.records.bulkAdd([
      { date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 },
      { date: '2024-01-16T10:30', sys: 130, dia: 85, pulse: 65 },
      { date: '2024-01-17T08:00', sys: 115, dia: 75, pulse: 58 },
    ]);
    expect(await db.records.count()).toBe(3);
  });

  it('bulkAdd した全レコードが正しい値を持つ', async () => {
    await db.records.bulkAdd([
      { date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 },
      { date: '2024-01-16T10:30', sys: 130, dia: 85, pulse: 65 },
    ]);
    const measurements = await db.records.orderBy('date').toArray();
    expect(measurements[0]).toMatchObject({ date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 });
    expect(measurements[1]).toMatchObject({ date: '2024-01-16T10:30', sys: 130, dia: 85, pulse: 65 });
  });

  it('グラフ表示用に全フィールドを含むMeasurementが取得できる', async () => {
    await db.records.bulkAdd([
      { date: '2024-01-15T09:00', sys: 120, dia: 80, pulse: 60 },
      { date: '2024-01-16T09:00', sys: 125, dia: 82, pulse: 62 },
    ]);
    const measurements = await db.records.orderBy('date').toArray();
    measurements.forEach(m => {
      expect(m).toHaveProperty('date');
      expect(m).toHaveProperty('sys');
      expect(m).toHaveProperty('dia');
      expect(m).toHaveProperty('pulse');
    });
  });
});

describe('addMeasurement', () => {
  let db;

  beforeEach(() => { db = createDb(); });
  afterEach(async () => { await db.close(); });

  it('Measurementを追加して数値IDを返す', async () => {
    const id = await addMeasurement(db, { date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 });
    expect(typeof id).toBe('number');
  });

  it('追加したMeasurementをDBから取得できる', async () => {
    const id = await addMeasurement(db, { date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 });
    const measurement = await db.records.get(id);
    expect(measurement).toMatchObject({ date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 });
  });
});

describe('updateMeasurement', () => {
  let db;

  beforeEach(() => { db = createDb(); });
  afterEach(async () => { await db.close(); });

  it('数値IDで更新できる', async () => {
    const id = await db.records.add({ date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 });
    await updateMeasurement(db, id, { sys: 135, dia: 90, pulse: 70 });
    const updated = await db.records.get(id);
    expect(updated.sys).toBe(135);
  });

  it('文字列IDを渡しても正しく更新できる（フォームの edit-id は文字列）', async () => {
    const id = await db.records.add({ date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 });
    await updateMeasurement(db, String(id), { sys: 135, dia: 90, pulse: 70 });
    const updated = await db.records.get(id);
    expect(updated.sys).toBe(135);
  });
});

describe('deleteMeasurement', () => {
  let db;

  beforeEach(() => { db = createDb(); });
  afterEach(async () => { await db.close(); });

  it('指定IDのMeasurementを削除できる', async () => {
    const id = await db.records.add({ date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 });
    await deleteMeasurement(db, id);
    expect(await db.records.get(id)).toBeUndefined();
  });

  it('文字列IDを渡しても正しく削除できる（フォームの edit-id は文字列）', async () => {
    const id = await db.records.add({ date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 });
    await deleteMeasurement(db, String(id));
    expect(await db.records.get(id)).toBeUndefined();
  });

  it('削除後は件数が1減る', async () => {
    await db.records.bulkAdd([
      { date: '2024-01-15T09:00', sys: 120, dia: 80, pulse: 60 },
      { date: '2024-01-16T09:00', sys: 125, dia: 82, pulse: 62 },
    ]);
    const all = await db.records.toArray();
    await deleteMeasurement(db, all[0].id);
    expect(await db.records.count()).toBe(1);
  });

  it('存在しないIDを削除しても例外が発生しない', async () => {
    await expect(deleteMeasurement(db, 9999)).resolves.not.toThrow();
  });
});

describe('fetchMeasurements', () => {
  let db;

  beforeEach(() => { db = createDb(); });
  afterEach(async () => { await db.close(); });

  it('デフォルトは日付昇順で返す', async () => {
    await db.records.bulkAdd([
      { date: '2024-01-17T09:00', sys: 130, dia: 85, pulse: 65 },
      { date: '2024-01-15T09:00', sys: 120, dia: 80, pulse: 60 },
      { date: '2024-01-16T09:00', sys: 125, dia: 82, pulse: 62 },
    ]);
    const measurements = await fetchMeasurements(db);
    expect(measurements.map(m => m.date)).toEqual([
      '2024-01-15T09:00',
      '2024-01-16T09:00',
      '2024-01-17T09:00',
    ]);
  });

  it('order: desc で日付降順（一覧表示用）で返す', async () => {
    await db.records.bulkAdd([
      { date: '2024-01-15T09:00', sys: 120, dia: 80, pulse: 60 },
      { date: '2024-01-17T09:00', sys: 130, dia: 85, pulse: 65 },
      { date: '2024-01-16T09:00', sys: 125, dia: 82, pulse: 62 },
    ]);
    const measurements = await fetchMeasurements(db, { order: 'desc' });
    expect(measurements.map(m => m.date)).toEqual([
      '2024-01-17T09:00',
      '2024-01-16T09:00',
      '2024-01-15T09:00',
    ]);
  });

  it('空のDBは空配列を返す', async () => {
    expect(await fetchMeasurements(db)).toEqual([]);
  });
});

describe('importMeasurements', () => {
  let db;

  beforeEach(() => { db = createDb(); });
  afterEach(async () => { await db.close(); });

  it('既存Measurementがない場合は全件追加される', async () => {
    const csv = 'date,sys,dia,pulse\n2024-01-15T09:05,120,80,60\n2024-01-16T10:30,130,85,65';
    const { added, skipped } = await importMeasurements(db, csv);
    expect(added).toBe(2);
    expect(skipped).toBe(0);
    expect(await db.records.count()).toBe(2);
  });

  it('全件が既存と完全一致する場合は何も追加しない', async () => {
    await db.records.add({ date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 });
    const csv = 'date,sys,dia,pulse\n2024-01-15T09:05,120,80,60';
    const { added, skipped } = await importMeasurements(db, csv);
    expect(added).toBe(0);
    expect(skipped).toBe(1);
    expect(await db.records.count()).toBe(1);
  });

  it('新規と重複が混在する場合は新規のみ追加される', async () => {
    await db.records.add({ date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 });
    const csv = 'date,sys,dia,pulse\n2024-01-15T09:05,120,80,60\n2024-01-16T10:30,130,85,65';
    const { added, skipped } = await importMeasurements(db, csv);
    expect(added).toBe(1);
    expect(skipped).toBe(1);
    expect(await db.records.count()).toBe(2);
  });

  it('date が同じでも他のフィールドが違えば重複とみなさない', async () => {
    await db.records.add({ date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 });
    const csv = 'date,sys,dia,pulse\n2024-01-15T09:05,125,80,60';
    const { added, skipped } = await importMeasurements(db, csv);
    expect(added).toBe(1);
    expect(skipped).toBe(0);
    expect(await db.records.count()).toBe(2);
  });

  it('同じCSVを2回インポートしても件数が増えない', async () => {
    const csv = 'date,sys,dia,pulse\n2024-01-15T09:05,120,80,60\n2024-01-16T10:30,130,85,65';
    await importMeasurements(db, csv);
    await importMeasurements(db, csv);
    expect(await db.records.count()).toBe(2);
  });
});
