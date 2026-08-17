import { useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { TABS } from './constants.js';
import { useFarmData } from './hooks/useFarmData.js';
import Toast from './components/Toast.jsx';
import Dashboard from './views/Dashboard.jsx';
import DailyLogView from './views/DailyLogView.jsx';
import ExpensesView from './views/ExpensesView.jsx';
import UnitsView from './views/UnitsView.jsx';
import AnalyticsView from './views/AnalyticsView.jsx';
import InventoryView from './views/InventoryView.jsx';

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = (message) => {
    setToast(message);

    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    toastTimer.current = setTimeout(() => setToast(null), 3800);
  };

  const farm = useFarmData(showToast);

  // App owns navigation only. Feature behavior stays in the views and the
  // farm hook, keeping this component as the composition boundary.
  return (
    <div className="farm-app min-h-screen pb-16">
      <header
        className="sticky top-0 z-10 px-5 pb-3 pt-5"
        style={{
          background: 'var(--bg)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div
              className="font-display text-2xl font-bold leading-none"
              style={{ color: 'var(--ink)' }}
            >
              Field Ledger
            </div>
            <div
              className="mt-1 text-xs"
              style={{ color: 'var(--ink-soft)' }}
            >
              Production &amp; input tracking — Phase 1 MVP
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-ghost flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
            title="Refresh the app. Saved records remain in this browser."
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        <nav
          className="flex gap-1.5 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'thin' }}
          aria-label="Primary navigation"
        >
          {TABS.map(({ icon: Icon, value, label }) => {
            const active = tab === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors"
                style={{
                  background: active ? 'var(--forest)' : 'transparent',
                  color: active ? '#fff' : 'var(--ink-soft)',
                  border: active
                    ? '1px solid var(--forest)'
                    : '1px solid transparent',
                }}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={15} strokeWidth={2.25} />
                {label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-5 pt-6">
        {tab === 'dashboard' && <Dashboard {...farm} goTo={setTab} />}

        {tab === 'log' && (
          <DailyLogView
            units={farm.units}
            logs={farm.logs}
            inventory={farm.inventory}
            getBalance={farm.getBalance}
            onAdd={farm.addLog}
            onUpdate={farm.updateLog}
            onRemove={farm.removeLog}
            goTo={setTab}
          />
        )}

        {tab === 'expenses' && (
          <ExpensesView
            units={farm.units}
            inventory={farm.inventory}
            expenses={farm.expenses}
            onAdd={farm.addExpense}
            onUpdate={farm.updateExpense}
            onRemove={farm.removeExpense}
          />
        )}

        {tab === 'units' && (
          <UnitsView
            units={farm.units}
            logs={farm.logs}
            onAdd={farm.addUnit}
            onUpdate={farm.updateUnit}
            onRemove={farm.removeUnit}
          />
        )}

        {tab === 'analytics' && (
          <AnalyticsView
            units={farm.units}
            logs={farm.logs}
            expenses={farm.expenses}
            inventoryMoves={farm.inventoryMoves}
          />
        )}

        {tab === 'inventory' && (
          <InventoryView
            units={farm.units}
            transactionTypes={farm.transactionTypes}
            inventory={farm.inventory}
            expenses={farm.expenses}
            moves={farm.inventoryMoves}
            onAddItem={farm.addInventoryItem}
            onUpdateItem={farm.updateInventoryItem}
            onRemoveItem={farm.removeInventoryItem}
            onAddMove={farm.addInventoryMove}
            onUpdateMove={farm.updateInventoryMove}
            onRemoveMove={farm.removeInventoryMove}
            getExpenseUnitCost={farm.getExpenseUnitCost}
          />
        )}
      </main>

      <Toast message={toast} />
    </div>
  );
}
