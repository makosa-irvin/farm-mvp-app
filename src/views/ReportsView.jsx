import { FileDown, BarChart3, Database } from 'lucide-react';
import { exportFarmReports } from '../lib/reportExport.js';

export default function ReportsView({ units, logs, expenses, inventory, inventoryMoves }) {
  const productionCount = logs.length;
  const expenseCount = expenses.length;
  const movementCount = inventoryMoves.length;

  function exportReports() {
    exportFarmReports({ units, logs, expenses, inventory, inventoryMoves });
  }

  return (
    <div className="space-y-6">
      <header><div className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--forest)' }}>Reports</div><h1 className="font-display text-2xl font-semibold mt-1">Take your records with you</h1><p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>Download simple CSV files you can open in Excel, Google Sheets, or another reporting tool.</p></header>
      <section className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="flex items-start gap-3"><FileDown size={20} style={{ color: 'var(--forest)', marginTop: 2 }} /><div><h2 className="font-semibold">Export farm reports</h2><p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>Creates production, expenses, and stock CSV files using the records currently on this device.</p></div></div>
        <button type="button" onClick={exportReports} className="btn-primary rounded-xl px-4 py-2.5 text-sm inline-flex items-center gap-2 mt-4"><FileDown size={16} /> Download CSV reports</button>
      </section>
      <div className="grid grid-cols-3 gap-3">
        <ReportStat icon={BarChart3} label="Production logs" value={productionCount} />
        <ReportStat icon={Database} label="Expense records" value={expenseCount} />
        <ReportStat icon={Database} label="Stock movements" value={movementCount} />
      </div>
      <p className="text-xs px-1" style={{ color: 'var(--ink-soft)' }}>CSV exports are copies of your current local records. They do not sync data to a server.</p>
    </div>
  );
}

function ReportStat({ icon: Icon, label, value }) {
  return <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}><Icon size={16} style={{ color: 'var(--forest)' }} /><div className="text-xs mt-2" style={{ color: 'var(--ink-soft)' }}>{label}</div><div className="font-mono text-xl font-semibold mt-1">{value}</div></div>;
}
