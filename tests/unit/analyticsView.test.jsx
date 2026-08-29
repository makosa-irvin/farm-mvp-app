import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AnalyticsView from '../../src/views/AnalyticsView.jsx';

const units = [{ id: 'u1', name: 'Layer House A', type: 'eggs', initialCount: 100, startDate: '2026-08-01', producePrice: 300 }];

function goToMoneyTab() {
  fireEvent.click(screen.getByRole('button', { name: 'Money' }));
}

describe('AnalyticsView — Money tab', () => {
  it('leads the top summary with money made and profit, not buried below feed metrics', () => {
    const logs = [{ unitId: 'u1', date: '2026-08-10', produced: 30, sold: 28, mortality: 0 }];
    render(<AnalyticsView units={units} logs={logs} expenses={[]} inventory={[]} inventoryMoves={[]} />);
    expect(screen.getByText('Money made')).toBeInTheDocument();
    expect(screen.getByText('Profit')).toBeInTheDocument();
  });

  it('states plainly when the whole figure is estimated (no real sales tracked yet)', () => {
    const logs = [{ unitId: 'u1', date: '2026-08-10', produced: 30, mortality: 0 }];
    render(<AnalyticsView units={units} logs={logs} expenses={[]} inventory={[]} inventoryMoves={[]} />);
    goToMoneyTab();
    expect(screen.getByText(/None of these log entries recorded an actual sale yet/)).toBeInTheDocument();
  });

  it('states plainly when the figure is fully real (every entry tracked a sale)', () => {
    const logs = [{ unitId: 'u1', date: '2026-08-10', produced: 30, sold: 30, mortality: 0 }];
    render(<AnalyticsView units={units} logs={logs} expenses={[]} inventory={[]} inventoryMoves={[]} />);
    goToMoneyTab();
    expect(screen.getByText(/this figure is real, not estimated/)).toBeInTheDocument();
  });

  it('states the exact split when revenue is a blend of real and estimated entries', () => {
    const logs = [
      { unitId: 'u1', date: '2026-08-10', produced: 30, sold: 30, mortality: 0 },
      { unitId: 'u1', date: '2026-08-11', produced: 20, mortality: 0 },
    ];
    render(<AnalyticsView units={units} logs={logs} expenses={[]} inventory={[]} inventoryMoves={[]} />);
    goToMoneyTab();
    expect(screen.getAllByText(/1 of 2 log entries recorded an actual sale/).length).toBeGreaterThan(0);
  });
});

describe('AnalyticsView — item cost trend (Feed tab)', () => {
  it('surfaces a mid-period item substitution week by week', () => {
    const inventory = [
      { id: 'feedA', name: 'Feed A', category: 'Feed', unit: 'kg' },
      { id: 'feedB', name: 'Feed B', category: 'Feed', unit: 'kg' },
    ];
    const inventoryMoves = [
      { itemId: 'feedB', transactionType: 'consumption', direction: 'out', quantity: 20, unitCost: 60, date: '2026-08-03' },
      { itemId: 'feedA', transactionType: 'consumption', direction: 'out', quantity: 20, unitCost: 90, date: '2026-08-17' },
    ];
    render(<AnalyticsView units={units} logs={[]} expenses={[]} inventory={inventory} inventoryMoves={inventoryMoves} />);
    fireEvent.click(screen.getByRole('button', { name: 'Feed' }));
    expect(screen.getByText('Cost by item, by week')).toBeInTheDocument();
    expect(screen.getAllByText('Feed A').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Feed B').length).toBeGreaterThan(0);
  });

  it('does not show the item-cost-trend panel when there is nothing to show', () => {
    render(<AnalyticsView units={units} logs={[]} expenses={[]} inventory={[]} inventoryMoves={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Feed' }));
    expect(screen.queryByText('Cost by item, by week')).not.toBeInTheDocument();
  });
});
