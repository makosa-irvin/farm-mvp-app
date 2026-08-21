import { describe, expect, it } from 'vitest';
import { findMatchingUnit, normalizeImportedRow, parseCsv, mapHeaders } from '../../src/lib/importRecords.js';

describe('import record mapping', () => {
  it('maps common headings and stock movement values', () => {
    const rows = parseCsv('Date,Flock,Item,Qty,Cost,Movement,Notes\n2025-01-05,Layer Chickens,Layer Mash,500,62,bought,Monthly feed');
    const row = normalizeImportedRow(rows[0]);
    expect(row.date).toBe('2025-01-05');
    expect(row.farm_group).toBe('Layer Chickens');
    expect(row.name).toBe('Layer Mash');
    expect(row.quantity).toBe(500);
    expect(row.unit_cost).toBe(62);
    expect(row.movement_type).toBe('purchase');
    expect(row.record_type).toBe('inventory');
  });

  it('matches an existing group only by exact name (case/whitespace-insensitive) — no fuzzy or synonym matching', () => {
    const units = [{ id: 'dairy-1', name: 'Dairy Herd', type: 'milk', initialCount: 22, startDate: '2024-01-01' }];
    // Exact match (normalized) still works.
    expect(findMatchingUnit(units, 'dairy herd')).toEqual(units[0]);
    expect(findMatchingUnit(units, '  Dairy   Herd  ')).toEqual(units[0]);

    // A "reasonable alternate name" — e.g. "Dairy Cows" for "Dairy Herd" —
    // deliberately does NOT match anymore. An earlier version of this
    // function did fuzzy/synonym-based matching here, but it was unsafe:
    // a real farm can plausibly have two genuinely different groups whose
    // names share words or belong to the same rough category (e.g.
    // "Layer House A" and "Layer House B", or "Old Layer House" next to
    // an existing "Layer House A"), and no word-overlap heuristic can
    // reliably tell that apart from a spelling variation of the same
    // group. An unmatched import just creates a new, visible group the
    // farmer can review and merge themselves — the safer failure mode
    // than silently conflating two real groups' history.
    expect(findMatchingUnit(units, 'Dairy Cows')).toBeNull();
  });

  it('keeps farm-group quantities and historical dates', () => {
    const rows = parseCsv('Record Type,Date,Farm Group,Quantity\nfarm_group,2024-08-20,Dairy Cows,18\nfarm_group,2025-02-15,Dairy Cows,28');
    const normalized = rows.map(normalizeImportedRow);
    expect(normalized.map((r) => r.quantity)).toEqual([18, 28]);
    expect(normalized.map((r) => r.date)).toEqual(['2024-08-20', '2025-02-15']);
  });
});

describe('inferRecordType — fallback inference when there is no Record Type column', () => {
  // Regression tests for a confirmed bug: the fallback checks referenced
  // pre-canonicalization header names (row.produced, row.opening_stock,
  // row.cost_per_unit) that mapHeaders() has already folded into shared
  // canonical keys (quantity, unit_cost) before this function ever runs
  // — meaning an ordinary "Group, Date, Produced" spreadsheet with no
  // explicit type column had its rows silently skipped during import.
  it('infers "log" from a bare quantity column, with no explicit type or loss/mortality data', () => {
    const row = normalizeImportedRow(parseCsv('Group,Date,Produced\nLayer House A,2026-08-01,80')[0]);
    expect(row.record_type).toBe('log');
    expect(row.quantity).toBe(80);
  });

  it('infers "inventory" from category + unit cost, with no explicit type', () => {
    const row = normalizeImportedRow(parseCsv('Group,Date,Item,Category,Unit,Qty,Cost\nDairy,2026-08-01,Layer Mash,Feed,kg,50,70')[0]);
    expect(row.record_type).toBe('inventory');
  });

  it('infers "expense" from a bare amount, with no explicit type or supplier', () => {
    const row = normalizeImportedRow(parseCsv('Group,Date,Total\nDairy,2026-08-01,500')[0]);
    expect(row.record_type).toBe('expense');
  });

  it('still infers "inventory" from a movement type, unaffected by the fix', () => {
    const row = normalizeImportedRow(parseCsv('Item,Date,Movement,Qty\nLayer Mash,2026-08-01,Used,10')[0]);
    expect(row.record_type).toBe('inventory');
  });

  it('still infers "log" from mortality data, unaffected by the fix', () => {
    const row = normalizeImportedRow(parseCsv('Group,Date,Deaths\nDairy,2026-08-01,2')[0]);
    expect(row.record_type).toBe('log');
  });

  it('still infers "expense" from a supplier name, unaffected by the fix', () => {
    const row = normalizeImportedRow(parseCsv('Group,Date,What,Amount,Vendor\nDairy,2026-08-01,Vet visit,2000,Dr Kamau')[0]);
    expect(row.record_type).toBe('expense');
  });
});

describe('mapHeaders — known limitation with duplicate-concept columns', () => {
  // Documented, not fixed, in this pass: if a spreadsheet has two
  // separate columns that both alias to the same canonical key (e.g.
  // both "Qty" and "Produced" present — realistic for a mixed-type
  // template where expense rows want "Qty" and log rows want
  // "Produced"), only the first-encountered column wins the canonical
  // slot; the second column's data is silently dropped rather than
  // causing an error. This test exists so that behavior is visible and
  // intentional rather than an unnoticed gap — if mapHeaders() is ever
  // reworked to handle this, this test should start failing and can be
  // updated to assert the improved behavior.
  it('keeps only the first of two columns that alias to the same canonical key', () => {
    const mapped = mapHeaders(['Date', 'Group', 'Qty', 'Produced']);
    // Only one index gets the 'quantity' canonical key — "Qty" (index 2),
    // since it appears first. "Produced" (index 3) gets no canonical
    // mapping at all.
    expect(Object.values(mapped).filter((v) => v === 'quantity')).toHaveLength(1);
    expect(mapped[2]).toBe('quantity');
    expect(mapped[3]).toBeUndefined();
  });
});
