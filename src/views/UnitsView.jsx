import { useState } from 'react';
import { Trash2, Pencil, X, Save, ChevronDown, ChevronUp, BarChart3, Plus } from 'lucide-react';
import FieldLabel from '../components/FieldLabel.jsx';
import { inputClass, inputStyle } from '../lib/styleTokens.js';
import { UNIT_TYPES } from '../constants.js';
import { uid, todayISO, typeOf, currentCountFor, unitMetrics, fmtNum, fmtMoney } from '../lib/helpers.js';

// Add, edit, and remove farm groups (flocks, herds, plots, or other
// productive groups). Every other view depends on at least one of these
// existing, so this is usually the first screen a new farm actually needs.
//
// "Farm groups" is the user-facing name throughout the app; internally
// this remains the "units" data model (unit.id, unitId on logs/expenses,
// etc.) for backwards compatibility with existing stored data — renaming
// the underlying fields would mean writing a migration for every farm
// that's already used the app, for a purely cosmetic gain. See
// constants.js for the same note on the TABS entry.
export default function UnitsView({ units, logs, expenses = [], inventoryMoves = [], onAdd, onUpdate, onRemove, onNavigateToAnalytics }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('eggs');
  const [initialCount, setInitialCount] = useState('');
  const [producePrice, setProducePrice] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [customUnitLabel, setCustomUnitLabel] = useState('');
  const [customGroupLabel, setCustomGroupLabel] = useState('');
  const [customGroupSize, setCustomGroupSize] = useState('');
  const [editingId, setEditingId] = useState(null);
  // Which group's "this month so far" snapshot is expanded in the list
  // below. Only one at a time.
  const [expandedId, setExpandedId] = useState(null);

  function resetForm() {
    setName('');
    setType('eggs');
    setInitialCount('');
    setProducePrice('');
    setStartDate(todayISO());
    setCustomUnitLabel('');
    setCustomGroupLabel('');
    setCustomGroupSize('');
    setEditingId(null);
  }

  function editUnit(unit) {
    setEditingId(unit.id);
    setName(unit.name);
    setType(unit.type);
    setInitialCount(String(unit.initialCount || 0));
    setProducePrice(String(unit.producePrice || 0));
    setStartDate(unit.startDate || todayISO());
    setCustomUnitLabel(unit.customUnitLabel || '');
    setCustomGroupLabel(unit.customGroupLabel || '');
    setCustomGroupSize(unit.customGroupSize ? String(unit.customGroupSize) : '');
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
      // Only meaningful for the 'trading' type — see typeOf() in
      // helpers.js, which ignores these entirely for every other type.
      // Saved regardless of the selected type so switching a unit's
      // type back to 'trading' later doesn't lose whatever was
      // previously configured.
      customUnitLabel: customUnitLabel.trim() || null,
      customGroupLabel: customGroupLabel.trim() || null,
      customGroupSize: Number(customGroupSize) || null,
      createdAt: editingId ? units.find((u) => u.id === editingId)?.createdAt || Date.now() : Date.now(),
    };
    if (editingId) onUpdate(record);
    else onAdd(record);
    resetForm();
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="font-display text-2xl font-semibold">Farm groups</div>
        <div className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
          Add the flocks, herds, crop plots, or other groups you manage. Daily log records what these groups produce or do.
        </div>
      </section>

      <form
        onSubmit={submit}
        className="rounded-2xl p-5 space-y-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
      >
        <div className="font-display text-lg font-semibold">{editingId ? `Edit ${name || 'farm group'}` : 'Add a farm group'}</div>

        <div>
          <FieldLabel>What should we call it?</FieldLabel>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Layer House A"
            required
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div className="grid grid-cols-2 gap-3.5 mobile-stack-form">
          <div>
            <FieldLabel>What are you managing?</FieldLabel>
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass} style={inputStyle}>
              {UNIT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>How many at the start?</FieldLabel>
            <input
              type="number"
              min="0"
              value={initialCount}
              onChange={(e) => setInitialCount(e.target.value)}
              placeholder="0"
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </div>

        {type === 'trading' && (
          <div className="rounded-xl p-3.5 space-y-3" style={{ background: 'var(--surface-alt)', border: '1px solid var(--line)' }}>
            <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>
              You buy in bulk and resell in fixed packages — tell us the shape of that package. For 20-liter jerricans of
              water sold at KSh 10 each: measured in "litres", package called "jerrican", 20 per package.
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <FieldLabel>What do you measure it in?</FieldLabel>
                <input
                  type="text"
                  value={customUnitLabel}
                  onChange={(e) => setCustomUnitLabel(e.target.value)}
                  placeholder="e.g. litres, kg"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <FieldLabel>What's the package called?</FieldLabel>
                <input
                  type="text"
                  value={customGroupLabel}
                  onChange={(e) => setCustomGroupLabel(e.target.value)}
                  placeholder="e.g. jerrican, bag"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <FieldLabel>How many {customUnitLabel.trim() || 'units'} per {customGroupLabel.trim() || 'package'}?</FieldLabel>
              <input
                type="number"
                min="1"
                value={customGroupSize}
                onChange={(e) => setCustomGroupSize(e.target.value)}
                placeholder="e.g. 20"
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>
        )}

        <div>
          {/* Label follows the selected type's natural selling unit (tray
              for eggs, liter for milk, etc.) — see UNIT_TYPES in
              constants.js for where groupLabel comes from. For the
              trading type, uses whatever the farmer just typed above
              instead of the generic "pack" placeholder, so this label
              reflects their own packaging as they configure it, not
              only after saving. */}
          <FieldLabel>
            How much do you usually sell one {type === 'trading' ? customGroupLabel.trim() || 'package' : UNIT_TYPES.find((t) => t.value === type)?.groupLabel || 'unit'} for? (KSh)
          </FieldLabel>
          <input
            type="number"
            min="0"
            step="0.01"
            value={producePrice}
            onChange={(e) => setProducePrice(e.target.value)}
            placeholder="0"
            className={inputClass}
            style={inputStyle}
          />
          <div className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
            Used to give you simple revenue and surplus estimates.
          </div>
        </div>

        <div>
          <FieldLabel>When did you start?</FieldLabel>
          <input
            type="date"
            value={startDate}
            max={todayISO()}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button type="submit" className="btn-primary rounded-xl px-5 py-2.5 text-sm flex items-center gap-2">
            {editingId ? <Save size={15} /> : <Plus size={15} />}
            {editingId ? 'Save changes' : 'Add group'}
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
          {units.map((unit) => {
            const Icon = typeOf(unit).icon;
            const live = currentCountFor(unit, logs);
            const isExpanded = expandedId === unit.id;
            return (
              <div
                key={unit.id}
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
              >
                <div
                  className="flex items-center justify-between px-5 py-3.5 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : unit.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'var(--forest-tint)' }}
                    >
                      <Icon size={16} style={{ color: 'var(--forest)' }} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{unit.name}</div>
                      <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>
                        {typeOf(unit).label} · {fmtNum(live)} live ·{' '}
                        {unit.producePrice
                          ? `${fmtMoney(Number(unit.producePrice), 2)} / ${typeOf(unit).groupLabel}`
                          : 'selling price not set'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        editUnit(unit);
                      }}
                      className="p-1.5 rounded hover:bg-black/5"
                      aria-label={`Edit ${unit.name}`}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(unit.id);
                      }}
                      className="p-1.5 rounded hover:bg-black/5"
                      aria-label={`Remove ${unit.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <UnitSnapshot
                    unit={unit}
                    logs={logs}
                    expenses={expenses}
                    inventoryMoves={inventoryMoves}
                    onNavigateToAnalytics={onNavigateToAnalytics}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// A quick "how's this group doing this month" preview, shown inline when
// a group row is expanded — without leaving the Groups tab to go find it
// in Analytics. Deliberately just 3 numbers; full detail (cost breakdown,
// production trend) still only lives in Analytics, so this is a preview,
// not a duplicate of that page.
function UnitSnapshot({ unit, logs, expenses, inventoryMoves, onNavigateToAnalytics }) {
  const metrics = unitMetrics(unit, logs, expenses, 'month', inventoryMoves);
  const type = typeOf(unit);
  const hasPrice = Number(unit.producePrice) > 0;

  return (
    <div className="px-5 pb-4 pt-1" style={{ borderTop: '1px solid var(--line)' }}>
      <div className="text-xs mb-2.5 mt-3" style={{ color: 'var(--ink-soft)' }}>
        This month so far
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <SnapshotStat label="Produced" value={`${fmtNum(metrics.produced)} ${type.unitLabel}`} />
        <SnapshotStat label="Farm cost" value={fmtMoney(metrics.directCost)} />
        {/* Shows "Estimated surplus" once a selling price is set (so
            revenue, and therefore surplus, is actually meaningful);
            falls back to plain cost-per-unit otherwise. */}
        <SnapshotStat
          label={hasPrice ? 'Estimated surplus' : 'Cost per unit'}
          value={hasPrice ? fmtMoney(metrics.profit) : metrics.costPerUnit !== null ? fmtMoney(metrics.costPerUnit, 2) : '—'}
          accent={hasPrice ? (metrics.profit >= 0 ? 'var(--forest)' : 'var(--rust)') : undefined}
        />
      </div>
      {onNavigateToAnalytics && (
        <button
          type="button"
          onClick={onNavigateToAnalytics}
          className="flex items-center gap-1.5 text-xs font-medium"
          style={{ color: 'var(--forest)' }}
        >
          <BarChart3 size={13} /> See more results
        </button>
      )}
    </div>
  );
}

// One labeled figure in the UnitSnapshot grid above.
function SnapshotStat({ label, value, accent }) {
  return (
    <div>
      <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>
        {label}
      </div>
      <div className="font-mono text-sm font-semibold mt-0.5" style={{ color: accent || 'var(--ink)' }}>
        {value}
      </div>
    </div>
  );
}
