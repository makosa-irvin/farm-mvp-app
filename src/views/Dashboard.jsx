import { Plus, Tag, Boxes } from 'lucide-react';
import StatCard from '../components/StatCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import {
  typeOf,
  todayISO,
  inPeriod,
  fmtNum,
  fmtMoney,
  unitMetrics,
  inventoryUnitCost,
} from '../lib/helpers.js';

export default function Dashboard({
  units,
  logs,
  expenses,
  inventory = [],
  inventoryMoves = [],
  goTo,
}) {
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

  const todayLogs = logs.filter((log) => log.date === todayISO());
  const producedToday = todayLogs.reduce(
    (sum, log) => sum + (log.produced || 0),
    0,
  );
  const mortalityToday = todayLogs.reduce(
    (sum, log) => sum + (log.mortality || 0),
    0,
  );

  const directCostsMTD = expenses
    .filter((expense) => expense.unitId && inPeriod(expense.date, 'month'))
    .reduce((sum, expense) => sum + (expense.amount || 0), 0);

  const unallocatedMTD = expenses
    .filter((expense) => !expense.unitId && inPeriod(expense.date, 'month'))
    .reduce((sum, expense) => sum + (expense.amount || 0), 0);

  const getInventoryBalance = (item) => {
    const movementBalance = inventoryMoves
      .filter((move) => move.itemId === item.id)
      .reduce(
        (sum, move) =>
          sum +
          ((move.direction || move.type) === 'in'
            ? Number(move.quantity)
            : -Number(move.quantity)),
        0,
      );

    return (item.openingStock || 0) + movementBalance;
  };

  const inventoryValue = inventory.reduce((sum, item) => {
    const balance = getInventoryBalance(item);
    return sum + Math.max(0, balance) * inventoryUnitCost(item, inventoryMoves);
  }, 0);

  const lowStock = inventory.filter(
    (item) => getInventoryBalance(item) <= (item.reorderLevel || 0),
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3.5">
        <StatCard
          label="Active units"
          value={fmtNum(units.length)}
          sub={`${todayLogs.length} logged today`}
        />
        <StatCard
          label="Produced today"
          value={fmtNum(producedToday)}
          sub={
            mortalityToday > 0
              ? `${mortalityToday} losses today`
              : 'No losses today'
          }
          accent="var(--forest)"
        />
        <StatCard
          label="Direct costs (MTD)"
          value={fmtMoney(directCostsMTD)}
          sub="Linked to a unit"
        />
        <StatCard
          label="Unallocated (MTD)"
          value={fmtMoney(unallocatedMTD)}
          sub="Shared costs — no unit link"
          accent="var(--amber)"
        />
        <StatCard
          label="Inventory value"
          value={fmtMoney(inventoryValue)}
          sub={
            lowStock
              ? `${lowStock} item${lowStock > 1 ? 's' : ''} at reorder level`
              : 'Stock levels healthy'
          }
          accent={lowStock ? 'var(--rust)' : 'var(--forest)'}
        />
      </div>

      <div
        className="overflow-hidden rounded-2xl"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
        }}
      >
        <div
          className="px-5 pb-3 pt-4 font-display text-lg font-semibold"
          style={{ borderBottom: '1px solid var(--line)' }}
        >
          Units at a glance
        </div>

        <table className="ledger-table w-full text-sm">
          <thead>
            <tr style={{ color: 'var(--ink-soft)' }} className="text-left">
              <th className="px-5 py-2.5 text-xs font-medium uppercase tracking-wide">
                Unit
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide">
                Live count
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide">
                Today
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-medium uppercase tracking-wide">
                Revenue (MTD)
              </th>
              <th className="px-5 py-2.5 text-right text-xs font-medium uppercase tracking-wide">
                Cost / unit (MTD)
              </th>
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => {
              const Icon = typeOf(unit).icon;
              const metrics = unitMetrics(
                unit,
                logs,
                expenses,
                'month',
                inventoryMoves,
              );
              const today = logs.find(
                (log) =>
                  log.unitId === unit.id && log.date === todayISO(),
              );

              return (
                <tr key={unit.id} className="font-mono">
                  <td className="px-5 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 font-sans font-medium"
                      style={{ color: 'var(--ink)' }}
                    >
                      <Icon size={14} style={{ color: 'var(--forest)' }} />
                      {unit.name}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {fmtNum(metrics.liveCount)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {today ? fmtNum(today.produced) : '—'}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {metrics.revenue > 0 ? fmtMoney(metrics.revenue) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {metrics.costPerUnit !== null
                      ? `$${metrics.costPerUnit.toFixed(3)}`
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        className="rounded-2xl p-5"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-display text-lg font-semibold">Inventory</div>
            <div
              className="mt-1 text-xs"
              style={{ color: 'var(--ink-soft)' }}
            >
              {inventory.length} tracked item
              {inventory.length !== 1 ? 's' : ''} ·{' '}
              {lowStock
                ? `${lowStock} need attention`
                : 'No low-stock alerts'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => goTo('inventory')}
            className="btn-ghost flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
          >
            <Boxes size={15} />
            Manage
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => goTo('log')}
          className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
        >
          <Plus size={15} />
          Log production
        </button>
        <button
          type="button"
          onClick={() => goTo('expenses')}
          className="btn-ghost flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
        >
          <Plus size={15} />
          Add expense
        </button>
      </div>
    </div>
  );
}
