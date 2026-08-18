import { useMemo, useState } from 'react';
import { Boxes, Trash2, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, Pencil, X, Save, Scale, ShoppingBasket, PackageMinus, SlidersHorizontal } from 'lucide-react';
import FieldLabel from '../components/FieldLabel.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { inputClass, inputStyle } from '../lib/styleTokens.js';
import { uid, todayISO, fmtNum, fmtMoney } from '../lib/helpers.js';

const DEFAULT_CATEGORIES = ['Feed', 'Seed', 'Fertilizer', 'Medicine', 'Packaging', 'Fuel', 'Supplies', 'Other'];

// Two independent things live on this page:
//  1. Inventory items — what you track (name, category, unit, low-stock warning level).
//  2. The transaction ledger — every movement of stock in or out. Balances
//     are always *derived* from the ledger (opening stock + sum of
//     transactions), never stored or edited directly, so they can't drift.
//
// Most day-to-day stock movement happens automatically elsewhere — a feed
// expense creates a purchase transaction (src/lib/expenseLinking.js), a
// daily log's feed use creates a consumption transaction
// (src/lib/feedLinking.js). The "Update your stock" form here is the
// manual/general path.
//
// UI note: the transaction-type picker defaults to just two big buttons —
// "I bought stock" and "I used stock" — since that covers almost every
// real update. The other seven types (returns, transfers, corrections,
// counts, sales) are real but rare, and are tucked behind "Something
// else?" rather than sitting in one dropdown with equal visual weight to
// the common case. Editing an existing entry of one of those rarer types
// opens straight into the advanced picker, since the simple two-button
// view can't represent it.
export default function InventoryView({ inventory, units = [], expenses = [], moves, onAddItem, onUpdateItem, onRemoveItem, onAddMove, onUpdateMove, onRemoveMove, getExpenseUnitCost, transactionTypes = [] }) {
  // --- "add inventory item" form state ---
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Feed');
  const [unit, setUnit] = useState('kg');
  const [openingStock, setOpeningStock] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);

  // --- "update your stock" form state ---
  const [moveItemId, setMoveItemId] = useState(inventory[0]?.id || '');
  const [moveType, setMoveType] = useState('purchase');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [moveQty, setMoveQty] = useState('');
  const [moveCountQty, setMoveCountQty] = useState('');
  const [moveDate, setMoveDate] = useState(todayISO());
  const [moveNote, setMoveNote] = useState('');
  const [expenseId, setExpenseId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [destinationUnitId, setDestinationUnitId] = useState('');
  const [editingMoveId, setEditingMoveId] = useState(null);

  // Current balance per item, derived fresh from opening stock + every
  // transaction — never read from a stored field on the item itself.
  const balances = useMemo(
    () =>
      Object.fromEntries(
        inventory.map((item) => [
          item.id,
          (item.openingStock || 0) +
            moves
              .filter((m) => m.itemId === item.id)
              .reduce((s, m) => s + ((m.direction || m.type) === 'in' ? Number(m.quantity) : -Number(m.quantity)), 0),
        ])
      ),
    [inventory, moves]
  );

  // Expenses eligible to be linked to a *manual* purchase transaction here.
  // Excludes any expense that already auto-created its own purchase
  // transaction (see expenseLinking.js) — otherwise the same purchase could
  // be linked twice and double-count the stock increase.
  const purchaseExpenses = expenses.filter(
    (e) => e.inventoryItemId && Number(e.inventoryQuantity) > 0 && inventory.some((i) => i.id === e.inventoryItemId) && !moves.some((m) => m.source === 'expense-purchase' && m.sourceId === e.id)
  );
  const selectedExpense = purchaseExpenses.find((e) => e.id === expenseId);
  const selectedExpenseUnitCost = selectedExpense ? getExpenseUnitCost(selectedExpense) : null;

  function resetItem() {
    setName('');
    setCategory('Feed');
    setUnit('kg');
    setOpeningStock('');
    setReorderLevel('');
    setUnitCost('');
    setEditingItemId(null);
  }

  function editItem(i) {
    setEditingItemId(i.id);
    setName(i.name);
    setCategory(i.category);
    setUnit(i.unit);
    setOpeningStock(String(i.openingStock || 0));
    setReorderLevel(String(i.reorderLevel || 0));
    setUnitCost(String(i.unitCost || 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function addItem(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const r = {
      id: editingItemId || uid('inv'),
      name: name.trim(),
      category,
      unit,
      openingStock: Number(openingStock) || 0,
      reorderLevel: Number(reorderLevel) || 0,
      unitCost: Number(unitCost) || 0,
      createdAt: editingItemId ? (inventory.find((i) => i.id === editingItemId)?.createdAt || Date.now()) : Date.now(),
    };
    editingItemId ? onUpdateItem(r) : onAddItem(r);
    resetItem();
  }

  function resetMove() {
    setMoveQty('');
    setMoveCountQty('');
    setMoveNote('');
    setExpenseId('');
    setEditingMoveId(null);
    setMoveDate(todayISO());
    setMoveType('purchase');
    setShowAdvanced(false);
    setUnitId('');
    setDestinationUnitId('');
    if (inventory[0]) setMoveItemId(inventory[0].id);
  }

  function editMove(m) {
    const type = m.transactionType || (m.type === 'in' ? 'purchase' : 'consumption');
    setEditingMoveId(m.id);
    setMoveItemId(m.itemId);
    setMoveType(type);
    // The simple two-button picker can only represent purchase/consumption
    // — anything else needs the full picker open right away so the type
    // being edited is actually visible and changeable.
    setShowAdvanced(type !== 'purchase' && type !== 'consumption');
    setMoveQty(String(m.quantity || ''));
    setMoveCountQty(String(m.countQuantity ?? ''));
    setMoveDate(m.date);
    setMoveNote(m.note || '');
    setExpenseId(m.expenseId || '');
    setUnitId(m.sourceUnitId || m.unitId || '');
    setDestinationUnitId(m.destinationUnitId || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function addMove(e) {
    e.preventDefault();
    const item = inventory.find((i) => i.id === moveItemId);
    if (!item) return;

    const current = editingMoveId ? moves.find((m) => m.id === editingMoveId) : null;
    const isCount = moveType === 'stock_count';
    const qty = Number(moveQty);
    const countQty = Number(moveCountQty);
    if (!moveItemId || (!isCount && (!qty || qty <= 0)) || (isCount && (!Number.isFinite(countQty) || countQty < 0))) return;

    // If a purchase expense was picked, its derived cost (amount / quantity)
    // wins over the item's fallback unit cost.
    const selectedExpense = purchaseExpenses.find((e) => e.id === expenseId);
    const effectiveCost = moveType === 'purchase' && selectedExpenseUnitCost != null ? selectedExpenseUnitCost : Number(item.unitCost) || 0;
    const typeMeta = transactionTypes.find((t) => t.value === moveType);

    const r = {
      id: editingMoveId || uid('txn'),
      itemId: moveItemId,
      transactionType: moveType,
      // Stock counts don't have a "quantity" the user enters directly — the
      // action layer (inventoryActions.js) computes the actual in/out
      // adjustment from the counted total vs. current balance.
      quantity: isCount ? 0 : qty,
      countQuantity: isCount ? countQty : undefined,
      unit: item.unit,
      date: moveDate,
      note: moveNote.trim(),
      expenseId: moveType === 'purchase' ? (expenseId || null) : null,
      unitCost: effectiveCost,
      source: current?.source || 'manual',
      sourceId: current?.sourceId || null,
      unitId: unitId || current?.unitId || null,
      sourceUnitId: unitId || current?.sourceUnitId || null,
      destinationUnitId: destinationUnitId || current?.destinationUnitId || null,
      createdAt: editingMoveId ? (current?.createdAt || Date.now()) : Date.now(),
      type: typeMeta?.direction || current?.type || 'in',
    };
    // onAddMove/onUpdateMove can return false — e.g. a transfer or an
    // outgoing transaction that exceeds available stock is rejected. Only
    // clear the form once the save actually went through.
    const saved = editingMoveId ? onUpdateMove(r) : onAddMove(r);
    if (saved !== false) resetMove();
  }

  const recentMoves = [...moves].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt).slice(0, 10);

  return (
    <div className="space-y-6">
      <form onSubmit={addItem} className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="font-display text-lg font-semibold">{editingItemId ? 'Edit stock item' : 'Add a stock item'}</div>

        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <FieldLabel>Item name</FieldLabel>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Layer mash" required className={inputClass} style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Category</FieldLabel>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} style={inputStyle}>
              {DEFAULT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          <div>
            <FieldLabel>Unit</FieldLabel>
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg, litre, bag..." required className={inputClass} style={inputStyle} />
          </div>
          <div>
            <FieldLabel>How much do you have now</FieldLabel>
            <input type="number" min="0" step="0.1" value={openingStock} onChange={(e) => setOpeningStock(e.target.value)} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Warn me when below</FieldLabel>
            <input type="number" min="0" step="0.1" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <FieldLabel>Usual price per unit</FieldLabel>
            <input type="number" min="0" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className={inputClass} style={inputStyle} />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button className="btn-primary rounded-xl px-5 py-2.5 text-sm flex items-center gap-2">
            <Save size={15} />
            {editingItemId ? 'Save changes' : 'Add item'}
          </button>
          {editingItemId && (
            <button type="button" onClick={resetItem} className="btn-ghost rounded-xl px-4 py-2.5 text-sm flex items-center gap-2">
              <X size={15} />
              Cancel
            </button>
          )}
        </div>
      </form>

      {inventory.length === 0 ? (
        <EmptyState icon={Boxes} title="Nothing tracked yet" body="Add feed, seed, fertilizer, medicine, or anything else you keep stock of." />
      ) : (
        <div className="space-y-2.5">
          {inventory.map((item) => {
            const balance = balances[item.id] || 0;
            const low = balance <= (item.reorderLevel || 0);
            return (
              <div key={item.id} className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-medium">
                    <Boxes size={15} style={{ color: 'var(--forest)' }} />
                    {item.name}
                    {low && (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--rust-tint)', color: 'var(--rust)' }}>
                        <AlertTriangle size={11} />
                        Low stock
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>{item.category} · usually {fmtMoney(item.unitCost || 0, 2)} / {item.unit}</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-lg font-semibold">{fmtNum(balance, 1)} {item.unit}</div>
                  <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>warn below {fmtNum(item.reorderLevel, 1)}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => editItem(item)} className="p-1.5 rounded hover:bg-black/5" aria-label="Edit stock item">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => onRemoveItem(item.id)} className="p-1.5 rounded hover:bg-black/5" aria-label="Delete stock item">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl px-5 py-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="font-display text-lg font-semibold">Your stock history</div>
        <div className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>
          Every time stock is bought, used, lost, or corrected, it's recorded below — that's how the totals above stay accurate.
        </div>
      </div>

      <form onSubmit={addMove} className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="font-display text-lg font-semibold">{editingMoveId ? 'Edit this update' : 'Update your stock'}</div>

        <div>
          <FieldLabel>Which item</FieldLabel>
          <select value={moveItemId} onChange={(e) => { setMoveItemId(e.target.value); setExpenseId(''); }} className={inputClass} style={inputStyle}>
            {inventory.map((i) => <option key={i.id} value={i.id}>{i.name} — {fmtNum(balances[i.id], 1)} {i.unit}</option>)}
          </select>
        </div>

        {!showAdvanced ? (
          <div>
            <FieldLabel>What happened</FieldLabel>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setMoveType('purchase')}
                className="rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-center gap-2"
                style={{
                  border: `1.5px solid ${moveType === 'purchase' ? 'var(--forest)' : 'var(--line)'}`,
                  background: moveType === 'purchase' ? 'var(--forest-tint)' : 'var(--surface)',
                  color: moveType === 'purchase' ? 'var(--forest)' : 'var(--ink)',
                }}
              >
                <ShoppingBasket size={16} /> I bought stock
              </button>
              <button
                type="button"
                onClick={() => setMoveType('consumption')}
                className="rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-center gap-2"
                style={{
                  border: `1.5px solid ${moveType === 'consumption' ? 'var(--forest)' : 'var(--line)'}`,
                  background: moveType === 'consumption' ? 'var(--forest-tint)' : 'var(--surface)',
                  color: moveType === 'consumption' ? 'var(--forest)' : 'var(--ink)',
                }}
              >
                <PackageMinus size={16} /> I used stock
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowAdvanced(true)}
              className="flex items-center gap-1 text-xs font-medium mt-2.5"
              style={{ color: 'var(--forest)' }}
            >
              <SlidersHorizontal size={12} /> Something else? (returns, transfers, corrections...)
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <FieldLabel>What happened</FieldLabel>
              <button type="button" onClick={() => setShowAdvanced(false)} className="text-xs font-medium" style={{ color: 'var(--forest)' }}>
                Back to common options
              </button>
            </div>
            <select value={moveType} onChange={(e) => { setMoveType(e.target.value); if (e.target.value !== 'purchase') setExpenseId(''); }} className={inputClass} style={inputStyle}>
              {transactionTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        )}

        {moveType === 'purchase' && (
          <div>
            <FieldLabel>Link to an expense you already logged — optional</FieldLabel>
            <select value={expenseId} onChange={(e) => setExpenseId(e.target.value)} className={inputClass} style={inputStyle}>
              <option value="">Use this item's usual price instead</option>
              {purchaseExpenses.filter((e) => e.inventoryItemId === moveItemId).map((e) => (
                <option key={e.id} value={e.id}>{e.date} · {fmtMoney(e.amount)} / {fmtNum(e.inventoryQuantity, 2)} = {fmtMoney(getExpenseUnitCost(e), 2)} per unit</option>
              ))}
            </select>
            {selectedExpenseUnitCost != null && (
              <div className="text-xs mt-1" style={{ color: 'var(--forest)' }}>
                Price from that expense: {fmtMoney(selectedExpenseUnitCost, 2)} / {inventory.find((i) => i.id === moveItemId)?.unit}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3.5">
          <div>
            {moveType === 'stock_count' ? (
              <>
                <FieldLabel>What you actually counted</FieldLabel>
                <input type="number" min="0" step="0.1" value={moveCountQty} onChange={(e) => setMoveCountQty(e.target.value)} required className={inputClass} style={inputStyle} />
              </>
            ) : (
              <>
                <FieldLabel>How much</FieldLabel>
                <input type="number" min="0.1" step="0.1" value={moveQty} onChange={(e) => setMoveQty(e.target.value)} required className={inputClass} style={inputStyle} />
              </>
            )}
          </div>
          <div>
            <FieldLabel>Date</FieldLabel>
            <input type="date" value={moveDate} max={todayISO()} onChange={(e) => setMoveDate(e.target.value)} required className={inputClass} style={inputStyle} />
          </div>
        </div>

        {moveType === 'consumption' && (
          <div>
            <FieldLabel>Which unit used it — optional</FieldLabel>
            <select value={unitId} onChange={(e) => setUnitId(e.target.value)} className={inputClass} style={inputStyle}>
              <option value="">General use / not one unit</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        )}

        {moveType === 'transfer' && (
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <FieldLabel>From unit</FieldLabel>
              <select value={unitId} onChange={(e) => setUnitId(e.target.value)} required className={inputClass} style={inputStyle}>
                <option value="">Select source</option>
                {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>To unit</FieldLabel>
              <select value={destinationUnitId} onChange={(e) => setDestinationUnitId(e.target.value)} required className={inputClass} style={inputStyle}>
                <option value="">Select destination</option>
                {units.filter((u) => u.id !== unitId).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>
        )}

        <div>
          <FieldLabel>Note — optional</FieldLabel>
          <input value={moveNote} onChange={(e) => setMoveNote(e.target.value)} placeholder="Supplier, reason, anything worth remembering" className={inputClass} style={inputStyle} />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button className="btn-primary rounded-xl px-5 py-2.5 text-sm flex items-center gap-2">
            {moveType === 'purchase' || moveType === 'return' || moveType === 'adjustment_in' ? <ArrowDownToLine size={15} /> : moveType === 'stock_count' ? <Scale size={15} /> : <ArrowUpFromLine size={15} />}
            {' '}{editingMoveId ? 'Save changes' : 'Save this update'}
          </button>
          {editingMoveId && (
            <button type="button" onClick={resetMove} className="btn-ghost rounded-xl px-4 py-2.5 text-sm flex items-center gap-2">
              <X size={15} />
              Cancel
            </button>
          )}
        </div>
      </form>

      {recentMoves.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <div className="px-5 pt-4 pb-3 font-display text-lg font-semibold" style={{ borderBottom: '1px solid var(--line)' }}>
            Recent updates
          </div>
          <table className="w-full text-sm ledger-table">
            <tbody>
              {recentMoves.map((m) => {
                const item = inventory.find((i) => i.id === m.itemId);
                return (
                  <tr key={m.id} className="font-mono">
                    <td className="px-5 py-2.5" style={{ color: 'var(--ink-soft)' }}>{m.date}</td>
                    <td className="px-3 py-2.5 font-sans">{item?.name || 'Removed item'}</td>
                    <td className="px-3 py-2.5 text-right">{m.type === 'in' ? '+' : '-'}{fmtNum(m.quantity, 1)} {m.unit}</td>
                    <td className="px-3 py-2.5 font-sans" style={{ color: 'var(--ink-soft)' }}>
                      {m.source === 'daily-log' ? 'Daily log' : (transactionTypes.find((t) => t.value === m.transactionType)?.label || (m.expenseId ? 'Linked expense' : 'Manual'))}
                      {m.unitCost ? ` · ${fmtMoney(m.unitCost, 2)}/${m.unit}` : ''}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => editMove(m)} className="p-1 rounded hover:bg-black/5" aria-label="Edit update">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => onRemoveMove(m.id)} className="p-1 rounded hover:bg-black/5" aria-label="Delete update">
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
