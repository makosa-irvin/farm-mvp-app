import { useState } from 'react';
import { Info, Trash2, Pencil, X, Save } from 'lucide-react';
import FieldLabel from '../components/FieldLabel.jsx';
import { inputClass, inputStyle } from '../lib/styleTokens.js';
import { EXPENSE_CATEGORIES } from '../constants.js';
import { uid, todayISO, fmtMoney } from '../lib/helpers.js';

// Record and edit expenses. An expense can optionally be linked to an
// inventory item + purchased quantity, which turns it into a stock
// purchase — see src/lib/expenseLinking.js for what that actually does
// (it's not just metadata: saving here moves real inventory).
export default function ExpensesView({ units, inventory = [], expenses, onAdd, onUpdate, onRemove }) {
  const [category, setCategory] = useState('feed');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [unitId, setUnitId] = useState('');
  const [description, setDescription] = useState('');
  const [inventoryItemId, setInventoryItemId] = useState('');
  const [inventoryQuantity, setInventoryQuantity] = useState('');
  const [editingId, setEditingId] = useState(null);

  function reset() {
    setCategory('feed');
    setAmount('');
    setDate(todayISO());
    setUnitId('');
    setDescription('');
    setInventoryItemId('');
    setInventoryQuantity('');
    setEditingId(null);
  }

  function edit(e) {
    setEditingId(e.id);
    setCategory(e.category);
    setAmount(String(e.amount));
    setDate(e.date);
    setUnitId(e.unitId || '');
    setDescription(e.description || '');
    setInventoryItemId(e.inventoryItemId || '');
    setInventoryQuantity(String(e.inventoryQuantity || ''));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function submit(ev) {
    ev.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    const record = {
      id: editingId || uid('exp'),
      category,
      amount: amt,
      date,
      unitId: unitId || null,
      description: description.trim(),
      inventoryItemId: inventoryItemId || null,
      // Only meaningful when an item is selected — the field itself is
      // disabled otherwise (see the input below).
      inventoryQuantity: inventoryItemId ? (Number(inventoryQuantity) || null) : null,
      createdAt: editingId ? (expenses.find((x) => x.id === editingId)?.createdAt || Date.now()) : Date.now(),
    };
    // onAdd/onUpdate can return false — e.g. reducing a purchase's quantity
    // below what's already been consumed is rejected (see expenseActions.js).
    // Only clear the form once the save actually went through, so a
    // rejected save doesn't silently discard what the user typed.
    const saved = editingId ? onUpdate(record) : onAdd(record);
    if (saved !== false) reset();
  }

  const recent = [...expenses].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 10);

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="font-display text-lg font-semibold">{editingId ? 'Edit expense' : 'Record an expense'}</div>

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

        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <FieldLabel>Inventory item — optional</FieldLabel>
            <select value={inventoryItemId} onChange={(e) => setInventoryItemId(e.target.value)} className={inputClass} style={inputStyle}>
              <option value="">Not an inventory purchase</option>
              {inventory.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Purchased quantity — optional</FieldLabel>
            <input
              type="number" min="0.01" step="0.01" value={inventoryQuantity}
              onChange={(e) => setInventoryQuantity(e.target.value)}
              disabled={!inventoryItemId}
              required={!!inventoryItemId}
              placeholder="e.g. 50"
              className={inputClass} style={inputStyle}
            />
          </div>
        </div>

        <div>
          <FieldLabel>Description — optional</FieldLabel>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. 50kg layer mash, Supplier X" className={inputClass} style={inputStyle} />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button type="submit" className="btn-primary rounded-xl px-5 py-2.5 text-sm flex items-center gap-2">
            <Save size={15} />
            {editingId ? 'Save changes' : 'Save expense'}
          </button>
          {editingId && (
            <button type="button" onClick={reset} className="btn-ghost rounded-xl px-4 py-2.5 text-sm flex items-center gap-2">
              <X size={15} />
              Cancel
            </button>
          )}
        </div>

        <div className="flex items-start gap-2 text-xs pt-1" style={{ color: 'var(--ink-soft)' }}>
          <Info size={13} className="mt-0.5 shrink-0" />
          <span>Link an expense to an inventory item and purchased quantity when it represents a stock purchase — this automatically adds that quantity to stock and sets its unit cost from the amount you spent.</span>
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
                      <div className="flex justify-end gap-1">
                        <button onClick={() => edit(e)} className="p-1 rounded hover:bg-black/5" aria-label="Edit expense">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => onRemove(e.id)} className="p-1 rounded hover:bg-black/5" aria-label="Delete expense">
                          <Trash2 size={14} />
                        </button>
                      </div>
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
