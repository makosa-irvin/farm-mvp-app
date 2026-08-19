import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SuppliersView from '../../src/views/SuppliersView.jsx';

describe('SuppliersView', () => {
  it('shows an empty state when no expense has a supplier recorded', () => {
    render(<SuppliersView expenses={[]} />);
    expect(screen.getByText('No suppliers recorded yet')).toBeInTheDocument();
  });

  it('ignores expenses with a blank or whitespace-only supplier field', () => {
    const expenses = [
      { supplier: '', amount: 100, date: '2026-08-01', category: 'feed' },
      { supplier: '   ', amount: 100, date: '2026-08-01', category: 'feed' },
    ];
    render(<SuppliersView expenses={expenses} />);
    expect(screen.getByText('No suppliers recorded yet')).toBeInTheDocument();
  });

  it('groups expenses by supplier name case-insensitively', () => {
    const expenses = [
      { supplier: 'Wanjiku Agrovet', amount: 500, date: '2026-08-01', category: 'feed' },
      { supplier: 'wanjiku agrovet', amount: 300, date: '2026-08-02', category: 'feed' },
    ];
    render(<SuppliersView expenses={expenses} />);
    // Combined spend of both entries, one card, not two.
    expect(screen.getByText('KSh 800')).toBeInTheDocument();
    expect(screen.getByText('2 recorded purchases')).toBeInTheDocument();
  });

  it('sorts suppliers by total spend, highest first', () => {
    const expenses = [
      { supplier: 'Small Spend', amount: 100, date: '2026-08-01', category: 'feed' },
      { supplier: 'Big Spend', amount: 900, date: '2026-08-01', category: 'feed' },
    ];
    render(<SuppliersView expenses={expenses} />);
    const html = document.body.innerHTML;
    expect(html.indexOf('Big Spend')).toBeLessThan(html.indexOf('Small Spend'));
  });

  // Regression-style test for a real risk this view correctly avoids:
  // synthetic non-cash expenses (auto-generated when stock is used or
  // lost — see buildInventoryCostExpense in inventoryActions.js) don't
  // represent an actual purchase from a supplier, and including them here
  // would inflate a supplier's spend total with money that was never
  // actually paid to them (again, on the purchase date, not the
  // consumption date).
  it('excludes non-cash entries from supplier spend, even if one happens to carry a supplier name', () => {
    const expenses = [
      { supplier: 'Wanjiku Agrovet', amount: 500, date: '2026-08-01', category: 'feed', nonCash: false },
      { supplier: 'Wanjiku Agrovet', amount: 9999, date: '2026-08-05', expenseType: 'inventory_loss', nonCash: true },
    ];
    render(<SuppliersView expenses={expenses} />);
    expect(screen.getByText('KSh 500')).toBeInTheDocument();
    expect(screen.queryByText('KSh 10,499')).not.toBeInTheDocument();
    expect(screen.getByText('1 recorded purchase')).toBeInTheDocument();
  });

  it('lists the distinct categories purchased from a supplier', () => {
    const expenses = [
      { supplier: 'Wanjiku Agrovet', amount: 500, date: '2026-08-01', category: 'feed' },
      { supplier: 'Wanjiku Agrovet', amount: 200, date: '2026-08-02', category: 'medicine' },
    ];
    render(<SuppliersView expenses={expenses} />);
    expect(screen.getByText('feed · medicine')).toBeInTheDocument();
  });

  it('shows the most recent purchase date, not the first one recorded', () => {
    const expenses = [
      { supplier: 'Wanjiku Agrovet', amount: 100, date: '2026-08-01', category: 'feed' },
      { supplier: 'Wanjiku Agrovet', amount: 100, date: '2026-08-15', category: 'feed' },
      { supplier: 'Wanjiku Agrovet', amount: 100, date: '2026-08-08', category: 'feed' },
    ];
    render(<SuppliersView expenses={expenses} />);
    expect(screen.getByText('Last purchase: 2026-08-15')).toBeInTheDocument();
  });
});
