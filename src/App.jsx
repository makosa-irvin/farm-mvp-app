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

  function showToast(msg) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3800);
  }

  const farm = useFarmData(showToast);

  return (
    <div className="farm-app min-h-screen pb-16">
      <header className="sticky top-0 z-10 px-5 pt-5 pb-3" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
        <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="font-display text-2xl font-bold leading-none" style={{ color: 'var(--ink)' }}>Field Ledger</div>
            <div className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>Production &amp; input tracking — Phase 1 MVP</div>
          </div>
          <button onClick={() => window.location.reload()} className="btn-ghost rounded-xl px-3 py-2 text-sm flex items-center gap-2" title="Refresh the app. Saved records remain in this browser.">
            <RefreshCw size={15}/> Refresh
          </button>
        </div>
        <nav className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
          {TABS.map(t => { const Icon=t.icon; const active=tab===t.value; return <button key={t.value} onClick={()=>setTab(t.value)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors" style={{background:active?'var(--forest)':'transparent',color:active?'#fff':'var(--ink-soft)',border:active?'1px solid var(--forest)':'1px solid transparent'}}><Icon size={15} strokeWidth={2.25}/>{t.label}</button>; })}
        </nav>
      </header>
      <main className="px-5 pt-6 max-w-3xl mx-auto">
        {tab === 'dashboard' && <Dashboard {...farm} goTo={setTab} />}
        {tab === 'log' && <DailyLogView units={farm.units} logs={farm.logs} inventory={farm.inventory} getBalance={farm.getBalance} onAdd={farm.addLog} onUpdate={farm.updateLog} onRemove={farm.removeLog} goTo={setTab} />}
        {tab === 'expenses' && <ExpensesView units={farm.units} inventory={farm.inventory} expenses={farm.expenses} onAdd={farm.addExpense} onUpdate={farm.updateExpense} onRemove={farm.removeExpense} />}
        {tab === 'units' && <UnitsView units={farm.units} logs={farm.logs} onAdd={farm.addUnit} onUpdate={farm.updateUnit} onRemove={farm.removeUnit} />}
        {tab === 'analytics' && <AnalyticsView units={farm.units} logs={farm.logs} expenses={farm.expenses} inventoryMoves={farm.inventoryMoves} />}
        {tab === 'inventory' && <InventoryView units={farm.units} transactionTypes={farm.transactionTypes} inventory={farm.inventory} expenses={farm.expenses} moves={farm.inventoryMoves} onAddItem={farm.addInventoryItem} onUpdateItem={farm.updateInventoryItem} onRemoveItem={farm.removeInventoryItem} onAddMove={farm.addInventoryMove} onUpdateMove={farm.updateInventoryMove} onRemoveMove={farm.removeInventoryMove} getExpenseUnitCost={farm.getExpenseUnitCost} />}
      </main>
      <Toast message={toast} />
    </div>
  );
}
