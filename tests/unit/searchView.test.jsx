import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchView from '../../src/views/SearchView.jsx';

const noop = () => {};

describe('SearchView', () => {
  it('shows no results and no "no matches" message when the query is empty', () => {
    const units = [{ id: 'u1', name: 'Layer House A', type: 'eggs' }];
    render(<SearchView units={units} logs={[]} expenses={[]} inventory={[]} goTo={noop} />);
    expect(screen.queryByText('Layer House A')).not.toBeInTheDocument();
    expect(screen.queryByText(/No records matched/)).not.toBeInTheDocument();
  });

  it('shows a "no matches" message for a query that finds nothing', () => {
    render(<SearchView units={[]} logs={[]} expenses={[]} inventory={[]} goTo={noop} />);
    fireEvent.change(screen.getByLabelText('Search farm records'), { target: { value: 'nonexistent thing' } });
    expect(screen.getByText('No records matched “nonexistent thing”.')).toBeInTheDocument();
  });

  it('finds a farm group by name', () => {
    const units = [{ id: 'u1', name: 'Layer House A', type: 'eggs' }];
    render(<SearchView units={units} logs={[]} expenses={[]} inventory={[]} goTo={noop} />);
    fireEvent.change(screen.getByLabelText('Search farm records'), { target: { value: 'layer house' } });
    expect(screen.getByText('Layer House A')).toBeInTheDocument();
    expect(screen.getByText('Group')).toBeInTheDocument();
  });

  it('matching is case-insensitive', () => {
    const units = [{ id: 'u1', name: 'Layer House A', type: 'eggs' }];
    render(<SearchView units={units} logs={[]} expenses={[]} inventory={[]} goTo={noop} />);
    fireEvent.change(screen.getByLabelText('Search farm records'), { target: { value: 'LAYER HOUSE' } });
    expect(screen.getByText('Layer House A')).toBeInTheDocument();
  });

  it('finds a farm group by its type, not just its name', () => {
    const units = [{ id: 'u1', name: 'Barn B', type: 'milk' }];
    render(<SearchView units={units} logs={[]} expenses={[]} inventory={[]} goTo={noop} />);
    fireEvent.change(screen.getByLabelText('Search farm records'), { target: { value: 'milk' } });
    expect(screen.getByText('Barn B')).toBeInTheDocument();
  });

  it('finds a stock item by name or category', () => {
    const inventory = [{ id: 'i1', name: 'Layer Mash', category: 'Feed', unit: 'kg' }];
    render(<SearchView units={[]} logs={[]} expenses={[]} inventory={inventory} goTo={noop} />);
    fireEvent.change(screen.getByLabelText('Search farm records'), { target: { value: 'layer mash' } });
    expect(screen.getByText('Layer Mash')).toBeInTheDocument();
    expect(screen.getByText('Stock')).toBeInTheDocument();
  });

  it('finds an expense by supplier name', () => {
    const expenses = [{ id: 'e1', description: '', category: 'feed', supplier: 'Wanjiku Agrovet', amount: 500, date: '2026-08-01' }];
    render(<SearchView units={[]} logs={[]} expenses={expenses} inventory={[]} goTo={noop} />);
    fireEvent.change(screen.getByLabelText('Search farm records'), { target: { value: 'wanjiku' } });
    expect(screen.getByText('Expense')).toBeInTheDocument();
  });

  it('finds a daily log by its farm group name or notes', () => {
    const units = [{ id: 'u1', name: 'Layer House A' }];
    const logs = [{ id: 'l1', unitId: 'u1', date: '2026-08-01', produced: 30, notes: 'unusually quiet today' }];
    render(<SearchView units={units} logs={logs} expenses={[]} inventory={[]} goTo={noop} />);
    fireEvent.change(screen.getByLabelText('Search farm records'), { target: { value: 'unusually quiet' } });
    expect(screen.getByText('Daily log')).toBeInTheDocument();
  });

  it('caps combined results at 30', () => {
    const inventory = Array.from({ length: 40 }, (_, i) => ({ id: `i${i}`, name: `Feed Item ${i}`, category: 'Feed', unit: 'kg' }));
    render(<SearchView units={[]} logs={[]} expenses={[]} inventory={inventory} goTo={noop} />);
    fireEvent.change(screen.getByLabelText('Search farm records'), { target: { value: 'feed' } });
    expect(screen.getAllByRole('button')).toHaveLength(30);
  });

  it('clicking a result navigates to its associated tab', () => {
    let navigatedTo = null;
    const units = [{ id: 'u1', name: 'Layer House A', type: 'eggs' }];
    render(<SearchView units={units} logs={[]} expenses={[]} inventory={[]} goTo={(tab) => { navigatedTo = tab; }} />);
    fireEvent.change(screen.getByLabelText('Search farm records'), { target: { value: 'layer house' } });
    fireEvent.click(screen.getByText('Layer House A'));
    expect(navigatedTo).toBe('units');
  });
});
