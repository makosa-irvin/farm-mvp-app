import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../../src/layout/Header.jsx';
import { TABS } from '../../src/constants.js';

const noop = () => {};

// The "More" popover used to be a native <details>/<summary>, closed on
// selection by imperatively poking the DOM. That handled the one case it
// covered (clicking an item), but native <details> has no built-in way to
// close on an outside click or Escape — the more general form of "the
// menu doesn't close" someone actually experiences. This tests all three
// closing paths against the React-state-controlled version.
describe('Header — "More" menu opens and closes correctly', () => {
  it('is closed by default', () => {
    render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
  it('opens when the More button is clicked, and reflects that in aria-expanded', () => {
    render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} />);
    const moreButton = screen.getByText('More').closest('button');
    expect(moreButton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(moreButton);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(moreButton).toHaveAttribute('aria-expanded', 'true');
  });
  it('exposes Farm insights in the More menu', () => {
    render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} />);
    fireEvent.click(screen.getByText('More').closest('button'));
    expect(screen.getByRole('menuitem', { name: /Farm insights/i })).toBeInTheDocument();
  });
  it('closes when a menu item is selected', () => {
    render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} />);
    fireEvent.click(screen.getByText('More').closest('button'));
    fireEvent.click(screen.getByRole('menuitem', { name: /Groups/ }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
  it('closes when clicking outside the menu', () => {
    render(<div><div data-testid="outside-content">Somewhere else on the page</div><Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} /></div>);
    fireEvent.click(screen.getByText('More').closest('button'));
    fireEvent.mouseDown(screen.getByTestId('outside-content'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
  it('does not close when clicking inside the menu', () => {
    render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} />);
    fireEvent.click(screen.getByText('More').closest('button'));
    fireEvent.mouseDown(screen.getByRole('menu'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
  it('closes when Escape is pressed', () => {
    render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} />);
    fireEvent.click(screen.getByText('More').closest('button'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
  it('clicking More again toggles it closed', () => {
    render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} />);
    const button = screen.getByText('More').closest('button');
    fireEvent.click(button); fireEvent.click(button);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
  it('the Refresh item closes the menu', () => {
    render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} />);
    const button = screen.getByText('More').closest('button');
    fireEvent.click(button); fireEvent.click(screen.getByRole('menuitem', { name: /Refresh/ }));
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });
  it('every current secondary tab appears in the menu', () => {
    render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} />);
    fireEvent.click(screen.getByText('More').closest('button'));
    for (const label of ['Groups', 'Suppliers', 'Analytics', 'Farm insights', 'Reports', 'Settings']) expect(screen.getByRole('menuitem', { name: new RegExp(label) })).toBeInTheDocument();
  });
  it('renders accessible home and search controls', () => {
    render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} />);
    expect(screen.getByRole('button', { name: /go to home/i })).toHaveTextContent('Mazaosmart');
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });
});
