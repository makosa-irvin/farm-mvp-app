import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DailyLogView from '../../src/views/DailyLogView.jsx';

const noop = () => {};
const units = [{ id: 'u1', name: 'Dairy Cows', type: 'milk' }];
const inventory = [
  { id: 'i1', name: 'Dairy Meal', category: 'Feed', unit: 'kg', openingStock: 100 },
  { id: 'i2', name: 'Dewormer', category: 'Medicine', unit: 'ml', openingStock: 50 },
];

// FieldLabel doesn't use real htmlFor/id association — a known, existing
// gap elsewhere in this project. Match the label text to its sibling
// input instead, the same workaround this project's other tests use.
function fieldByLabel(container, labelText) {
  const label = Array.from(container.querySelectorAll('label')).find((el) => el.textContent === labelText);
  return label?.parentElement.querySelector('input');
}

describe('DailyLogView — three independently-saved sections', () => {
  it('each section has its own Save button, not one shared button for everything', () => {
    render(<DailyLogView units={units} logs={[]} inventory={inventory} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    expect(screen.getByRole('button', { name: /Save production/ })).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Sold, used at home, spoiled or lost/));
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('saving production alone does not touch stock or disposition — each is a fully independent record', () => {
    const onAdd = vi.fn(() => true);
    const { container } = render(<DailyLogView units={units} logs={[]} inventory={inventory} onAdd={onAdd} onUpdate={noop} onRemove={noop} goTo={noop} />);
    fireEvent.change(fieldByLabel(container, 'Quantity produced (liters)'), { target: { value: '16' } });
    fireEvent.click(screen.getByRole('button', { name: /Save production/ }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    const [entry, , kind] = onAdd.mock.calls[0];
    expect(entry.produced).toBe(16);
    expect(entry.consumedItems).toBeUndefined();
    expect(kind).toBe('production');
  });

  it('a farmer can log a second production entry the same day without it overwriting the first (morning + evening milking)', () => {
    const onAdd = vi.fn(() => true);
    const { container } = render(<DailyLogView units={units} logs={[]} inventory={inventory} onAdd={onAdd} onUpdate={noop} onRemove={noop} goTo={noop} />);

    fireEvent.change(fieldByLabel(container, 'Quantity produced (liters)'), { target: { value: '16' } });
    fireEvent.click(screen.getByRole('button', { name: /Save production/ }));
    fireEvent.change(fieldByLabel(container, 'Quantity produced (liters)'), { target: { value: '11' } });
    fireEvent.click(screen.getByRole('button', { name: /Save production/ }));

    expect(onAdd).toHaveBeenCalledTimes(2);
    expect(onAdd.mock.calls[0][0].id).not.toBe(onAdd.mock.calls[1][0].id);
  });

  it('saving stock use creates its own record with a "stock" kind, independent of production', () => {
    const onAdd = vi.fn(() => true);
    render(<DailyLogView units={units} logs={[]} inventory={inventory} onAdd={onAdd} onUpdate={noop} onRemove={noop} goTo={noop} />);
    fireEvent.click(screen.getByText('+ Add stock used today'));
    fireEvent.change(screen.getByLabelText('Stock item'), { target: { value: 'i1' } });
    fireEvent.change(screen.getByLabelText('Quantity used'), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: /Save stock used/ }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    const [entry, , kind] = onAdd.mock.calls[0];
    expect(entry.consumedItems).toEqual([{ itemId: 'i1', quantity: 6 }]);
    expect(entry.produced).toBe(0);
    expect(kind).toBe('stock');
  });

  it('saving disposition creates its own record with a "disposition" kind, independent of production and stock', () => {
    const onAdd = vi.fn(() => true);
    render(<DailyLogView units={units} logs={[]} inventory={inventory} onAdd={onAdd} onUpdate={noop} onRemove={noop} goTo={noop} />);
    fireEvent.click(screen.getByText(/Sold, used at home, spoiled or lost/));
    fireEvent.change(screen.getByText('Sold (liters)', { selector: 'label' }).parentElement.querySelector('input'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    const [entry, , kind] = onAdd.mock.calls[0];
    expect(entry.sold).toBe(10);
    expect(entry.produced).toBe(0);
    expect(kind).toBe('disposition');
  });

  it('each section can have its own date, independent of the others', () => {
    const onAdd = vi.fn(() => true);
    const { container } = render(<DailyLogView units={units} logs={[]} inventory={inventory} onAdd={onAdd} onUpdate={noop} onRemove={noop} goTo={noop} />);
    fireEvent.click(screen.getByText(/Sold, used at home, spoiled or lost/));
    const dispositionDateInputs = container.querySelectorAll('input[type="date"]');
    expect(dispositionDateInputs.length).toBeGreaterThanOrEqual(2);
  });
});

describe('DailyLogView — reverse revenue calculation (money received -> estimated quantity)', () => {
  const unitsWithPrice = [{ id: 'u1', name: 'Dairy Cows', type: 'milk', producePrice: 70 }];

  it('estimates the sold quantity from money received at the usual price', () => {
    render(<DailyLogView units={unitsWithPrice} logs={[]} inventory={[]} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    fireEvent.click(screen.getByText(/Sold, used at home, spoiled or lost/));
    const moneyInput = screen.getByText('Not sure how much sold? Enter money received instead', { selector: 'label' }).parentElement.querySelector('input');
    fireEvent.change(moneyInput, { target: { value: '700' } });

    const soldInput = screen.getByText('Sold (liters)', { selector: 'label' }).parentElement.querySelector('input');
    expect(soldInput).toHaveValue(10);
    expect(screen.getByText(/estimated at/)).toBeInTheDocument();
  });

  it('uses a one-off custom price, not the usual price, when one is entered', () => {
    render(<DailyLogView units={unitsWithPrice} logs={[]} inventory={[]} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    fireEvent.click(screen.getByText(/Sold, used at home, spoiled or lost/));
    const priceInput = screen.getByText('Price this time — optional', { selector: 'label' }).parentElement.querySelector('input');
    fireEvent.change(priceInput, { target: { value: '50' } });
    const moneyInput = screen.getByText('Not sure how much sold? Enter money received instead', { selector: 'label' }).parentElement.querySelector('input');
    fireEvent.change(moneyInput, { target: { value: '500' } });

    const soldInput = screen.getByText('Sold (liters)', { selector: 'label' }).parentElement.querySelector('input');
    expect(soldInput).toHaveValue(10);
  });

  it('accounts for package size — the water/jerrican scenario', () => {
    const waterUnit = [{ id: 'u1', name: 'Water Kiosk', type: 'trading', producePrice: 10, customUnitLabel: 'litres', customGroupLabel: 'jerrican', customGroupSize: 20 }];
    render(<DailyLogView units={waterUnit} logs={[]} inventory={[]} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    fireEvent.click(screen.getByText(/Sold, used at home, spoiled or lost/));
    const moneyInput = screen.getByText('Not sure how much sold? Enter money received instead', { selector: 'label' }).parentElement.querySelector('input');
    fireEvent.change(moneyInput, { target: { value: '700' } });

    const soldInput = screen.getByText('Sold (litres)', { selector: 'label' }).parentElement.querySelector('input');
    expect(soldInput).toHaveValue(1400);
  });

  it('the estimate is still directly editable — the farmer can correct it', () => {
    render(<DailyLogView units={unitsWithPrice} logs={[]} inventory={[]} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    fireEvent.click(screen.getByText(/Sold, used at home, spoiled or lost/));
    const moneyInput = screen.getByText('Not sure how much sold? Enter money received instead', { selector: 'label' }).parentElement.querySelector('input');
    fireEvent.change(moneyInput, { target: { value: '700' } });

    const soldInput = screen.getByText('Sold (liters)', { selector: 'label' }).parentElement.querySelector('input');
    fireEvent.change(soldInput, { target: { value: '9' } });
    expect(soldInput).toHaveValue(9);
    expect(screen.queryByText(/estimated at/)).not.toBeInTheDocument();
  });

  it('does not estimate anything when no selling price is known at all', () => {
    const noPriceUnit = [{ id: 'u1', name: 'Dairy Cows', type: 'milk' }];
    render(<DailyLogView units={noPriceUnit} logs={[]} inventory={[]} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    fireEvent.click(screen.getByText(/Sold, used at home, spoiled or lost/));
    const moneyInput = screen.getByText('Not sure how much sold? Enter money received instead', { selector: 'label' }).parentElement.querySelector('input');
    fireEvent.change(moneyInput, { target: { value: '700' } });
    expect(screen.queryByText(/estimated at/)).not.toBeInTheDocument();
  });
});

describe('DailyLogView — produce balance hint', () => {
  it('shows how much is still unsold when opening the disposition section', () => {
    const logs = [{ id: 'l1', unitId: 'u1', date: '2026-08-01', produced: 180, mortality: 0 }];
    render(<DailyLogView units={units} logs={logs} inventory={inventory} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    fireEvent.click(screen.getByText(/Sold, used at home, spoiled or lost/));
    expect(screen.getByText(/180 liters produced but not yet sold/)).toBeInTheDocument();
  });

  it('does not show the hint when there is no unsold balance', () => {
    render(<DailyLogView units={units} logs={[]} inventory={inventory} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    fireEvent.click(screen.getByText(/Sold, used at home, spoiled or lost/));
    expect(screen.queryByText(/produced but not yet sold/)).not.toBeInTheDocument();
  });
});

describe('DailyLogView — the exact real-world bug this redesign fixes', () => {
  it('two same-day entries for the same group are shown distinctly, with times and notes visible', () => {
    const logs = [
      { id: 'l1', unitId: 'u1', date: '2026-08-26', produced: 16, loss: 5, mortality: 0, notes: 'Return 2', createdAt: new Date('2026-08-26T17:26:00').getTime() },
      { id: 'l2', unitId: 'u1', date: '2026-08-26', produced: 11, loss: 1, mortality: 0, notes: 'Delayed the milking time by 30', createdAt: new Date('2026-08-26T18:42:00').getTime() },
    ];
    render(<DailyLogView units={units} logs={logs} inventory={inventory} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    const table = document.querySelector('table');
    expect(table.textContent).toContain('Return 2');
    expect(table.textContent).toContain('Delayed the milking time by 30');
    expect(table.textContent).toMatch(/5:26 PM/);
    expect(table.textContent).toMatch(/6:42 PM/);
  });
});

describe('DailyLogView — separate entry tables (production / stock used / sold & disposition)', () => {
  const logs = [
    { id: 'l1', unitId: 'u1', date: '2026-08-01', produced: 20, mortality: 0 },
    { id: 'l2', unitId: 'u1', date: '2026-08-02', consumedItems: [{ itemId: 'i1', quantity: 6 }], produced: 0, mortality: 0 },
    { id: 'l3', unitId: 'u1', date: '2026-08-03', sold: 15, produced: 0, mortality: 0 },
  ];

  it('an entry appears only under the table matching what it actually contains', () => {
    render(<DailyLogView units={units} logs={logs} inventory={inventory} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    expect(document.querySelector('table').textContent).toContain('2026-08-01');
    expect(document.querySelector('table').textContent).not.toContain('2026-08-02');
  });

  it('switching to the Stock used tab shows only the stock entry', () => {
    render(<DailyLogView units={units} logs={logs} inventory={inventory} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /Stock used \(1\)/ }));
    expect(document.querySelector('table').textContent).toContain('2026-08-02');
    expect(document.querySelector('table').textContent).not.toContain('2026-08-01');
  });

  it('switching to the Sold & disposition tab shows only the disposition entry', () => {
    render(<DailyLogView units={units} logs={logs} inventory={inventory} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /Sold & disposition/ }));
    expect(document.querySelector('table').textContent).toContain('2026-08-03');
    expect(document.querySelector('table').textContent).toContain('15 sold');
  });

  it('an entry with no matching data at all shows an honest empty state, not a blank table', () => {
    render(<DailyLogView units={units} logs={[]} inventory={inventory} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    expect(screen.getByText('No production logged yet for this group.')).toBeInTheDocument();
  });
});

describe('DailyLogView — editing preserves data from the other sections on the same record', () => {
  it('editing just the production part of an old, all-in-one legacy entry does not wipe its stock/disposition data', () => {
    const onUpdate = vi.fn(() => true);
    const legacyEntry = {
      id: 'l1', unitId: 'u1', date: '2026-08-01', produced: 20, mortality: 0,
      feedItemId: 'i1', feedQuantity: 6, sold: 18,
    };
    const { container } = render(<DailyLogView units={units} logs={[legacyEntry]} inventory={inventory} onAdd={noop} onUpdate={onUpdate} onRemove={noop} goTo={noop} />);
    fireEvent.click(screen.getAllByLabelText('Edit entry')[0]);
    fireEvent.change(fieldByLabel(container, 'Quantity produced (liters)'), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    const [entry] = onUpdate.mock.calls[0];
    expect(entry.produced).toBe(25);
    expect(entry.feedItemId).toBe('i1');
    expect(entry.sold).toBe(18);
  });

  it('editing backward-compatible legacy stock data upgrades it to the new consumedItems array on save', () => {
    const onUpdate = vi.fn(() => true);
    const legacyEntry = { id: 'l1', unitId: 'u1', date: '2026-08-01', produced: 0, mortality: 0, feedItemId: 'i1', feedQuantity: 12 };
    render(<DailyLogView units={units} logs={[legacyEntry]} inventory={inventory} onAdd={noop} onUpdate={onUpdate} onRemove={noop} goTo={noop} />);
    fireEvent.click(screen.getAllByRole('button', { name: /Stock used/ })[1]);
    fireEvent.click(screen.getAllByLabelText('Edit entry')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    const [entry] = onUpdate.mock.calls[0];
    expect(entry.consumedItems).toEqual([{ itemId: 'i1', quantity: 12 }]);
  });
});

describe('DailyLogView — delete works across all three entry types', () => {
  it('does not crash when removing an entry with no stock use', () => {
    const onRemove = vi.fn();
    const logs = [{ id: 'l1', unitId: 'u1', date: '2026-08-01', produced: 20, mortality: 0 }];
    render(<DailyLogView units={units} logs={logs} inventory={inventory} onAdd={noop} onUpdate={noop} onRemove={onRemove} goTo={noop} />);
    fireEvent.click(screen.getAllByLabelText('Delete entry')[0]);
    expect(onRemove).toHaveBeenCalledWith('l1');
  });
});
