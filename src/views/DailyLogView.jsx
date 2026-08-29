import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, ClipboardList, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import TagChip from '../components/TagChip.jsx';
import FieldLabel from '../components/FieldLabel.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { inputClass, inputStyle } from '../lib/styleTokens.js';
import { UNIT_TYPES } from '../constants.js';
import { uid, todayISO, typeOf, fmtNum, fmtMoney, getProduceBalance } from '../lib/helpers.js';
import { normalizedConsumedItems } from '../lib/feedLinking.js';

// A log entry can carry production, stock-use, and/or disposition data —
// these helpers classify which an existing entry actually has, so it can
// be listed (and edited) under the right section regardless of how or
// when it was saved. A single entry can match more than one — an older,
// pre-revamp entry commonly has all three at once.
function hasProductionData(log) {
  return (Number(log.produced) || 0) > 0 || !!log.grades || (Number(log.mortality) || 0) > 0;
}
function hasStockData(log) {
  return normalizedConsumedItems(log).length > 0;
}
function hasDispositionData(log) {
  const hasSold = log.sold !== undefined && log.sold !== null && log.sold !== '';
  return hasSold || (Number(log.usedInternally) || 0) > 0 || (Number(log.loss) || 0) > 0;
}

// Same-date entries (very normal — morning and evening milking, for
// instance) are otherwise indistinguishable in a list. A time, not just
// a date, is what actually tells them apart.
function formatTime(createdAt) {
  if (!createdAt) return '';
  try {
    return new Date(createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

const EMPTY_PRODUCTION = { large: '', medium: '', small: '', qty: '', mortality: '', notes: '', date: null };
const EMPTY_STOCK = { rows: [], notes: '', date: null };
const EMPTY_DISPOSITION = { sold: '', salePrice: '', moneyReceived: '', soldIsEstimated: false, usedInternally: '', spoiled: '', notes: '', date: null };

// Logs a farm group's day as three fully independent records — a
// customer testing this directly asked for saves to be separate, since a
// farmer might record milk produced at different times of the day, add
// what was sold at the end of the day, and log feed use whenever it
// actually happens, none of them necessarily together. Each section
// below has its own date, its own Save button, and creates its own log
// record; editing an existing entry only ever touches the section it
// actually came from, though whatever else that same record might carry
// (e.g. an older, pre-revamp entry with everything on one row) is
// preserved rather than wiped when just one section of it is resaved.
export default function DailyLogView({ units, logs, inventory = [], getBalance, onAdd, onUpdate, onRemove, goTo }) {
  const [unitId, setUnitId] = useState(units[0]?.id || '');
  const [activeTable, setActiveTable] = useState('production');

  const [production, setProduction] = useState({ ...EMPTY_PRODUCTION, date: todayISO() });
  const [editingProduction, setEditingProduction] = useState(null); // the full original log record, or null

  const [stock, setStock] = useState({ ...EMPTY_STOCK, date: todayISO() });
  const [stockSectionOpen, setStockSectionOpen] = useState(false);
  const [editingStock, setEditingStock] = useState(null);

  const [disposition, setDisposition] = useState({ ...EMPTY_DISPOSITION, date: todayISO() });
  const [dispositionOpen, setDispositionOpen] = useState(false);
  const [editingDisposition, setEditingDisposition] = useState(null);

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
  const unitLogs = logs.filter((l) => l.unitId === unitId);
  const produceBalance = unit ? getProduceBalance(unit, logs) : 0;

  // ---------- Production ----------

  function addStockRow() {
    setStock((s) => ({ ...s, rows: [...s.rows, { key: uid('row'), itemId: inventory[0]?.id || '', quantity: '' }] }));
    setStockSectionOpen(true);
  }
  function updateStockRow(key, field, value) {
    setStock((s) => ({ ...s, rows: s.rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)) }));
  }
  function removeStockRow(key) {
    setStock((s) => ({ ...s, rows: s.rows.filter((r) => r.key !== key) }));
  }

  function editProductionEntry(log) {
    setEditingProduction(log);
    setUnitId(log.unitId);
    const next = { ...EMPTY_PRODUCTION, date: log.date, mortality: String(log.mortality || 0), notes: log.notes || '' };
    if (log.grades) {
      next.large = String(log.grades.large || 0);
      next.medium = String(log.grades.medium || 0);
      next.small = String(log.grades.small || 0);
    } else {
      next.qty = String(log.produced || 0);
    }
    setProduction(next);
    setActiveTable('production');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetProduction() {
    setProduction({ ...EMPTY_PRODUCTION, date: todayISO() });
    setEditingProduction(null);
  }

  function submitProduction(ev) {
    ev.preventDefault();
    if (!unit) return;
    let produced = 0;
    let grades = null;
    if (t.hasGrades) {
      const L = Number(production.large) || 0;
      const M = Number(production.medium) || 0;
      const S = Number(production.small) || 0;
      produced = L + M + S;
      grades = { large: L, medium: M, small: S };
    } else {
      produced = Number(production.qty) || 0;
    }
    const base = editingProduction || {};
    const entry = {
      ...base,
      id: editingProduction?.id || uid('log'),
      unitId: unit.id,
      date: production.date,
      produced,
      grades,
      mortality: Number(production.mortality) || 0,
      notes: production.notes.trim(),
      createdAt: editingProduction?.createdAt || Date.now(),
    };
    const saved = editingProduction ? onUpdate(entry, unit, 'production') : onAdd(entry, unit, 'production');
    if (saved !== false) resetProduction();
  }

  // ---------- Stock used ----------

  function editStockEntry(log) {
    setEditingStock(log);
    setUnitId(log.unitId);
    const items = normalizedConsumedItems(log);
    setStock({
      rows: items.map((row) => ({ key: uid('row'), itemId: row.itemId, quantity: String(row.quantity) })),
      notes: log.notes || '',
      date: log.date,
    });
    setStockSectionOpen(true);
    setActiveTable('stock');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetStock() {
    setStock({ ...EMPTY_STOCK, date: todayISO() });
    setStockSectionOpen(false);
    setEditingStock(null);
  }

  function submitStock(ev) {
    ev.preventDefault();
    if (!unit) return;
    const cleanConsumedItems = stock.rows
      .filter((row) => row.itemId && Number(row.quantity) > 0)
      .map((row) => ({ itemId: row.itemId, quantity: Number(row.quantity) }));
    const base = editingStock || {};
    const entry = {
      ...base,
      id: editingStock?.id || uid('log'),
      unitId: unit.id,
      date: stock.date,
      consumedItems: cleanConsumedItems,
      notes: stock.notes.trim(),
      produced: base.produced || 0,
      mortality: base.mortality || 0,
      createdAt: editingStock?.createdAt || Date.now(),
    };
    const saved = editingStock ? onUpdate(entry, unit, 'stock') : onAdd(entry, unit, 'stock');
    if (saved !== false) resetStock();
  }

  // ---------- Disposition ----------

  function applyMoneyReceived(value) {
    setDisposition((d) => {
      const next = { ...d, moneyReceived: value };
      const pricePerGroup = Number(d.salePrice) > 0 ? Number(d.salePrice) : Number(unit?.producePrice) || 0;
      if (value !== '' && pricePerGroup > 0) {
        const soldGroups = Number(value) / pricePerGroup;
        const soldBaseUnits = soldGroups * t.groupSize;
        next.sold = String(Math.round(soldBaseUnits * 10) / 10);
        next.soldIsEstimated = true;
      } else {
        next.soldIsEstimated = false;
      }
      return next;
    });
  }

  function editDispositionEntry(log) {
    setEditingDisposition(log);
    setUnitId(log.unitId);
    const hasSold = log.sold !== undefined && log.sold !== null && log.sold !== '';
    setDisposition({
      sold: hasSold ? String(log.sold) : '',
      salePrice: log.salePrice !== undefined && log.salePrice !== null && log.salePrice !== '' ? String(log.salePrice) : '',
      moneyReceived: '',
      soldIsEstimated: false,
      usedInternally: String(log.usedInternally || 0),
      spoiled: String(log.loss || 0),
      notes: log.notes || '',
      date: log.date,
    });
    setDispositionOpen(true);
    setActiveTable('disposition');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetDisposition() {
    setDisposition({ ...EMPTY_DISPOSITION, date: todayISO() });
    setDispositionOpen(false);
    setEditingDisposition(null);
  }

  function submitDisposition(ev) {
    ev.preventDefault();
    if (!unit) return;
    const base = editingDisposition || {};
    const entry = {
      ...base,
      id: editingDisposition?.id || uid('log'),
      unitId: unit.id,
      date: disposition.date,
      // Same distinction the rest of the app relies on: a blank field
      // means "not tracked" (falls back to the produced-based estimate
      // in unitMetrics/analytics), an explicit "0" means "tracked, and
      // nothing sold" — never conflate the two here.
      sold: disposition.sold !== '' ? Number(disposition.sold) || 0 : undefined,
      salePrice: disposition.salePrice !== '' ? Number(disposition.salePrice) || 0 : undefined,
      usedInternally: Number(disposition.usedInternally) || 0,
      loss: Number(disposition.spoiled) || 0,
      notes: disposition.notes.trim(),
      produced: base.produced || 0,
      mortality: base.mortality || 0,
      createdAt: editingDisposition?.createdAt || Date.now(),
    };
    const saved = editingDisposition ? onUpdate(entry, unit, 'disposition') : onAdd(entry, unit, 'disposition');
    if (saved !== false) resetDisposition();
  }

  // ---------- Entry lists ----------

  const productionEntries = unitLogs.filter(hasProductionData).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);
  const stockEntries = unitLogs.filter(hasStockData).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);
  const dispositionEntries = unitLogs.filter(hasDispositionData).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);

  const tables = [
    { key: 'production', label: 'Production', count: productionEntries.length },
    { key: 'stock', label: 'Stock used', count: stockEntries.length },
    { key: 'disposition', label: 'Sold & disposition', count: dispositionEntries.length },
  ];

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

      {/* ---------- Production ---------- */}
      <form
        onSubmit={submitProduction}
        className="rounded-2xl p-5 space-y-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
      >
        <div className="flex items-center justify-between">
          <div className="font-display text-lg font-semibold">{editingProduction ? 'Edit production' : 'What was produced'}</div>
          {editingProduction && (
            <button type="button" onClick={resetProduction} className="text-xs" style={{ color: 'var(--ink-soft)' }}>
              Cancel edit
            </button>
          )}
        </div>

        <div>
          <FieldLabel>Date</FieldLabel>
          <input
            type="date" value={production.date} max={todayISO()}
            onChange={(e) => setProduction((p) => ({ ...p, date: e.target.value }))}
            required className={inputClass} style={inputStyle}
          />
        </div>

        {t.hasGrades ? (
          <div>
            <FieldLabel>Eggs collected, by grade</FieldLabel>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--ink-soft)' }}>Large</div>
                <input type="number" min="0" value={production.large} onChange={(e) => setProduction((p) => ({ ...p, large: e.target.value }))} placeholder="0" className={inputClass} style={inputStyle} />
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--ink-soft)' }}>Medium</div>
                <input type="number" min="0" value={production.medium} onChange={(e) => setProduction((p) => ({ ...p, medium: e.target.value }))} placeholder="0" className={inputClass} style={inputStyle} />
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--ink-soft)' }}>Small</div>
                <input type="number" min="0" value={production.small} onChange={(e) => setProduction((p) => ({ ...p, small: e.target.value }))} placeholder="0" className={inputClass} style={inputStyle} />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <FieldLabel>Quantity produced ({t.unitLabel})</FieldLabel>
            <input type="number" min="0" step="0.1" value={production.qty} onChange={(e) => setProduction((p) => ({ ...p, qty: e.target.value }))} placeholder="0" className={inputClass} style={inputStyle} />
          </div>
        )}

        <div>
          <FieldLabel>Mortality / losses (animals)</FieldLabel>
          <input type="number" min="0" value={production.mortality} onChange={(e) => setProduction((p) => ({ ...p, mortality: e.target.value }))} placeholder="0" className={inputClass} style={inputStyle} />
        </div>

        <div>
          <FieldLabel>Note — optional</FieldLabel>
          <input
            type="text" value={production.notes} onChange={(e) => setProduction((p) => ({ ...p, notes: e.target.value }))}
            placeholder="e.g. morning milking, delayed by 30 minutes" className={inputClass} style={inputStyle}
          />
        </div>

        <button type="submit" className="btn-primary rounded-xl px-5 py-2.5 text-sm flex items-center gap-2">
          <Save size={15} /> {editingProduction ? 'Save changes' : 'Save production'}
        </button>
      </form>

      {/* ---------- Stock used ---------- */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <button type="button" onClick={() => setStockSectionOpen((o) => !o)} className="w-full flex items-center justify-between">
          <div className="text-left">
            <div className="font-display text-lg font-semibold">{editingStock ? 'Edit stock used' : 'Stock used'}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
              {stock.rows.length > 0 ? `${stock.rows.length} item${stock.rows.length > 1 ? 's' : ''} added` : 'Feed, medicine, anything used — logged whenever it happens'}
            </div>
          </div>
          {stockSectionOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {!stockSectionOpen && (
          <button type="button" onClick={addStockRow} className="mt-1 text-xs font-medium" style={{ color: 'var(--forest)' }}>
            + Add stock used today
          </button>
        )}

        {stockSectionOpen && (
          <form onSubmit={submitStock} className="mt-4 space-y-3.5">
            <div>
              <FieldLabel>Date</FieldLabel>
              <input type="date" value={stock.date} max={todayISO()} onChange={(e) => setStock((s) => ({ ...s, date: e.target.value }))} required className={inputClass} style={inputStyle} />
            </div>
            <div className="space-y-2.5">
              {stock.rows.map((row) => {
                const item = inventory.find((i) => i.id === row.itemId);
                return (
                  <div key={row.key} className="flex gap-2 items-start">
                    <select value={row.itemId} onChange={(e) => updateStockRow(row.key, 'itemId', e.target.value)} aria-label="Stock item" className={`${inputClass} flex-1`} style={inputStyle}>
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
                      type="number" min="0" step="0.1" value={row.quantity} onChange={(e) => updateStockRow(row.key, 'quantity', e.target.value)}
                      placeholder={item?.unit || 'qty'} aria-label="Quantity used" className={inputClass} style={{ ...inputStyle, width: '96px' }}
                    />
                    <button type="button" onClick={() => removeStockRow(row.key)} className="p-3 rounded-xl hover:bg-black/5 shrink-0" aria-label="Remove this item">
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
              <button type="button" onClick={addStockRow} className="btn-ghost rounded-xl px-4 py-2.5 text-sm flex items-center gap-2">
                <Plus size={15} /> Add an item
              </button>
            </div>
            <div>
              <FieldLabel>Note — optional</FieldLabel>
              <input type="text" value={stock.notes} onChange={(e) => setStock((s) => ({ ...s, notes: e.target.value }))} placeholder="e.g. extra bought to cover a shortage" className={inputClass} style={inputStyle} />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button type="submit" className="btn-primary rounded-xl px-5 py-2.5 text-sm flex items-center gap-2">
                <Save size={15} /> {editingStock ? 'Save changes' : 'Save stock used'}
              </button>
              {editingStock && (
                <button type="button" onClick={resetStock} className="btn-ghost rounded-xl px-4 py-2.5 text-sm flex items-center gap-2">
                  <X size={15} /> Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* ---------- Disposition ---------- */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <button type="button" onClick={() => setDispositionOpen((o) => !o)} className="w-full flex items-center justify-between">
          <div className="text-left">
            <div className="font-display text-lg font-semibold">{editingDisposition ? 'Edit sold & disposition' : 'What happened to it'}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
              Sold, used at home, spoiled or lost — logged whenever a sale actually happens, not necessarily the same day
            </div>
          </div>
          {dispositionOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {dispositionOpen && (
          <form onSubmit={submitDisposition} className="mt-4 space-y-3.5">
            {produceBalance > 0 && (
              <div className="text-xs rounded-xl p-3" style={{ background: 'var(--forest-tint)', color: 'var(--forest-dark)' }}>
                {fmtNum(produceBalance)} {t.unitLabel} produced but not yet sold, used, or written off — record a sale
                against this whenever it actually happens.
              </div>
            )}
            <div>
              <FieldLabel>Date</FieldLabel>
              <input type="date" value={disposition.date} max={todayISO()} onChange={(e) => setDisposition((d) => ({ ...d, date: e.target.value }))} required className={inputClass} style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <FieldLabel>Sold ({t.unitLabel})</FieldLabel>
                <input
                  type="number" min="0" step="0.1" value={disposition.sold}
                  onChange={(e) => setDisposition((d) => ({ ...d, sold: e.target.value, soldIsEstimated: false }))}
                  placeholder="0" className={inputClass} style={inputStyle}
                />
              </div>
              <div>
                <FieldLabel>Price this time — optional</FieldLabel>
                <input
                  type="number" min="0" step="0.01" value={disposition.salePrice}
                  onChange={(e) => setDisposition((d) => ({ ...d, salePrice: e.target.value }))}
                  placeholder={unit?.producePrice ? `Usually ${fmtMoney(Number(unit.producePrice), 2)}` : '0'}
                  className={inputClass} style={inputStyle}
                />
              </div>
            </div>
            <div>
              <FieldLabel>Not sure how much sold? Enter money received instead</FieldLabel>
              <input
                type="number" min="0" step="0.01" value={disposition.moneyReceived}
                onChange={(e) => applyMoneyReceived(e.target.value)}
                placeholder="e.g. 700" className={inputClass} style={inputStyle}
              />
              {disposition.soldIsEstimated && (
                <div className="text-xs mt-1" style={{ color: 'var(--forest)' }}>
                  ≈ {fmtNum(Number(disposition.sold))} {t.unitLabel} estimated at {fmtMoney(Number(disposition.salePrice) || Number(unit?.producePrice) || 0, 2)} per {t.groupLabel}.
                  Edit "Sold" above directly if this isn't quite right.
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <FieldLabel>Used at home ({t.unitLabel})</FieldLabel>
                <input type="number" min="0" step="0.1" value={disposition.usedInternally} onChange={(e) => setDisposition((d) => ({ ...d, usedInternally: e.target.value }))} placeholder="0" className={inputClass} style={inputStyle} />
              </div>
              <div>
                <FieldLabel>Spoiled or lost ({t.unitLabel})</FieldLabel>
                <input type="number" min="0" step="0.1" value={disposition.spoiled} onChange={(e) => setDisposition((d) => ({ ...d, spoiled: e.target.value }))} placeholder="0" className={inputClass} style={inputStyle} />
              </div>
            </div>
            <div>
              <FieldLabel>Note — optional</FieldLabel>
              <input type="text" value={disposition.notes} onChange={(e) => setDisposition((d) => ({ ...d, notes: e.target.value }))} placeholder="e.g. sold to neighbor at a discount" className={inputClass} style={inputStyle} />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button type="submit" className="btn-primary rounded-xl px-5 py-2.5 text-sm flex items-center gap-2">
                <Save size={15} /> {editingDisposition ? 'Save changes' : 'Save'}
              </button>
              {editingDisposition && (
                <button type="button" onClick={resetDisposition} className="btn-ghost rounded-xl px-4 py-2.5 text-sm flex items-center gap-2">
                  <X size={15} /> Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* ---------- Entry tables ---------- */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="flex gap-1 p-2 flex-wrap" style={{ borderBottom: '1px solid var(--line)' }}>
          {tables.map((tab) => (
            <button
              key={tab.key} type="button" onClick={() => setActiveTable(tab.key)}
              className="px-3 py-2 rounded-xl text-xs font-medium"
              style={activeTable === tab.key ? { background: 'var(--forest)', color: '#fff' } : { color: 'var(--ink-soft)' }}
            >
              {tab.label} {tab.count > 0 ? `(${tab.count})` : ''}
            </button>
          ))}
        </div>

        {activeTable === 'production' && (
          <EntryTable
            rows={productionEntries}
            empty="No production logged yet for this group."
            onEdit={editProductionEntry}
            onRemove={onRemove}
            renderCells={(l) => [
              <>{fmtNum(l.produced)} {t.unitLabel}</>,
              l.mortality > 0 ? <span style={{ color: 'var(--rust)' }}>{l.mortality} lost</span> : '—',
              l.notes || '—',
            ]}
          />
        )}
        {activeTable === 'stock' && (
          <EntryTable
            rows={stockEntries}
            empty="No stock use logged yet for this group."
            onEdit={editStockEntry}
            onRemove={onRemove}
            renderCells={(l) =>
              normalizedConsumedItems(l).map(({ itemId, quantity }) => {
                const item = inventory.find((i) => i.id === itemId);
                return `${fmtNum(quantity, 1)} ${item?.unit || ''} ${item?.name || 'stock'}`;
              }).join(', ') || '—'
            }
            singleCell
          />
        )}
        {activeTable === 'disposition' && (
          <EntryTable
            rows={dispositionEntries}
            empty="Nothing sold or written off yet for this group."
            onEdit={editDispositionEntry}
            onRemove={onRemove}
            renderCells={(l) => {
              const hasSold = l.sold !== undefined && l.sold !== null && l.sold !== '';
              return [
                hasSold ? <span style={{ color: 'var(--forest)' }}>{fmtNum(l.sold)} sold</span> : '—',
                l.usedInternally > 0 ? `${fmtNum(l.usedInternally)} used` : '—',
                l.loss > 0 ? <span style={{ color: 'var(--rust)' }}>{fmtNum(l.loss)} spoiled</span> : '—',
              ];
            }}
          />
        )}
      </div>
    </div>
  );
}

// Shared table renderer for all three entry lists — each date shown with
// a time (see formatTime above), since two entries on the same date is
// the normal case this whole redesign exists to handle cleanly, not an
// edge case to paper over.
function EntryTable({ rows, empty, onEdit, onRemove, renderCells, singleCell }) {
  if (rows.length === 0) {
    return <div className="px-5 py-6 text-sm text-center" style={{ color: 'var(--ink-soft)' }}>{empty}</div>;
  }
  return (
    <table className="w-full text-sm ledger-table">
      <tbody>
        {rows.map((l) => {
          const cells = renderCells(l);
          return (
            <tr key={l.id} className="font-mono">
              <td className="px-5 py-2.5" style={{ color: 'var(--ink-soft)' }}>
                {l.date}
                {formatTime(l.createdAt) && <span className="block text-xs">{formatTime(l.createdAt)}</span>}
              </td>
              {singleCell ? (
                <td className="px-3 py-2.5 font-sans">{cells}</td>
              ) : (
                cells.map((c, i) => <td key={i} className="px-3 py-2.5 font-sans">{c}</td>)
              )}
              <td className="px-5 py-2.5 text-right">
                <div className="flex justify-end gap-1">
                  <button onClick={() => onEdit(l)} className="p-1 rounded hover:bg-black/5" aria-label="Edit entry">
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
  );
}
