import { useEffect, useState } from 'react';
import { CheckCircle2, CloudOff, RefreshCw } from 'lucide-react';

// The app is currently local-first. This indicator deliberately avoids
// claiming cloud synchronization that does not exist yet. It tells the
// farmer whether changes are safely stored on this phone and whether the
// browser currently has connectivity for a future sync-capable backend.
export default function OfflineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
      title={online ? 'Your changes are saved on this phone' : 'You are offline. Your changes are saved on this phone.'}
      style={{
        background: online ? 'var(--forest-tint)' : 'var(--amber-tint)',
        color: online ? 'var(--forest-dark)' : 'var(--amber)',
      }}
    >
      {online ? <CheckCircle2 size={13} /> : <CloudOff size={13} />}
      <span>{online ? 'Saved on phone' : 'Offline · saved on phone'}</span>
    </div>
  );
}
