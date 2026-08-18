import { Plus, Tag, Boxes, AlertTriangle, CheckCircle2 } from 'lucide-react';
import StatCard from '../components/StatCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { typeOf, todayISO, inPeriod, fmtNum, fmtMoney, unitMetrics, inventoryUnitCost } from '../lib/helpers.js';

export default function Dashboard({ units, logs, expenses, inventory = [], inventoryMoves = [], goTo }) {
  if (units.length === 0) {
    return (
      <EmptyState
        icon={Tag}
        title="No farm groups yet"
        body="Add your first flock, herd, or plot to start recording what it produces and what it costs."
        actionLabel="Add group"
        onAction={() => goTo('units')}
      />
    );
  }

  const today = todayISO();
  const todayLogs = logs.filter((log) => log.date === today);
  const producedToday = todayLogs.reduce((sum, log) => sum + (Number(log.produced) || 0), 0);
  const mortalityToday = todayLogs.reduce((sum, log) => sum + (Number(log.mortality) || 0), 0);

  const moneyPaidThisMonth = expenses
    .filter((expense) => inPeriod(expense.date, 'month') && !expense.inventoryTransactionId)
    .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);

  const farmCostsThisMonth = expenses
    .filter((expense) => inPeriod(expense.date, 'month'))
    .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);

  const getInventoryBalance = (item) => {
    const movementBalance = inventoryMoves
      .filter((move) => move.itemId === item.id)
      .reduce((sum, move) => sum + ((move.direction || move.type) === 'in' ? Number(move.quantity) : -Number(move.quantity)), 0);
    return (Number(item.openingStock) || 0) + movementBalance;
  };

  const inventoryValue = inventory.reduce((sum, item) => Math.max(0, getInventoryBalance(item)) * inventoryUnitCost(item, inventoryMoves) + sum, 0);
  const lowStockItems = inventory.filter((item) => getInventoryBalance(item) <= (Number(item.reorderLevel) || 0));
  const recentLosses = inventoryMoves.filter((move) => move.transactionType === 'wastage' && inPeriod(move.date, 'week')).length;

  return (
    <div className="space-y-6">
      <section>
        <div className="font-display text-2xl font-semibold">Good day 👋</div>
        <div className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
          Here is what needs your attention today.
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3.5">
        <StatCard label="Farm groups" value={fmtNum(units.length)} sub={`${todayLogs.length} logged today`} />
        <StatCard label="Produced today" value={fmtNum(producedToday)} sub={mortalityToday > 0 ? `${mortalityToday} losses today` : 'No losses today'} accent="var(--forest)" />
        <StatCard label="Money paid" value={fmtMoney(moneyPaidThisMonth)} sub="This month" />
        <StatCard label="Farm costs" value={fmtMoney(farmCostsThisMonth)} sub="Money paid + stock used/lost" accent="var(--amber)" />
        <StatCard label="Stock value" value={fmtMoney(inventoryValue)} sub={lowStockItems.length ? `${lowStockItems.length} item${lowStockItems.length > 1 ? 's' : ''} running low` : 'Nothing running low'} accent={lowStockItems.length ? 'var(--rust)' : 'var(--forest)'} />
      </div>

      {(lowStockItems.length > 0 || recentLosses > 0) && (
        <section className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <div className="font-display text-lg font-semibold">Needs your attention</div>
          <div className="mt-3 space-y-2">
            {lowStockItems.slice(0, 4).map((item) => (
              <button key={item.id} type="button" onClick={() => goTo('inventory')} className="w-full flex items-center gap-3 rounded-xl p-3 text-left" style={{ background: 'var(--rust-tint)' }}>
                <AlertTriangle size={18} style={{ color: 'var(--rust)' }} />
                <span className="text-sm"><strong>{item.name}</strong> is running low. Check your stock.</span>
              </button>
            ))}
            {recentLosses > 0 && (
              <button type="button" onClick={() => goTo('inventory')} className="w-full flex items-center gap-3 rounded-xl p-3 text-left" style={{ background: 'var(--amber-tint)' }}>
                <AlertTriangle size={18} style={{ color: 'var(--amber)' }} />
                <span className="text-sm"><strong>{recentLosses} stock loss{recentLosses > 1 ? 'es' : ''}</strong> recorded this week.</span>
              </button>
            )}
          </div>
        </section>
      )}

      {lowStockItems.length === 0 && recentLosses === 0 && (
        <div className="flex items-center gap-3 rounded-2xl p-4" style={{ background: 'var(--forest-tint)', color: 'var(--forest-dark)' }}>
          <CheckCircle2 size={20} />
          <span className="text-sm font-medium">Nothing needs your attention right now.</span>
        </div>
      )}

      <section className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="font-display text-lg font-semibold">Quick actions</div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => goTo('log')} className="btn-primary flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm"><Plus size={16} /> Log today</button>
          <button type="button" onClick={() => goTo('inventory')} className="btn-ghost flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm"><Plus size={16} /> Update stock</button>
          <button type="button" onClick={() => goTo('expenses')} className="btn-ghost flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm"><Plus size={16} /> Record money</button>
          <button type="button" onClick={() => goTo('units')} className="btn-ghost flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm"><Plus size={16} /> Add group</button>
        </div>
      </section>

      <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-display text-lg font-semibold">Stock</div>
            <div className="mt-1 text-xs" style={{ color: 'var(--ink-soft)' }}>{inventory.length} tracked item{inventory.length !== 1 ? 's' : ''}</div>
          </div>
          <button type="button" onClick={() => goTo('inventory')} className="btn-ghost flex items-center gap-2 rounded-xl px-3 py-2 text-sm"><Boxes size={15} /> Manage</button>
        </div>
      </div>

      <div className="text-xs leading-5" style={{ color: 'var(--ink-soft)' }}>
        <strong>Farm costs</strong> include things the farm has used or lost, even when you paid for them earlier. This keeps your farm's true costs separate from the money you paid today.
      </div>
    </div>
  );
}
