import Dashboard from '../views/Dashboard.jsx';
import DailyLogView from '../views/DailyLogView.jsx';
import ExpensesView from '../views/ExpensesView.jsx';
import UnitsView from '../views/UnitsView.jsx';
import AnalyticsView from '../views/AnalyticsView.jsx';
import InventoryView from '../views/InventoryView.jsx';

// Renders whichever view matches the active tab. `farm` is the full
// useFarmData() return value — Dashboard takes it wholesale via spread
// since it reads most of it; the other views destructure just the
// slice(s) and action(s) they actually need, spelled out explicitly so
// it's clear at a glance what each view depends on.
export default function MainContent({ tab, farm, setTab }) {
  return (
    <main className="px-5 pt-6 max-w-3xl mx-auto">
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
        <UnitsView units={farm.units} logs={farm.logs} onAdd={farm.addUnit} onUpdate={farm.updateUnit} onRemove={farm.removeUnit} />
      )}

      {tab === 'analytics' && (
        <AnalyticsView units={farm.units} logs={farm.logs} expenses={farm.expenses} inventory={farm.inventory} inventoryMoves={farm.inventoryMoves} />
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
  );
}
