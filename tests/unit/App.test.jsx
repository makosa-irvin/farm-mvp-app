import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../src/App.jsx';
import Header from '../../src/layout/Header.jsx';
import { TABS } from '../../src/constants.js';

const resetStorage = () => localStorage.clear();

describe('App — composition and core navigation', () => {
  beforeEach(resetStorage);

  it('renders the header and starts on the Dashboard tab', () => {
    render(<App />);
    expect(screen.getByText('Mazaosmart')).toBeInTheDocument();
    expect(screen.getByText('No farm groups yet')).toBeInTheDocument();
  });

  it('clicking a nav tab switches the rendered view', () => {
    const onSelectTab = vi.fn();
    render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={onSelectTab} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Groups' })[0]);
    expect(onSelectTab).toHaveBeenCalledWith('units');

    fireEvent.click(screen.getAllByRole('button', { name: 'Stock' })[0]);
    expect(onSelectTab).toHaveBeenCalledWith('inventory');
  });

  it('the active tab is visually distinguished from inactive ones', () => {
    render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={vi.fn()} />);
    const dashboardTab = screen.getByRole('button', { name: 'Dashboard' });
    const unitsTab = screen.getAllByRole('button', { name: 'Groups' })[0];

    expect(dashboardTab.className).not.toBe(unitsTab.className);
  });
});

describe('App — accessibility: skip-to-content link', () => {
  beforeEach(resetStorage);

  it('renders a skip-to-content link pointing at the main landmark', () => {
    render(<App />);
    const skipLink = screen.getByText('Skip to main content');

    expect(skipLink.tagName).toBe('A');
    expect(skipLink).toHaveAttribute('href', '#main-content');
    expect(skipLink.className).toContain('sr-only');
    expect(document.getElementById('main-content')).not.toBeNull();
    expect(document.getElementById('main-content')).toHaveAttribute('tabindex', '-1');
  });
});

describe('App — mobile navigation wiring', () => {
  beforeEach(resetStorage);

  it('every declared tab appears in the mobile navigation', () => {
    render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={vi.fn()} />);
    fireEvent.click(screen.getByText('More'));

    for (const tab of TABS) {
      const mobileLabel = { dashboard: 'Home', log: 'Log', inventory: 'Stock', expenses: 'Expenses' }[tab.value] || tab.label;
      expect(screen.getAllByText(mobileLabel).length, `"${tab.label}" should appear in mobile navigation`).toBeGreaterThan(0);
    }
  });

  it('clicking a secondary More item invokes the correct tab selection', () => {
    const onSelectTab = vi.fn();
    render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={onSelectTab} />);
    fireEvent.click(screen.getByText('More'));

    const settingsButtons = screen.getAllByRole('button', { name: 'Settings' });
    fireEvent.click(settingsButtons[settingsButtons.length - 1]);

    expect(onSelectTab).toHaveBeenCalledWith('settings');
  });
});
