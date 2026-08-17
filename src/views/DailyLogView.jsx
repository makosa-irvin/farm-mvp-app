import { useEffect, useState } from 'react';
import { ClipboardList, Trash2 } from 'lucide-react';
import TagChip from '../components/TagChip.jsx';
import FieldLabel from '../components/FieldLabel.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { inputClass, inputStyle } from '../lib/styleTokens.js';
import { UNIT_TYPES } from '../constants.js';
import { uid, todayISO, typeOf, fmtNum } from '../lib/helpers.js';

export default function DailyLogView({ units, logs, onAdd, onRemove, goTo }) {
  const [unitId, setUnitId] = useState(units[0]?.id || '');
  const [date, setDate] = useState(todayISO());
  const [large, setLarge] = useState('');
  const [medium, setMedium] = useState('');
  const [small, setSmall] = useState('');
  const [broken, setBroken] = useState('');
  const [qty, setQty] = useState('');
  const [loss, setLoss] = useState('');
  const [feedKg, setFeedKg] = useState('');
  const [mortality, setMortality] = useState('');
  const [notes, setNotes] = useState('');

  const unit = units.find((u) => u.id === unitId);

  useEffect(() => {
    if (!unitId && units[0]) setUnitId(units[0].id);
  }, [units]);

  if (units.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Add a unit before logging"
        body="Daily logs are recorded against a specific flock, herd, or plot."
        actionLabel="Add a production unit"
        onAction={() => goTo('units')}
      />
    );
  }

  const t = unit ? typeOf(unit) : UNIT_TYPES[0];

  function reset() {
    setLarge(''); setMedium(''); setSmall(''); setBroken('');
    setQty(''); setLoss(''); setFeedKg(''); setMortality(''); setNotes('');
  }

  function submit(ev) {
    ev.preventDefault();
    if (!unit) return;
    let produced = 0;
    let grades = null;
    if (t.hasGrades) {
      const L = Number(large) || 0, M = Number(medium) || 0, S = Number(small) || 0;
      produced = L + M + S;
      grades = { large: L, medium: M, small: S };
    } else {
      produced = Number(qty) || 0;
    }
    const entry = {
      id: uid('log'),
      unitId: unit.id,
      date,
      produced,
      grades,
      loss: t.hasGrades ? (Number(broken) || 0) : (Number(loss) || 0),
      feedKg: Number(feedKg) || 0,
      mortality: Number(mortality) || 0,
      notes: notes.trim(),
      createdAt: Date.now(),
    };
    onAdd(entry, unit);
    reset();
  }

  const recent = logs
    .filter((l) => l.unitId === unitId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <FieldLabel>Production unit</FieldLabel>
        <div className="flex gap-2 flex-wrap">
          {units.map((u) => {
            const Icon = typeOf(u).icon;
            return <TagChip key={u.id} label={u.name} icon={Icon} active={u.id === unitId} onClick={() => setUnitId(u.id)} />;
          })}
        </div>
      </div>

      <form onSubmit={submit} className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <FieldLabel>Date</FieldLabel>
            <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} required className={inputClass} style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Mortality / losses (animals)</FieldLabel>
            <input type="number" min="0" value={mortality} onChange={(e) => setMortality(e.target.value)} placeholder="0" className={inputClass} style={inputStyle} />
          </div>
        </div>

        {t.hasGrades ? (
          <div>
            <FieldLabel>Eggs collected, by grade</FieldLabel>
            <div className="grid grid-cols-4 gap-2.5">
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--ink-soft)' }}>Large</div>
                <input type="number" min="0" value={large} onChange={(e) => setLarge(e.target.value)} placeholder="0" className={inputClass} style={inputStyle} />
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--ink-soft)' }}>Medium</div>
                <input type="number" min="0" value={medium} onChange={(e) => setMedium(e.target.value)} placeholder="0" className={inputClass} style={inputStyle} />
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--ink-soft)' }}>Small</div>
                <input type="number" min="0" value={small} onChange={(e) => setSmall(e.target.value)} placeholder="0" className={inputClass} style={inputStyle} />
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--ink-soft)' }}>Broken</div>
                <input type="number" min="0" value={broken} onChange={(e) => setBroken(e.target.value)} placeholder="0" className={inputClass} style={inputStyle} />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <FieldLabel>Quantity produced ({t.unitLabel})</FieldLabel>
              <input type="number" min="0" step="0.1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <FieldLabel>Loss / spoilage ({t.unitLabel})</FieldLabel>
              <input type="number" min="0" step="0.1" value={loss} onChange={(e) => setLoss(e.target.value)} placeholder="0" className={inputClass} style={inputStyle} />
            </div>
          </div>
        )}

        <div>
          <FieldLabel>Feed consumed (kg) — optional</FieldLabel>
          <input type="number" min="0" step="0.1" value={feedKg} onChange={(e) => setFeedKg(e.target.value)} placeholder="0" className={inputClass} style={inputStyle} />
        </div>

        <div>
          <FieldLabel>Notes — optional</FieldLabel>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Anything worth remembering about today" className={inputClass} style={inputStyle} />
        </div>

        <button type="submit" className="btn-primary rounded-xl px-5 py-2.5 text-sm w-full sm:w-auto">
          Save log entry
        </button>
      </form>

      {recent.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <div className="px-5 pt-4 pb-3 font-display text-lg font-semibold" style={{ borderBottom: '1px solid var(--line)' }}>
            Recent entries — {unit?.name}
          </div>
          <table className="w-full text-sm ledger-table">
            <tbody>
              {recent.map((l) => (
                <tr key={l.id} className="font-mono">
                  <td className="px-5 py-2.5" style={{ color: 'var(--ink-soft)' }}>{l.date}</td>
                  <td className="px-3 py-2.5 text-right">{fmtNum(l.produced)} {t.unitLabel}</td>
                  <td className="px-3 py-2.5 text-right" style={{ color: l.mortality > 0 ? 'var(--rust)' : 'var(--ink-soft)' }}>
                    {l.mortality > 0 ? `${l.mortality} lost` : '—'}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <button onClick={() => onRemove(l.id)} className="p-1 rounded hover:bg-black/5" aria-label="Delete entry">
                      <Trash2 size={14} style={{ color: 'var(--ink-soft)' }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
