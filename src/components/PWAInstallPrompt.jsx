import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('field-ledger-install-dismissed') === '1');

  useEffect(() => {
    const onBeforeInstall = (event) => { event.preventDefault(); setPromptEvent(event); };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  if (!promptEvent || dismissed) return null;

  async function install() {
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  }

  function dismiss() {
    sessionStorage.setItem('field-ledger-install-dismissed', '1');
    setDismissed(true);
  }

  return (
    <aside className="fixed inset-x-4 bottom-20 z-30 rounded-2xl p-4 shadow-lg sm:inset-x-auto sm:right-5 sm:w-96" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }} aria-label="Install Field Ledger">
      <div className="flex items-start gap-3"><Download size={19} style={{ color: 'var(--forest)', marginTop: 2 }} /><div className="flex-1"><div className="font-semibold text-sm">Install Field Ledger</div><div className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>Keep the farm tracker on your home screen for quick offline access.</div><button type="button" onClick={install} className="btn-primary rounded-lg px-3 py-2 text-xs mt-3">Install app</button></div><button type="button" onClick={dismiss} aria-label="Dismiss install prompt" className="p-1 rounded hover:bg-black/5"><X size={15} /></button></div>
    </aside>
  );
}
