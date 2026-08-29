import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, ClipboardList, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import TagChip from '../components/TagChip.jsx';
import FieldLabel from '../components/FieldLabel.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { inputClass, inputStyle } from '../lib/styleTokens.js';
import { UNIT_TYPES } from '../constants.js';
import { uid, todayISO, typeOf, fmtNum, fmtMoney } from '../lib/helpers.js';
import { normalizedConsumedItems } from '../lib/feedLinking.js';

// Log a farm group's day in three separate, clearly-bounded parts —
// customer testing showed the old single flat form (production, one
// feed item, and a loss figure all crammed into one block) was
// genuinely inconvenient, especially once a farmer used more than one
// kind of stock in a day:
//
//   1. What happened — production (or grades), mortality. Always
//      visible, since this is what almost every entry needs and should
//      stay the fast path it always was.
//   2. Stock used — any number of different tracked items (feed,
//      medicine, anything), not just one. Collapsed by default so a day
//      with nothing new to record here doesn't add visual weight; opens
//      automatically when editing an entry that already has some.
//   3. What happened to it — sold / used internally / spoiled or lost,
//      as real quantities rather than one flat "loss" figure. Also
//      collapsed by default, for the same reason. Recording a real
//      "sold" quantity here is what turns Analytics' revenue figure
//      from a produced-based estimate into something the app actually
//      knows — see unitMetrics() in helpers.js for exactly how that
//      blends with older entries that never tracked this.
export default function DailyLogView({ units, logs, inventory = [], getBalance, onAdd, onUpdate, onRemove, goTo }) {
  const [unitId, setUnitId] = useState(units[0]?.id || '');
  const [date, setDate] = useState(todayISO());

  // Production
  const [large, setLarge] = useState('');
  const [medium, setMedium] = useState('');
  const [small, setSmall] = useState('');
  const [qty, setQty] = useState('');
  const [mortality, setMortality] = useState('');

  // Stock used — a list, not a single item. Each row's `key` is a local
  // id for React reconciliation only, unrelated to the saved data.
  const [consumedItems, setConsumedItems] = useState([]);
  const [stockSectionOpen, setStockSectionOpen] = useState(false);

  // What happened to what was produced
  const [sold, setSold] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [usedInternally, setUsedInternally] = useState('');
  const [spoiled, setSpoiled] = useState('');
  const [dispositionOpen, setDispositionOpen] = useState(false);

  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState(null);

  const unit = units.find((u) => u.id === unitId);

  useEffect(() => {
    if (!unitId && units[0]) setUnitId(units[0].id);
  }, [units, unitId]);

  if (units.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Add a farm group before logging"
        body="Daily logs are recorded against a specific flock, herd, or plot."
        actionLabel="Add a farm group"
        onAction={() => goTo('units')}
      />
    );
  }

  const t = unit ? typeOf(unit) : UNIT_TYPES[0];

  function addStockRow() {
    setConsumedItems((prev) => [...prev, { key: uid('row'), itemId: inventory[0]?.id || '', quantity: '' }]);
    setStockSectionOpen(true);
  }

  function updateStockRow(key, field, value) {
    setConsumedItems((prev) => prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  }

  function removeStockRow(key) {
    setConsumedItems((prev) => prev.filter((row) => row.key !== key));
  }

  function editLog(l) {
    setEditingId(l.id);
    setUnitId(l.unitId);
    setDate(l.date);
    setMortality(String(l.mortality || 0));
    setNotes(l.notes || '');
    if (l.grades) {
      setLarge(String(l.grades.large || 0));
      setMedium(String(l.grades.medium || 0));
      setSmall(String(l.grades.small || 0));
    } else {
      setQty(String(l.produced || 0));
    }

    // normalizedConsumedItems() reads either the current consumedItems
    // array or an older log's single feedItemId/feedQuantity pair — see
    // feedLinking.js. Editing an old-style entry through this form and
    // saving it forward naturally upgrades it to the new shape.
    const items = normalizedConsumedItems(l);
    setConsumedItems(items.map((row) => ({ key: uid('row'), itemId: row.itemId, quantity: String(row.quantity) })));
    setStockSectionOpen(items.length > 0);

    const hasSold = l.sold !== undefined && l.sold !== null && l.sold !== '';
    setSold(hasSold ? String(l.sold) : '');
    setSalePrice(l.salePrice !== undefined && l.salePrice !== null && l.salePrice !== '' ? String(l.salePrice) : '');
    setUsedInternally(String(l.usedInternally || 0));
    setSpoiled(String(l.loss || 0));
    setDispositionOpen(hasSold || Number(l.usedInternally) > 0 || Number(l.loss) > 0);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function reset() {
    setLarge('');
    setMedium('');
    setSmall('');
    setQty('');
    setMortality('');
    setConsumedItems([]);
    setStockSectionOpen(false);
    setSold('');
    setSalePrice('');
    setUsedInternally('');
    setSpoiled('');
    setDispositionOpen(false);
    setNotes('');
    setEditingId(null);
  }

  function submit(ev) {
    ev.preventDefault();
    if (!unit) return;

    let produced = 0;
    let grades = null;
    if (t.hasGrades) {
      const L = Number(large) || 0;
      const M = Number(medium) || 0;
      const S = Number(small) || 0;
      produced = L + M + S;
      grades = { large: L, medium: M, small: S };
    } else {
      produced = Number(qty) || 0;
    }

    const cleanConsumedItems = consumedItems
      .filter((row) => row.itemId && Number(row.quantity) > 0)
      .map((row) => ({ itemId: row.itemId, quantity: Number(row.quantity) }));

    const entry = {
      id: editingId || uid('log'),
      unitId: unit.id,
      date,
      produced,
      grades,
      loss: Number(spoiled) || 0,
      consumedItems: cleanConsumedItems,
      // A blank sold field means "not tracked today" (falls back to the
      // estimate in unitMetrics) — deliberately distinct from an
      // explicit "0", which means "tracked, and nothing sold". See
      // helpers.js's unitMetrics() for exactly how this distinction is
      // used; getting it wrong here would silently turn every
      // untracked day into a false "sold nothing" instead of an honest
      // estimate.
      sold: sold !== '' ? Number(sold) || 0 : undefined,
      salePrice: salePrice !== '' ? Number(salePrice) || 0 : undefined,
      usedInternally: Number(usedInternally) || 0,
      mortality: Number(mortality) || 0,
      notes: notes.trim(),
      createdAt: editingId ? logs.find((l) => l.id === editingId)?.createdAt || Date.now() : Date.now(),
    };
    const saved = editingId ? onUpdate(entry) : onAdd(entry, unit);
    if (saved !== false) reset();
  }

  const recent = logs
    .filter((l) => l.unitId === unitId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <FieldLabel>Farm group</FieldLabel>
        <div className="flex gap-2 flex-wrap">
          {units.map((u) => {
            const Icon = typeOf(u).icon;
            return <TagChip key={u.id} label={u.name} icon={Icon} active={u.id === unitId} onClick={() => setUnitId(u.id)} />;
          })}
        </div>
      </div>

      <form
        onSubmit={submit}
        className="rounded-2xl p-5 space-y-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
      >
        <div>
          <FieldLabel>Date</FieldLabel>
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

        {/* --- Section 1: What happened --- */}
        <section className="space-y-3.5">
          <div className="font-display text-base font-semibold">What happened</div>

          {t.hasGrades ? (
            <div>
              <FieldLabel>Eggs collected, by grade</FieldLabel>
              <div className="grid grid-cols-3 gap-2.5">
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
              </div>
            </div>
          ) : (
            <div>
              <FieldLabel>Quantity produced ({t.unitLabel})</FieldLabel>
              <input type="number" min="0" step="0.1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" className={inputClass} style={inputStyle} />
            </div>
          )}

          <div>
            <FieldLabel>Mortality / losses (animals)</FieldLabel>
            <input type="number" min="0" value={mortality} onChange={(e) => setMortality(e.target.value)} placeholder="0" className={inputClass} style={inputStyle} />
          </div>
        </section>

        {/* --- Section 2: Stock used --- */}
        <section className="pt-1" style={{ borderTop: '1px solid var(--line)' }}>
          <button
            type="button"
            onClick={() => setStockSectionOpen((open) => !open)}
            className="w-full flex items-center justify-between pt-3"
          >
            <div className="text-left">
              <div className="font-display text-base font-semibold">Stock used</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                {consumedItems.length > 0 ? `${consumedItems.length} item${consumedItems.length > 1 ? 's' : ''} added` : 'Feed, medicine, anything you used today'}
              </div>
            </div>
            {stockSectionOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {stockSectionOpen && (
            <div className="mt-3 space-y-2.5">
              {consumedItems.map((row) => {
                const item = inventory.find((i) => i.id === row.itemId);
                return (
                  <div key={row.key} className="flex gap-2 items-start">
                    <select
                      value={row.itemId}
                      onChange={(e) => updateStockRow(row.key, 'itemId', e.target.value)}
                      aria-label="Stock item"
                      className={`${inputClass} flex-1`}
                      style={inputStyle}
                    >
                      {inventory.length === 0 ? (
                        <option value="">Add a stock item in Inventory first</option>
                      ) : (
                        inventory.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name} · {fmtNum(getBalance ? getBalance(i.id) : i.openingStock || 0, 1)} {i.unit}
                          </option>
                        ))
                      )}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={row.quantity}
                      onChange={(e) => updateStockRow(row.key, 'quantity', e.target.value)}
                      placeholder={item?.unit || 'qty'}
                      aria-label="Quantity used"
                      className={inputClass}
                      style={{ ...inputStyle, width: '96px' }}
                    />
                    <button
                      type="button"
                      onClick={() => removeStockRow(row.key)}
                      className="p-3 rounded-xl hover:bg-black/5 shrink-0"
                      aria-label="Remove this item"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
              <button type="button" onClick={addStockRow} className="btn-ghost rounded-xl px-4 py-2.5 text-sm flex items-center gap-2">
                <Plus size={15} /> Add an item
              </button>
            </div>
          )}
          {!stockSectionOpen && (
            <button type="button" onClick={addStockRow} className="mt-1 text-xs font-medium" style={{ color: 'var(--forest)' }}>
              + Add stock used today
            </button>
          )}
        </section>

        {/* --- Section 3: What happened to it --- */}
        <section className="pt-1" style={{ borderTop: '1px solid var(--line)' }}>
          <button
            type="button"
            onClick={() => setDispositionOpen((open) => !open)}
            className="w-full flex items-center justify-between pt-3"
          >
            <div className="text-left">
              <div className="font-display text-base font-semibold">What happened to it</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                Sold, used at home, spoiled or lost — optional, but this is what makes Analytics' money-made figure real instead of estimated
              </div>
            </div>
            {dispositionOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {dispositionOpen && (
            <div className="mt-3 space-y-3.5">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <FieldLabel>Sold ({t.unitLabel})</FieldLabel>
                  <input type="number" min="0" step="0.1" value={sold} onChange={(e) => setSold(e.target.value)} placeholder="0" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <FieldLabel>Price this time — optional</FieldLabel>
                  <input
                    type="number" min="0" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)}
                    placeholder={unit?.producePrice ? `Usually ${fmtMoney(Number(unit.producePrice), 2)}` : '0'}
                    className={inputClass} style={inputStyle}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <FieldLabel>Used at home ({t.unitLabel})</FieldLabel>
                  <input type="number" min="0" step="0.1" value={usedInternally} onChange={(e) => setUsedInternally(e.target.value)} placeholder="0" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <FieldLabel>Spoiled or lost ({t.unitLabel})</FieldLabel>
                  <input type="number" min="0" step="0.1" value={spoiled} onChange={(e) => setSpoiled(e.target.value)} placeholder="0" className={inputClass} style={inputStyle} />
                </div>
              </div>
            </div>
          )}
        </section>

        <div>
          <FieldLabel>Notes — optional</FieldLabel>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Anything worth remembering about today"
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button type="submit" className="btn-primary rounded-xl px-5 py-2.5 text-sm flex items-center gap-2">
            <Save size={15} />
            {editingId ? 'Save changes' : 'Save log entry'}
          </button>
          {editingId && (
            <button type="button" onClick={reset} className="btn-ghost rounded-xl px-4 py-2.5 text-sm flex items-center gap-2">
              <X size={15} />
              Cancel
            </button>
          )}
        </div>
      </form>

      {recent.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
          <div className="px-5 pt-4 pb-3 font-display text-lg font-semibold" style={{ borderBottom: '1px solid var(--line)' }}>
            Recent entries — {unit?.name}
          </div>
          <table className="w-full text-sm ledger-table">
            <tbody>
              {recent.map((l) => {
                const hasSold = l.sold !== undefined && l.sold !== null && l.sold !== '';
                return (
                  <tr key={l.id} className="font-mono">
                    <td className="px-5 py-2.5" style={{ color: 'var(--ink-soft)' }}>{l.date}</td>
                    <td className="px-3 py-2.5 text-right">
                      {fmtNum(l.produced)} {t.unitLabel}
                    </td>
                    <td className="px-3 py-2.5 text-right" style={{ color: hasSold ? 'var(--forest)' : 'var(--ink-soft)' }}>
                      {hasSold ? `${fmtNum(l.sold)} sold` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right" style={{ color: l.mortality > 0 ? 'var(--rust)' : 'var(--ink-soft)' }}>
                      {l.mortality > 0 ? `${l.mortality} lost` : '—'}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => editLog(l)} className="p-1 rounded hover:bg-black/5" aria-label="Edit entry">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => onRemove(l.id)} className="p-1 rounded hover:bg-black/5" aria-label="Delete entry">
                          <Trash2 size={14} style={{ color: 'var(--ink-soft)' }} />
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
