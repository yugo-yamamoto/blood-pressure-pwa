import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import Dexie from 'dexie';

// テストごとに独立した IDBFactory を使うことでデータが混在しない
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

    const record = await db.records.get(id);
    expect(record).toEqual({ id, date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 });
  });

  it('空のDBはレコード0件を返す', async () => {
    const records = await db.records.toArray();
    expect(records).toEqual([]);
  });

  it('レコードを日付の昇順で取得できる', async () => {
    await db.records.bulkAdd([
      { date: '2024-01-17T09:00', sys: 130, dia: 85, pulse: 65 },
      { date: '2024-01-15T09:00', sys: 120, dia: 80, pulse: 60 },
      { date: '2024-01-16T09:00', sys: 125, dia: 82, pulse: 62 },
    ]);
    const records = await db.records.orderBy('date').toArray();
    expect(records.map(r => r.date)).toEqual([
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
    const records = await db.records.orderBy('date').reverse().toArray();
    expect(records.map(r => r.date)).toEqual([
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
    expect(updated.date).toBe('2024-01-15T09:05'); // dateは変わらない
  });

  it('レコードを削除できる', async () => {
    const id = await db.records.add({ date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 });
    await db.records.delete(id);

    const record = await db.records.get(id);
    expect(record).toBeUndefined();
  });

  it('削除後も他のレコードは残る', async () => {
    const id1 = await db.records.add({ date: '2024-01-15T09:00', sys: 120, dia: 80, pulse: 60 });
    const id2 = await db.records.add({ date: '2024-01-16T09:00', sys: 130, dia: 85, pulse: 65 });
    await db.records.delete(id1);

    const remaining = await db.records.toArray();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(id2);
  });

  it('CSVインポート用の bulkAdd で複数件を一括追加できる', async () => {
    const newRecords = [
      { date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 },
      { date: '2024-01-16T10:30', sys: 130, dia: 85, pulse: 65 },
      { date: '2024-01-17T08:00', sys: 115, dia: 75, pulse: 58 },
    ];
    await db.records.bulkAdd(newRecords);

    const count = await db.records.count();
    expect(count).toBe(3);
  });

  it('bulkAdd した全レコードが正しい値を持つ', async () => {
    const newRecords = [
      { date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 },
      { date: '2024-01-16T10:30', sys: 130, dia: 85, pulse: 65 },
    ];
    await db.records.bulkAdd(newRecords);

    const records = await db.records.orderBy('date').toArray();
    expect(records[0]).toMatchObject({ date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 });
    expect(records[1]).toMatchObject({ date: '2024-01-16T10:30', sys: 130, dia: 85, pulse: 65 });
  });

  it('グラフ表示用に日付昇順・全フィールドを含むレコードが取得できる', async () => {
    await db.records.bulkAdd([
      { date: '2024-01-15T09:00', sys: 120, dia: 80, pulse: 60 },
      { date: '2024-01-16T09:00', sys: 125, dia: 82, pulse: 62 },
    ]);
    const records = await db.records.orderBy('date').toArray();
    records.forEach(r => {
      expect(r).toHaveProperty('date');
      expect(r).toHaveProperty('sys');
      expect(r).toHaveProperty('dia');
      expect(r).toHaveProperty('pulse');
    });
  });
});

describe('削除処理（btn-delete が呼び出すロジック）', () => {
  let db;

  beforeEach(() => {
    db = createDb();
  });

  afterEach(async () => {
    await db.close();
  });

  it('指定IDのレコードを削除できる', async () => {
    const id = await db.records.add({ date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 });
    await db.records.delete(parseInt(String(id), 10));
    expect(await db.records.get(id)).toBeUndefined();
  });

  it('削除後は件数が1減る', async () => {
    await db.records.bulkAdd([
      { date: '2024-01-15T09:00', sys: 120, dia: 80, pulse: 60 },
      { date: '2024-01-16T09:00', sys: 125, dia: 82, pulse: 62 },
    ]);
    const all = await db.records.toArray();
    await db.records.delete(all[0].id);
    expect(await db.records.count()).toBe(1);
  });

  it('文字列IDをparseIntして渡しても正しく削除できる（フォームの edit-id は文字列）', async () => {
    const id = await db.records.add({ date: '2024-01-15T09:05', sys: 120, dia: 80, pulse: 60 });
    // フォームの hidden input から取得すると文字列になるため parseInt が必要
    const idAsString = String(id);
    await db.records.delete(parseInt(idAsString, 10));
    expect(await db.records.get(id)).toBeUndefined();
  });

  it('存在しないIDを削除しても例外が発生しない', async () => {
    await expect(db.records.delete(9999)).resolves.not.toThrow();
  });
});
