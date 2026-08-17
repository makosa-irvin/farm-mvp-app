import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import UnitsView from '../../src/views/UnitsView.jsx';
import ExpensesView from '../../src/views/ExpensesView.jsx';
import InventoryView from '../../src/views/InventoryView.jsx';
import DailyLogView from '../../src/views/DailyLogView.jsx';
import Dashboard from '../../src/views/Dashboard.jsx';
import AnalyticsView from '../../src/views/AnalyticsView.jsx';
import { INVENTORY_TRANSACTION_TYPES } from '../../src/lib/inventoryLedger.js';

const noop = () => {};

describe('view components render without crashing, empty-state', () => {
  it('UnitsView', () => {
    render(<UnitsView units={[]} logs={[]} onAdd={noop} onUpdate={noop} onRemove={noop} />);
    expect(screen.getByText('Add a production unit')).toBeInTheDocument();
  });

  it('ExpensesView', () => {
    render(<ExpensesView units={[]} inventory={[]} expenses={[]} onAdd={noop} onUpdate={noop} onRemove={noop} />);
    expect(screen.getByText('Record an expense')).toBeInTheDocument();
  });

  it('InventoryView', () => {
    render(<InventoryView units={[]} inventory={[]} expenses={[]} moves={[]} transactionTypes={INVENTORY_TRANSACTION_TYPES} onAddItem={noop} onUpdateItem={noop} onRemoveItem={noop} onAddMove={noop} onUpdateMove={noop} onRemoveMove={noop} getExpenseUnitCost={noop} />);
    expect(screen.getByText('Inventory is ready to track')).toBeInTheDocument();
  });

  it('DailyLogView with no units shows the empty state instead of the form', () => {
    render(<DailyLogView units={[]} logs={[]} inventory={[]} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    expect(screen.getByText('Add a unit before logging')).toBeInTheDocument();
  });

  it('Dashboard with no units shows the empty state', () => {
    render(<Dashboard units={[]} logs={[]} expenses={[]} inventory={[]} inventoryMoves={[]} goTo={noop} />);
    expect(screen.getByText('No production units yet')).toBeInTheDocument();
  });

  it('AnalyticsView with no units shows the empty state', () => {
    render(<AnalyticsView units={[]} logs={[]} expenses={[]} inventoryMoves={[]} />);
    expect(screen.getByText('Nothing to analyze yet')).toBeInTheDocument();
  });
});

describe('the fields the E2E suite depends on actually exist', () => {
  // These mirror what tests/e2e/inventory-linking.spec.js drives through a
  // real browser. If a label or option text changes and breaks the E2E
  // locators, this (much faster) test should catch it first.

  it('UnitsView exposes a "Name" field and "Add unit" button', () => {
    render(<UnitsView units={[]} logs={[]} onAdd={noop} onUpdate={noop} onRemove={noop} />);
    const label = screen.getByText('Name', { selector: 'label' });
    expect(label.parentElement.querySelector('input')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add unit' })).toBeInTheDocument();
  });

  it('InventoryView exposes "Item name"/"Category"/"Unit" fields and lists items with their balance', () => {
    const inventory = [{ id: 'i1', name: 'Layer Mash', category: 'Feed', unit: 'kg', openingStock: 150, reorderLevel: 20, unitCost: 0 }];
    render(<InventoryView units={[]} inventory={inventory} expenses={[]} moves={[]} transactionTypes={INVENTORY_TRANSACTION_TYPES} onAddItem={noop} onUpdateItem={noop} onRemoveItem={noop} onAddMove={noop} onUpdateMove={noop} onRemoveMove={noop} getExpenseUnitCost={noop} />);
    expect(screen.getByText('Item name', { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByText('Layer Mash')).toBeInTheDocument();
    expect(screen.getByText('150.0 kg')).toBeInTheDocument(); // the balance the E2E test asserts on
  });

  it('ExpensesView exposes the inventory-link fields with the option label format the E2E test selects by', () => {
    const inventory = [{ id: 'i1', name: 'Layer Mash', unit: 'kg' }];
    render(<ExpensesView units={[]} inventory={inventory} expenses={[]} onAdd={noop} onUpdate={noop} onRemove={noop} />);
    expect(screen.getByText('Inventory item — optional', { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Layer Mash (kg)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save expense' })).toBeInTheDocument();
  });

  it('DailyLogView lists feed items with name + balance in the option text', () => {
    const units = [{ id: 'u1', name: 'Layer House A', type: 'eggs' }];
    const inventory = [{ id: 'i1', name: 'Layer Mash', category: 'Feed', unit: 'kg', openingStock: 150 }];
    render(<DailyLogView units={units} logs={[]} inventory={inventory} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    expect(screen.getByRole('button', { name: 'Layer House A' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Layer Mash · 150.0 kg' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save log entry' })).toBeInTheDocument();
  });
});
