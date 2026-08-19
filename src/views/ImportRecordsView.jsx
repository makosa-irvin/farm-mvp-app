import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, FileSpreadsheet, NotebookPen, Plus, Upload } from 'lucide-react';
import { todayISO } from '../lib/helpers.js';

const TYPES = [
  { value: 'unit', label: 'Farm group', hint: 'A flock, herd, crop plot or other activity.' },
  { value: 'inventory', label: 'Stock', hint: 'Feed, seed, fertilizer, medicine or supplies.' },
  { value: 'expense', label: 'Expense', hint: 'Money you already spent.' },
  { value: 'log', label: 'Daily log', hint: 'Production or losses from an earlier day.' },
];

const makeId = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const HEADER_ALIASES = {
  record_type: ['record_type', 'record type', 'type', 'record', 'entry_type', 'entry type'],
  date: ['date', 'day', 'record_date', 'record date', 'date recorded', 'transaction_date', 'transaction date', 'start_date', 'start date'],
  farm_group: ['farm_group', 'farm group', 'farm_group_name', 'farm group name', 'group', 'group_name', 'group name', 'unit', 'unit_name', 'unit name', 'flock', 'herd', 'plot'],
  name: ['name', 'item', 'item_name', 'item name', 'description', 'what', 'activity', 'record_name', 'record name'],
  category: ['category', 'type/category', 'expense_category', 'expense category'],
  unit: ['unit', 'uom', 'measure', 'measurement_unit', 'measurement unit'],
  quantity: ['quantity', 'qty', 'amount_of_stock', 'amount of stock', 'count', 'opening_stock', 'opening stock', 'produced', 'production', 'production_quantity', 'production quantity'],
  unit_cost: ['unit_cost', 'unit cost', 'cost_per_unit', 'cost per unit', 'price_per_unit', 'price per unit', 'cost'],
  amount: ['amount', 'total', 'total_amount', 'total amount', 'expense', 'expense_amount', 'expense amount', 'money', 'value'],
  supplier: ['supplier', 'vendor', 'seller', 'bought_from', 'bought from'],
  payment_method: ['payment_method', 'payment method', 'paid_by', 'paid by', 'payment'],
  movement_type: ['movement_type', 'movement type', 'stock_movement', 'stock movement', 'transaction_type', 'transaction type', 'movement'],
  loss: ['loss', 'lost', 'losses', 'wastage', 'waste'],
  mortality: ['mortality', 'deaths', 'dead', 'birds_lost', 'birds lost'],
  notes: ['notes', 'note', 'remarks', 'comment', 'comments'],
};

const normalizeHeader = (value) => String(value || '').trim().toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ');
const canonicalHeader = (value) => normalizeHeader(value).replace(/ /g, '_');

function mapHeaders(headers) {
  const mapped = {};
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    const index = headers.findIndex((header) => aliases.some((alias) => normalizeHeader(alias) === normalizeHeader(header)));
    if (index >= 0) mapped[index] = canonical;
  }
  return mapped;
}

export function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const parseLine = (line) => {
    const cells = [];
    let cell = '', quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = !quoted;
      else if (ch === ',' && !quoted) { cells.push(cell.trim()); cell = ''; }
      else cell += ch;
    }
    cells.push(cell.trim());
    return cells;
  };

  const rawHeaders = parseLine(lines[0]);
  const mapped = mapHeaders(rawHeaders);
  const headers = rawHeaders.map((header, index) => mapped[index] || canonicalHeader(header));
  return lines.slice(1).map((line, index) => {
    const cells = parseLine(line);
    return Object.fromEntries(headers.map((header, i) => [header, cells[i] || '']));
  }).map((row, i) => ({ ...row, _row: i + 2 }));
}

const firstValue = (row, keys) => keys.map((key) => row[key]).find((value) => value !== undefined && String(value).trim() !== '') || '';

