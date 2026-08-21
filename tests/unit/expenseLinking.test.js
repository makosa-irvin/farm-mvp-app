import { describe, it, expect } from 'vitest';
import {
  syncedTransactionsForExpense,
  balanceIfExpensePurchaseRemoved,
  expensePurchaseTransactionId,
} from '../../src/lib/expenseLinking.js';

describe('syncedTransactionsForExpense', () => {
  it('creates a purchase transaction when an expense is linked to inventory', () => {
    const inventory = [{ id: 'i1', unit: 'kg', openingStock: 0 }];
    const expense = { id: 'e1', amount: 105, date: '2026-08-17', inventoryItemId: 'i1', inventoryQuantity: 150, description: '' };
    const result = syncedTransactionsForExpense(expense, inventory, []);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: expensePurchaseTransactionId('e1'), itemId: 'i1', direction: 'in', quantity: 150 });
    expect(result[0].unitCost).toBeCloseTo(0.7);
  });

  it('produces no transaction when the expense has no inventory link', () => {
    const expense = { id: 'e1', amount: 50, date: '2026-08-17', inventoryItemId: null, inventoryQuantity: null };
    expect(syncedTransactionsForExpense(expense, [], [])).toEqual([]);
  });

  it('returns null (reject) when reducing quantity would drive stock negative', () => {
    const inventory = [{ id: 'i1', unit: 'kg', openingStock: 0 }];
    const existingPurchase = {
      id: expensePurchaseTransactionId('e1'),
      itemId: 'i1',
      source: 'expense-purchase',
      sourceId: 'e1',
      direction: 'in',
      quantity: 150,
      unitCost: 0.7,
    };
    const consumption = { id: 'logfeed_l1', itemId: 'i1', direction: 'out', quantity: 45, unitCost: 0.7 };
    const transactions = [existingPurchase, consumption];

    const reducedExpense = { id: 'e1', amount: 28, date: '2026-08-17', inventoryItemId: 'i1', inventoryQuantity: 40 };
    expect(syncedTransactionsForExpense(reducedExpense, inventory, transactions)).toBeNull();
  });

  it('allows increasing the quantity even with existing consumption', () => {
    const inventory = [{ id: 'i1', unit: 'kg', openingStock: 0 }];
    const existingPurchase = {
      id: expensePurchaseTransactionId('e1'),
      itemId: 'i1',
      source: 'expense-purchase',
      sourceId: 'e1',
      direction: 'in',
      quantity: 150,
      unitCost: 0.7,
    };
    const consumption = { id: 'logfeed_l1', itemId: 'i1', direction: 'out', quantity: 45, unitCost: 0.7 };
    const transactions = [existingPurchase, consumption];

    const increasedExpense = { id: 'e1', amount: 140, date: '2026-08-17', inventoryItemId: 'i1', inventoryQuantity: 200 };
    const result = syncedTransactionsForExpense(increasedExpense, inventory, transactions);
    expect(result).not.toBeNull();
    expect(result.find((t) => t.source === 'expense-purchase').quantity).toBe(200);
  });

  it('preserves the original createdAt across an edit', () => {
    const inventory = [{ id: 'i1', unit: 'kg', openingStock: 0 }];
    const existingPurchase = {
      id: expensePurchaseTransactionId('e1'),
      itemId: 'i1',
      source: 'expense-purchase',
      sourceId: 'e1',
      direction: 'in',
      quantity: 150,
      unitCost: 0.7,
      createdAt: 12345,
    };
    const expense = { id: 'e1', amount: 140, date: '2026-08-17', inventoryItemId: 'i1', inventoryQuantity: 200 };
    const result = syncedTransactionsForExpense(expense, inventory, [existingPurchase]);
    expect(result.find((t) => t.source === 'expense-purchase').createdAt).toBe(12345);
  });
});

describe('balanceIfExpensePurchaseRemoved', () => {
  it('reports a null linkedTx when the expense has no linked purchase', () => {
    expect(balanceIfExpensePurchaseRemoved('e1', [], [])).toEqual({ linkedTx: null, balance: null });
  });

  it('computes the resulting balance if the linked purchase were removed', () => {
    const inventory = [{ id: 'i1', openingStock: 0 }];
    const purchase = { id: 'exppurchase_e1', itemId: 'i1', source: 'expense-purchase', sourceId: 'e1', direction: 'in', quantity: 150 };
    const consumption = { id: 'logfeed_l1', itemId: 'i1', direction: 'out', quantity: 45 };
    const { linkedTx, balance } = balanceIfExpensePurchaseRemoved('e1', inventory, [purchase, consumption]);
    expect(linkedTx).toBeTruthy();
    expect(balance).toBe(-45);
  });
});
