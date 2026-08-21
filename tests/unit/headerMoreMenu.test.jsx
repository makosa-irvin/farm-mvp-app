import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../../src/layout/Header.jsx';
import { TABS } from '../../src/constants.js';
const noop = () => {};
describe('Header — "More" menu opens and closes correctly', () => {
  it('is closed by default', () => { render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} />); expect(screen.queryByRole('menu')).not.toBeInTheDocument(); });
  it('opens and exposes Farm insights', () => { render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} />); const button = screen.getByText('More').closest('button'); fireEvent.click(button); expect(screen.getByRole('menu')).toBeInTheDocument(); expect(screen.getByRole('menuitem', { name: /Farm insights/i })).toBeInTheDocument(); });
  it('closes on Escape', () => { render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} />); fireEvent.click(screen.getByText('More').closest('button')); fireEvent.keyDown(document, { key: 'Escape' }); expect(screen.queryByRole('menu')).not.toBeInTheDocument(); });
  it('renders accessible home and search controls', () => { render(<Header tabs={TABS} activeTab="dashboard" onSelectTab={noop} />); expect(screen.getByRole('button', { name: /go to home/i })).toHaveTextContent('Mazaosmart'); expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument(); });
});
