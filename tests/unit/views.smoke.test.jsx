import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    expect(screen.getByText('Add a farm group')).toBeInTheDocument();
  });

  it('ExpensesView', () => {
    render(<ExpensesView units={[]} inventory={[]} expenses={[]} onAdd={noop} onUpdate={noop} onRemove={noop} />);
    expect(screen.getByText('Record money spent')).toBeInTheDocument();
  });

  it('InventoryView', () => {
    render(
      <InventoryView
        units={[]}
        inventory={[]}
        expenses={[]}
        moves={[]}
        transactionTypes={INVENTORY_TRANSACTION_TYPES}
        onAddItem={noop}
        onUpdateItem={noop}
        onRemoveItem={noop}
        onAddMove={noop}
        onUpdateMove={noop}
        onRemoveMove={noop}
        getExpenseUnitCost={noop}
      />,
    );
    expect(screen.getByText('Nothing tracked yet')).toBeInTheDocument();
  });

  it('DailyLogView with no units shows the empty state instead of the form', () => {
    render(<DailyLogView units={[]} logs={[]} inventory={[]} onAdd={noop} onUpdate={noop} onRemove={noop} goTo={noop} />);
    expect(screen.getByText('Add a farm group before logging')).toBeInTheDocument();
  });

  it('Dashboard with no units shows the empty state', () => {
    render(<Dashboard units={[]} logs={[]} expenses={[]} inventory={[]} inventoryMoves={[]} goTo={noop} />);
    expect(screen.getByText('No farm groups yet')).toBeInTheDocument();
  });

  it('AnalyticsView with no units shows the empty state', () => {
    render(<AnalyticsView units={[]} logs={[]} expenses={[]} inventoryMoves={[]} />);
    expect(screen.getByText('Nothing to look at yet')).toBeInTheDocument();
  });
});

