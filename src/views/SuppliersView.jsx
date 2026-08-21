import { Building2, Phone, Receipt } from 'lucide-react';
import EmptyState from '../components/EmptyState.jsx';
import { fmtMoney, fmtNum } from '../lib/helpers.js';

/** Supplier intelligence derived from the supplier field already captured on expenses. */
export default function SuppliersView({ expenses = [] }) {
  const suppliers = Object.values(
    expenses.reduce((map, expense) => {
      const name = expense.supplier?.trim();
      if (!name || expense.nonCash) return map;
      const key = name.toLowerCase();
      map[key] ||= { name, spend: 0, purchases: 0, lastDate: expense.date, categories: new Set() };
      map[key].spend += Number(expense.amount) || 0;
      map[key].purchases += 1;
      map[key].lastDate = map[key].lastDate > expense.date ? map[key].lastDate : expense.date;
      if (expense.category) map[key].categories.add(expense.category);
      return map;
    }, {}),
  ).sort((a, b) => b.spend - a.spend);

  if (!suppliers.length)
    return (
      <EmptyState
        icon={Building2}
        title="No suppliers recorded yet"
        body="Add a supplier when recording an expense. Supplier history and spend will appear here automatically."
      />
    );

  return (
    <div className="space-y-5">
      <header>
        <div className="font-display text-2xl font-semibold">Suppliers</div>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>
          A simple view of who you buy from and where your money goes.
        </p>
      </header>
      <div className="space-y-2.5">
        {suppliers.map((supplier) => (
          <article
            key={supplier.name.toLowerCase()}
            className="rounded-2xl p-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'var(--forest-tint)', color: 'var(--forest)' }}
              >
                <Building2 size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{supplier.name}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
                  {[...supplier.categories].join(' · ') || 'Various purchases'}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-semibold">{fmtMoney(supplier.spend)}</div>
                <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>
                  total spend
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 text-xs" style={{ color: 'var(--ink-soft)' }}>
              <div className="flex items-center gap-1.5">
                <Receipt size={13} /> {fmtNum(supplier.purchases)} recorded purchase{supplier.purchases === 1 ? '' : 's'}
              </div>
              <div className="text-right">Last purchase: {supplier.lastDate || '—'}</div>
            </div>
          </article>
        ))}
      </div>
      <div className="text-xs px-1" style={{ color: 'var(--ink-soft)' }}>
        <Phone size={12} className="inline mr-1" />
        Supplier contacts are not stored yet; this screen currently summarizes recorded purchasing history.
      </div>
    </div>
  );
}
