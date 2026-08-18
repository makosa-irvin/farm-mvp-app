import { RefreshCw, MoreHorizontal } from 'lucide-react';
import NavTabs from './NavTabs.jsx';
import styles from './Header.module.css';

// Responsive application shell. Desktop keeps full navigation; mobile keeps
// high-frequency recording destinations in the bottom bar and puts lower-
// frequency screens such as Groups, Analytics, and Settings behind More.
export default function Header({ tabs, activeTab, onSelectTab }) {
  const mobilePrimary = tabs.filter((t) => ['dashboard', 'log', 'inventory', 'expenses'].includes(t.value));
  const mobileMore = tabs.filter((t) => ['units', 'analytics', 'settings'].includes(t.value));

  return (
    <>
      <header className={`sticky top-0 z-20 px-5 pt-5 pb-3 ${styles.header}`}>
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <div className={`font-display text-2xl font-bold leading-none ${styles.title}`}>Field Ledger</div>
            <div className={`text-xs mt-1 truncate ${styles.subtitle}`}>Production &amp; input tracking</div>
          </div>
          <button onClick={() => window.location.reload()} className="btn-ghost hidden sm:flex rounded-xl px-3 py-2 text-sm items-center gap-2 shrink-0" title="Refresh the app. Saved records remain in this browser.">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
        <div className="mt-4 hidden sm:block"><NavTabs tabs={tabs} activeTab={activeTab} onSelect={onSelectTab} /></div>
      </header>

      <nav className={styles.mobileNav} aria-label="Primary navigation">
        {mobilePrimary.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.value;
          return (
            <button key={t.value} type="button" onClick={() => onSelectTab(t.value)} className={`${styles.mobileNavItem} ${active ? styles.mobileNavItemActive : ''}`} aria-current={active ? 'page' : undefined}>
              <Icon size={20} strokeWidth={2.25} />
              <span>{t.value === 'dashboard' ? 'Home' : t.value === 'log' ? 'Log' : t.value === 'inventory' ? 'Stock' : 'Expenses'}</span>
            </button>
          );
        })}
        <details className={styles.moreMenu}>
          <summary className={`${styles.mobileNavItem} ${mobileMore.some((t) => t.value === activeTab) ? styles.mobileNavItemActive : ''}`}>
            <MoreHorizontal size={20} strokeWidth={2.25} /><span>More</span>
          </summary>
          <div className={styles.morePopover}>
            {mobileMore.map((t) => {
              const Icon = t.icon;
              return <button key={t.value} type="button" onClick={() => onSelectTab(t.value)} className={styles.moreItem}><Icon size={18} />{t.label}</button>;
            })}
            <button type="button" onClick={() => window.location.reload()} className={styles.moreItem}><RefreshCw size={18} />Refresh</button>
          </div>
        </details>
      </nav>
    </>
  );
}
