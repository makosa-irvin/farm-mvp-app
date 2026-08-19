import { describe, expect, it } from 'vitest';
import { findMatchingUnit, normalizeImportedRow, parseCsv } from '../../src/lib/importRecords.js';

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

  it('matches a historical group when the spreadsheet uses a reasonable alternate name', () => {
    const units = [{ id: 'dairy-1', name: 'Dairy Herd', type: 'milk', initialCount: 22, startDate: '2024-01-01' }];
    expect(findMatchingUnit(units, 'Dairy Cows')).toEqual(units[0]);
  });

  it('keeps farm-group quantities and historical dates', () => {
    const rows = parseCsv('Record Type,Date,Farm Group,Quantity\nfarm_group,2024-08-20,Dairy Cows,18\nfarm_group,2025-02-15,Dairy Cows,28');
    const normalized = rows.map(normalizeImportedRow);
    expect(normalized.map(r => r.quantity)).toEqual([18, 28]);
    expect(normalized.map(r => r.date)).toEqual(['2024-08-20', '2025-02-15']);
  });
});
