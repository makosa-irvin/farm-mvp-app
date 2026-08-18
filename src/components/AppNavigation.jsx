import { TABS } from '../constants.js';
import '../styles/components/app-navigation.css';

export default function AppNavigation({ activeTab, onTabChange }) {
  return (
    <nav className="app-navigation" aria-label="Primary navigation">
      {TABS.map(({ icon: Icon, value, label }) => {
        const active = activeTab === value;

        return (
          <button
            key={value}
            type="button"
            onClick={() => onTabChange(value)}
            className={`app-navigation__tab${active ? ' app-navigation__tab--active' : ''}`}
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