function inferRecordType(row) {
  const explicit = firstValue(row, ['record_type', 'type', 'record']);
  if (explicit) {
    const value = explicit.toLowerCase().trim().replace(/[- ]+/g, '_');
    if (['farm_group', 'farmgroup', 'group', 'unit', 'flock', 'herd', 'plot'].includes(value)) return 'unit';
    if (['inventory', 'stock', 'item', 'supply'].includes(value)) return 'inventory';
    if (['expense', 'expenses', 'cost', 'spending'].includes(value)) return 'expense';
    if (['log', 'daily_log', 'dailylog', 'production', 'activity'].includes(value)) return 'log';
  }
  if (row.movement_type) return 'inventory';
  if (row.loss || row.mortality || row.produced || row.production || row.production_quantity) return 'log';
  if (row.supplier || row.payment_method || row.expense_amount || row.expense) return 'expense';
  if (row.opening_stock || row.unit_cost || row.cost_per_unit) return 'inventory';
  return '';
}

const numberValue = (value) => {
  if (value === undefined || value === null || String(value).trim() === '') return 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const textValue = (row, keys) => String(firstValue(row, keys)).trim();

function normalizeMovementType(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/[- ]+/g, '_');
  const aliases = {
    bought: 'purchase', buy: 'purchase', purchased: 'purchase', purchase: 'purchase', in: 'purchase', stock_in: 'purchase',
    used: 'consumption', use: 'consumption', consumed: 'consumption', consumption: 'consumption', out: 'consumption', stock_out: 'consumption',
    lost: 'wastage', waste: 'wastage', spoiled: 'wastage', spoilage: 'wastage', wastage: 'wastage',
    returned: 'return', return: 'return', found: 'adjustment_in', found_extra: 'adjustment_in',
    missing: 'adjustment_out', correction_out: 'adjustment_out', correction_in: 'adjustment_in',
    counted: 'stock_count', stock_count: 'stock_count', count: 'stock_count',
    sold: 'sale', sale: 'sale', transferred: 'transfer', transfer: 'transfer',
  };
  return aliases[normalized] || '';
}

function normalizeImportedRow(row) {
  return {
    ...row,
    record_type: inferRecordType(row),
    date: textValue(row, ['date', 'record_date', 'transaction_date', 'start_date']) || todayISO(),
    farm_group: textValue(row, ['farm_group', 'farm_group_name', 'group_name', 'unit_name', 'flock', 'herd', 'plot']),
    name: textValue(row, ['name', 'item', 'item_name', 'description', 'what', 'activity', 'record_name']),
    category: textValue(row, ['category', 'expense_category']) || 'supplies',
    unit: textValue(row, ['unit', 'uom', 'measure']) || 'units',
    quantity: numberValue(firstValue(row, ['quantity', 'qty', 'count', 'opening_stock', 'produced', 'production', 'production_quantity'])),
    unit_cost: numberValue(firstValue(row, ['unit_cost', 'cost_per_unit', 'price_per_unit', 'cost'])),
    amount: numberValue(firstValue(row, ['amount', 'total_amount', 'total', 'expense', 'expense_amount', 'money', 'value'])),
    supplier: textValue(row, ['supplier', 'vendor', 'seller', 'bought_from']),
    payment_method: textValue(row, ['payment_method', 'paid_by', 'payment']),
    movement_type: normalizeMovementType(firstValue(row, ['movement_type', 'transaction_type', 'stock_movement', 'movement'])),
    loss: numberValue(firstValue(row, ['loss', 'lost', 'losses', 'wastage', 'waste'])),
    mortality: numberValue(firstValue(row, ['mortality', 'deaths', 'dead', 'birds_lost'])),
    notes: textValue(row, ['notes', 'note', 'remarks', 'comment', 'comments']),
  };
}

