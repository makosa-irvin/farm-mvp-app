import { useEffect, useRef, useState } from 'react';
import { RefreshCw, MoreHorizontal } from 'lucide-react';
import NavTabs from './NavTabs.jsx';
import styles from './Header.module.css';

export default function Header({ tabs, activeTab, onSelectTab }) {
  const mobilePrimary = tabs.filter((t) => ['dashboard', 'log', 'inventory', 'expenses'].includes(t.value));
  const mobileMore = tabs.filter((t) => ['units', 'suppliers', 'analytics', 'reports', 'search', 'settings'].includes(t.value));

  // The "More" popover used to be a native <details>/<summary>, closed on
  // selection by imperatively poking the DOM (event.currentTarget.closest
  // ('details').open = false). That worked for the one case it handled —
  // clicking an item inside the menu — but native <details> has no
  // built-in way to close on an outside click or Escape, which is the
  // more general form of "the menu doesn't close" a person actually
  // experiences day to day. Controlling `open` as real React state fixes
  // both: selecting an item, clicking anywhere outside the menu, and
  // pressing Escape all close it the same, reliable way.
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    function onOutsideInteraction(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') setIsMenuOpen(false);
    }

    // 'mousedown' rather than 'click' so the outside-close fires before
    // any click-triggered navigation elsewhere on the page.
    document.addEventListener('mousedown', onOutsideInteraction);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onOutsideInteraction);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isMenuOpen]);

  function selectMoreItem(value) {
    setIsMenuOpen(false);
    onSelectTab(value);
  }

  return (
    <>
      <header className={`sticky top-0 z-20 px-5 pt-5 pb-3 ${styles.header}`}>
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <div className={`font-display text-2xl font-bold leading-none ${styles.title}`}>Mazaosmart</div>
            <div className={`text-xs mt-1 truncate ${styles.subtitle}`}>Smart farm records &amp; decisions</div>
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
              data-tour={`nav-${t.value}`}
              onClick={() => onSelectTab(t.value)}
              className={`${styles.mobileNavItem} ${active ? styles.mobileNavItemActive : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={20} strokeWidth={2.25} />
              <span>{t.value === 'dashboard' ? 'Home' : t.value === 'log' ? 'Log' : t.value === 'inventory' ? 'Stock' : 'Expenses'}</span>
            </button>
          );
        })}

        <div className={styles.moreMenu} ref={menuRef}>
          <button
            type="button"
            data-tour="nav-more"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-haspopup="true"
            aria-expanded={isMenuOpen}
            className={`${styles.mobileNavItem} ${mobileMore.some((t) => t.value === activeTab) ? styles.mobileNavItemActive : ''}`}
          >
            <MoreHorizontal size={20} strokeWidth={2.25} />
            <span>More</span>
          </button>

          {isMenuOpen && (
            <div className={styles.morePopover} role="menu">
              {mobileMore.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    data-tour={`more-${t.value}`}
                    type="button"
                    role="menuitem"
                    onClick={() => selectMoreItem(t.value)}
                    className={styles.moreItem}
                  >
                    <Icon size={18} />
                    {t.label}
                  </button>
                );
              })}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  window.location.reload();
                }}
                className={styles.moreItem}
              >
                <RefreshCw size={18} />
                Refresh
              </button>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
