import { useState } from 'react';
import { BarChart3, ChevronDown, ChevronUp, Info } from 'lucide-react';
import TagChip from '../components/TagChip.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Metric from '../components/Metric.jsx';
import { PERIODS } from '../constants.js';
import { typeOf, unitMetrics, fmtNum, fmtMoney } from '../lib/helpers.js';

// Numbers-per-unit view. Deliberately shows only 2-3 headline figures by
// default per unit, with the rest (feed use, laying rate, losses) tucked
// behind "See more" — a wall of eight technical stats up front reads as
// "software I might break," not "a tool that helps me." Every label here
// is written in plain terms on purpose: no "FCR", no "mortality rate",
// no formulas in parentheses.
export default function AnalyticsView({ units, logs, expenses, inventoryMoves = [] }) {
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
          <UnitAnalyticsCard key={u.id} unit={u} logs={logs} expenses={expenses} inventoryMoves={inventoryMoves} period={period} />
        ))}
      </div>

      <div className="flex items-start gap-2 text-xs px-1" style={{ color: 'var(--ink-soft)' }}>
        <Info size={13} className="mt-0.5 shrink-0" />
        <span>These numbers are close estimates based on what you've logged — they get more accurate the more days you record.</span>
      </div>
    </div>
  );
}

function UnitAnalyticsCard({ unit, logs, expenses, inventoryMoves, period }) {
  const [expanded, setExpanded] = useState(false);
  const t = typeOf(unit);
  const Icon = t.icon;
  const m = unitMetrics(unit, logs, expenses, period, inventoryMoves);
  const unitSingular = t.unitLabel.replace(/s$/, '');

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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
          <Metric label="Feed used" value={m.feedKg > 0 ? `${fmtNum(m.feedKg, 1)} kg` : '—'} />
          <Metric label={`Feed per ${unitSingular}`} value={m.fcr !== null ? `${m.fcr.toFixed(2)} kg` : '—'} />
          {t.hasGrades && <Metric label="Laying rate" value={m.productionRate !== null ? `${m.productionRate.toFixed(1)}%` : '—'} />}
          <Metric
            label="Losses"
            value={m.mortalityRate !== null ? `${m.mortalityRate.toFixed(1)}%` : '—'}
            accent={m.mortalityRate > 5 ? 'var(--rust)' : undefined}
          />
        </div>
      )}
    </div>
  );
}
