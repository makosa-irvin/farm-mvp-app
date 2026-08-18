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
