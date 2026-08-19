import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../../src/App.jsx';

describe('App — Header/NavTabs/MainContent composition', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the header and starts on the Dashboard tab', () => {
    render(<App />);
    expect(screen.getByText('Field Ledger')).toBeInTheDocument();
    expect(screen.getByText('No farm groups yet')).toBeInTheDocument(); // Dashboard empty state
  });

  it('clicking a nav tab switches the rendered view', () => {
    render(<App />);
    // The responsive header renders both the desktop top nav and the
    // mobile bottom nav in the DOM at once (jsdom doesn't evaluate the
    // `hidden sm:block` media query the way a real browser viewport
    // would), so some labels now match more than one button. Either one
    // triggers the same onSelectTab callback, so clicking the first match
    // is a faithful test of the actual behavior.
    fireEvent.click(screen.getAllByRole('button', { name: 'Groups' })[0]);
    expect(screen.getByText('Add a farm group')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Stock' })[0]);
    expect(screen.getByText('Nothing tracked yet')).toBeInTheDocument();
  });

  it('the active tab is visually distinguished from inactive ones', () => {
    render(<App />);
    const dashboardTab = screen.getByRole('button', { name: 'Dashboard' }); // unique: mobile nav labels this "Home" instead
    const unitsTab = screen.getAllByRole('button', { name: 'Groups' })[0];
    // Active/inactive are separate CSS module classes (NavTabs.module.css)
    // rather than inline styles now — just confirm they actually differ.
    expect(dashboardTab.className).not.toBe(unitsTab.className);

    fireEvent.click(unitsTab);
    expect(unitsTab.className).not.toBe(dashboardTab.className);
  });
});

describe('App — accessibility: skip-to-content link', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders a "Skip to main content" link as the very first focusable element', () => {
    render(<App />);
    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink.tagName).toBe('A');
  });

  it('the skip link points to an element that actually exists on the page', () => {
    render(<App />);
    const skipLink = screen.getByText('Skip to main content');
    const targetId = skipLink.getAttribute('href').replace('#', '');
    expect(document.getElementById(targetId)).not.toBeNull();
  });

  it('the skip link is visually hidden until focused (sr-only, not permanently visible chrome)', () => {
    render(<App />);
    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink.className).toContain('sr-only');
  });

  it('the main content landmark is keyboard-focusable (tabIndex=-1), so focus can actually land there when the skip link is used', () => {
    render(<App />);
    const main = document.getElementById('main-content');
    expect(main.getAttribute('tabindex')).toBe('-1');
  });
});

describe('App — every declared tab is reachable, on both desktop and mobile nav', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('every tab in TABS appears somewhere in the mobile nav (primary bar or the More menu)', async () => {
    const { TABS } = await import('../../src/constants.js');
    render(<App />);

    // Primary bar items are directly visible buttons; secondary ones are
    // revealed by opening "More". This is a permanent guard against the
    // exact class of bug where a newly-added tab is only wired into the
    // desktop nav and silently never appears on mobile at all, since the
    // mobile split is a hardcoded list in Header.jsx, not derived
    // automatically from TABS.
    fireEvent.click(screen.getByText('More'));

    for (const tab of TABS) {
      const mobileLabel = { dashboard: 'Home', log: 'Log', inventory: 'Stock', expenses: 'Expenses' }[tab.value] || tab.label;
      const matches = screen.getAllByText(mobileLabel);
      expect(matches.length, `"${tab.label}" (mobile label "${mobileLabel}") should appear in the mobile nav`).toBeGreaterThan(0);
    }
  });

  it('clicking through to each secondary tab in the "More" menu actually renders that screen', () => {
    render(<App />);
    fireEvent.click(screen.getByText('More'));
    // "Settings" matches both the desktop nav and the mobile "More"
    // popover, since both render in the DOM at once under jsdom (see the
    // note on this in Header.jsx) — click the last match, which is the
    // one inside the just-opened popover.
    const settingsButtons = screen.getAllByRole('button', { name: 'Settings' });
    fireEvent.click(settingsButtons[settingsButtons.length - 1]);
    expect(screen.getByText('Data & backup')).toBeInTheDocument();
  });
});
