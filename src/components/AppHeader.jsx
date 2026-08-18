import { RefreshCw } from 'lucide-react';
import AppNavigation from './AppNavigation.jsx';
import '../styles/components/app-header.css';

export default function AppHeader({ activeTab, onTabChange }) {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <header className="app-header">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="app-header__brand-title font-display text-2xl font-bold leading-none">
            Field Ledger
          </div>
          <div className="app-header__brand-subtitle mt-1 text-xs">
            Production &amp; input tracking — Phase 1 MVP
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          className="btn-ghost flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
          title="Refresh the app. Saved records remain in this browser."
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      <AppNavigation activeTab={activeTab} onTabChange={onTabChange} />
    </header>
  );
}
