import { useEffect, useRef, useState } from 'react';
import { RefreshCw, MoreHorizontal, Search } from 'lucide-react';
import NavTabs from './NavTabs.jsx';
import styles from './Header.module.css';

export default function Header({ tabs, activeTab, onSelectTab }) {
  const mobilePrimary = tabs.filter((t) => ['dashboard', 'log', 'inventory', 'expenses'].includes(t.value));
  const mobileMore = tabs.filter((t) => ['units', 'suppliers', 'analytics', 'reports', 'settings'].includes(t.value));

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

  function goHome() {
    setIsMenuOpen(false);
    onSelectTab('dashboard');
  }

  function openSearch() {
    setIsMenuOpen(false);
    onSelectTab('search');
  }

  return (
    <>
      <header className={`sticky top-0 z-20 px-5 pt-5 pb-3 ${styles.header}`}>
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2">
            <button
              type="button"
              onClick={goHome}
              className={`font-display text-2xl font-bold leading-none ${styles.titleButton}`}
              aria-label="Go to home"
              title="Home"
            >
              Mazaosmart
            </button>
            <button
              type="button"
              onClick={openSearch}
              className="btn-ghost rounded-xl p-2.5 shrink-0"
              aria-label="Search records"
              title="Search records"
            >
              <Search size={21} strokeWidth={2.25} />
            </button>
            <div className={`text-xs mt-1 truncate hidden sm:block ${styles.subtitle}`}>Smart farm records &amp; decisions</div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="btn-ghost hidden sm:flex rounded-xl px-3 py-2 text-sm items-center gap-2 shrink-0"
            title="Refresh the app. Saved records remain in this browser."
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
        <div className="mt-1 sm:hidden">
          <div className={`text-xs truncate ${styles.subtitle}`}>Smart farm records &amp; decisions</div>
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
