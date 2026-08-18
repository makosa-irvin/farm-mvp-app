import { Plus, Tag, Boxes, AlertTriangle, CheckCircle2, Egg, Droplets, Wheat, Package, Wallet, TrendingUp, ArrowRight } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import { typeOf, todayISO, inPeriod, fmtNum, fmtMoney, unitMetrics } from '../lib/helpers.js';

// Icons for each production type, used on the "Production this week" list.
const PRODUCE_ICONS = { eggs: Egg, milk: Droplets, crop: Wheat, other: Package };

// The farmer's first screen. Everything here is ordered by how urgently it
// needs a decision, not by how the data happens to be structured:
// actionable alerts ("Needs your attention") come before passive stats
// ("Today", "Production this week"), on the assumption that someone
// opening this on a phone between other jobs wants to know what to *do*
// before they want to browse numbers.
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

  // "Produced today" is only meaningful as a single number when every log
  // entry today is the same kind of produce — adding "30 eggs" to "20
  // liters of milk" would give a technically-computable but meaningless
  // number. When today's entries span more than one production type, this
  // falls back to counting how many groups were logged instead, which is
  // still honest and still useful at a glance.
  const producedTodayByType = todayLogs.reduce((totals, log) => {
    const unit = units.find((u) => u.id === log.unitId);
    const type = unit?.type || 'other';
    totals[type] = (totals[type] || 0) + (Number(log.produced) || 0);
    return totals;
  }, {});
  const typesLoggedToday = Object.keys(producedTodayByType);
  const singleTypeToday = typesLoggedToday.length === 1 ? typesLoggedToday[0] : null;

  const mortalityToday = todayLogs.reduce((sum, log) => sum + (Number(log.mortality) || 0), 0);
  const todaySpend = expenses.filter((expense) => expense.date === today && !expense.inventoryTransactionId).reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);

  const moneySpentThisMonth = expenses
    .filter((expense) => inPeriod(expense.date, 'month') && !expense.inventoryTransactionId)
    .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const farmCostsThisMonth = expenses
    .filter((expense) => inPeriod(expense.date, 'month'))
    .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0);
  const estimatedRevenue = units.reduce((sum, unit) => sum + unitMetrics(unit, logs, expenses, 'month', inventoryMoves).revenue, 0);
  const estimatedSurplus = estimatedRevenue > 0 ? estimatedRevenue - farmCostsThisMonth : null;

  const getInventoryBalance = (item) => {
    const movementBalance = inventoryMoves
      .filter((move) => move.itemId === item.id)
      .reduce((sum, move) => sum + ((move.direction || move.type) === 'in' ? Number(move.quantity) : -Number(move.quantity)), 0);
    return (Number(item.openingStock) || 0) + movementBalance;
  };

  const lowStockItems = inventory.filter((item) => getInventoryBalance(item) <= (Number(item.reorderLevel) || 0));
  const recentLosses = inventoryMoves.filter((move) => move.transactionType === 'wastage' && inPeriod(move.date, 'week')).length;
  const attentionItems = lowStockItems.slice(0, 3);
  const hasAttentionItems = attentionItems.length > 0 || recentLosses > 0;

  const productionByUnit = units.map((unit) => ({
    unit,
    produced: logs.filter((log) => log.unitId === unit.id && inPeriod(log.date, 'week')).reduce((sum, log) => sum + (Number(log.produced) || 0), 0),
  })).filter(({ produced }) => produced > 0);

  return (
    <div className="space-y-6">
      <section>
        <div className="font-display text-2xl font-semibold">Good day 👋</div>
        <div className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
          Here is what you need to know about your farm today.
        </div>
      </section>

      <section className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ink-soft)' }}>How is the farm doing?</div>
        <div className="mt-2 flex items-end justify-between gap-4">
          <div>
            <div className="font-mono text-3xl font-semibold" style={{ color: estimatedSurplus === null ? 'var(--ink)' : estimatedSurplus >= 0 ? 'var(--forest)' : 'var(--rust)' }}>
              {estimatedSurplus === null ? '—' : fmtMoney(estimatedSurplus)}
            </div>
            <div className="text-sm mt-1">Estimated surplus this month</div>
          </div>
          <TrendingUp size={24} style={{ color: estimatedSurplus === null ? 'var(--ink-soft)' : estimatedSurplus >= 0 ? 'var(--forest)' : 'var(--rust)' }} />
        </div>
        <div className="text-xs mt-3" style={{ color: 'var(--ink-soft)' }}>
          {estimatedSurplus === null
            ? 'Add produce prices to estimate your surplus.'
            : 'Estimated produce value minus farm costs. This is not a cash balance.'}
        </div>
      </section>

      {/* Actionable items come first — before passive stats — since this is
          what most directly helps someone decide what to do next. */}
      {hasAttentionItems ? (
        <section className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <div className="font-display text-lg font-semibold">Needs your attention</div>
          <div className="mt-1 text-xs" style={{ color: 'var(--ink-soft)' }}>A few things worth checking today.</div>
          <div className="mt-3 space-y-2">
            {attentionItems.map((item) => (
              <button key={item.id} type="button" onClick={() => goTo('inventory')} className="w-full flex items-center gap-3 rounded-xl p-3 text-left" style={{ background: 'var(--rust-tint)' }}>
                <AlertTriangle size={18} style={{ color: 'var(--rust)' }} />
                <span className="text-sm flex-1"><strong>{item.name}</strong> is running low. Check your stock.</span>
                <ArrowRight size={15} style={{ color: 'var(--rust)' }} />
              </button>
            ))}
            {recentLosses > 0 && (
              <button type="button" onClick={() => goTo('inventory')} className="w-full flex items-center gap-3 rounded-xl p-3 text-left" style={{ background: 'var(--amber-tint)' }}>
                <AlertTriangle size={18} style={{ color: 'var(--amber)' }} />
                <span className="text-sm flex-1"><strong>{recentLosses} stock loss{recentLosses > 1 ? 'es' : ''}</strong> recorded this week.</span>
                <ArrowRight size={15} style={{ color: 'var(--amber)' }} />
              </button>
            )}
          </div>
        </section>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl p-4" style={{ background: 'var(--forest-tint)', color: 'var(--forest-dark)' }}>
          <CheckCircle2 size={20} />
          <span className="text-sm font-medium">Nothing needs your attention right now.</span>
        </div>
      )}

      <section>
        <div className="font-display text-lg font-semibold">Today</div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {singleTypeToday ? (
            <TodayCard icon={Egg} label="Produced" value={fmtNum(producedTodayByType[singleTypeToday])} sub={typeOf({ type: singleTypeToday }).unitLabel} />
          ) : (
            <TodayCard icon={Egg} label="Logged today" value={fmtNum(typesLoggedToday.length)} sub={typesLoggedToday.length === 1 ? 'kind of produce' : 'kinds of produce'} />
          )}
          <TodayCard icon={Wallet} label="Money spent" value={fmtMoney(todaySpend)} sub="today" />
          <TodayCard icon={Boxes} label="Stock used" value={fmtNum(inventoryMoves.filter((move) => move.date === today && move.direction === 'out').length)} sub="stock movements" />
          <TodayCard icon={AlertTriangle} label="Losses" value={fmtNum(mortalityToday)} sub="animals today" />
        </div>
      </section>

      {productionByUnit.length > 0 && (
        <section>
          <div className="font-display text-lg font-semibold">Production this week</div>
          <div className="space-y-2 mt-3">
            {productionByUnit.slice(0, 4).map(({ unit, produced }) => {
              const Icon = PRODUCE_ICONS[unit.type] || Package;
              const type = typeOf(unit);
              return (
                <div key={unit.id} className="flex items-center gap-3 rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--forest-tint)', color: 'var(--forest)' }}>
                    <Icon size={19} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm">{unit.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>{type.label}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-semibold text-sm">{fmtNum(produced)}</div>
                    <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>{type.unitLabel}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="font-display text-lg font-semibold">Money this month</div>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div><div className="text-xs" style={{ color: 'var(--ink-soft)' }}>Farm costs</div><div className="font-mono text-lg font-semibold mt-1">{fmtMoney(farmCostsThisMonth)}</div></div>
          <div><div className="text-xs" style={{ color: 'var(--ink-soft)' }}>Money spent</div><div className="font-mono text-lg font-semibold mt-1">{fmtMoney(moneySpentThisMonth)}</div></div>
        </div>
        {/* Moved here from a page-level footnote — the explanation is much
            more likely to actually be read sitting right next to the two
            numbers it explains, rather than at the very bottom of the page
            with no visual connection to them. */}
        <div className="text-xs mt-3 leading-5" style={{ color: 'var(--ink-soft)' }}>
          <strong>Farm costs</strong> also counts stock the farm used or lost, even if you paid for it earlier. <strong>Money spent</strong> is only new cash payments made this month.
        </div>
        <button type="button" onClick={() => goTo('analytics')} className="mt-4 flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--forest)' }}>
          See more financial details <ArrowRight size={13} />
        </button>
      </section>

      <section className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="font-display text-lg font-semibold">What do you want to record?</div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => goTo('log')} className="btn-primary flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm"><Plus size={16} /> Daily log</button>
          <button type="button" onClick={() => goTo('inventory')} className="btn-ghost flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm"><Plus size={16} /> Stock</button>
          <button type="button" onClick={() => goTo('expenses')} className="btn-ghost flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm"><Plus size={16} /> Money</button>
          <button type="button" onClick={() => goTo('units')} className="btn-ghost flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm"><Plus size={16} /> Add group</button>
        </div>
      </section>
    </div>
  );
}

// One of the four small stat tiles in the "Today" section.
function TodayCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <Icon size={17} style={{ color: 'var(--forest)' }} />
      <div className="text-xs mt-2" style={{ color: 'var(--ink-soft)' }}>{label}</div>
      <div className="font-mono text-lg font-semibold mt-0.5">{value}</div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>{sub}</div>
    </div>
  );
}
