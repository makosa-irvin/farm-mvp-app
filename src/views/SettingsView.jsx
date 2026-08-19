import { useRef, useState } from 'react';
import { Download, Upload, ShieldCheck, Database, Sprout, NotebookPen, Type } from 'lucide-react';

const FONT_SIZE_KEY = 'mazaosmart-font-size';
const FONT_SIZES = [
  { value: 'compact', label: 'Compact', description: 'Smaller text' },
  { value: 'default', label: 'Default', description: 'Recommended' },
  { value: 'large', label: 'Large', description: 'Easier to read' },
  { value: 'x-large', label: 'Extra large', description: 'Highest visibility' },
];

export default function SettingsView({ exportData, importData, onNavigate }) {
  const fileRef = useRef(null);
  const [fontSize, setFontSize] = useState(() => localStorage.getItem(FONT_SIZE_KEY) || 'default');

  async function handleImport(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) await importData(file);
  }

  function replayTutorial() {
    localStorage.removeItem('mazao-onboarding-completed');
    window.dispatchEvent(new Event('mazao-show-onboarding'));
  }

  function changeFontSize(value) {
    setFontSize(value);
    localStorage.setItem(FONT_SIZE_KEY, value);
    window.dispatchEvent(new CustomEvent('mazaosmart-font-size-changed', { detail: value }));
  }

  return (
    <div className="space-y-6">
      <header><div className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--forest)' }}>Settings</div><h1 className="font-display text-2xl font-semibold mt-1">Data & backup</h1><p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>Your farm records stay on this device unless you choose to export them.</p></header>

      <section className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="flex items-start gap-3"><Type size={20} style={{ color: 'var(--forest)', marginTop: 2 }} /><div><h2 className="font-semibold">Text size</h2><p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>Choose a comfortable reading size. Default is slightly larger for easier reading on phones.</p></div></div>
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Text size">
          {FONT_SIZES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={fontSize === option.value}
              onClick={() => changeFontSize(option.value)}
              className="rounded-xl px-3 py-3 text-left border min-h-[58px]"
              style={{
                borderColor: fontSize === option.value ? 'var(--forest)' : 'var(--line)',
                background: fontSize === option.value ? 'var(--forest-tint)' : 'var(--surface)',
                color: 'var(--ink)',
              }}
            >
              <span className="block font-semibold">{option.label}</span>
              <span className="block text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>{option.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="flex items-start gap-3"><Sprout size={20} style={{ color: 'var(--forest)', marginTop: 2 }} /><div><h2 className="font-semibold">Learn how to use Mazaosmart</h2><p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>Take the short farm tour again. It uses a temporary example and does not change your real farm records.</p></div></div>
        <button type="button" onClick={replayTutorial} className="btn-ghost rounded-xl px-4 py-2.5 text-sm inline-flex items-center gap-2"><Sprout size={16} /> Show me around</button>
      </section>

      <section className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
        <div className="flex items-start gap-3"><NotebookPen size={20} style={{ color: 'var(--forest)', marginTop: 2 }} /><div><h2 className="font-semibold">Bring in existing records</h2><p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>Have records in a notebook or spreadsheet? Add them without replacing the records already on this device.</p></div></div>
        <button type="button" onClick={() => onNavigate('import-records')} className="btn-primary rounded-xl px-4 py-2.5 text-sm inline-flex items-center gap-2"><NotebookPen size={16} /> Bring in records</button>
      </section>

      <section className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}><div className="flex items-start gap-3"><Database size={20} style={{ color: 'var(--forest)', marginTop: 2 }} /><div><h2 className="font-semibold">Backup your farm records</h2><p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>Export a complete JSON backup containing groups, daily logs, expenses, stock items, and the inventory ledger.</p></div></div><button type="button" onClick={exportData} className="btn-primary rounded-xl px-4 py-2.5 text-sm inline-flex items-center gap-2"><Download size={16} /> Download backup</button></section>

      <section className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}><div className="flex items-start gap-3"><Upload size={20} style={{ color: 'var(--forest)', marginTop: 2 }} /><div><h2 className="font-semibold">Restore a backup</h2><p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>Restoring replaces the records currently stored in this browser. The file is validated before anything is changed.</p></div></div><input ref={fileRef} type="file" accept="application/json,.json" onChange={handleImport} className="hidden" /><button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost rounded-xl px-4 py-2.5 text-sm inline-flex items-center gap-2"><Upload size={16} /> Choose backup file</button></section>

      <section className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}><div className="flex items-start gap-3"><ShieldCheck size={20} style={{ color: 'var(--forest)', marginTop: 2 }} /><div><h2 className="font-semibold">Privacy boundary</h2><p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>Mazaosmart has no backend account or automatic cloud sync. Exported files are controlled by you and should be stored somewhere safe.</p></div></div></section>
    </div>
  );
}
