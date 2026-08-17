import { Plus, Tag, Boxes } from 'lucide-react';
import StatCard from '../components/StatCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { typeOf, todayISO, inPeriod, fmtNum, fmtMoney, unitMetrics, inventoryUnitCost } from '../lib/helpers.js';

export default function Dashboard({ units, logs, expenses, inventory = [], inventoryMoves = [], goTo }) {
  if (units.length === 0) {
    return (
      <EmptyState
        icon={Tag}
        title="No production units yet"
        body="Add your first flock, herd, or plot to start logging daily production and costs against it."
        actionLabel="Add a production unit"
        onAction={() => goTo('units')}
      />
    );
  }

  const todayLogs = logs.filter((l) => l.date === todayISO());
  const producedToday = todayLogs.reduce((s, l) => s + (l.produced || 0), 0);
  const mortalityToday = todayLogs.reduce((s, l) => s + (l.mortality || 0), 0);
  const directCostsMTD = expenses
    .filter((e) => e.unitId && inPeriod(e.date, 'month'))
    .reduce((s, e) => s + (e.amount || 0), 0);
  const unallocatedMTD = expenses
    .filter((e) => !e.unitId && inPeriod(e.date, 'month'))
    .reduce((s, e) => s + (e.amount || 0), 0);
  const inventoryValue = inventory.reduce((sum, item) => {
    const balance = (item.openingStock || 0) + inventoryMoves.filter((m) => m.itemId === item.id).reduce((s, m) => s + ((m.direction || m.type) === 'in' ? Number(m.quantity) : -Number(m.quantity)), 0);
    return sum + Math.max(0, balance) * inventoryUnitCost(item, inventoryMoves);
  }, 0);
  const lowStock = inventory.filter((item) => {
    const balance = (item.openingStock || 0) + inventoryMoves.filter((m) => m.itemId === item.id).reduce((s, m) => s + ((m.direction || m.type) === 'in' ? m.quantity : -m.quantity), 0);
    return balance <= (item.reorderLevel || 0);
  }).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3.5">
        <StatCard label="Active units" value={fmtNum(units.length)} sub={`${todayLogs.length} logged today`} />
        <StatCard
          label="Produced today"
          value={fmtNum(producedToday)}
          sub={mortalityToday > 0 ? `${mortalityToday} losses today` : 'No losses today'}
          accent="var(--forest)"
        />
        <StatCard label="Direct costs (MTD)" value={fmtMoney(directCostsMTD)} sub="Linked to a unit" />
        <StatCard label="Unallocated (MTD)" value={fmtMoney(unallocatedMTD)} sub="Shared costs — no unit link" accent="var(--amber)" />
        <StatCard label="Inventory value" value={fmtMoney(inventoryValue)} sub={lowStock ? `${lowStock} item${lowStock > 1 ? "s" : ""} at reorder level` : "Stock levels healthy"} accent={lowStock ? "var(--rust)" : "var(--forest)"} />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="px-5 pt-4 pb-3 font-display text-lg font-semibold" style={{ borderBottom: '1px solid var(--line)' }}>
          Units at a glance
        </div>
        <table className="w-full text-sm ledger-table">
          <thead>
            <tr style={{ color: 'var(--ink-soft)' }} className="text-left">
              <th className="px-5 py-2.5 font-medium text-xs uppercase tracking-wide">Unit</th>
              <th className="px-3 py-2.5 font-medium text-xs uppercase tracking-wide text-right">Live count</th>
              <th className="px-3 py-2.5 font-medium text-xs uppercase tracking-wide text-right">Today</th>
              <th className="px-3 py-2.5 font-medium text-xs uppercase tracking-wide text-right">Revenue (MTD)</th><th className="px-5 py-2.5 font-medium text-xs uppercase tracking-wide text-right">Cost / unit (MTD)</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => {
              const Icon = typeOf(u).icon;
              const m = unitMetrics(u, logs, expenses, 'month', inventoryMoves);
              const today = logs.find((l) => l.unitId === u.id && l.date === todayISO());
              return (
                <tr key={u.id} className="font-mono">
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 font-sans font-medium" style={{ color: 'var(--ink)' }}>
                      <Icon size={14} style={{ color: 'var(--forest)' }} />
                      {u.name}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">{fmtNum(m.liveCount)}</td>
                  <td className="px-3 py-3 text-right">{today ? fmtNum(today.produced) : '—'}</td>
                  <td className="px-3 py-3 text-right">{m.revenue > 0 ? fmtMoney(m.revenue) : '—'}</td><td className="px-5 py-3 text-right">{m.costPerUnit !== null ? `$${m.costPerUnit.toFixed(3)}` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-display text-lg font-semibold">Inventory</div>
            <div className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>{inventory.length} tracked item{inventory.length !== 1 ? 's' : ''} · {lowStock ? `${lowStock} need attention` : 'No low-stock alerts'}</div>
          </div>
          <button onClick={() => goTo('inventory')} className="btn-ghost rounded-xl px-3 py-2 text-sm flex items-center gap-2"><Boxes size={15} /> Manage</button>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => goTo('log')} className="btn-primary rounded-xl px-4 py-2.5 text-sm flex items-center gap-2">
          <Plus size={15} /> Log production
        </button>
        <button onClick={() => goTo('expenses')} className="btn-ghost rounded-xl px-4 py-2.5 text-sm flex items-center gap-2">
          <Plus size={15} /> Add expense
        </button>
      </div>
    </div>
  );
}
