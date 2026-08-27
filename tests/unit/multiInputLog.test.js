import { describe, expect, it } from 'vitest';
import { buildInputTransactions, inputsForLog } from '../../src/lib/feedLinking.js';

describe('multiple daily-log inputs', () => {
  it('creates a separate stock deduction for feed and medicine', () => {
    const log = { id: 'l1', unitId: 'cow1', date: '2026-08-27', inputs: [{ itemId: 'feed', quantity: 4, kind: 'feed' }, { itemId: 'med', quantity: 1, kind: 'medicine' }] };
    const txs = buildInputTransactions(log, [{ id: 'cow1', name: 'Bella' }]);
    expect(txs).toHaveLength(2);
    expect(txs.map((t) => t.itemId)).toEqual(['feed', 'med']);
    expect(txs.every((t) => t.sourceId === 'l1')).toBe(true);
  });
  it('continues to understand old single-feed logs', () => {
    expect(inputsForLog({ feedItemId: 'feed', feedQuantity: 3 })).toEqual([{ itemId: 'feed', quantity: 3, kind: 'feed' }]);
  });
});
