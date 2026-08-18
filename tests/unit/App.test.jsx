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
    expect(screen.getByText('No production units yet')).toBeInTheDocument(); // Dashboard empty state
  });

  it('clicking a nav tab switches the rendered view', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Units' }));
    expect(screen.getByText('Add a production unit')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Inventory' }));
    expect(screen.getByText('Inventory is ready to track')).toBeInTheDocument();
  });

  it('the active tab is visually distinguished from inactive ones', () => {
    render(<App />);
    const dashboardTab = screen.getByRole('button', { name: 'Dashboard' });
    const unitsTab = screen.getByRole('button', { name: 'Units' });
    // Active/inactive are separate CSS module classes (NavTabs.module.css)
    // rather than inline styles now — just confirm they actually differ.
    expect(dashboardTab.className).not.toBe(unitsTab.className);

    fireEvent.click(unitsTab);
    expect(unitsTab.className).not.toBe(dashboardTab.className);
  });
});
