import { Fragment, useState } from 'react';
import { Info, Trash2, Pencil, X, Save, ChevronDown, ChevronUp, PackageMinus } from 'lucide-react';
import FieldLabel from '../components/FieldLabel.jsx';
import { inputClass, inputStyle } from '../lib/styleTokens.js';
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../constants.js';
import { uid, todayISO, fmtMoney, fmtNum } from '../lib/helpers.js';

// Records both kinds of farm cost: actual cash payments (the form below),
// and non-cash costs the app generates automatically when stock is used,
// lost, or written down (see buildInventoryCostExpense in
// inventoryActions.js). Buying stock is a cash payment and creates
// inventory; using/losing it later becomes a non-cash cost at the
// inventory ledger's weighted-average value. Recognizing the cost at
// consumption rather than at purchase avoids charging the same money
// twice while still tracking what the farm actually used.
//
// Supplier and payment method are both optional and don't drive any
// calculation today — they're recorded so questions like "which supplier
// costs more" or "how much of my spend is cash vs M-Pesa" become
// answerable later, once enough expenses carry them.
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
  // Which row's detail panel is open in the "Recent money & costs" table
  // below. Only one at a time — opening a new row closes whichever was open.
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

  function edit(expense) {
    setEditingId(expense.id);
    setCategory(expense.category);
    setAmount(String(expense.amount));
    setDate(expense.date);
    setUnitId(expense.unitId || '');
    setDescription(expense.description || '');
    setSupplier(expense.supplier || '');
    setPaymentMethod(expense.paymentMethod || '');
    setInventoryItemId(expense.inventoryItemId || '');
    setInventoryQuantity(String(expense.inventoryQuantity || ''));
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
      inventoryQuantity: inventoryItemId ? Number(inventoryQuantity) || null : null,
      createdAt: editingId ? expenses.find((x) => x.id === editingId)?.createdAt || Date.now() : Date.now(),
    };
    // onAdd/onUpdate can return false — e.g. reducing a purchase's quantity
    // below what's already been consumed is rejected (see
    // expenseActions.js). Only clear the form once the save actually went
    // through, so a rejected save doesn't silently discard what was typed.
    const saved = editingId ? onUpdate(record) : onAdd(record);
    if (saved !== false) reset();
  }

  const recent = [...expenses].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 10);

  // Real expenses use their EXPENSE_CATEGORIES label ("Feed", "Labor",
  // etc.). Synthetic non-cash entries (see the isNonCash note below) carry
  // an `expenseType` instead of a normal category and get their own labels.
  const expenseLabel = (expense) => {
    if (expense.expenseType === 'inventory_loss') return 'Stock loss / spoilage';
    if (expense.expenseType === 'inventory_deduction') return 'Stock used / deduction';
    return EXPENSE_CATEGORIES.find((c) => c.value === expense.category)?.label || expense.category;
  };

  return (
    <div className="space-y-6">
      <section>
        <div className="font-display text-2xl font-semibold">Money spent &amp; farm costs</div>
        <div className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
          Money you paid is shown alongside the value of stock your farm used, lost, or spoiled.
        </div>
      </section>

      <form
        onSubmit={submit}
        className="rounded-2xl p-5 space-y-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
      >
        <div className="font-display text-lg font-semibold">{editingId ? 'Edit money spent' : 'Record money spent'}</div>

        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <FieldLabel>What was it for?</FieldLabel>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} style={inputStyle}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>How much did you pay? (KSh)</FieldLabel>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              required
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <FieldLabel>When?</FieldLabel>
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              required
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div>
            <FieldLabel>Which farm group? (optional)</FieldLabel>
            <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className={inputClass} style={inputStyle}>
              <option value="">Shared across farm</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <FieldLabel>Did you buy stock? (optional)</FieldLabel>
            <select value={inventoryItemId} onChange={(e) => setInventoryItemId(e.target.value)} className={inputClass} style={inputStyle}>
              <option value="">No</option>
              {inventory.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.unit})
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>How much stock?</FieldLabel>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={inventoryQuantity}
              onChange={(e) => setInventoryQuantity(e.target.value)}
              disabled={!inventoryItemId}
              required={!!inventoryItemId}
              placeholder="e.g. 50"
              className={inputClass}
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <FieldLabel>Note (optional)</FieldLabel>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 50 kg layer mash"
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <FieldLabel>Who did you buy from? (optional)</FieldLabel>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="e.g. local agrovet"
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div>
            <FieldLabel>How did you pay? (optional)</FieldLabel>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className={inputClass} style={inputStyle}>
              <option value="">Not recorded</option>
              {PAYMENT_METHODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button type="submit" className="btn-primary rounded-xl px-5 py-2.5 text-sm flex items-center gap-2">
            <Save size={15} />
            {editingId ? 'Save changes' : 'Save'}
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
          <span>
            When you buy stock, the money you pay is recorded now. When the stock is later used, lost, or spoiled, its value becomes a farm
            cost without counting another cash payment.
          </span>
        </div>
      </form>

      {recent.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <div className="px-5 pt-4 pb-3 font-display text-lg font-semibold" style={{ borderBottom: '1px solid var(--line)' }}>
            Recent money &amp; costs
          </div>
          <div className="text-xs px-5 pb-2" style={{ color: 'var(--ink-soft)' }}>
            Stock used, lost, or spoiled is shown here as a farm cost. It does not mean you paid money again.
          </div>
          <table className="w-full text-sm ledger-table">
            <tbody>
              {recent.map((expense) => {
                const unit = units.find((u) => u.id === expense.unitId);
                const item = inventory.find((i) => i.id === expense.inventoryItemId);
                const isExpanded = expandedId === expense.id;
                const hasDetail = expense.description || expense.supplier || expense.paymentMethod || item || expense.nonCash;

                return (
                  <Fragment key={expense.id}>
                    <tr
                      className="font-mono cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : expense.id)}
                      style={{ background: isExpanded ? 'var(--surface-alt)' : undefined }}
                    >
                      <td className="px-5 py-2.5" style={{ color: 'var(--ink-soft)' }}>
                        {expense.date}
                      </td>
                      <td className="px-3 py-2.5 font-sans">
                        <span className="inline-flex items-center gap-1.5">
                          {expense.nonCash && <PackageMinus size={13} style={{ color: 'var(--rust)' }} />}
                          {expenseLabel(expense)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-sans" style={{ color: 'var(--ink-soft)' }}>
                        {unit ? unit.name : <span style={{ color: 'var(--amber)' }}>Shared farm cost</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right">{fmtMoney(expense.amount)}</td>
                      <td className="px-5 py-2.5 text-right">
                        <div className="flex justify-end items-center gap-1">
                          {hasDetail && (isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
                          {/*
                            Non-cash rows (expense.nonCash) are auto-created
                            by inventoryActions.js when stock is used, lost,
                            or written down — see buildInventoryCostExpense.
                            They have NO edit/delete buttons here, on
                            purpose: expenseActions.js's edit/delete logic
                            only understands the opposite direction of link
                            (a cash expense that creates a purchase
                            transaction), not this reverse one. Confirmed
                            directly that letting these through that path
                            corrupts the inventory ledger — deleting one
                            orphaned the real inventory transaction (the
                            cost kept counting, invisibly), and editing one
                            fabricated a fake purchase transaction that
                            silently canceled out the real loss. The actual
                            correction belongs in Stock, where
                            inventoryActions.js keeps this synthetic record
                            in sync automatically. expenseActions.js also
                            guards this at the action layer, not just here
                            — this UI-level omission is defense in depth,
                            not the only thing preventing it.
                          */}
                          {!expense.nonCash && (
                            <>
                              <button
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  edit(expense);
                                }}
                                className="p-1 rounded hover:bg-black/5"
                                aria-label="Edit expense"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  onRemove(expense.id);
                                }}
                                className="p-1 rounded hover:bg-black/5"
                                aria-label="Delete expense"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ background: 'var(--surface-alt)' }}>
                        <td colSpan={5} className="px-5 pb-3 pt-0 font-sans">
                          <div
                            className="rounded-xl p-3 space-y-1.5 text-xs"
                            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
                          >
                            {expense.nonCash && (
                              <div>
                                <span style={{ color: 'var(--ink-soft)' }}>What this means: </span>
                                This is the value of stock the farm used or lost. No new cash payment was recorded.
                              </div>
                            )}
                            {expense.nonCash && (
                              <div style={{ color: 'var(--ink-soft)' }}>
                                To correct this, go to Stock and edit or remove the update there — it will update here automatically.
                              </div>
                            )}
                            {expense.description && (
                              <div>
                                <span style={{ color: 'var(--ink-soft)' }}>Note: </span>
                                {expense.description}
                              </div>
                            )}
                            {expense.supplier && (
                              <div>
                                <span style={{ color: 'var(--ink-soft)' }}>Bought from: </span>
                                {expense.supplier}
                              </div>
                            )}
                            {expense.paymentMethod && (
                              <div>
                                <span style={{ color: 'var(--ink-soft)' }}>Paid by: </span>
                                {PAYMENT_METHODS.find((p) => p.value === expense.paymentMethod)?.label || expense.paymentMethod}
                              </div>
                            )}
                            {item && (
                              <div>
                                <span style={{ color: 'var(--ink-soft)' }}>{expense.nonCash ? 'Stock changed: ' : 'Stock added: '}</span>
                                {fmtNum(expense.inventoryQuantity, 2)} {item.unit} of {item.name}
                              </div>
                            )}
                            {!hasDetail && <div style={{ color: 'var(--ink-soft)' }}>No extra detail recorded.</div>}
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
