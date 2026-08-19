import { useRef } from 'react';
import { Download, Upload, ShieldCheck, Database, Sprout } from 'lucide-react';

export default function SettingsView({ exportData, importData }) {
  const fileRef = useRef(null);

  async function handleImport(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) await importData(file);
  }

  function replayTutorial() {
    localStorage.removeItem('mazao-onboarding-completed');
    window.dispatchEvent(new Event('mazao-show-onboarding'));
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--forest)' }}>Settings</div>
        <h1 className="font-display text-2xl font-semibold mt-1">Data & backup</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>Your farm records stay on this device unless you choose to export them.</p>
      </header>

      <section className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="flex items-start gap-3">
          <Sprout size={20} style={{ color: 'var(--forest)', marginTop: 2 }} />
          <div>
            <h2 className="font-semibold">Learn how to use Mazaosmart</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>
              Take the short farm tour again. It uses a temporary example and does not change your real farm records.
            </p>
          </div>
        </div>
        <button type="button" onClick={replayTutorial} className="btn-ghost rounded-xl px-4 py-2.5 text-sm inline-flex items-center gap-2">
          <Sprout size={16} /> Show me around
        </button>
      </section>

      <section className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="flex items-start gap-3">
          <Database size={20} style={{ color: 'var(--forest)', marginTop: 2 }} />
          <div>
            <h2 className="font-semibold">Backup your farm records</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>
              Export a complete JSON backup containing groups, daily logs, expenses, stock items, and the inventory ledger.
            </p>
          </div>
        </div>
        <button type="button" onClick={exportData} className="btn-primary rounded-xl px-4 py-2.5 text-sm inline-flex items-center gap-2">
          <Download size={16} /> Download backup
        </button>
      </section>

      <section className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="flex items-start gap-3">
          <Upload size={20} style={{ color: 'var(--forest)', marginTop: 2 }} />
          <div>
            <h2 className="font-semibold">Restore a backup</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>
              Restoring replaces the records currently stored in this browser. The file is validated before anything is changed.
            </p>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleImport} className="hidden" />
        <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost rounded-xl px-4 py-2.5 text-sm inline-flex items-center gap-2">
          <Upload size={16} /> Choose backup file
        </button>
      </section>

      <section className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} style={{ color: 'var(--forest)', marginTop: 2 }} />
          <div>
            <h2 className="font-semibold">Privacy boundary</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>
              Mazaosmart has no backend account or automatic cloud sync. Exported files are controlled by you and should be stored somewhere safe.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
