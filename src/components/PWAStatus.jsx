import { useEffect, useState } from 'react';
import { HardDrive, RefreshCw } from 'lucide-react';

const APP_VERSION = '1.1.0';

function formatSavedAt(value) {
  if (!value) return 'Not saved yet';
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return 'Saved recently';
  return `Saved ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export default function PWAStatus({ lastSavedAt }) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [storage, setStorage] = useState(null);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.data?.type === 'FIELD_LEDGER_UPDATE_READY') setUpdateAvailable(true);
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!navigator.storage?.estimate) return undefined;
    navigator.storage.estimate().then(({ usage = 0, quota = 0 }) => {
      if (!cancelled && quota) setStorage({ usage, quota, percent: Math.round((usage / quota) * 100) });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [lastSavedAt]);

  const refresh = () => window.location.reload();
  const storageWarning = storage?.percent >= 80;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-xs" aria-label="Mazaosmart app status">
      <span title={`Mazaosmart v${APP_VERSION}`}>v{APP_VERSION}</span>
      <span aria-label="Last saved">{formatSavedAt(lastSavedAt)}</span>
      {storageWarning && <span className="inline-flex items-center gap-1 rounded-full px-2 py-1" style={{ background: 'var(--amber-tint)', color: 'var(--amber)' }}><HardDrive size={12} /> Storage {storage.percent}% full</span>}
      {updateAvailable && <button type="button" onClick={refresh} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium" style={{ background: 'var(--forest-tint)', color: 'var(--forest-dark)' }}><RefreshCw size={12} /> Update available</button>}
    </div>
  );
}
