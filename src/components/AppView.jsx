import Dashboard from '../views/Dashboard.jsx';
import DailyLogView from '../views/DailyLogView.jsx';
import ExpensesView from '../views/ExpensesView.jsx';
import UnitsView from '../views/UnitsView.jsx';
import AnalyticsView from '../views/AnalyticsView.jsx';
import InventoryView from '../views/InventoryView.jsx';

export default function AppView({ tab, farm, onNavigate }) {
  switch (tab) {
    case 'dashboard':
      return <Dashboard {...farm} goTo={onNavigate} />;

    case 'log':
      return (
        <DailyLogView
          units={farm.units}
          logs={farm.logs}
          inventory={farm.inventory}
          getBalance={farm.getBalance}
          onAdd={farm.addLog}
          onUpdate={farm.updateLog}
          onRemove={farm.removeLog}
          goTo={onNavigate}
        />
      );

    case 'expenses':
      return (
        <ExpensesView
          units={farm.units}
          inventory={farm.inventory}
          expenses={farm.expenses}
          onAdd={farm.addExpense}
          onUpdate={farm.updateExpense}
          onRemove={farm.removeExpense}
        />
      );

    case 'units':
      return (
        <UnitsView
          units={farm.units}
          logs={farm.logs}
          onAdd={farm.addUnit}
          onUpdate={farm.updateUnit}
          onRemove={farm.removeUnit}
        />
      );

    case 'analytics':
      return (
        <AnalyticsView
          units={farm.units}
          logs={farm.logs}
          expenses={farm.expenses}
          inventoryMoves={farm.inventoryMoves}
        />
      );

    case 'inventory':
      return (
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
      );

    default:
      return <Dashboard {...farm} goTo={onNavigate} />;
  }
}
