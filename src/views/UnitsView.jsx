import { useState } from 'react';
import { Trash2, Pencil, X, Save } from 'lucide-react';
import FieldLabel from '../components/FieldLabel.jsx';
import { inputClass, inputStyle } from '../lib/styleTokens.js';
import { UNIT_TYPES } from '../constants.js';
import { uid, todayISO, typeOf, currentCountFor, fmtNum, fmtMoney } from '../lib/helpers.js';

// Add, edit, and remove production units (flocks, herds, plots). Every
// other view depends on at least one unit existing, so this is usually the
// first screen a new farm actually needs to use.
export default function UnitsView({ units, logs, onAdd, onUpdate, onRemove }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('eggs');
  const [initialCount, setInitialCount] = useState('');
  const [producePrice, setProducePrice] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [editingId, setEditingId] = useState(null);

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
            return (
              <div key={u.id} className="flex items-center justify-between rounded-2xl px-5 py-3.5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--forest-tint)' }}>
                    <Icon size={16} style={{ color: 'var(--forest)' }} />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{u.name}</div>
                    <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>
                      {typeOf(u).label} · {fmtNum(live)} live · {u.producePrice ? `${fmtMoney(Number(u.producePrice), 2)} / ${typeOf(u).groupLabel}` : 'price not set'} · since {u.startDate}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => editUnit(u)} className="p-1.5 rounded hover:bg-black/5" aria-label={`Edit ${u.name}`}>
                    <Pencil size={15} style={{ color: 'var(--ink-soft)' }} />
                  </button>
                  <button onClick={() => onRemove(u.id)} className="p-1.5 rounded hover:bg-black/5" aria-label={`Remove ${u.name}`}>
                    <Trash2 size={15} style={{ color: 'var(--ink-soft)' }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
