import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FarmAlerts from '../../src/components/FarmAlerts.jsx';

const noop = () => {};
const today = new Date().toISOString().slice(0, 10);

describe('FarmAlerts', () => {
  it('shows "Nothing needs attention" when there is genuinely nothing to flag', () => {
    const units = [{ id: 'u1', name: 'Layer House A' }];
    const logs = [{ unitId: 'u1', date: today, mortality: 0 }]; // logged today, so not "under-logged" either
    render(<FarmAlerts units={units} logs={logs} inventory={[]} inventoryMoves={[]} goTo={noop} />);
    expect(screen.getByText('Nothing needs attention right now.')).toBeInTheDocument();
  });

  it('flags an item at or below its reorder level', () => {
    const inventory = [{ id: 'i1', name: 'Layer Mash', openingStock: 5, reorderLevel: 20 }];
    render(<FarmAlerts units={[]} logs={[]} inventory={inventory} inventoryMoves={[]} goTo={noop} />);
    expect(screen.getByText('Layer Mash is at or below its reorder level.')).toBeInTheDocument();
  });

  it('does not flag an item with no reorder level set (0 is treated as "not configured", not "always low")', () => {
    const inventory = [{ id: 'i1', name: 'Layer Mash', openingStock: 0, reorderLevel: 0 }];
    render(<FarmAlerts units={[]} logs={[]} inventory={inventory} inventoryMoves={[]} goTo={noop} />);
    expect(screen.queryByText(/reorder level/)).not.toBeInTheDocument();
  });

  it('computes stock balance from opening stock plus ledger movements, not just opening stock', () => {
    const inventory = [{ id: 'i1', name: 'Layer Mash', openingStock: 100, reorderLevel: 20 }];
    const inventoryMoves = [{ itemId: 'i1', direction: 'out', quantity: 90 }]; // 100 - 90 = 10, below reorderLevel 20
    render(<FarmAlerts units={[]} logs={[]} inventory={inventory} inventoryMoves={inventoryMoves} goTo={noop} />);
    expect(screen.getByText('Layer Mash is at or below its reorder level.')).toBeInTheDocument();
  });

  it('falls back to the legacy `type` field when `direction` is not set on a movement (backward compatibility)', () => {
    const inventory = [{ id: 'i1', name: 'Layer Mash', openingStock: 100, reorderLevel: 20 }];
    const inventoryMoves = [{ itemId: 'i1', type: 'out', quantity: 90 }]; // no `direction`, only the older `type` field
    render(<FarmAlerts units={[]} logs={[]} inventory={inventory} inventoryMoves={inventoryMoves} goTo={noop} />);
    expect(screen.getByText('Layer Mash is at or below its reorder level.')).toBeInTheDocument();
  });

  it('flags wastage recorded in the last 7 days, with correct singular/plural wording', () => {
    const inventoryMoves = [{ transactionType: 'wastage', date: today }];
    render(<FarmAlerts units={[]} logs={[]} inventory={[]} inventoryMoves={inventoryMoves} goTo={noop} />);
    expect(screen.getByText('1 stock loss recorded in the last 7 days.')).toBeInTheDocument();
  });

  it('pluralizes "losses" correctly for more than one', () => {
    const inventoryMoves = [
      { transactionType: 'wastage', date: today },
      { transactionType: 'wastage', date: today },
    ];
    render(<FarmAlerts units={[]} logs={[]} inventory={[]} inventoryMoves={inventoryMoves} goTo={noop} />);
    expect(screen.getByText('2 stock losses recorded in the last 7 days.')).toBeInTheDocument();
  });

  it('flags today\'s mortality specifically, not mortality from any other day', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const logs = [
      { unitId: 'u1', date: today, mortality: 3 },
      { unitId: 'u1', date: yesterday, mortality: 99 }, // should not count
    ];
    render(<FarmAlerts units={[]} logs={logs} inventory={[]} inventoryMoves={[]} goTo={noop} />);
    expect(screen.getByText('3 animals recorded as lost today.')).toBeInTheDocument();
  });

  it('flags a farm group with no log entry today, but not one that already has one', () => {
    const units = [
      { id: 'u1', name: 'Logged Group' },
      { id: 'u2', name: 'Forgotten Group' },
    ];
    const logs = [{ unitId: 'u1', date: today, mortality: 0 }];
    render(<FarmAlerts units={units} logs={logs} inventory={[]} inventoryMoves={[]} goTo={noop} />);
    expect(screen.getByText('Forgotten Group has no daily log for today.')).toBeInTheDocument();
    expect(screen.queryByText('Logged Group has no daily log for today.')).not.toBeInTheDocument();
  });

  it('caps low-stock alerts at 4 items even if more qualify', () => {
    const inventory = Array.from({ length: 6 }, (_, i) => ({ id: `i${i}`, name: `Item ${i}`, openingStock: 0, reorderLevel: 10 }));
    render(<FarmAlerts units={[]} logs={[]} inventory={inventory} inventoryMoves={[]} goTo={noop} />);
    expect(screen.getAllByText(/is at or below its reorder level/)).toHaveLength(4);
  });

  it('caps the combined alert list at 6 items total across all categories', () => {
    const inventory = Array.from({ length: 4 }, (_, i) => ({ id: `i${i}`, name: `Item ${i}`, openingStock: 0, reorderLevel: 10 }));
    const units = Array.from({ length: 5 }, (_, i) => ({ id: `u${i}`, name: `Group ${i}` }));
    render(<FarmAlerts units={units} logs={[]} inventory={inventory} inventoryMoves={[]} goTo={noop} />);
    // 4 low-stock + up to 3 under-logged would be 7, but the combined list caps at 6.
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(6);
  });

  it('clicking an alert navigates to its associated tab', () => {
    let navigatedTo = null;
    const inventory = [{ id: 'i1', name: 'Layer Mash', openingStock: 0, reorderLevel: 20 }];
    render(<FarmAlerts units={[]} logs={[]} inventory={inventory} inventoryMoves={[]} goTo={(tab) => { navigatedTo = tab; }} />);
    fireEvent.click(screen.getByText('Layer Mash is at or below its reorder level.'));
    expect(navigatedTo).toBe('inventory');
  });

  it('an under-logged alert navigates to the log tab specifically', () => {
    let navigatedTo = null;
    const units = [{ id: 'u1', name: 'Forgotten Group' }];
    render(<FarmAlerts units={units} logs={[]} inventory={[]} inventoryMoves={[]} goTo={(tab) => { navigatedTo = tab; }} />);
    fireEvent.click(screen.getByText('Forgotten Group has no daily log for today.'));
    expect(navigatedTo).toBe('log');
  });
});
