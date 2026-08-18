import { useState } from 'react';
import { Trash2, Pencil, X, Save, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import FieldLabel from '../components/FieldLabel.jsx';
import { inputClass, inputStyle } from '../lib/styleTokens.js';
import { UNIT_TYPES } from '../constants.js';
import { uid, todayISO, typeOf, currentCountFor, unitMetrics, fmtNum, fmtMoney } from '../lib/helpers.js';

// Add, edit, and remove production units (flocks, herds, plots). Every
// other view depends on at least one unit existing, so this is usually the
// first screen a new farm actually needs to use.
export default function UnitsView({ units, logs, expenses = [], inventoryMoves = [], onAdd, onUpdate, onRemove, onNavigateToAnalytics }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('eggs');
  const [initialCount, setInitialCount] = useState('');
  const [producePrice, setProducePrice] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  function resetForm() {
    setName('');
    setType('eggs');
    setInitialCount('');
    setProducePrice('');
    setStartDate(todayISO());
    setEditingId(null);
  }

  function editUnit(u) {
    setEditingId(u.id);
    setName(u.name);
    setType(u.type);
    setInitialCount(String(u.initialCount || 0));
    setProducePrice(String(u.producePrice || 0));
    setStartDate(u.startDate || todayISO());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function submit(ev) {
    ev.preventDefault();
    if (!name.trim()) return;
    const record = {
      id: editingId || uid('unit'),
      name: name.trim(),
      type,
      initialCount: Number(initialCount) || 0,
      producePrice: Number(producePrice) || 0,
      startDate,
      createdAt: editingId ? (units.find((u) => u.id === editingId)?.createdAt || Date.now()) : Date.now(),
    };
    if (editingId) onUpdate(record); else onAdd(record);
    resetForm();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="font-display text-lg font-semibold">{editingId ? `Edit ${name || 'production unit'}` : 'Add a production unit'}</div>

        <div>
          <FieldLabel>Name</FieldLabel>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Layer House A" required className={inputClass} style={inputStyle} />
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <FieldLabel>Type</FieldLabel>
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass} style={inputStyle}>
              {UNIT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Starting headcount</FieldLabel>
            <input type="number" min="0" value={initialCount} onChange={(e) => setInitialCount(e.target.value)} placeholder="0" className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div>
          {/* Label follows the selected type's natural selling unit (tray for
              eggs, liter for milk, etc.) — see UNIT_TYPES in constants.js. */}
          <FieldLabel>Produce selling price ({UNIT_TYPES.find((t) => t.value === type)?.groupLabel || 'unit'})</FieldLabel>
          <input type="number" min="0" step="0.01" value={producePrice} onChange={(e) => setProducePrice(e.target.value)} placeholder="0.00" className={inputClass} style={inputStyle} />
          <div className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>Used to estimate revenue from production logs for this unit.</div>
        </div>

        <div>
          <FieldLabel>Start date</FieldLabel>
          <input type="date" value={startDate} max={todayISO()} onChange={(e) => setStartDate(e.target.value)} className={inputClass} style={inputStyle} />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button type="submit" className="btn-primary rounded-xl px-5 py-2.5 text-sm flex items-center gap-2">
            <Save size={15} /> {editingId ? 'Save changes' : 'Add unit'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-ghost rounded-xl px-4 py-2.5 text-sm flex items-center gap-2">
              <X size={15} /> Cancel
            </button>
          )}
        </div>
      </form>

      {units.length > 0 && (
        <div className="space-y-2.5">
          {units.map((u) => {
            const Icon = typeOf(u).icon;
            const live = currentCountFor(u, logs);
            const isExpanded = expandedId === u.id;
            return (
              <div key={u.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
                <div
                  className="flex items-center justify-between px-5 py-3.5 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : u.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--forest-tint)' }}>
                      <Icon size={16} style={{ color: 'var(--forest)' }} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{u.name}</div>
                      <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>
                        {typeOf(u).label} · {fmtNum(live)} live · {u.producePrice ? `${fmtMoney(Number(u.producePrice), 2)} / ${typeOf(u).groupLabel}` : 'price not set'} · since {u.startDate}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isExpanded ? <ChevronUp size={14} style={{ color: 'var(--ink-soft)' }} /> : <ChevronDown size={14} style={{ color: 'var(--ink-soft)' }} />}
                    <button onClick={(e) => { e.stopPropagation(); editUnit(u); }} className="p-1.5 rounded hover:bg-black/5" aria-label={`Edit ${u.name}`}>
                      <Pencil size={15} style={{ color: 'var(--ink-soft)' }} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onRemove(u.id); }} className="p-1.5 rounded hover:bg-black/5" aria-label={`Remove ${u.name}`}>
                      <Trash2 size={15} style={{ color: 'var(--ink-soft)' }} />
                    </button>
                  </div>
                </div>

                {isExpanded && <UnitSnapshot unit={u} logs={logs} expenses={expenses} inventoryMoves={inventoryMoves} onNavigateToAnalytics={onNavigateToAnalytics} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// A quick "how's this unit doing this month" snapshot, without leaving
// the Units tab to go find it in Analytics. Deliberately just 3 numbers —
// full detail (cost breakdown, trend chart) already lives in Analytics,
// so this is a preview, not a duplicate of that page.
function UnitSnapshot({ unit, logs, expenses, inventoryMoves, onNavigateToAnalytics }) {
  const m = unitMetrics(unit, logs, expenses, 'month', inventoryMoves);
  const t = typeOf(unit);

  return (
    <div className="px-5 pb-4 pt-1" style={{ borderTop: '1px solid var(--line)' }}>
      <div className="text-xs mb-2.5 mt-3" style={{ color: 'var(--ink-soft)' }}>This month so far</div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <SnapshotStat label="Produced" value={`${fmtNum(m.produced)} ${t.unitLabel}`} />
        <SnapshotStat label="Spent" value={fmtMoney(m.directCost)} />
        <SnapshotStat
          label={Number(unit.producePrice) > 0 ? 'Profit' : 'Cost/unit'}
          value={Number(unit.producePrice) > 0 ? fmtMoney(m.profit) : (m.costPerUnit !== null ? fmtMoney(m.costPerUnit, 2) : '—')}
          accent={Number(unit.producePrice) > 0 ? (m.profit >= 0 ? 'var(--forest)' : 'var(--rust)') : undefined}
        />
      </div>
      {onNavigateToAnalytics && (
        <button
          type="button"
          onClick={onNavigateToAnalytics}
          className="flex items-center gap-1.5 text-xs font-medium"
          style={{ color: 'var(--forest)' }}
        >
          <BarChart3 size={13} /> See full analytics for this unit
        </button>
      )}
    </div>
  );
}

function SnapshotStat({ label, value, accent }) {
  return (
    <div>
      <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>{label}</div>
      <div className="font-mono text-sm font-semibold mt-0.5" style={{ color: accent || 'var(--ink)' }}>{value}</div>
    </div>
  );
}
