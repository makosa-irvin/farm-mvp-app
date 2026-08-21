import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../../src/layout/Header.jsx';
import { TABS } from '../../src/constants.js';

const noop = () => {};

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
    render(<div><div data-testid="outside-content">Somewhere else</div><Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} /></div>);
    fireEvent.click(screen.getByText('More').closest('button'));
    fireEvent.mouseDown(screen.getByTestId('outside-content'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes when Escape is pressed', () => {
    render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} />);
    fireEvent.click(screen.getByText('More').closest('button'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('renders accessible home and search controls', () => {
    render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} />);
    expect(screen.getByRole('button', { name: /go to home/i })).toHaveTextContent('Mazaosmart');
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });
});