describe('the fields the E2E suite depends on actually exist', () => {
  // These mirror what tests/e2e/inventory-linking.spec.js drives through a
  // real browser. If a label or option text changes and breaks the E2E
  // locators, this (much faster) test should catch it first.

  it('UnitsView exposes a "What should we call it?" field and "Add group" button', () => {
    render(<UnitsView units={[]} logs={[]} onAdd={noop} onUpdate={noop} onRemove={noop} />);
    const label = screen.getByText('What should we call it?', { selector: 'label' });
    expect(label.parentElement.querySelector('input')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add group' })).toBeInTheDocument();
  });

  it('InventoryView exposes "Item name"/"Category"/"Unit" fields and lists items with their balance', () => {
    const inventory = [{ id: 'i1', name: 'Layer Mash', category: 'Feed', unit: 'kg', openingStock: 150, reorderLevel: 20, unitCost: 0 }];
    render(
      <InventoryView
        units={[]}
        inventory={inventory}
        expenses={[]}
        moves={[]}
        transactionTypes={INVENTORY_TRANSACTION_TYPES}
        onAddItem={noop}
        onUpdateItem={noop}
        onRemoveItem={noop}
        onAddMove={noop}
        onUpdateMove={noop}
        onRemoveMove={noop}
        getExpenseUnitCost={noop}
      />,
    );
    expect(screen.getByText('Item name', { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByText('Layer Mash')).toBeInTheDocument();
    expect(screen.getByText('150.0 kg')).toBeInTheDocument(); // the balance the E2E test asserts on
  });

  it('ExpensesView exposes the inventory-link fields with the option label format the E2E test selects by', () => {
    const inventory = [{ id: 'i1', name: 'Layer Mash', unit: 'kg' }];
    render(<ExpensesView units={[]} inventory={inventory} expenses={[]} onAdd={noop} onUpdate={noop} onRemove={noop} />);
    expect(screen.getByText('Did you buy stock? (optional)', { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Layer Mash (kg)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
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

describe('InventoryView — progressive disclosure for stock updates', () => {
  const inventory = [{ id: 'i1', name: 'Layer Mash', category: 'Feed', unit: 'kg', openingStock: 100, reorderLevel: 20, unitCost: 50 }];
  const baseProps = {
    units: [],
    inventory,
    expenses: [],
    moves: [],
    transactionTypes: INVENTORY_TRANSACTION_TYPES,
    onAddItem: noop,
    onUpdateItem: noop,
    onRemoveItem: noop,
    onAddMove: noop,
    onUpdateMove: noop,
    onRemoveMove: noop,
    getExpenseUnitCost: noop,
  };

  it('shows the two common-action buttons by default, not the full type picker', () => {
    render(<InventoryView {...baseProps} />);
    expect(screen.getByRole('button', { name: /I bought stock/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /I used stock/ })).toBeInTheDocument();
    // The advanced dropdown (9 transaction types) shouldn't be present yet.
    expect(screen.queryByText('Lost or spoiled')).not.toBeInTheDocument();
  });

  it('reveals the full type picker after "Something else?" is clicked', () => {
    render(<InventoryView {...baseProps} />);
    fireEvent.click(screen.getByText(/Something else\?/));
    expect(screen.getByRole('option', { name: 'Lost or spoiled' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Bought stock' })).toBeInTheDocument();
    // Can toggle back to the simple view.
    fireEvent.click(screen.getByText('Back to common options'));
    expect(screen.getByRole('button', { name: /I bought stock/ })).toBeInTheDocument();
  });
});

describe('ExpensesView — expandable rows with optional detail', () => {
  const units = [{ id: 'u1', name: 'Layer House A' }];
  const expenses = [
    {
      id: 'e1',
      category: 'feed',
      amount: 500,
      date: '2026-08-10',
      unitId: 'u1',
      description: 'Layer mash',
      supplier: 'Wanjiku Agrovet',
      paymentMethod: 'mpesa',
      inventoryItemId: null,
      inventoryQuantity: null,
      createdAt: 1,
    },
    {
      id: 'e2',
      category: 'labor',
      amount: 200,
      date: '2026-08-09',
      unitId: null,
      description: '',
      supplier: null,
      paymentMethod: null,
      inventoryItemId: null,
      inventoryQuantity: null,
      createdAt: 2,
    },
  ];

  it('detail is hidden until the row is clicked', () => {
    render(<ExpensesView units={units} inventory={[]} expenses={expenses} onAdd={() => {}} onUpdate={() => {}} onRemove={() => {}} />);
    expect(screen.queryByText('Wanjiku Agrovet')).not.toBeInTheDocument();
  });

  it('clicking a row reveals its supplier and payment method', () => {
    render(<ExpensesView units={units} inventory={[]} expenses={expenses} onAdd={() => {}} onUpdate={() => {}} onRemove={() => {}} />);
    // 'M-Pesa' already exists once as a <option> in the form's "Paid by"
    // dropdown regardless of expansion state — expanding the row should
    // add a second occurrence in the detail panel.
    expect(screen.getAllByText('M-Pesa')).toHaveLength(1);
    fireEvent.click(screen.getAllByText('KSh 500')[0].closest('tr'));
    expect(screen.getByText('Wanjiku Agrovet')).toBeInTheDocument();
    expect(screen.getAllByText('M-Pesa')).toHaveLength(2);
  });

  it('clicking the same row again collapses it', () => {
    render(<ExpensesView units={units} inventory={[]} expenses={expenses} onAdd={() => {}} onUpdate={() => {}} onRemove={() => {}} />);
    const row = screen.getAllByText('KSh 500')[0].closest('tr');
    fireEvent.click(row);
    expect(screen.getByText('Wanjiku Agrovet')).toBeInTheDocument();
    fireEvent.click(row);
    expect(screen.queryByText('Wanjiku Agrovet')).not.toBeInTheDocument();
  });

  it('an expense with no extra detail says so, rather than showing an empty panel', () => {
    render(<ExpensesView units={units} inventory={[]} expenses={expenses} onAdd={() => {}} onUpdate={() => {}} onRemove={() => {}} />);
    fireEvent.click(screen.getAllByText('KSh 200')[0].closest('tr'));
    expect(screen.getByText('No extra detail recorded.')).toBeInTheDocument();
  });

  it('clicking Edit or Delete inside a row does not also toggle the row expansion', () => {
    const onRemove = () => {};
    render(<ExpensesView units={units} inventory={[]} expenses={expenses} onAdd={() => {}} onUpdate={() => {}} onRemove={onRemove} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Edit expense' })[0]);
    // Editing scrolls to the form and populates it, but should not have
    // also expanded the row's detail panel as a side effect of the click.
    expect(screen.queryByText('Wanjiku Agrovet')).not.toBeInTheDocument();
  });

  it('the supplier and payment method fields are optional, not required', () => {
    render(<ExpensesView units={units} inventory={[]} expenses={[]} onAdd={() => {}} onUpdate={() => {}} onRemove={() => {}} />);
    expect(screen.getByPlaceholderText('e.g. local agrovet')).not.toBeRequired();
  });
});

describe('UnitsView — expandable mini-analytics snapshot', () => {
  const units = [{ id: 'u1', name: 'Layer House A', type: 'eggs', initialCount: 100, startDate: '2026-08-01', producePrice: 0 }];
  const logs = [{ id: 'l1', unitId: 'u1', date: '2026-08-10', produced: 30, mortality: 0 }];
  const expenses = [{ id: 'e1', unitId: 'u1', date: '2026-08-10', category: 'feed', amount: 150, inventoryItemId: null }];

  it('the snapshot is hidden until the unit row is clicked', () => {
    render(
      <UnitsView
        units={units}
        logs={logs}
        expenses={expenses}
        inventoryMoves={[]}
        onAdd={() => {}}
        onUpdate={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(screen.queryByText('This month so far')).not.toBeInTheDocument();
  });

  it('clicking the unit row reveals produced/spent/cost-per-unit for this month', () => {
    render(
      <UnitsView
        units={units}
        logs={logs}
        expenses={expenses}
        inventoryMoves={[]}
        onAdd={() => {}}
        onUpdate={() => {}}
        onRemove={() => {}}
      />,
    );
    fireEvent.click(screen.getByText('Layer House A'));
    expect(screen.getByText('This month so far')).toBeInTheDocument();
    expect(screen.getByText('Cost per unit')).toBeInTheDocument(); // no producePrice set on this unit, so cost/unit shows instead of profit
  });

  it('shows Profit instead of Cost/unit once the unit has a selling price', () => {
    const pricedUnits = [{ ...units[0], producePrice: 20 }];
    render(
      <UnitsView
        units={pricedUnits}
        logs={logs}
        expenses={expenses}
        inventoryMoves={[]}
        onAdd={() => {}}
        onUpdate={() => {}}
        onRemove={() => {}}
      />,
    );
    fireEvent.click(screen.getByText('Layer House A'));
    expect(screen.getByText('Estimated surplus')).toBeInTheDocument();
  });

  it('clicking Edit or Remove does not also toggle the snapshot', () => {
    render(
      <UnitsView
        units={units}
        logs={logs}
        expenses={expenses}
        inventoryMoves={[]}
        onAdd={() => {}}
        onUpdate={() => {}}
        onRemove={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit Layer House A' }));
    expect(screen.queryByText('This month so far')).not.toBeInTheDocument();
  });

  it('a "see full analytics" link navigates to the Analytics tab when provided', () => {
    let navigated = false;
    render(
      <UnitsView
        units={units}
        logs={logs}
        expenses={expenses}
        inventoryMoves={[]}
        onAdd={() => {}}
        onUpdate={() => {}}
        onRemove={() => {}}
        onNavigateToAnalytics={() => {
          navigated = true;
        }}
      />,
    );
    fireEvent.click(screen.getByText('Layer House A'));
    fireEvent.click(screen.getByText('See more results'));
    expect(navigated).toBe(true);
  });
});

describe('Dashboard — "Today" produced stat does not sum across mismatched units', () => {
  // Regression test for a confirmed bug: the "Produced today" stat summed
  // raw quantities across every log entry today regardless of unit type -
  // adding "30 eggs" to "20 liters of milk" into one meaningless number.
  it('sums normally when every log entry today is the same production type', () => {
    const units = [
      { id: 'u1', name: 'Layer House A', type: 'eggs', initialCount: 100, startDate: '2026-08-01', producePrice: 0 },
      { id: 'u2', name: 'Layer House B', type: 'eggs', initialCount: 100, startDate: '2026-08-01', producePrice: 0 },
    ];
    const today = new Date().toISOString().slice(0, 10);
    const logs = [
      { unitId: 'u1', date: today, produced: 30, mortality: 0 },
      { unitId: 'u2', date: today, produced: 20, mortality: 0 },
    ];
    render(<Dashboard units={units} logs={logs} expenses={[]} inventory={[]} inventoryMoves={[]} goTo={() => {}} />);
    expect(screen.getByText('50')).toBeInTheDocument(); // 30 + 20 eggs — a meaningful sum
    expect(screen.getAllByText('eggs').length).toBeGreaterThan(0);
  });

  it('falls back to a count of kinds logged, never a mixed-unit sum, when types differ', () => {
    const units = [
      { id: 'u1', name: 'Layer House A', type: 'eggs', initialCount: 100, startDate: '2026-08-01', producePrice: 0 },
      { id: 'u2', name: 'Dairy Herd', type: 'milk', initialCount: 10, startDate: '2026-08-01', producePrice: 0 },
    ];
    const today = new Date().toISOString().slice(0, 10);
    const logs = [
      { unitId: 'u1', date: today, produced: 30, mortality: 0 }, // 30 eggs
      { unitId: 'u2', date: today, produced: 20, mortality: 0 }, // 20 liters
    ];
    render(<Dashboard units={units} logs={logs} expenses={[]} inventory={[]} inventoryMoves={[]} goTo={() => {}} />);
    // Must never show "50" here — that would be eggs + liters added together.
    expect(screen.queryByText('50')).not.toBeInTheDocument();
    expect(screen.getByText('Logged today')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // 2 kinds of produce logged
  });
});

describe('Dashboard — "Farm costs" is an accrual figure, not the purchase price', () => {
  // Regression test for a confirmed bug: "Farm costs this month" summed
  // the expenses array directly, which double-counted a stock purchase's
  // full price the moment it was bought while also missing the true
  // consumption cost for anything used through Daily Log (only a manual
  // Stock deduction auto-creates a matching expense entry — see
  // buildInventoryCostExpense in inventoryActions.js — so day-to-day feed
  // logging was invisible to this figure entirely).
  it('shows only the value actually consumed, not the full purchase price, when a large batch is used gradually', () => {
    const today = new Date().toISOString().slice(0, 10);
    const units = [{ id: 'u1', name: 'Layer House A', type: 'eggs', initialCount: 100, startDate: today, producePrice: 0 }];
    // Bought 50kg of feed for KSh 3500 (70/kg) — but only 5kg has been
    // used so far via a real daily log, exactly like a farmer would do.
    const expenses = [
      {
        id: 'e1',
        category: 'feed',
        amount: 3500,
        date: today,
        unitId: null,
        inventoryItemId: 'i1',
        inventoryQuantity: 50,
        description: '',
        supplier: null,
        paymentMethod: null,
      },
    ];
    const inventoryMoves = [
      {
        id: 'exppurchase_e1',
        itemId: 'i1',
        transactionType: 'purchase',
        direction: 'in',
        type: 'in',
        quantity: 50,
        unit: 'kg',
        unitCost: 70,
        date: today,
        source: 'expense-purchase',
        sourceId: 'e1',
        expenseId: 'e1',
      },
      {
        id: 'logfeed_l1',
        itemId: 'i1',
        transactionType: 'consumption',
        direction: 'out',
        type: 'out',
        quantity: 5,
        unit: 'kg',
        unitCost: 70,
        date: today,
        source: 'daily-log',
        sourceId: 'l1',
        unitId: 'u1',
      },
    ];

    render(<Dashboard units={units} logs={[]} expenses={expenses} inventory={[]} inventoryMoves={inventoryMoves} goTo={() => {}} />);

    // 5kg * KSh 70/kg = KSh 350 actually used — the "Farm costs" figure
    // should show this, not the full KSh 3,500 purchase price. "Money
    // spent" (the separate cash-flow figure) correctly still shows the
    // full KSh 3,500 — that one's about cash leaving hand, not accrual,
    // so both figures being different is the point, not a contradiction.
    const farmCostsLabel = screen.getByText('Farm costs', { selector: 'div' });
    const farmCostsValue = farmCostsLabel.parentElement.querySelector('.font-mono');
    expect(farmCostsValue).toHaveTextContent('KSh 350');

    // "Money spent" appears twice on this screen — today's stat and this
    // month's — both correctly show the full purchase price here, since
    // the test expense is dated today.
    const moneySpentLabels = screen.getAllByText('Money spent', { selector: 'div' });
    const moneySpentValues = moneySpentLabels.map((label) => label.parentElement.querySelector('.font-mono')?.textContent);
    expect(moneySpentValues).toContain('KSh 3,500');
  });
});

describe('Dashboard — no longer has its own duplicate attention section', () => {
  // Regression test: Dashboard used to render its own "Needs your
  // attention" box (low stock + wastage losses) that overlapped almost
  // entirely with the newer, more comprehensive FarmAlerts.jsx component
  // (which MainContent.jsx renders directly above Dashboard). Confirmed
  // via git diff that Dashboard.jsx was never touched when FarmAlerts was
  // added, so a farmer saw two separately-styled boxes repeating the same
  // low-stock/loss information. Dashboard's own copy was removed; this
  // guards against it quietly coming back.
  it('never renders "Needs your attention" even when stock is genuinely low', () => {
    const units = [{ id: 'u1', name: 'Layer House A', type: 'eggs', initialCount: 100, startDate: '2026-08-01', producePrice: 0 }];
    const inventory = [{ id: 'i1', name: 'Layer Mash', category: 'Feed', unit: 'kg', openingStock: 5, reorderLevel: 20, unitCost: 50 }];
    render(<Dashboard units={units} logs={[]} expenses={[]} inventory={inventory} inventoryMoves={[]} goTo={() => {}} />);
    expect(screen.queryByText('Needs your attention')).not.toBeInTheDocument();
  });
});
