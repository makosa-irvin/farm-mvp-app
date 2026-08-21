import { describe, it, expect, vi } from 'vitest';
import { buildBackup, downloadBackup, validateBackup, readBackupFile, PERSISTED_KEYS } from '../../src/lib/dataBackup.js';

describe('buildBackup', () => {
  it('wraps the five data slices with a kind and version marker', () => {
    const payload = buildBackup({
      units: [{ id: 'u1' }],
      logs: [{ id: 'l1' }],
      expenses: [{ id: 'e1' }],
      inventory: [{ id: 'i1' }],
      inventoryTransactions: [{ id: 't1' }],
    });
    expect(payload.kind).toBe('mazaosmart-backup');
    expect(payload.version).toBe(1);
    expect(payload.data.units).toEqual([{ id: 'u1' }]);
    expect(payload.data.inventoryTransactions).toEqual([{ id: 't1' }]);
    expect(typeof payload.exportedAt).toBe('string');
    expect(new Date(payload.exportedAt).toString()).not.toBe('Invalid Date');
  });
});

describe('validateBackup', () => {
  const validPayload = () => ({
    kind: 'mazaosmart-backup',
    version: 1,
    data: { units: [{ id: 'u1' }], logs: [], expenses: [], inventory: [], inventoryTransactions: [] },
  });

  // Regression test for a confirmed bug: LEGACY_BACKUP_KIND was found set
  // to the exact same string as BACKUP_KIND, silently turning the
  // backward-compatibility check into a no-op. A farmer with a backup
  // downloaded before the Mazaosmart rebrand (carrying the pre-rebrand
  // "field-ledger-backup" marker) would have that legitimate file
  // rejected as "not a Mazaosmart backup" — exactly the safety net a
  // backup feature exists to provide, failing at the moment it's
  // actually needed.
  it('accepts a backup downloaded before the Mazaosmart rebrand (the legacy "field-ledger-backup" marker)', () => {
    const legacyPayload = {
      kind: 'field-ledger-backup',
      version: 1,
      data: { units: [{ id: 'old-unit' }], logs: [], expenses: [], inventory: [], inventoryTransactions: [] },
    };
    const result = validateBackup(legacyPayload);
    expect(result.units).toEqual([{ id: 'old-unit' }]);
  });

  it('accepts a well-formed backup and returns its five arrays', () => {
    const result = validateBackup(validPayload());
    expect(result.units).toEqual([{ id: 'u1' }]);
    expect(result.logs).toEqual([]);
  });

  it('rejects a file with the wrong kind marker', () => {
    expect(() => validateBackup({ ...validPayload(), kind: 'something-else' })).toThrow('not a Mazaosmart backup');
  });

  it('rejects a completely unrelated JSON file (no kind at all)', () => {
    expect(() => validateBackup({ hello: 'world' })).toThrow('not a Mazaosmart backup');
  });

  it('rejects null/undefined payloads without crashing', () => {
    expect(() => validateBackup(null)).toThrow('not a Mazaosmart backup');
    expect(() => validateBackup(undefined)).toThrow('not a Mazaosmart backup');
  });

  it('rejects an unsupported version, naming the version in the error', () => {
    expect(() => validateBackup({ ...validPayload(), version: 99 })).toThrow('99');
  });

  it('rejects a payload with no data object at all', () => {
    expect(() => validateBackup({ kind: 'mazaosmart-backup', version: 1 })).toThrow('does not contain farm data');
  });

  it('coerces a missing or non-array field to an empty array rather than crashing', () => {
    const payload = validPayload();
    delete payload.data.logs;
    payload.data.expenses = 'not an array';
    const result = validateBackup(payload);
    expect(result.logs).toEqual([]);
    expect(result.expenses).toEqual([]);
  });

  // This is a real, known gap, not just a missing feature: validation only
  // checks that each field is *an array*, not that the records inside it
  // have the right shape. A backup with garbage records currently
  // "validates" successfully. Documenting the current (permissive)
  // behavior explicitly, so a future tightening of this function shows up
  // as an intentional, visible test change rather than a silent behavior
  // shift.
  it('KNOWN GAP: does not validate the shape of individual records within each array', () => {
    const payload = validPayload();
    payload.data.units = [{ totally: 'not a real unit', missing: 'every expected field' }];
    const result = validateBackup(payload);
    expect(result.units).toEqual([{ totally: 'not a real unit', missing: 'every expected field' }]);
  });
});

describe('readBackupFile', () => {
  function fakeFile(text) {
    return { text: () => Promise.resolve(text) };
  }

  it('parses and validates a real backup file', async () => {
    const payload = {
      kind: 'mazaosmart-backup',
      version: 1,
      data: { units: [{ id: 'u1' }], logs: [], expenses: [], inventory: [], inventoryTransactions: [] },
    };
    const result = await readBackupFile(fakeFile(JSON.stringify(payload)));
    expect(result.units).toEqual([{ id: 'u1' }]);
  });

  it('rejects a file that is not valid JSON at all, with a clear message', async () => {
    await expect(readBackupFile(fakeFile('{ not: valid json'))).rejects.toThrow('not valid JSON');
  });

  it('rejects a valid JSON file that is not a Mazaosmart backup', async () => {
    await expect(readBackupFile(fakeFile(JSON.stringify({ some: 'other file' })))).rejects.toThrow('not a Mazaosmart backup');
  });
});

describe('downloadBackup', () => {
  it('creates an object URL, triggers a click, and revokes the URL', () => {
    const createObjectURL = vi.fn(() => 'blob:fake-url');
    const revokeObjectURL = vi.fn();
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;

    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') el.click = clickSpy;
      return el;
    });

    downloadBackup({ kind: 'mazaosmart-backup', version: 1, data: {} });

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');

    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    document.createElement.mockRestore();
  });
});

describe('PERSISTED_KEYS', () => {
  // This constant is exported but not actually used anywhere in the
  // current codebase (confirmed via a repo-wide search) — this test
  // exists to keep the list itself honest (matching the real
  // localStorage keys usePersistentState.js actually writes) for whenever
  // it does get used, e.g. for a future "clear all data" feature.
  it('lists exactly the localStorage keys useFarmData.js actually persists to', () => {
    expect(PERSISTED_KEYS).toEqual(['farm-units', 'farm-logs', 'farm-expenses', 'farm-inventory', 'farm-inventory-ledger']);
  });
});
