import { Search, Tag, Boxes, Receipt, ClipboardList } from 'lucide-react';
import { useMemo, useState } from 'react';
import { fmtMoney, fmtNum } from '../lib/helpers.js';
import { clearSearchHistory, readSearchHistory, rememberSearch } from '../lib/searchHistory.js';

export default function SearchView({ units = [], logs = [], expenses = [], inventory = [], goTo }) {
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState(() => readSearchHistory());
  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return [];
    const matches = [];
    units.forEach((item) => {
      if (`${item.name} ${item.type}`.toLowerCase().includes(q)) matches.push({ key: `unit-${item.id}`, icon: Tag, type: 'Group', title: item.name, detail: item.type, tab: 'units' });
    });
    inventory.forEach((item) => {
      if (`${item.name} ${item.category}`.toLowerCase().includes(q)) matches.push({ key: `stock-${item.id}`, icon: Boxes, type: 'Stock', title: item.name, detail: `${item.category} · ${item.unit}`, tab: 'inventory' });
    });
    expenses.forEach((item) => {
      if (`${item.description || ''} ${item.supplier || ''} ${item.category || ''}`.toLowerCase().includes(q)) matches.push({ key: `expense-${item.id}`, icon: Receipt, type: 'Expense', title: item.description || item.category, detail: `${fmtMoney(item.amount)} · ${item.date}`, tab: 'expenses' });
    });
    logs.forEach((item) => {
      const group = units.find((u) => u.id === item.unitId);
      if (`${group?.name || ''} ${item.notes || ''} ${item.date}`.toLowerCase().includes(q)) matches.push({ key: `log-${item.id}`, icon: ClipboardList, type: 'Daily log', title: group?.name || 'Daily log', detail: `${item.date} · ${fmtNum(item.produced || 0)} produced`, tab: 'log' });
    });
    return matches.slice(0, 30);
  }, [q, units, logs, expenses, inventory]);

  function submitSearch(event) {
    event.preventDefault();
    if (q) setHistory(rememberSearch(query));
  }

  return (
    <div className="space-y-5">
      <header>
        <div className="font-display text-2xl font-semibold">Search your farm</div>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>Find groups, stock items, expenses, suppliers, and daily logs from one place.</p>
      </header>
      <form onSubmit={submitSearch} className="relative">
        <Search size={18} className="absolute left-3 top-3.5" style={{ color: 'var(--ink-soft)' }} />
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search e.g. Layer House, feed, supplier..." aria-label="Search farm records" className="w-full rounded-xl pl-10 pr-4 py-3" style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)' }} />
      </form>
      {!query && history.length > 0 && (
        <section>
          <div className="flex items-center justify-between"><h2 className="font-semibold text-sm">Recent searches</h2><button type="button" className="text-xs" onClick={() => { clearSearchHistory(); setHistory([]); }}>Clear</button></div>
          <div className="flex flex-wrap gap-2 mt-2">{history.map((entry) => <button key={entry} type="button" className="tag-chip" onClick={() => setQuery(entry)}>{entry}</button>)}</div>
        </section>
      )}
      {query && !results.length && <div className="rounded-2xl p-5 text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink-soft)' }}>No records matched “{query}”.</div>}
      <div className="space-y-2">{results.map(({ key, icon: Icon, type, title, detail, tab }) => <button key={key} type="button" className="w-full rounded-2xl p-4 flex items-center gap-3 text-left" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }} onClick={() => goTo(tab)}><Icon size={17} style={{ color: 'var(--forest)' }} /><div className="min-w-0 flex-1"><div className="text-xs" style={{ color: 'var(--ink-soft)' }}>{type}</div><div className="font-medium truncate">{title}</div><div className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>{detail}</div></div></button>)}</div>
    </div>
  );
}