export default function ImportRecordsView({ farm, onBack }) {
  const [mode, setMode] = useState('choose');
  const [type, setType] = useState('expense');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ date: todayISO(), name: '', category: 'supplies', unit: 'kg', quantity: '', amount: '', notes: '', unitId: '' });
  const [csvRows, setCsvRows] = useState([]);
  const [csvError, setCsvError] = useState('');
  const fileRef = useRef(null);

  const selectedUnit = useMemo(() => farm.units.find((u) => u.id === form.unitId), [farm.units, form.unitId]);
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  function saveManual(event) {
    event.preventDefault();
    if (!form.date || !form.name.trim()) return;
    const createdAt = Date.now();
    if (type === 'unit') {
      farm.addUnit({ id: makeId('unit'), name: form.name.trim(), type: 'other', initialCount: Number(form.quantity) || 0, producePrice: 0, startDate: form.date, createdAt });
    } else if (type === 'inventory') {
      farm.addInventoryItem({ id: makeId('item'), name: form.name.trim(), category: form.category, unit: form.unit, openingStock: Number(form.quantity) || 0, openingDate: form.date, reorderLevel: 0, unitCost: Number(form.amount) || 0, createdAt });
    } else if (type === 'expense') {
      farm.addExpense({ id: makeId('expense'), category: form.category, amount: Number(form.amount) || 0, date: form.date, unitId: form.unitId || null, description: form.name.trim(), supplier: null, paymentMethod: null, inventoryItemId: null, inventoryQuantity: null, createdAt });
    } else {
      if (!selectedUnit) return;
      farm.addLog({ id: makeId('log'), unitId: selectedUnit.id, date: form.date, produced: Number(form.quantity) || 0, grades: null, loss: 0, feedKg: 0, feedQuantity: 0, feedItemId: null, mortality: 0, notes: form.notes || form.name.trim(), createdAt }, selectedUnit);
    }
    setSaved(true);
    setForm((prev) => ({ ...prev, name: '', quantity: '', amount: '', notes: '' }));
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setCsvError('');
    try {
      const rows = parseCsv(await file.text()).map(normalizeImportedRow);
      if (!rows.length) throw new Error('The spreadsheet is empty.');
      if (!rows.some((row) => row.record_type)) throw new Error('We could not identify any records. Add a Record Type column (Farm Group, Stock, Expense or Daily Log), or use the Mazaosmart template.');
      setCsvRows(rows);
      setMode('csv-review');
    } catch (error) { setCsvError(error.message || 'Could not read that file.'); }
  }

  function importCsv() {
    const unitsByName = new Map(farm.units.map((u) => [u.name.trim().toLowerCase(), u]));
    const inventoryByName = new Map(farm.inventory.map((item) => [item.name.trim().toLowerCase(), item]));
    let imported = 0;
    let skipped = 0;
    for (const row of csvRows) {
      const recordType = row.record_type;
      const date = row.date || todayISO();
      if (recordType === 'unit') {
        const name = row.name || row.farm_group;
        if (!name || unitsByName.has(name.toLowerCase())) { skipped += 1; continue; }
        const unit = { id: makeId('unit'), name, type: 'other', initialCount: row.quantity, producePrice: 0, startDate: date, createdAt: Date.now() };
        farm.addUnit(unit); unitsByName.set(name.toLowerCase(), unit); imported += 1;
      } else if (recordType === 'inventory') {
        if (!row.name || row.quantity <= 0) { skipped += 1; continue; }
        let item = inventoryByName.get(row.name.toLowerCase());
        if (!item) {
          item = { id: makeId('item'), name: row.name, category: row.category, unit: row.unit, openingStock: row.movement_type ? 0 : row.quantity, openingDate: row.movement_type ? null : date, reorderLevel: 0, unitCost: row.unit_cost, supplier: row.supplier || null, createdAt: Date.now() };
          const savedItem = farm.addInventoryItem(item);
          item = savedItem || item;
          inventoryByName.set(row.name.toLowerCase(), item);
        }
        if (row.movement_type) {
          const saved = farm.addInventoryMove({
            id: makeId('import_txn'),
            itemId: item.id,
            transactionType: row.movement_type,
            quantity: row.quantity,
            unitCost: row.unit_cost || item.unitCost || 0,
            date,
            note: row.notes || 'Imported stock movement',
            source: 'import',
            sourceId: row._row,
            unitId: row.farm_group ? unitsByName.get(row.farm_group.toLowerCase())?.id || null : null,
          });
          if (saved === false) { skipped += 1; continue; }
        }
        imported += 1;
      } else if (recordType === 'expense') {
        if (!row.name || row.amount <= 0) { skipped += 1; continue; }
        const unit = row.farm_group ? unitsByName.get(row.farm_group.toLowerCase()) : null;
        farm.addExpense({ id: makeId('expense'), category: row.category, amount: row.amount, date, unitId: unit?.id || null, description: row.name, supplier: row.supplier || null, paymentMethod: row.payment_method || null, inventoryItemId: null, inventoryQuantity: row.quantity || null, createdAt: Date.now() });
        imported += 1;
      } else if (recordType === 'log') {
        const unit = row.farm_group ? unitsByName.get(row.farm_group.toLowerCase()) : null;
        if (!unit || (row.quantity <= 0 && row.loss <= 0 && row.mortality <= 0)) { skipped += 1; continue; }
        farm.addLog({ id: makeId('log'), unitId: unit.id, date, produced: row.quantity, grades: null, loss: row.loss, feedKg: 0, feedQuantity: 0, feedItemId: null, mortality: row.mortality, notes: row.notes || row.name || '', createdAt: Date.now() }, unit);
        imported += 1;
      } else {
        skipped += 1;
      }
    }
    setSaved(true);
    setCsvRows([]);
    setMode('choose');
    setCsvError(`${imported} records added${skipped ? `; ${skipped} rows skipped because required information was missing or could not be matched.` : '.'}`);
  }

  function downloadTemplate() {
    const content = 'record_type,date,farm_group,name,category,unit,quantity,unit_cost,amount,supplier,payment_method,movement_type,loss,mortality,notes\n' +
      'farm_group,2026-01-01,,Layer House A,Eggs,birds,50,,,,,,,\n' +
      'stock,2026-01-01,Layer House A,Layer Mash,Feed,kg,50,75,,,,purchase,,,\n' +
      'stock,2026-01-10,Layer House A,Layer Mash,Feed,kg,5,75,,,,consumption,,,Used for feeding\n' +
      'expense,2026-01-05,Layer House A,Feed purchase,Feed,kg,50,75,3750,Local agrovet,mpesa,,,,\n' +
      'log,2026-01-06,Layer House A,Daily production,Eggs,trays,30,,,,,,2,1,Example historical record';
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'mazaosmart-records-template.csv'; a.click(); URL.revokeObjectURL(url);
  }

  if (mode === 'manual') return <div className="space-y-5"><button className="btn-ghost rounded-xl px-3 py-2 text-sm" onClick={() => setMode('choose')}><ArrowLeft size={16} className="inline mr-2" />Back</button><header><div className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--forest)' }}>Bring in old records</div><h1 className="font-display text-2xl font-semibold mt-1">Add a past record</h1><p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>You don't need to enter everything. Start with the records that matter most.</p></header><div className="grid grid-cols-2 gap-2">{TYPES.map((item) => <button key={item.value} type="button" onClick={() => { setType(item.value); setSaved(false); }} className={`rounded-xl border p-3 text-left text-sm ${type === item.value ? 'ring-2' : ''}`} style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}><div className="font-semibold">{item.label}</div><div className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>{item.hint}</div></button>)}</div><form onSubmit={saveManual} className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}><label className="block text-sm font-medium">Date<input className="field mt-1 w-full" type="date" value={form.date} onChange={(e) => update('date', e.target.value)} required /></label><label className="block text-sm font-medium">{type === 'unit' ? 'Farm group name' : type === 'inventory' ? 'Stock item' : type === 'expense' ? 'What was it for?' : 'What happened?'}<input className="field mt-1 w-full" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder={type === 'unit' ? 'e.g. Layer House A' : type === 'inventory' ? 'e.g. Layer Mash' : type === 'expense' ? 'e.g. Feed purchase' : 'e.g. Eggs collected'} required /></label>{type === 'unit' && <label className="block text-sm font-medium">Starting quantity<input className="field mt-1 w-full" type="number" min="0" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} /></label>}{type === 'inventory' && <><label className="block text-sm font-medium">Quantity<input className="field mt-1 w-full" type="number" min="0" step="any" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} /></label><label className="block text-sm font-medium">Unit cost<input className="field mt-1 w-full" type="number" min="0" step="any" value={form.amount} onChange={(e) => update('amount', e.target.value)} /></label></>}{type === 'expense' && <><label className="block text-sm font-medium">Amount (KSh)<input className="field mt-1 w-full" type="number" min="0" step="any" value={form.amount} onChange={(e) => update('amount', e.target.value)} required /></label><label className="block text-sm font-medium">Farm group (optional)<select className="field mt-1 w-full" value={form.unitId} onChange={(e) => update('unitId', e.target.value)}><option value="">Not linked</option>{farm.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label></>}{type === 'log' && <><label className="block text-sm font-medium">Farm group<select className="field mt-1 w-full" value={form.unitId} onChange={(e) => update('unitId', e.target.value)} required><option value="">Choose group</option>{farm.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label><label className="block text-sm font-medium">Production quantity<input className="field mt-1 w-full" type="number" min="0" step="any" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} required /></label><label className="block text-sm font-medium">Notes<textarea className="field mt-1 w-full" value={form.notes} onChange={(e) => update('notes', e.target.value)} /></label></>}<button className="btn-primary w-full rounded-xl px-4 py-3 font-semibold" type="submit"><Plus size={17} className="inline mr-2" />Save past record</button>{saved && <div className="text-sm flex items-center gap-2" style={{ color: 'var(--forest)' }}><CheckCircle2 size={18} />Saved. You can add another record.</div>}</form></div>;

  if (mode === 'csv-review') return <div className="space-y-5"><button className="btn-ghost rounded-xl px-3 py-2 text-sm" onClick={() => setMode('choose')}><ArrowLeft size={16} className="inline mr-2" />Back</button><header><h1 className="font-display text-2xl font-semibold">Check your records</h1><p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>{csvRows.length} rows found. We add these to your existing records; we don't replace them.</p></header><div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}><div className="p-4 text-sm font-semibold" style={{ background: 'var(--surface)' }}>Preview</div><div className="overflow-auto max-h-72"><table className="w-full text-sm"><tbody>{csvRows.slice(0, 10).map((row) => <tr key={row._row} style={{ borderTop: '1px solid var(--line)' }}><td className="p-3">Row {row._row}</td><td className="p-3">{row.record_type || 'Unmatched'}</td><td className="p-3">{row.name || row.farm_group || '—'}</td><td className="p-3">{row.date || '—'}</td><td className="p-3">{row.amount || row.quantity || '—'}</td></tr>)}</tbody></table></div></div><button className="btn-primary w-full rounded-xl px-4 py-3 font-semibold" onClick={importCsv}>Add these records</button></div>;

  return <div className="space-y-5"><header><div className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--forest)' }}>Settings · Data</div><h1 className="font-display text-2xl font-semibold mt-1">Bring in existing records</h1><p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>Have records in a notebook? You can enter the important ones here. Have a spreadsheet? Upload it.</p></header><section className="grid gap-3"><button type="button" onClick={() => { setMode('manual'); setSaved(false); }} className="rounded-2xl p-5 text-left" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}><NotebookPen size={22} style={{ color: 'var(--forest)' }} /><h2 className="font-semibold mt-3">Enter records from paper</h2><p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>Add farm groups, stock, expenses and daily records one at a time.</p></button><button type="button" onClick={() => fileRef.current?.click()} className="rounded-2xl p-5 text-left" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}><FileSpreadsheet size={22} style={{ color: 'var(--forest)' }} /><h2 className="font-semibold mt-3">Upload a spreadsheet</h2><p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>CSV files are supported. We map common column names automatically and show a preview before adding anything.</p></button><input ref={fileRef} type="file" accept="text/csv,.csv" onChange={handleFile} className="hidden" /><button type="button" onClick={downloadTemplate} className="btn-ghost rounded-xl px-4 py-3 text-sm inline-flex items-center justify-center gap-2"><Upload size={16} /> Download CSV template</button></section>{csvError && <p className="text-sm rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>{csvError}</p>}<button type="button" onClick={onBack} className="btn-ghost rounded-xl px-4 py-3 text-sm w-full">Back to Settings</button></div>;
}
