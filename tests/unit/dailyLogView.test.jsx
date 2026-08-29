import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DailyLogView from '../../src/views/DailyLogView.jsx';

const noop = () => {};

// FieldLabel (used for the disposition section's fields) doesn't use
// real htmlFor/id association — a known, existing gap elsewhere in this
// project, not something introduced or fixed here — so getByLabelText
// can't find these. Match the label text to its sibling input instead,
// the same workaround this project's other tests and E2E helpers use.
function fieldByLabel(container, labelText) {
  const label = Array.from(container.querySelectorAll('label')).find((el) => el.textContent === labelText);
  return label?.parentElement.querySelector('input');
}
const units = [{ id: 'u1', name: 'Dairy Cows', type: 'milk' }];
const inventory = [
  { id: 'i1', name: 'Dairy Meal', category: 'Feed', unit: 'kg', openingStock: 100 },
  { id: 'i2', name: 'Dewormer', category: 'Medicine', unit: 'ml', openingStock: 50 },
];

describe('DailyLogView — stock used (multi-item)', () => {
  it('the section is collapsed by default, with an inline add affordance', () => {
    const { container } = render(<DailyLogView units={units} logs={[]} inventory={inventory} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    expect(screen.queryByLabelText('Stock item')).not.toBeInTheDocument();
    expect(screen.getByText('+ Add stock used today')).toBeInTheDocument();
  });

  it('opens the section and adds one row in a single click', () => {
    const { container } = render(<DailyLogView units={units} logs={[]} inventory={inventory} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    fireEvent.click(screen.getByText('+ Add stock used today'));
    expect(screen.getAllByLabelText('Stock item')).toHaveLength(1);
  });

  it('supports adding several different items in one entry — the actual reason for this revamp', () => {
    const { container } = render(<DailyLogView units={units} logs={[]} inventory={inventory} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    fireEvent.click(screen.getByText('+ Add stock used today'));
    fireEvent.click(screen.getByRole('button', { name: /Add an item/ }));
    expect(screen.getAllByLabelText('Stock item')).toHaveLength(2);
  });

  it('removing a row works', () => {
    const { container } = render(<DailyLogView units={units} logs={[]} inventory={inventory} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    fireEvent.click(screen.getByText('+ Add stock used today'));
    fireEvent.click(screen.getByRole('button', { name: /Add an item/ }));
    expect(screen.getAllByLabelText('Stock item')).toHaveLength(2);
    fireEvent.click(screen.getAllByLabelText('Remove this item')[0]);
    expect(screen.getAllByLabelText('Stock item')).toHaveLength(1);
  });

  it('submits a consumedItems array with every row that has both an item and a quantity', () => {
    const onAdd = vi.fn(() => true);
    const { container } = render(<DailyLogView units={units} logs={[]} inventory={inventory} onAdd={onAdd} onUpdate={noop} onRemove={noop} goTo={noop} />);

    fireEvent.click(screen.getByText('+ Add stock used today'));
    fireEvent.change(screen.getByLabelText('Stock item'), { target: { value: 'i1' } });
    fireEvent.change(screen.getByLabelText('Quantity used'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: /Add an item/ }));
    const [, secondSelect] = screen.getAllByLabelText('Stock item');
    const [, secondQty] = screen.getAllByLabelText('Quantity used');
    fireEvent.change(secondSelect, { target: { value: 'i2' } });
    fireEvent.change(secondQty, { target: { value: '5' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save log entry' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    const [entry] = onAdd.mock.calls[0];
    expect(entry.consumedItems).toEqual([
      { itemId: 'i1', quantity: 20 },
      { itemId: 'i2', quantity: 5 },
    ]);
  });

  it('excludes a row with no quantity entered from the saved consumedItems', () => {
    const onAdd = vi.fn(() => true);
    const { container } = render(<DailyLogView units={units} logs={[]} inventory={inventory} onAdd={onAdd} onUpdate={noop} onRemove={noop} goTo={noop} />);
    fireEvent.click(screen.getByText('+ Add stock used today'));
    // Left with an item selected but no quantity typed in.
    fireEvent.click(screen.getByRole('button', { name: 'Save log entry' }));
    const [entry] = onAdd.mock.calls[0];
    expect(entry.consumedItems).toEqual([]);
  });
});

describe('DailyLogView — what happened to it (disposition)', () => {
  it('the section is collapsed by default', () => {
    const { container } = render(<DailyLogView units={units} logs={[]} inventory={inventory} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    expect(screen.queryByText('Sold (liters)', { selector: 'label' })).not.toBeInTheDocument();
  });

  it('a blank "sold" field means untracked (undefined), not zero', () => {
    const onAdd = vi.fn(() => true);
    const { container } = render(<DailyLogView units={units} logs={[]} inventory={inventory} onAdd={onAdd} onUpdate={noop} onRemove={noop} goTo={noop} />);
    fireEvent.change(fieldByLabel(container, 'Quantity produced (liters)'), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save log entry' }));
    const [entry] = onAdd.mock.calls[0];
    expect(entry.sold).toBeUndefined();
  });

  it('explicitly entering 0 sold is saved as a real zero, not left untracked', () => {
    // The distinction this whole feature depends on: "didn't track it"
    // vs. "tracked it, and the answer was zero" — see unitMetrics() in
    // helpers.js for why this matters for revenue accuracy.
    const onAdd = vi.fn(() => true);
    const { container } = render(<DailyLogView units={units} logs={[]} inventory={inventory} onAdd={onAdd} onUpdate={noop} onRemove={noop} goTo={noop} />);
    fireEvent.click(screen.getByText(/Sold, used at home, spoiled or lost/));
    fireEvent.change(fieldByLabel(container, 'Sold (liters)'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save log entry' }));
    const [entry] = onAdd.mock.calls[0];
    expect(entry.sold).toBe(0);
  });

  it('records sold, salePrice, usedInternally, and loss (spoiled) all independently', () => {
    const onAdd = vi.fn(() => true);
    const { container } = render(<DailyLogView units={units} logs={[]} inventory={inventory} onAdd={onAdd} onUpdate={noop} onRemove={noop} goTo={noop} />);
    fireEvent.click(screen.getByText(/Sold, used at home, spoiled or lost/));
    fireEvent.change(fieldByLabel(container, 'Sold (liters)'), { target: { value: '30' } });
    fireEvent.change(fieldByLabel(container, 'Price this time — optional'), { target: { value: '55' } });
    fireEvent.change(fieldByLabel(container, 'Used at home (liters)'), { target: { value: '3' } });
    fireEvent.change(fieldByLabel(container, 'Spoiled or lost (liters)'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save log entry' }));
    const [entry] = onAdd.mock.calls[0];
    expect(entry.sold).toBe(30);
    expect(entry.salePrice).toBe(55);
    expect(entry.usedInternally).toBe(3);
    expect(entry.loss).toBe(2);
  });
});

describe('DailyLogView — editing preserves and upgrades old-shape logs', () => {
  it('editing a log with the legacy single feedItemId/feedQuantity shows it as a stock-used row, expanded', () => {
    const oldLog = { id: 'l1', unitId: 'u1', date: '2026-08-01', produced: 40, feedItemId: 'i1', feedQuantity: 12, mortality: 0 };
    const { container } = render(<DailyLogView units={units} logs={[oldLog]} inventory={inventory} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    fireEvent.click(screen.getByLabelText('Edit entry'));
    expect(screen.getByLabelText('Stock item')).toHaveValue('i1');
    expect(screen.getByLabelText('Quantity used')).toHaveValue(12);
  });

  it('re-saving an edited legacy log upgrades it to the new consumedItems array', () => {
    const onUpdate = vi.fn(() => true);
    const oldLog = { id: 'l1', unitId: 'u1', date: '2026-08-01', produced: 40, feedItemId: 'i1', feedQuantity: 12, mortality: 0 };
    const { container } = render(<DailyLogView units={units} logs={[oldLog]} inventory={inventory} onAdd={noop} onUpdate={onUpdate} onRemove={noop} goTo={noop} />);
    fireEvent.click(screen.getByLabelText('Edit entry'));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    const [entry] = onUpdate.mock.calls[0];
    expect(entry.consumedItems).toEqual([{ itemId: 'i1', quantity: 12 }]);
  });

  it('editing a log that already tracks disposition opens that section automatically, pre-filled', () => {
    const trackedLog = { id: 'l1', unitId: 'u1', date: '2026-08-01', produced: 40, sold: 35, salePrice: 60, mortality: 0 };
    const { container } = render(<DailyLogView units={units} logs={[trackedLog]} inventory={inventory} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    fireEvent.click(screen.getByLabelText('Edit entry'));
    expect(fieldByLabel(container, 'Sold (liters)')).toHaveValue(35);
    expect(fieldByLabel(container, 'Price this time — optional')).toHaveValue(60);
  });

  it('editing a log that never tracked disposition leaves that section collapsed', () => {
    const untrackedLog = { id: 'l1', unitId: 'u1', date: '2026-08-01', produced: 40, mortality: 0 };
    const { container } = render(<DailyLogView units={units} logs={[untrackedLog]} inventory={inventory} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    fireEvent.click(screen.getByLabelText('Edit entry'));
    expect(screen.queryByText('Sold (liters)', { selector: 'label' })).not.toBeInTheDocument();
  });
});

describe('DailyLogView — recent entries list', () => {
  it('shows "sold" for a tracked entry, and a dash for an untracked one', () => {
    const logs = [
      { id: 'l1', unitId: 'u1', date: '2026-08-01', produced: 40, sold: 35, mortality: 0 },
      { id: 'l2', unitId: 'u1', date: '2026-08-02', produced: 38, mortality: 0 },
    ];
    const { container } = render(<DailyLogView units={units} logs={logs} inventory={inventory} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    expect(screen.getByText('35 sold')).toBeInTheDocument();
  });
});
