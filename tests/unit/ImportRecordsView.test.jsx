import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ImportRecordsView, { parseCsv } from '../../src/views/ImportRecordsView.jsx';

const farm = {
  units: [{ id: 'u1', name: 'Layer House A' }],
  addUnit: vi.fn(),
  addInventoryItem: vi.fn(),
  addExpense: vi.fn(),
  addLog: vi.fn(),
};

describe('ImportRecordsView', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps common spreadsheet headers into canonical fields', () => {
    const rows = parseCsv([
      'Date,Group,Item,Qty,Cost,Expense,Vendor,Payment,Produced,Losses,Deaths,Remarks',
      '2026-08-01,Layer House A,Layer Mash,50,75,3750,Agrovet,M-Pesa,30,2,1,Old notebook record',
    ].join('\n'));

    expect(rows[0]).toEqual(expect.objectContaining({
      date: '2026-08-01',
      farm_group: 'Layer House A',
      name: 'Layer Mash',
      quantity: '50',
      unit_cost: '75',
      amount: '3750',
      supplier: 'Agrovet',
      payment_method: 'M-Pesa',
      loss: '2',
      mortality: '1',
      notes: 'Old notebook record',
    }));
  });

  it('explains both paper and spreadsheet migration', () => {
    render(<ImportRecordsView farm={farm} onBack={vi.fn()} />);
    expect(screen.getByText('Bring in existing records')).toBeInTheDocument();
    expect(screen.getByText('Enter records from paper')).toBeInTheDocument();
    expect(screen.getByText('Upload a spreadsheet')).toBeInTheDocument();
  });

  it('allows a farmer to add a historical expense without replacing existing records', () => {
    render(<ImportRecordsView farm={farm} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /enter records from paper/i }));
    fireEvent.click(screen.getByRole('button', { name: /expense/i }));
    fireEvent.change(screen.getByLabelText('What was it for?'), { target: { value: 'Old feed purchase' } });
    fireEvent.change(screen.getByLabelText(/amount \(ksh\)/i), { target: { value: '2500' } });
    fireEvent.click(screen.getByRole('button', { name: /save past record/i }));
    expect(farm.addExpense).toHaveBeenCalledWith(expect.objectContaining({ amount: 2500, description: 'Old feed purchase', date: expect.any(String) }));
  });

  it('requires a farm group before saving a historical daily log', () => {
    render(<ImportRecordsView farm={farm} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /enter records from paper/i }));
    fireEvent.click(screen.getByRole('button', { name: /daily log/i }));
    fireEvent.change(screen.getByLabelText('What happened?'), { target: { value: 'Eggs collected' } });
    fireEvent.change(screen.getByLabelText('Production quantity'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: /save past record/i }));
    expect(farm.addLog).not.toHaveBeenCalled();
  });

  it('imports farm groups, stock, expenses and logs from one populated spreadsheet', async () => {
    const { container } = render(<ImportRecordsView farm={farm} onBack={vi.fn()} />);
    const fileInput = container.querySelector('input[type="file"]');
    const csv = [
      'Record Type,Date,Farm Group,Name,Category,Unit,Quantity,Unit Cost,Amount,Supplier,Payment Method,Loss,Mortality,Notes',
      'Farm Group,2026-08-01,,Old Layer House,,,,,,,,,,,',
      'Stock,2026-08-02,Old Layer House,Layer Mash,Feed,kg,50,75,,,,,,',
      'Expense,2026-08-03,Old Layer House,Feed purchase,feed,kg,50,75,3750,Agrovet,M-Pesa,,,,',
      'Daily Log,2026-08-04,Old Layer House,Eggs collected,production,trays,30,,,,,,2,1,Historical production',
    ].join('\n');

    fireEvent.change(fileInput, { target: { files: [new File([csv], 'records.csv', { type: 'text/csv' })] } });
    await waitFor(() => expect(screen.getByText('Check your records')).toBeInTheDocument());
    expect(screen.getByText(/4 rows found/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /add these records/i }));

    expect(farm.addUnit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Old Layer House', startDate: '2026-08-01' }));
    expect(farm.addInventoryItem).toHaveBeenCalledWith(expect.objectContaining({ name: 'Layer Mash', openingStock: 50, openingDate: '2026-08-02', unitCost: 75 }));
    expect(farm.addExpense).toHaveBeenCalledWith(expect.objectContaining({ amount: 3750, description: 'Feed purchase', date: '2026-08-03', supplier: 'Agrovet', paymentMethod: 'M-Pesa' }));
    expect(farm.addLog).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-08-04', produced: 30, loss: 2, mortality: 1, notes: 'Historical production' }), expect.objectContaining({ name: 'Old Layer House' }));
  });

  it('infers record types when a spreadsheet does not have a Record Type column', async () => {
    const { container } = render(<ImportRecordsView farm={farm} onBack={vi.fn()} />);
    const fileInput = container.querySelector('input[type="file"]');
    const csv = [
      'Date,Group,Description,Qty,Unit Cost,Expense,Vendor,Payment,Produced,Losses,Deaths',
      '2026-08-01,Old Layer House,Feed purchase,50,75,3750,Agrovet,M-Pesa,,,',
      '2026-08-02,Old Layer House,Eggs collected,,,,, ,30,2,1',
    ].join('\n');

    fireEvent.change(fileInput, { target: { files: [new File([csv], 'records.csv', { type: 'text/csv' })] } });
    await waitFor(() => expect(screen.getByText('Check your records')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /add these records/i }));

    expect(farm.addExpense).toHaveBeenCalled();
    expect(farm.addLog).toHaveBeenCalled();
  });

  it('rejects an empty spreadsheet', async () => {
    const { container } = render(<ImportRecordsView farm={farm} onBack={vi.fn()} />);
    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [new File([''], 'empty.csv', { type: 'text/csv' })] } });
    await waitFor(() => expect(screen.getByText(/spreadsheet is empty/i)).toBeInTheDocument());
  });
});
