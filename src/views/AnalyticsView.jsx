import { useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp, Info, TrendingUp, TrendingDown } from 'lucide-react';
import TagChip from '../components/TagChip.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Metric from '../components/Metric.jsx';
import TrendChart from '../components/TrendChart.jsx';
import { PERIODS } from '../constants.js';
import { typeOf, unitMetrics, unitCostBreakdown, dailyProductionTrend, fmtNum, fmtMoney } from '../lib/helpers.js';

// Numbers-per-unit view. Deliberately shows only 2-3 headline figures by
// default per unit, with the rest (cost breakdown, feed use, laying rate,
// losses) tucked behind "See more" — a wall of technical stats up front
// reads as "software I might break," not "a tool that helps me." The
// production trend chart is the one exception kept always-visible: a
// glance at a chart doesn't add the same cognitive load a table of
// numbers does, and "is this going up or down" is often the actual
// question someone has, more than any single figure.
export default function AnalyticsView({ units, logs, expenses, inventory = [], inventoryMoves = [] }) {
  const [period, setPeriod] = useState('month');

  if (units.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Nothing to look at yet"
        body="Add a unit and log a few days of work to see what things are costing you here."
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap">
        {PERIODS.map((p) => (
          <TagChip key={p.value} label={p.label} active={period === p.value} onClick={() => setPeriod(p.value)} />
        ))}
      </div>

      <div className="space-y-3.5">
        {units.map((u) => (
          <UnitAnalyticsCard key={u.id} unit={u} logs={logs} expenses={expenses} inventory={inventory} inventoryMoves={inventoryMoves} period={period} />
        ))}
      </div>

      <div className="flex items-start gap-2 text-xs px-1" style={{ color: 'var(--ink-soft)' }}>
        <Info size={13} className="mt-0.5 shrink-0" />
        <span>These numbers are close estimates based on what you've logged — they get more accurate the more days you record.</span>
      </div>
    </div>
  );
}

function UnitAnalyticsCard({ unit, logs, expenses, inventory, inventoryMoves, period }) {
  const [expanded, setExpanded] = useState(false);
  const t = typeOf(unit);
  const Icon = t.icon;
  const m = unitMetrics(unit, logs, expenses, period, inventoryMoves);
  const unitSingular = t.unitLabel.replace(/s$/, '');
  const costRows = unitCostBreakdown(unit, logs, expenses, period, inventoryMoves, inventory);
  const trend = dailyProductionTrend(unit, logs, 14);
  const hasPrice = Number(unit.producePrice) > 0;

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} style={{ color: 'var(--forest)' }} />
        <div className="font-display text-lg font-semibold">{unit.name}</div>
        <div className="text-xs ml-auto font-mono" style={{ color: 'var(--ink-soft)' }}>{m.logCount} {m.logCount === 1 ? 'entry' : 'entries'}</div>
      </div>

      {/* Headline numbers: the 2-3 things worth glancing at, always visible. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Metric label={`Cost per ${unitSingular}`} value={m.costPerUnit !== null ? fmtMoney(m.costPerUnit, 2) : '—'} />
        <Metric label="Spent this period" value={fmtMoney(m.directCost)} />
        <Metric label="Produced" value={`${fmtNum(m.produced)} ${t.unitLabel}`} />
      </div>

      {/* Revenue -> profit: the "am I actually making money" line. Only
          shown once a selling price is set on the unit — otherwise
          revenue is always zero and the row would just be noise. */}
      {hasPrice && (
        <div className="flex items-center gap-2.5 mt-4 pt-4 text-sm" style={{ borderTop: '1px solid var(--line)' }}>
          <span style={{ color: 'var(--ink-soft)' }}>Revenue {fmtMoney(m.revenue)}</span>
          <span style={{ color: 'var(--ink-soft)' }}>→</span>
          <span
            className="inline-flex items-center gap-1 font-semibold"
            style={{ color: m.profit >= 0 ? 'var(--forest)' : 'var(--rust)' }}
          >
            {m.profit >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            Profit {fmtMoney(m.profit)}
          </span>
        </div>
      )}

      {/* Production trend: last 14 days, always visible. */}
      <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
        <div className="text-xs mb-1.5" style={{ color: 'var(--ink-soft)' }}>Production, last 14 days</div>
        <TrendChart data={trend} />
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs font-medium mt-4"
        style={{ color: 'var(--forest)' }}
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? 'Show less' : 'See more details'}
      </button>

      {expanded && (
        <div className="mt-4 pt-4 space-y-4" style={{ borderTop: '1px solid var(--line)' }}>
          {costRows.length > 0 && (
            <div>
              <div className="text-xs mb-2" style={{ color: 'var(--ink-soft)' }}>Where the money went</div>
              <div className="space-y-1.5">
                {costRows.map((row) => (
                  <CostBar key={row.label} label={row.label} amount={row.amount} max={costRows[0].amount} />
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Metric label="Feed used" value={m.feedKg > 0 ? `${fmtNum(m.feedKg, 1)} kg` : '—'} />
            <Metric label={`Feed per ${unitSingular}`} value={m.fcr !== null ? `${m.fcr.toFixed(2)} kg` : '—'} />
            {t.hasGrades && <Metric label="Laying rate" value={m.productionRate !== null ? `${m.productionRate.toFixed(1)}%` : '—'} />}
            <Metric
              label="Losses"
              value={m.mortalityRate !== null ? `${m.mortalityRate.toFixed(1)}%` : '—'}
              accent={m.mortalityRate > 5 ? 'var(--rust)' : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// One row of the cost breakdown: a category label, the amount, and a bar
// sized relative to the largest category — so "most of it's feed" is
// visible at a glance, not something you have to compare numbers to see.
function CostBar({ label, amount, max }) {
  const pct = max > 0 ? Math.max(4, (amount / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: 'var(--ink)' }}>{label}</span>
        <span className="font-mono" style={{ color: 'var(--ink-soft)' }}>{fmtMoney(amount)}</span>
      </div>
      <div className="rounded-full overflow-hidden" style={{ background: 'var(--surface-alt)', height: 6 }}>
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--forest)' }} />
      </div>
    </div>
  );
}
