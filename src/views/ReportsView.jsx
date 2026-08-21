import { FileDown, BarChart3, Database, Boxes, Users } from 'lucide-react';
import { exportFarmReports } from '../lib/reportExport.js';
import { fmtMoney, fmtNum } from '../lib/helpers.js';

export default function ReportsView({ units, logs, expenses, inventory, inventoryMoves }) {
  const production = logs.reduce((s, l) => s + (Number(l.produced) || 0), 0);
  const spent = expenses.filter((e) => !e.nonCash).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const stockMovements = inventoryMoves.length;
  const stockBalance = inventory.reduce(
    (sum, item) =>
      sum +
      (Number(item.openingStock) || 0) +
      inventoryMoves
        .filter((m) => m.itemId === item.id)
        .reduce((s, m) => s + ((m.direction || m.type) === 'in' ? Number(m.quantity) || 0 : -(Number(m.quantity) || 0)), 0),
    0,
  );
  const earliest = [...logs, ...expenses, ...inventoryMoves]
    .map((x) => x.date)
    .filter(Boolean)
    .sort()[0];
  const latest = [...logs, ...expenses, ...inventoryMoves]
    .map((x) => x.date)
    .filter(Boolean)
    .sort()
    .at(-1);
  const exportReports = () => exportFarmReports({ units, logs, expenses, inventory, inventoryMoves });
  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--forest)' }}>
          Reports
        </div>
        <h1 className="font-display text-2xl font-semibold mt-1">Your farm history</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>
          Imported and new records are included. Download separate CSV reports for production, expenses, stock movements and groups.
        </p>
      </header>
      <section className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="flex items-start gap-3">
          <FileDown size={20} style={{ color: 'var(--forest)', marginTop: 2 }} />
          <div>
            <h2 className="font-semibold">Export complete reports</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>
              Stock exports include every historical movement, not just the current item list.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={exportReports}
          className="btn-primary rounded-xl px-4 py-3 text-sm inline-flex items-center gap-2 mt-4"
        >
          <FileDown size={16} />
          Download CSV reports
        </button>
      </section>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ReportStat icon={Users} label="Farm groups" value={units.length} />
        <ReportStat icon={BarChart3} label="Production" value={fmtNum(production)} />
        <ReportStat icon={Database} label="Cash expenses" value={fmtMoney(spent)} />
        <ReportStat icon={Boxes} label="Stock movements" value={stockMovements} />
      </div>
      <section className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <h2 className="font-semibold">History covered</h2>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>
              First record
            </div>
            <div className="font-mono mt-1">{earliest || '—'}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>
              Latest record
            </div>
            <div className="font-mono mt-1">{latest || '—'}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>
              Current stock quantity
            </div>
            <div className="font-mono mt-1">{fmtNum(stockBalance)}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>
              Production entries
            </div>
            <div className="font-mono mt-1">{logs.length}</div>
          </div>
        </div>
      </section>
      <p className="text-xs px-1" style={{ color: 'var(--ink-soft)' }}>
        CSV files are copies of the records on this device. They include the original dates from imported history.
      </p>
    </div>
  );
}
function ReportStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <Icon size={16} style={{ color: 'var(--forest)' }} />
      <div className="text-xs mt-2" style={{ color: 'var(--ink-soft)' }}>
        {label}
      </div>
      <div className="font-mono text-lg font-semibold mt-1 break-words">{value}</div>
    </div>
  );
}
