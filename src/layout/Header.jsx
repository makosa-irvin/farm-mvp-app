import { RefreshCw, MoreHorizontal } from 'lucide-react';
import NavTabs from './NavTabs.jsx';
import styles from './Header.module.css';

// Responsive application shell. Desktop keeps the full tab navigation;
// mobile moves primary navigation to a thumb-friendly bottom bar and puts
// lower-frequency destinations/actions behind More.
//
// Both navs render in the DOM at all times — Tailwind's `hidden sm:block`
// classes hide one or the other with CSS media queries, not conditional
// rendering. That's a deliberate simplicity/reliability tradeoff (no
// window-width state to get wrong), but it means anything that queries the
// rendered output without a real browser viewport (jsdom-based tests, for
// instance) will see both at once and may get duplicate matches for a
// label that appears in both navs — see tests/unit/App.test.jsx for how
// that's handled.
//
// mobilePrimary/mobileMore is a hardcoded split of the six tabs, not
// derived from any flag on the tab data itself (see TABS in constants.js).
// If a new tab is ever added, it needs to be added to one of these two
// lists explicitly or it silently won't appear on mobile at all.
//
// The "More" menu uses a native <details>/<summary> element rather than
// button + useState — this gets keyboard support and click-outside-to-close
// for free from the browser, no extra JS needed for something this simple.
export default function Header({ tabs, activeTab, onSelectTab }) {
  const mobilePrimary = tabs.filter((t) => ['dashboard', 'log', 'inventory', 'expenses'].includes(t.value));
  const mobileMore = tabs.filter((t) => ['units', 'analytics'].includes(t.value));

  return (
    <>
      <header className={`sticky top-0 z-20 px-5 pt-5 pb-3 ${styles.header}`}>
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <div className={`font-display text-2xl font-bold leading-none ${styles.title}`}>Field Ledger</div>
            <div className={`text-xs mt-1 truncate ${styles.subtitle}`}>Production &amp; input tracking</div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="btn-ghost hidden sm:flex rounded-xl px-3 py-2 text-sm items-center gap-2 shrink-0"
            title="Refresh the app. Saved records remain in this browser."
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
        <div className="mt-4 hidden sm:block">
          <NavTabs tabs={tabs} activeTab={activeTab} onSelect={onSelectTab} />
        </div>
      </header>

      <nav className={styles.mobileNav} aria-label="Primary navigation">
        {mobilePrimary.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => onSelectTab(t.value)}
              className={`${styles.mobileNavItem} ${active ? styles.mobileNavItemActive : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={20} strokeWidth={2.25} />
              {/* Mobile-specific short labels, hardcoded per tab value
                  rather than read from tabs data. This silently falls
                  through to "Expenses" for any value not explicitly
                  matched — safe today since mobilePrimary is a fixed list
                  of exactly these four, but worth fixing to a lookup map
                  if a fifth item is ever added here. */}
              <span>{t.value === 'dashboard' ? 'Home' : t.value === 'log' ? 'Log' : t.value === 'inventory' ? 'Stock' : 'Expenses'}</span>
            </button>
          );
        })}
        <details className={styles.moreMenu}>
          <summary className={`${styles.mobileNavItem} ${mobileMore.some((t) => t.value === activeTab) ? styles.mobileNavItemActive : ''}`}>
            <MoreHorizontal size={20} strokeWidth={2.25} />
            <span>More</span>
          </summary>
          <div className={styles.morePopover}>
            {mobileMore.map((t) => {
              const Icon = t.icon;
              return (
                <button key={t.value} type="button" onClick={() => onSelectTab(t.value)} className={styles.moreItem}>
                  <Icon size={18} />
                  {t.label}
                </button>
              );
            })}
            <button type="button" onClick={() => window.location.reload()} className={styles.moreItem}>
              <RefreshCw size={18} />
              Refresh
            </button>
          </div>
        </details>
      </nav>
    </>
  );
}
