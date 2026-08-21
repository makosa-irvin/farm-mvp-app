import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Header from '../../src/layout/Header.jsx';
import { TABS } from '../../src/constants.js';

const noop = () => {};

describe('Header navigation', () => {
  it('renders Mazaosmart as an accessible home button', () => {
    render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} />);

    const homeButton = screen.getByRole('button', { name: /go to home/i });
    expect(homeButton).toHaveTextContent('Mazaosmart');
    expect(homeButton).toHaveAttribute('title', 'Home');
  });

  it('returns to the dashboard when Mazaosmart is clicked', () => {
    const onSelectTab = vi.fn();
    render(<Header tabs={TABS} activeTab="reports" onSelectTab={onSelectTab} />);

    fireEvent.click(screen.getByRole('button', { name: /go to home/i }));

    expect(onSelectTab).toHaveBeenCalledTimes(1);
    expect(onSelectTab).toHaveBeenCalledWith('dashboard');
  });

  it('renders Search in the header rather than the More menu', () => {
    render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} />);

    expect(screen.getByRole('button', { name: /search records/i })).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('navigates to Search when the header Search button is clicked', () => {
    const onSelectTab = vi.fn();
    render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={onSelectTab} />);

    fireEvent.click(screen.getByRole('button', { name: /search records/i }));

    expect(onSelectTab).toHaveBeenCalledTimes(1);
    expect(onSelectTab).toHaveBeenCalledWith('search');
  });

  it('does not render the Search button when the search tab is unavailable', () => {
    const tabsWithoutSearch = TABS.filter((tab) => tab.value !== 'search');
    render(<Header tabs={tabsWithoutSearch} activeTab="dashboard" onSelectTab={noop} />);

    expect(screen.queryByRole('button', { name: /search records/i })).not.toBeInTheDocument();
  });

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

  it('closes when a menu item is selected', () => {
    render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} />);
    fireEvent.click(screen.getByText('More').closest('button'));
    fireEvent.click(screen.getByRole('menuitem', { name: /Groups/ }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('calls onSelectTab with the correct tab value when a menu item is selected', () => {
    let selected = null;
    render(
      <Header
        tabs={TABS}
        activeTab="dashboard"
        onSelectTab={(value) => {
          selected = value;
        }}
      />,
    );
    fireEvent.click(screen.getByText('More').closest('button'));
    fireEvent.click(screen.getByRole('menuitem', { name: /Groups/ }));
    expect(selected).toBe('units');
  });

  it('closes when clicking outside the menu', () => {
    render(
      <div>
        <div data-testid="outside-content">Somewhere else on the page</div>
        <Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} />
      </div>,
    );
    fireEvent.click(screen.getByText('More').closest('button'));
    fireEvent.mouseDown(screen.getByTestId('outside-content'));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('does not close when clicking inside the menu but not on an item', () => {
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

  it('clicking the More button again toggles it closed', () => {
    render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} />);
    const moreButton = screen.getByText('More').closest('button');
    fireEvent.click(moreButton);
    fireEvent.click(moreButton);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('the Refresh item inside the menu also closes it', () => {
    render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} />);
    const moreButton = screen.getByText('More').closest('button');
    fireEvent.click(moreButton);

    fireEvent.click(screen.getByRole('menuitem', { name: /Refresh/ }));

    expect(moreButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('secondary navigation does not include Search because it has a dedicated header button', () => {
    render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} />);
    fireEvent.click(screen.getByText('More').closest('button'));

    for (const label of ['Groups', 'Suppliers', 'Analytics', 'Reports', 'Settings']) {
      expect(screen.getByRole('menuitem', { name: new RegExp(label) })).toBeInTheDocument();
    }
    expect(screen.queryByRole('menuitem', { name: /^Search$/ })).not.toBeInTheDocument();
  });

  it('preserves onboarding data-tour targets on the More trigger and items', () => {
    render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} />);
    expect(document.querySelector('[data-tour="nav-more"]')).not.toBeNull();
    fireEvent.click(screen.getByText('More').closest('button'));
    expect(document.querySelector('[data-tour="more-units"]')).not.toBeNull();
    expect(document.querySelector('[data-tour="more-settings"]')).not.toBeNull();
  });
});
