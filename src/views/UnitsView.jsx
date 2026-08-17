import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import FieldLabel from '../components/FieldLabel.jsx';
import { inputClass, inputStyle } from '../lib/styleTokens.js';
import { UNIT_TYPES } from '../constants.js';
import { uid, todayISO, typeOf, currentCountFor, fmtNum } from '../lib/helpers.js';

export default function UnitsView({ units, logs, onAdd, onRemove }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('eggs');
  const [initialCount, setInitialCount] = useState('');
  const [startDate, setStartDate] = useState(todayISO());

  function submit(ev) {
    ev.preventDefault();
    if (!name.trim()) return;
    onAdd({
      id: uid('unit'),
      name: name.trim(),
      type,
      initialCount: Number(initialCount) || 0,
      startDate,
      createdAt: Date.now(),
    });
    setName(''); setInitialCount('');
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="font-display text-lg font-semibold">Add a production unit</div>
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
          <FieldLabel>Start date</FieldLabel>
          <input type="date" value={startDate} max={todayISO()} onChange={(e) => setStartDate(e.target.value)} className={inputClass} style={inputStyle} />
        </div>
        <button type="submit" className="btn-primary rounded-xl px-5 py-2.5 text-sm w-full sm:w-auto">
          Add unit
        </button>
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
                      {typeOf(u).label} · {fmtNum(live)} live · since {u.startDate}
                    </div>
                  </div>
                </div>
                <button onClick={() => onRemove(u.id)} className="p-1.5 rounded hover:bg-black/5" aria-label={`Remove ${u.name}`}>
                  <Trash2 size={15} style={{ color: 'var(--ink-soft)' }} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
