import styles from './NavTabs.module.css';

// Top-level tab bar. `tabs` is the TABS array from constants.js;
// `activeTab`/`onSelect` are lifted up to App.jsx, since which tab is
// active determines what MainContent renders.
export default function NavTabs({ tabs, activeTab, onSelect }) {
  return (
    <nav className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
      {tabs.map((t) => {
        const Icon = t.icon;
        const active = activeTab === t.value;
        return (
          <button
            key={t.value}
            onClick={() => onSelect(t.value)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap ${styles.tab} ${active ? styles.tabActive : ''}`}
          >
            <Icon size={15} strokeWidth={2.25} />
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
