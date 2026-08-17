import { TABS } from '../constants.js';

export default function AppNavigation({ activeTab, onTabChange }) {
  return (
    <nav className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }} aria-label="Primary navigation">
      {TABS.map(({ icon: Icon, value, label }) => {
        const active = activeTab === value;

        return (
          <button
            key={value}
            type="button"
            onClick={() => onTabChange(value)}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition-colors"
            style={{
              background: active ? 'var(--forest)' : 'transparent',
              color: active ? '#fff' : 'var(--ink-soft)',
              border: active ? '1px solid var(--forest)' : '1px solid transparent',
            }}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={15} strokeWidth={2.25} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
