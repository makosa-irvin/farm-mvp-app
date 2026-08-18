import { RefreshCw } from 'lucide-react';
import NavTabs from './NavTabs.jsx';
import styles from './Header.module.css';

// The sticky top bar: app title, a manual refresh button, and the tab nav.
// Refresh just reloads the page — since everything is stored via
// usePersistentState (localStorage), nothing is lost. It's there for the
// rare case the UI gets into a stuck state a re-render alone won't fix.
export default function Header({ tabs, activeTab, onSelectTab }) {
  return (
    <header className={`sticky top-0 z-10 px-5 pt-5 pb-3 ${styles.header}`}>
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
        <div>
          <div className={`font-display text-2xl font-bold leading-none ${styles.title}`}>Field Ledger</div>
          <div className={`text-xs mt-1 ${styles.subtitle}`}>Production &amp; input tracking — Phase 1 MVP</div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="btn-ghost rounded-xl px-3 py-2 text-sm flex items-center gap-2"
          title="Refresh the app. Saved records remain in this browser."
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>
      <NavTabs tabs={tabs} activeTab={activeTab} onSelect={onSelectTab} />
    </header>
  );
}
