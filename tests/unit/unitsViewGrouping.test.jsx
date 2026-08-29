import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UnitsView from '../../src/views/UnitsView.jsx';

const noop = () => {};

describe('UnitsView — grouping individual animals under a herd', () => {
  it('the parent-group picker is hidden when there is nothing eligible to group under', () => {
    render(<UnitsView units={[]} logs={[]} onAdd={noop} onUpdate={noop} onRemove={noop} />);
    expect(screen.queryByText('Part of a bigger group? (optional)')).not.toBeInTheDocument();
  });

  it('the picker appears once at least one other group exists, and lists it as a candidate', () => {
    const units = [{ id: 'u1', name: 'Dairy Herd', type: 'milk', initialCount: 6, startDate: '2026-08-01' }];
    render(<UnitsView units={units} logs={[]} onAdd={noop} onUpdate={noop} onRemove={noop} />);
    expect(screen.getByText('Part of a bigger group? (optional)')).toBeInTheDocument();
    const select = screen.getByText('Part of a bigger group? (optional)', { selector: 'label' }).parentElement.querySelector('select');
    expect(Array.from(select.options).map((o) => o.textContent)).toContain('Dairy Herd');
  });

  it('the exact scenario this was built for: six individually-named cows grouped under one herd', () => {
    let saved = null;
    const herd = { id: 'herd1', name: 'Dairy Herd', type: 'milk', initialCount: 6, startDate: '2026-08-01' };
    render(<UnitsView units={[herd]} logs={[]} onAdd={(record) => { saved = record; }} onUpdate={noop} onRemove={noop} />);

    fireEvent.change(screen.getByText('What should we call it?', { selector: 'label' }).parentElement.querySelector('input'), { target: { value: 'Lucy' } });
    const parentSelect = screen.getByText('Part of a bigger group? (optional)', { selector: 'label' }).parentElement.querySelector('select');
    fireEvent.change(parentSelect, { target: { value: 'herd1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add group' }));

    expect(saved.name).toBe('Lucy');
    expect(saved.parentUnitId).toBe('herd1');
  });

  it('a group cannot be listed as its own parent candidate', () => {
    const herd = { id: 'herd1', name: 'Dairy Herd', type: 'milk', initialCount: 6, startDate: '2026-08-01' };
    render(<UnitsView units={[herd]} logs={[]} onAdd={noop} onUpdate={noop} onRemove={noop} />);
    fireEvent.click(screen.getByLabelText('Edit Dairy Herd'));
    // Editing "Dairy Herd" itself — it should never be able to pick
    // itself as its own parent, and since it's currently the only unit,
    // there's nothing else to offer either.
    expect(screen.queryByText('Part of a bigger group? (optional)')).not.toBeInTheDocument();
  });

  it('a group that already has members of its own cannot become a member of another group (no 3-level nesting)', () => {
    const herd = { id: 'herd1', name: 'Dairy Herd', type: 'milk', initialCount: 6, startDate: '2026-08-01' };
    const lucy = { id: 'lucy1', name: 'Lucy', type: 'milk', initialCount: 1, startDate: '2026-08-01', parentUnitId: 'herd1' };
    const other = { id: 'other1', name: 'Other Group', type: 'other', initialCount: 1, startDate: '2026-08-01' };
    render(<UnitsView units={[herd, lucy, other]} logs={[]} onAdd={noop} onUpdate={noop} onRemove={noop} />);
    fireEvent.click(screen.getByLabelText('Edit Dairy Herd'));
    expect(screen.getByText(/already has its own members/)).toBeInTheDocument();
    expect(screen.queryByText('Part of a bigger group? (optional)')).not.toBeInTheDocument();
  });

  it('a unit that already has a parent is not itself offered as a parent candidate for others', () => {
    const herd = { id: 'herd1', name: 'Dairy Herd', type: 'milk', initialCount: 6, startDate: '2026-08-01' };
    const lucy = { id: 'lucy1', name: 'Lucy', type: 'milk', initialCount: 1, startDate: '2026-08-01', parentUnitId: 'herd1' };
    render(<UnitsView units={[herd, lucy]} logs={[]} onAdd={noop} onUpdate={noop} onRemove={noop} />);
    // Adding a new unit — Lucy (a child) should not appear as an option,
    // only Dairy Herd (a valid top-level candidate).
    const select = screen.getByText('Part of a bigger group? (optional)', { selector: 'label' }).parentElement.querySelector('select');
    const optionNames = Array.from(select.options).map((o) => o.textContent);
    expect(optionNames).toContain('Dairy Herd');
    expect(optionNames).not.toContain('Lucy');
  });

  it('the group list shows a headcount for a group with members, and nests them visually beneath it', () => {
    const herd = { id: 'herd1', name: 'Dairy Herd', type: 'milk', initialCount: 6, startDate: '2026-08-01' };
    const lucy = { id: 'lucy1', name: 'Lucy', type: 'milk', initialCount: 1, startDate: '2026-08-01', parentUnitId: 'herd1' };
    const kavoo = { id: 'kavoo1', name: 'Kavoo', type: 'milk', initialCount: 1, startDate: '2026-08-01', parentUnitId: 'herd1' };
    render(<UnitsView units={[herd, lucy, kavoo]} logs={[]} onAdd={noop} onUpdate={noop} onRemove={noop} />);
    expect(screen.getByText(/2 in this group/)).toBeInTheDocument();
  });

  it('a child whose parent has been deleted still shows in the list rather than disappearing', () => {
    const orphan = { id: 'lucy1', name: 'Lucy', type: 'milk', initialCount: 1, startDate: '2026-08-01', parentUnitId: 'does-not-exist' };
    render(<UnitsView units={[orphan]} logs={[]} onAdd={noop} onUpdate={noop} onRemove={noop} />);
    expect(screen.getByText('Lucy', { selector: 'div' })).toBeInTheDocument();
  });

  it('editing a unit and removing it from its group saves parentUnitId as null', () => {
    const onUpdate = vi.fn();
    const herd = { id: 'herd1', name: 'Dairy Herd', type: 'milk', initialCount: 6, startDate: '2026-08-01' };
    const lucy = { id: 'lucy1', name: 'Lucy', type: 'milk', initialCount: 1, startDate: '2026-08-01', parentUnitId: 'herd1' };
    render(<UnitsView units={[herd, lucy]} logs={[]} onAdd={noop} onUpdate={onUpdate} onRemove={noop} />);
    fireEvent.click(screen.getByLabelText('Edit Lucy'));
    const select = screen.getByText('Part of a bigger group? (optional)', { selector: 'label' }).parentElement.querySelector('select');
    expect(select).toHaveValue('herd1');
    fireEvent.change(select, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onUpdate.mock.calls[0][0].parentUnitId).toBeNull();
  });
});
