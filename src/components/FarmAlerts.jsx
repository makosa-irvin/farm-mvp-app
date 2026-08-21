import { AlertTriangle, BellRing, CheckCircle2, PackageSearch, TrendingDown } from 'lucide-react';
import { inPeriod, todayISO } from '../lib/helpers.js';

/**
 * Small action-oriented alert list. It intentionally uses existing records
 * rather than introducing another persistent notification store: alerts are
 * derived from current farm state, so they cannot become stale.
 */
export default function FarmAlerts({ units, logs, inventory, inventoryMoves, goTo }) {
  const today = todayISO();
  const balanceFor = (item) =>
    (Number(item.openingStock) || 0) +
    inventoryMoves
      .filter((m) => m.itemId === item.id)
      .reduce((sum, m) => sum + ((m.direction || m.type) === 'in' ? Number(m.quantity) : -Number(m.quantity)), 0);
  const lowStock = inventory
    .filter((item) => balanceFor(item) <= (Number(item.reorderLevel) || 0) && Number(item.reorderLevel) > 0)
    .slice(0, 4);
  const losses = inventoryMoves.filter((m) => m.transactionType === 'wastage' && inPeriod(m.date, 'week')).length;
  const mortality = logs.filter((l) => l.date === today).reduce((sum, l) => sum + (Number(l.mortality) || 0), 0);

  const underLogged = units.filter((unit) => !logs.some((log) => log.unitId === unit.id && log.date === today)).slice(0, 3);
  const alerts = [
    ...lowStock.map((item) => ({
      key: `stock-${item.id}`,
      icon: PackageSearch,
      tone: 'rust',
      text: `${item.name} is at or below its reorder level.`,
      tab: 'inventory',
    })),
    ...(losses
      ? [
          {
            key: 'losses',
            icon: AlertTriangle,
            tone: 'amber',
            text: `${losses} stock loss${losses === 1 ? '' : 'es'} recorded in the last 7 days.`,
            tab: 'inventory',
          },
        ]
      : []),
    ...(mortality
      ? [
          {
            key: 'mortality',
            icon: TrendingDown,
            tone: 'rust',
            text: `${mortality} animal${mortality === 1 ? '' : 's'} recorded as lost today.`,
            tab: 'log',
          },
        ]
      : []),
    ...underLogged.map((unit) => ({
      key: `log-${unit.id}`,
      icon: BellRing,
      tone: 'forest',
      text: `${unit.name} has no daily log for today.`,
      tab: 'log',
    })),
  ].slice(0, 6);

  return (
    <section className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <div className="flex items-center gap-2">
        <BellRing size={17} style={{ color: 'var(--forest)' }} />
        <div className="font-display text-lg font-semibold">Farm alerts</div>
      </div>
      {alerts.length === 0 ? (
        <div className="flex items-center gap-2 mt-3 text-sm" style={{ color: 'var(--forest)' }}>
          <CheckCircle2 size={17} /> Nothing needs attention right now.
        </div>
      ) : (
        <div className="space-y-2 mt-3">
          {alerts.map(({ key, icon: Icon, tone, text, tab }) => (
            <button
              key={key}
              type="button"
              onClick={() => goTo(tab)}
              className="w-full flex items-center gap-3 rounded-xl p-3 text-left"
              style={{ background: tone === 'rust' ? 'var(--rust-tint)' : tone === 'amber' ? 'var(--amber-tint)' : 'var(--forest-tint)' }}
            >
              <Icon size={17} style={{ color: tone === 'rust' ? 'var(--rust)' : tone === 'amber' ? 'var(--amber)' : 'var(--forest)' }} />
              <span className="text-sm">{text}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
