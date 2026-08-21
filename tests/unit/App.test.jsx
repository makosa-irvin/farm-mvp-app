import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
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

describe('App — font-size preference reaches the document root, not just an inner div', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-font-size');
  });

  // Regression test for a confirmed bug: rem units, which every Tailwind
  // text-size utility compiles to (used throughout essentially every
  // view in this app), are always relative to the root <html> element's
  // font-size — never to a descendant div. Applying data-font-size only
  // to the .farm-app div left almost all of the app's text completely
  // unaffected by this setting, despite Settings explicitly promising
  // "Easier to read" / "Highest visibility" for the Large/Extra large
  // options.
  it('applies data-font-size to <html> on initial load, matching the saved preference', () => {
    localStorage.setItem('mazaosmart-font-size', 'large');
    render(<App />);
    expect(document.documentElement.getAttribute('data-font-size')).toBe('large');
  });

  it('defaults to "default" on <html> when no preference has been saved', () => {
    render(<App />);
    expect(document.documentElement.getAttribute('data-font-size')).toBe('default');
  });

  it('updates <html> when the font-size-changed event fires elsewhere (e.g. from Settings)', () => {
    render(<App />);
    act(() => {
      window.dispatchEvent(new CustomEvent('mazaosmart-font-size-changed', { detail: 'x-large' }));
    });
    expect(document.documentElement.getAttribute('data-font-size')).toBe('x-large');
  });
});
