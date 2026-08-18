import { Fragment, useState } from 'react';
import { Info, Trash2, Pencil, X, Save, ChevronDown, ChevronUp } from 'lucide-react';
import FieldLabel from '../components/FieldLabel.jsx';
import { inputClass, inputStyle } from '../lib/styleTokens.js';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../constants.js';
import { uid, todayISO, fmtMoney, fmtNum } from '../lib/helpers.js';

// Record and edit expenses. An expense can optionally be linked to an
// inventory item + purchased quantity, which turns it into a stock
// purchase — see src/lib/expenseLinking.js for what that actually does
// (it's not just metadata: saving here moves real inventory).
//
// Supplier and payment method are both optional and don't drive any
// calculation today — they're recorded so questions like "which supplier
// costs more" or "how much of my spend is cash vs M-Pesa" become
// answerable later, once enough expenses carry them. Recorded, not
// required: nothing about the core flow (log an expense fast) should get
// slower for someone who doesn't want to bother with them.
export default function ExpensesView({ units, inventory = [], expenses, onAdd, onUpdate, onRemove }) {
  const [category, setCategory] = useState('feed');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [unitId, setUnitId] = useState('');
  const [description, setDescription] = useState('');
  const [supplier, setSupplier] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [inventoryItemId, setInventoryItemId] = useState('');
  const [inventoryQuantity, setInventoryQuantity] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  function reset() {
    setCategory('feed');
    setAmount('');
    setDate(todayISO());
    setUnitId('');
    setDescription('');
    setSupplier('');
    setPaymentMethod('');
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
    setSupplier(e.supplier || '');
    setPaymentMethod(e.paymentMethod || '');
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
      supplier: supplier.trim() || null,
      paymentMethod: paymentMethod || null,
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
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. 50kg layer mash" className={inputClass} style={inputStyle} />
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <FieldLabel>Supplier — optional</FieldLabel>
            <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. Wanjiku Agrovet" className={inputClass} style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Paid by — optional</FieldLabel>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputClass} style={inputStyle}>
              <option value="">Not recorded</option>
              {PAYMENT_METHODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
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
          <div className="text-xs px-5 pb-2" style={{ color: 'var(--ink-soft)' }}>Tap a row to see more detail.</div>
          <table className="w-full text-sm ledger-table">
            <tbody>
              {recent.map((e) => {
                const u = units.find((x) => x.id === e.unitId);
                const item = inventory.find((i) => i.id === e.inventoryItemId);
                const isExpanded = expandedId === e.id;
                const hasDetail = e.description || e.supplier || e.paymentMethod || item;
                return (
                  <Fragment key={e.id}>
                    <tr
                      className="font-mono cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : e.id)}
                      style={{ background: isExpanded ? 'var(--surface-alt)' : undefined }}
                    >
                      <td className="px-5 py-2.5" style={{ color: 'var(--ink-soft)' }}>{e.date}</td>
                      <td className="px-3 py-2.5 font-sans capitalize">{EXPENSE_CATEGORIES.find((c) => c.value === e.category)?.label}</td>
                      <td className="px-3 py-2.5 font-sans" style={{ color: 'var(--ink-soft)' }}>
                        {u ? u.name : <span style={{ color: 'var(--amber)' }}>Unallocated</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right">{fmtMoney(e.amount)}</td>
                      <td className="px-5 py-2.5 text-right">
                        <div className="flex justify-end items-center gap-1">
                          {hasDetail && (isExpanded ? <ChevronUp size={13} style={{ color: 'var(--ink-soft)' }} /> : <ChevronDown size={13} style={{ color: 'var(--ink-soft)' }} />)}
                          <button onClick={(ev) => { ev.stopPropagation(); edit(e); }} className="p-1 rounded hover:bg-black/5" aria-label="Edit expense">
                            <Pencil size={14} />
                          </button>
                          <button onClick={(ev) => { ev.stopPropagation(); onRemove(e.id); }} className="p-1 rounded hover:bg-black/5" aria-label="Delete expense">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ background: 'var(--surface-alt)' }}>
                        <td colSpan={5} className="px-5 pb-3 pt-0 font-sans">
                          <div className="rounded-xl p-3 space-y-1.5 text-xs" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
                            {e.description && (
                              <div><span style={{ color: 'var(--ink-soft)' }}>Note: </span>{e.description}</div>
                            )}
                            {e.supplier && (
                              <div><span style={{ color: 'var(--ink-soft)' }}>Supplier: </span>{e.supplier}</div>
                            )}
                            {e.paymentMethod && (
                              <div><span style={{ color: 'var(--ink-soft)' }}>Paid by: </span>{PAYMENT_METHODS.find((p) => p.value === e.paymentMethod)?.label || e.paymentMethod}</div>
                            )}
                            {item && (
                              <div>
                                <span style={{ color: 'var(--ink-soft)' }}>Added to stock: </span>
                                {fmtNum(e.inventoryQuantity, 2)} {item.unit} of {item.name}
                              </div>
                            )}
                            {!hasDetail && <div style={{ color: 'var(--ink-soft)' }}>No extra detail recorded for this expense.</div>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
