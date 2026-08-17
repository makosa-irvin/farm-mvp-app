import { RefreshCw } from 'lucide-react';
import AppNavigation from './AppNavigation.jsx';

export default function AppHeader({ activeTab, onTabChange }) {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <header className="sticky top-0 z-10 px-5 pb-3 pt-5" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="font-display text-2xl font-bold leading-none" style={{ color: 'var(--ink)' }}>
            Field Ledger
          </div>
          <div className="mt-1 text-xs" style={{ color: 'var(--ink-soft)' }}>
            Production &amp; input tracking — Phase 1 MVP
          </div>
        </div>
        <button type="button" onClick={handleRefresh} className="btn-ghost flex items-center gap-2 rounded-xl px-3 py-2 text-sm" title="Refresh the app. Saved records remain in this browser.">
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>
      <AppNavigation activeTab={activeTab} onTabChange={onTabChange} />
    </header>
  );
}
