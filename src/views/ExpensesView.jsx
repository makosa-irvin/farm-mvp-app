import { useState } from 'react';
import { Info, Trash2 } from 'lucide-react';
import FieldLabel from '../components/FieldLabel.jsx';
import { inputClass, inputStyle } from '../lib/styleTokens.js';
import { EXPENSE_CATEGORIES } from '../constants.js';
import { uid, todayISO, fmtMoney } from '../lib/helpers.js';

export default function ExpensesView({ units, expenses, onAdd, onRemove }) {
  const [category, setCategory] = useState('feed');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [unitId, setUnitId] = useState('');
  const [description, setDescription] = useState('');

  function submit(ev) {
    ev.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    onAdd({
      id: uid('exp'),
      category,
      amount: amt,
      date,
      unitId: unitId || null,
      description: description.trim(),
      createdAt: Date.now(),
    });
    setAmount(''); setDescription('');
  }

  const recent = [...expenses].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 10);

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <FieldLabel>Category</FieldLabel>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} style={inputStyle}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Amount</FieldLabel>
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required className={inputClass} style={inputStyle} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <FieldLabel>Date</FieldLabel>
            <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} required className={inputClass} style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Production unit</FieldLabel>
            <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className={inputClass} style={inputStyle}>
              <option value="">Unallocated (shared cost)</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <FieldLabel>Description — optional</FieldLabel>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. 50kg layer mash, Supplier X" className={inputClass} style={inputStyle} />
        </div>
        <button type="submit" className="btn-primary rounded-xl px-5 py-2.5 text-sm w-full sm:w-auto">
          Save expense
        </button>
        <div className="flex items-start gap-2 text-xs pt-1" style={{ color: 'var(--ink-soft)' }}>
          <Info size={13} className="mt-0.5 shrink-0" />
          <span>Costs left "unallocated" (labor across units, whole-farm utilities, depreciation) aren't in any single unit's cost-per-unit yet — splitting them fairly is a Phase 2 feature.</span>
        </div>
      </form>

      {recent.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <div className="px-5 pt-4 pb-3 font-display text-lg font-semibold" style={{ borderBottom: '1px solid var(--line)' }}>
            Recent expenses
          </div>
          <table className="w-full text-sm ledger-table">
            <tbody>
              {recent.map((e) => {
                const u = units.find((x) => x.id === e.unitId);
                return (
                  <tr key={e.id} className="font-mono">
                    <td className="px-5 py-2.5" style={{ color: 'var(--ink-soft)' }}>{e.date}</td>
                    <td className="px-3 py-2.5 font-sans capitalize">{EXPENSE_CATEGORIES.find((c) => c.value === e.category)?.label}</td>
                    <td className="px-3 py-2.5 font-sans" style={{ color: 'var(--ink-soft)' }}>
                      {u ? u.name : <span style={{ color: 'var(--amber)' }}>Unallocated</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">{fmtMoney(e.amount)}</td>
                    <td className="px-5 py-2.5 text-right">
                      <button onClick={() => onRemove(e.id)} className="p-1 rounded hover:bg-black/5" aria-label="Delete expense">
                        <Trash2 size={14} style={{ color: 'var(--ink-soft)' }} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
