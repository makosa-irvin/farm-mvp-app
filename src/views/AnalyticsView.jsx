import { useState } from 'react';
import { BarChart3, Info } from 'lucide-react';
import TagChip from '../components/TagChip.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Metric from '../components/Metric.jsx';
import { PERIODS } from '../constants.js';
import { typeOf, unitMetrics, fmtNum, fmtMoney } from '../lib/helpers.js';

export default function AnalyticsView({ units, logs, expenses }) {
  const [period, setPeriod] = useState('month');

  if (units.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Nothing to analyze yet"
        body="Add a production unit and log a few days of data to see cost-per-unit economics here."
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
        {units.map((u) => {
          const t = typeOf(u);
          const Icon = t.icon;
          const m = unitMetrics(u, logs, expenses, period);
          return (
            <div key={u.id} className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Icon size={16} style={{ color: 'var(--forest)' }} />
                <div className="font-display text-lg font-semibold">{u.name}</div>
                <div className="text-xs ml-auto font-mono" style={{ color: 'var(--ink-soft)' }}>{m.logCount} {m.logCount === 1 ? 'entry' : 'entries'}</div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Metric label={`Cost / ${t.unitLabel.replace(/s$/, '')}`} value={m.costPerUnit !== null ? `$${m.costPerUnit.toFixed(3)}` : '—'} />
                {t.hasGrades && <Metric label="Cost / dozen" value={m.costPerGroup !== null ? fmtMoney(m.costPerGroup) : '—'} />}
                <Metric label="Direct costs" value={fmtMoney(m.directCost)} />
                <Metric label="Produced" value={`${fmtNum(m.produced)} ${t.unitLabel}`} />
                <Metric label="Feed used" value={m.feedKg > 0 ? `${fmtNum(m.feedKg, 1)} kg` : '—'} />
                <Metric label="FCR (kg feed / output)" value={m.fcr !== null ? m.fcr.toFixed(2) : '—'} />
                {t.hasGrades && <Metric label="Production rate*" value={m.productionRate !== null ? `${m.productionRate.toFixed(1)}%` : '—'} />}
                <Metric label="Mortality rate*" value={m.mortalityRate !== null ? `${m.mortalityRate.toFixed(1)}%` : '—'} accent={m.mortalityRate > 5 ? 'var(--rust)' : undefined} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 text-xs px-1" style={{ color: 'var(--ink-soft)' }}>
        <Info size={13} className="mt-0.5 shrink-0" />
        <span>*Rates use current live headcount as an approximation of headcount across the period. Tracking daily headcount changes (Phase 2) will make these exact. Figures also reflect direct costs only — shared costs (labor, utilities, depreciation) aren't allocated into these numbers until the Phase 2 allocation engine is built.</span>
      </div>
    </div>
  );
}
