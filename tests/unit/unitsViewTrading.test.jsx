import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UnitsView from '../../src/views/UnitsView.jsx';

const noop = () => {};

describe('UnitsView — trading/resale type packaging', () => {
  it('the packaging fields are hidden for a normal type (progressive disclosure)', () => {
    render(<UnitsView units={[]} logs={[]} onAdd={noop} onUpdate={noop} onRemove={noop} />);
    expect(screen.queryByText('What do you measure it in?')).not.toBeInTheDocument();
  });

  it('selecting the trading type reveals the packaging fields', () => {
    render(<UnitsView units={[]} logs={[]} onAdd={noop} onUpdate={noop} onRemove={noop} />);
    fireEvent.change(screen.getByText('What are you managing?', { selector: 'label' }).parentElement.querySelector('select'), {
      target: { value: 'trading' },
    });
    expect(screen.getByText('What do you measure it in?')).toBeInTheDocument();
    expect(screen.getByText("What's the package called?")).toBeInTheDocument();
  });

  it('saves the exact water-reselling scenario correctly', () => {
    let saved = null;
    render(<UnitsView units={[]} logs={[]} onAdd={(record) => { saved = record; }} onUpdate={noop} onRemove={noop} />);

    fireEvent.change(screen.getByText('What should we call it?', { selector: 'label' }).parentElement.querySelector('input'), {
      target: { value: 'Water Kiosk' },
    });
    fireEvent.change(screen.getByText('What are you managing?', { selector: 'label' }).parentElement.querySelector('select'), {
      target: { value: 'trading' },
    });
    fireEvent.change(screen.getByText('What do you measure it in?', { selector: 'label' }).parentElement.querySelector('input'), {
      target: { value: 'litres' },
    });
    fireEvent.change(screen.getByText("What's the package called?", { selector: 'label' }).parentElement.querySelector('input'), {
      target: { value: 'jerrican' },
    });
    fireEvent.change(screen.getByText('How many litres per jerrican?', { selector: 'label' }).parentElement.querySelector('input'), {
      target: { value: '20' },
    });
    fireEvent.change(screen.getByText(/How much do you usually sell one jerrican for/, { selector: 'label' }).parentElement.querySelector('input'), {
      target: { value: '10' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add group' }));

    expect(saved.type).toBe('trading');
    expect(saved.customUnitLabel).toBe('litres');
    expect(saved.customGroupLabel).toBe('jerrican');
    expect(saved.customGroupSize).toBe(20);
    expect(saved.producePrice).toBe(10);
  });

  it('the selling-price question updates live to reflect the package name as it\'s typed', () => {
    render(<UnitsView units={[]} logs={[]} onAdd={noop} onUpdate={noop} onRemove={noop} />);
    fireEvent.change(screen.getByText('What are you managing?', { selector: 'label' }).parentElement.querySelector('select'), {
      target: { value: 'trading' },
    });
    expect(screen.getByText(/How much do you usually sell one package for/)).toBeInTheDocument();
    fireEvent.change(screen.getByText("What's the package called?", { selector: 'label' }).parentElement.querySelector('input'), {
      target: { value: 'sack' },
    });
    expect(screen.getByText(/How much do you usually sell one sack for/)).toBeInTheDocument();
  });

  it('editing an existing trading-type group repopulates its saved packaging', () => {
    const unit = {
      id: 'u1', name: 'Water Kiosk', type: 'trading', initialCount: 0, producePrice: 10, startDate: '2026-08-01',
      customUnitLabel: 'litres', customGroupLabel: 'jerrican', customGroupSize: 20,
    };
    render(<UnitsView units={[unit]} logs={[]} onAdd={noop} onUpdate={noop} onRemove={noop} />);
    fireEvent.click(screen.getByLabelText('Edit Water Kiosk'));
    expect(screen.getByText('What do you measure it in?', { selector: 'label' }).parentElement.querySelector('input')).toHaveValue('litres');
    expect(screen.getByText("What's the package called?", { selector: 'label' }).parentElement.querySelector('input')).toHaveValue('jerrican');
    expect(screen.getByText('How many litres per jerrican?', { selector: 'label' }).parentElement.querySelector('input')).toHaveValue(20);
  });

  it('the group list shows the price per the farmer\'s own package name, not a generic default', () => {
    const unit = {
      id: 'u1', name: 'Water Kiosk', type: 'trading', initialCount: 0, producePrice: 10, startDate: '2026-08-01',
      customUnitLabel: 'litres', customGroupLabel: 'jerrican', customGroupSize: 20,
    };
    render(<UnitsView units={[unit]} logs={[]} onAdd={noop} onUpdate={noop} onRemove={noop} />);
    expect(screen.getByText(/KSh 10\.00 \/ jerrican/)).toBeInTheDocument();
  });
});
