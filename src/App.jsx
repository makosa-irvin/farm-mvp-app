import { useRef, useState } from 'react';
import { TABS } from './constants.js';
import { usePersistentState } from './lib/usePersistentState.js';
import { fmtNum, typeOf } from './lib/helpers.js';
import Toast from './components/Toast.jsx';
import Dashboard from './views/Dashboard.jsx';
import DailyLogView from './views/DailyLogView.jsx';
import ExpensesView from './views/ExpensesView.jsx';
import UnitsView from './views/UnitsView.jsx';
import AnalyticsView from './views/AnalyticsView.jsx';

export default function App() {
  const [units, setUnits] = usePersistentState('farm-units', []);
  const [logs, setLogs] = usePersistentState('farm-logs', []);
  const [expenses, setExpenses] = usePersistentState('farm-expenses', []);
  const [tab, setTab] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  function showToast(msg) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3800);
  }

  function addUnit(u) {
    setUnits((prev) => [...prev, u]);
    showToast(`${u.name} added — ready to log production.`);
  }

  function removeUnit(id) {
    setUnits((prev) => prev.filter((u) => u.id !== id));
    setLogs((prev) => prev.filter((l) => l.unitId !== id));
    setExpenses((prev) => prev.map((e) => (e.unitId === id ? { ...e, unitId: null } : e)));
  }

  function addLog(entry, unit) {
    const t = typeOf(unit);
    const recentBest = logs
      .filter((l) => l.unitId === unit.id && l.date !== entry.date)
      .reduce((max, l) => Math.max(max, l.produced || 0), 0);
    const isBest = entry.produced > 0 && entry.produced > recentBest;
    setLogs((prev) => [...prev, entry]);
    showToast(`${fmtNum(entry.produced)} ${t.unitLabel} logged for ${unit.name}${isBest ? ' — best entry yet.' : '.'}`);
  }

  function removeLog(id) {
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  function addExpense(e) {
    setExpenses((prev) => [...prev, e]);
    showToast(`${e.amount.toLocaleString(undefined, { style: 'currency', currency: 'KSH' })} expense logged.`);
  }

  function removeExpense(id) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="farm-app min-h-screen pb-16">
      <header className="sticky top-0 z-10 px-5 pt-5 pb-3" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
        <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="font-display text-2xl font-bold leading-none" style={{ color: 'var(--ink)' }}>Field Ledger</div>
            <div className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>Production &amp; input tracking — Phase 1 MVP</div>
          </div>
        </div>
        <nav className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
                style={{
                  background: active ? 'var(--forest)' : 'transparent',
                  color: active ? '#fff' : 'var(--ink-soft)',
                  border: active ? '1px solid var(--forest)' : '1px solid transparent',
                }}
              >
                <Icon size={15} strokeWidth={2.25} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="px-5 pt-6 max-w-3xl mx-auto">
        {tab === 'dashboard' && <Dashboard units={units} logs={logs} expenses={expenses} goTo={setTab} />}
        {tab === 'log' && <DailyLogView units={units} logs={logs} onAdd={addLog} onRemove={removeLog} goTo={setTab} />}
        {tab === 'expenses' && <ExpensesView units={units} expenses={expenses} onAdd={addExpense} onRemove={removeExpense} />}
        {tab === 'units' && <UnitsView units={units} logs={logs} onAdd={addUnit} onRemove={removeUnit} />}
        {tab === 'analytics' && <AnalyticsView units={units} logs={logs} expenses={expenses} />}
      </main>

      <Toast message={toast} />
    </div>
  );
}
