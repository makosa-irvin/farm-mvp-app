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

function parseCsv(text) {
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
  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map((line, index) => {
    const cells = parseLine(line);
    return Object.fromEntries(headers.map((header, i) => [header, cells[i] || '']));
  }).map((row, i) => ({ ...row, _row: i + 2 }));
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
    if (!form.date) return;
    if (type === 'unit' && !form.name.trim()) return;
    if (type !== 'unit' && !form.name.trim()) return;
    const createdAt = Date.now();
    if (type === 'unit') {
      farm.addUnit({ id: makeId('unit'), name: form.name.trim(), type: 'other', initialCount: Number(form.quantity) || 0, producePrice: 0, startDate: form.date, createdAt });
    } else if (type === 'inventory') {
      farm.addInventoryItem({ id: makeId('item'), name: form.name.trim(), category: form.category, unit: form.unit, openingStock: Number(form.quantity) || 0, reorderLevel: 0, unitCost: Number(form.amount) || 0, createdAt });
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
      const rows = parseCsv(await file.text());
      if (!rows.length || !rows[0].record_type) throw new Error('The CSV needs a record_type column. Download the template and try again.');
      setCsvRows(rows);
      setMode('csv-review');
    } catch (error) { setCsvError(error.message || 'Could not read that file.'); }
  }

  function importCsv() {
    const unitsByName = new Map(farm.units.map((u) => [u.name.trim().toLowerCase(), u]));
    let imported = 0;
    for (const row of csvRows) {
      const recordType = row.record_type.toLowerCase();
      const date = row.date || todayISO();
      if (recordType === 'farm_group' || recordType === 'unit') {
        if (!row.name || unitsByName.has(row.name.trim().toLowerCase())) continue;
        const unit = { id: makeId('unit'), name: row.name.trim(), type: 'other', initialCount: Number(row.quantity) || 0, producePrice: 0, startDate: date, createdAt: Date.now() };
        farm.addUnit(unit); unitsByName.set(unit.name.toLowerCase(), unit); imported += 1;
      } else if (recordType === 'inventory' || recordType === 'stock') {
        if (!row.name) continue;
        farm.addInventoryItem({ id: makeId('item'), name: row.name.trim(), category: row.category || 'supplies', unit: row.unit || 'units', openingStock: Number(row.quantity) || 0, reorderLevel: 0, unitCost: Number(row.unit_cost || row.cost) || 0, createdAt: Date.now() }); imported += 1;
      } else if (recordType === 'expense') {
        if (!row.name || !Number(row.amount)) continue;
        const unit = row.farm_group ? unitsByName.get(row.farm_group.trim().toLowerCase()) : null;
        farm.addExpense({ id: makeId('expense'), category: row.category || 'supplies', amount: Number(row.amount), date, unitId: unit?.id || null, description: row.name.trim(), supplier: row.supplier || null, paymentMethod: row.payment_method || null, inventoryItemId: null, inventoryQuantity: null, createdAt: Date.now() }); imported += 1;
      } else if (recordType === 'log') {
        const unit = row.farm_group ? unitsByName.get(row.farm_group.trim().toLowerCase()) : null;
        if (!unit || !row.quantity) continue;
        farm.addLog({ id: makeId('log'), unitId: unit.id, date, produced: Number(row.quantity) || 0, grades: null, loss: Number(row.loss) || 0, feedKg: 0, feedQuantity: 0, feedItemId: null, mortality: Number(row.mortality) || 0, notes: row.notes || '', createdAt: Date.now() }, unit); imported += 1;
      }
    }
    setSaved(true);
    setCsvRows([]);
    setMode('choose');
    setCsvError(`${imported} records added. Records that could not be matched were skipped.`);
  }

  function downloadTemplate() {
    const content = 'record_type,date,farm_group,name,category,unit,quantity,unit_cost,amount,supplier,payment_method,loss,mortality,notes\n' +
      'farm_group,2026-01-01,,Layer House A,,,,,,,,,,,\n' +
      'stock,2026-01-01,Layer House A,Layer Mash,Feed,kg,50,75,,,,,,\n' +
      'expense,2026-01-05,Layer House A,Feed purchase,feed,,50,75,3750,Local agrovet,mpesa,,,,\n' +
      'log,2026-01-06,Layer House A,Daily production,,,30,,,,,,2,1,Example historical record';
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'mazaosmart-records-template.csv'; a.click(); URL.revokeObjectURL(url);
  }

  if (mode === 'manual') return <div className="space-y-5"><button className="btn-ghost rounded-xl px-3 py-2 text-sm" onClick={() => setMode('choose')}><ArrowLeft size={16} className="inline mr-2" />Back</button><header><div className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--forest)' }}>Bring in old records</div><h1 className="font-display text-2xl font-semibold mt-1">Add a past record</h1><p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>You don't need to enter everything. Start with the records that matter most.</p></header><div className="grid grid-cols-2 gap-2">{TYPES.map((item) => <button key={item.value} type="button" onClick={() => { setType(item.value); setSaved(false); }} className={`rounded-xl border p-3 text-left text-sm ${type === item.value ? 'ring-2' : ''}`} style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}><div className="font-semibold">{item.label}</div><div className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>{item.hint}</div></button>)}</div><form onSubmit={saveManual} className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}><label className="block text-sm font-medium">Date<input className="field mt-1 w-full" type="date" value={form.date} onChange={(e) => update('date', e.target.value)} required /></label><label className="block text-sm font-medium">{type === 'unit' ? 'Farm group name' : type === 'inventory' ? 'Stock item' : type === 'expense' ? 'What was it for?' : 'What happened?'}<input className="field mt-1 w-full" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder={type === 'unit' ? 'e.g. Layer House A' : type === 'inventory' ? 'e.g. Layer Mash' : type === 'expense' ? 'e.g. Feed purchase' : 'e.g. Eggs collected'} required /></label>{type === 'unit' && <label className="block text-sm font-medium">Starting quantity<input className="field mt-1 w-full" type="number" min="0" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} /></label>}{type === 'inventory' && <><label className="block text-sm font-medium">Quantity<input className="field mt-1 w-full" type="number" min="0" step="any" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} /></label><label className="block text-sm font-medium">Unit cost<input className="field mt-1 w-full" type="number" min="0" step="any" value={form.amount} onChange={(e) => update('amount', e.target.value)} /></label></>}{type === 'expense' && <><label className="block text-sm font-medium">Amount (KSh)<input className="field mt-1 w-full" type="number" min="0" step="any" value={form.amount} onChange={(e) => update('amount', e.target.value)} required /></label><label className="block text-sm font-medium">Farm group (optional)<select className="field mt-1 w-full" value={form.unitId} onChange={(e) => update('unitId', e.target.value)}><option value="">Not linked</option>{farm.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label></>}{type === 'log' && <><label className="block text-sm font-medium">Farm group<select className="field mt-1 w-full" value={form.unitId} onChange={(e) => update('unitId', e.target.value)} required><option value="">Choose group</option>{farm.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label><label className="block text-sm font-medium">Production quantity<input className="field mt-1 w-full" type="number" min="0" step="any" value={form.quantity} onChange={(e) => update('quantity', e.target.value)} required /></label><label className="block text-sm font-medium">Notes<textarea className="field mt-1 w-full" value={form.notes} onChange={(e) => update('notes', e.target.value)} /></label></>}<button className="btn-primary w-full rounded-xl px-4 py-3 font-semibold" type="submit"><Plus size={17} className="inline mr-2" />Save past record</button>{saved && <div className="text-sm flex items-center gap-2" style={{ color: 'var(--forest)' }}><CheckCircle2 size={18} />Saved. You can add another record.</div>}</form></div>;

  if (mode === 'csv-review') return <div className="space-y-5"><button className="btn-ghost rounded-xl px-3 py-2 text-sm" onClick={() => setMode('choose')}><ArrowLeft size={16} className="inline mr-2" />Back</button><header><h1 className="font-display text-2xl font-semibold">Check your records</h1><p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>{csvRows.length} rows found. We add these to your existing records; we don't replace them.</p></header><div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}><div className="p-4 text-sm font-semibold" style={{ background: 'var(--surface)' }}>Preview</div><div className="overflow-auto max-h-72"><table className="w-full text-sm"><tbody>{csvRows.slice(0, 10).map((row) => <tr key={row._row} style={{ borderTop: '1px solid var(--line)' }}><td className="p-3">Row {row._row}</td><td className="p-3">{row.record_type}</td><td className="p-3">{row.name || row.farm_group || '—'}</td><td className="p-3">{row.amount || row.quantity || '—'}</td></tr>)}</tbody></table></div></div><button className="btn-primary w-full rounded-xl px-4 py-3 font-semibold" onClick={importCsv}>Add these records</button></div>;

  return <div className="space-y-5"><header><div className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--forest)' }}>Settings · Data</div><h1 className="font-display text-2xl font-semibold mt-1">Bring in existing records</h1><p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>Have records in a notebook? You can enter the important ones here. Have a spreadsheet? Upload it.</p></header><section className="grid gap-3"><button type="button" onClick={() => { setMode('manual'); setSaved(false); }} className="rounded-2xl p-5 text-left" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}><NotebookPen size={22} style={{ color: 'var(--forest)' }} /><h2 className="font-semibold mt-3">Enter records from paper</h2><p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>Add farm groups, stock, expenses and daily records one at a time.</p></button><button type="button" onClick={() => fileRef.current?.click()} className="rounded-2xl p-5 text-left" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}><FileSpreadsheet size={22} style={{ color: 'var(--forest)' }} /><h2 className="font-semibold mt-3">Upload a spreadsheet</h2><p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>Use the simple CSV template, review the rows, then add them without replacing current records.</p></button><input ref={fileRef} type="file" accept="text/csv,.csv" onChange={handleFile} className="hidden" /><button type="button" onClick={downloadTemplate} className="btn-ghost rounded-xl px-4 py-3 text-sm inline-flex items-center justify-center gap-2"><Upload size={16} /> Download CSV template</button></section>{csvError && <p className="text-sm rounded-xl p-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>{csvError}</p>}<button type="button" onClick={onBack} className="btn-ghost rounded-xl px-4 py-3 text-sm w-full">Back to Settings</button></div>;
}
