import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ImportRecordsView from '../../src/views/ImportRecordsView.jsx';

const farm = {
  units: [{ id: 'u1', name: 'Layer House A' }],
  addUnit: vi.fn(),
  addInventoryItem: vi.fn(),
  addExpense: vi.fn(),
  addLog: vi.fn(),
};

describe('ImportRecordsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('explains both paper and spreadsheet migration', () => {
    render(<ImportRecordsView farm={farm} onBack={vi.fn()} />);

    expect(screen.getByText('Bring in existing records')).toBeInTheDocument();
    expect(screen.getByText('Enter records from paper')).toBeInTheDocument();
    expect(screen.getByText('Upload a spreadsheet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download csv template/i })).toBeInTheDocument();
  });

  it('allows a farmer to add a historical expense without replacing existing records', () => {
    render(<ImportRecordsView farm={farm} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /enter records from paper/i }));
    fireEvent.click(screen.getByRole('button', { name: /expense/i }));

    fireEvent.change(screen.getByLabelText('What was it for?'), { target: { value: 'Old feed purchase' } });
    fireEvent.change(screen.getByLabelText(/amount \(ksh\)/i), { target: { value: '2500' } });
    fireEvent.click(screen.getByRole('button', { name: /save past record/i }));

    expect(farm.addExpense).toHaveBeenCalledWith(expect.objectContaining({
      amount: 2500,
      description: 'Old feed purchase',
      date: expect.any(String),
    }));
    expect(screen.getByText(/saved\. you can add another record/i)).toBeInTheDocument();
  });

  it('requires a farm group before saving a historical daily log', () => {
    render(<ImportRecordsView farm={farm} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /enter records from paper/i }));
    fireEvent.click(screen.getByRole('button', { name: /daily log/i }));
    fireEvent.change(screen.getByLabelText('What happened?'), { target: { value: 'Eggs collected' } });
    fireEvent.change(screen.getByLabelText('Production quantity'), { target: { value: '20' } });

    expect(screen.getByRole('button', { name: /save past record/i })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: /save past record/i }));
    expect(farm.addLog).not.toHaveBeenCalled();
  });

  it('imports supported CSV rows after previewing them', async () => {
    const { container } = render(<ImportRecordsView farm={farm} onBack={vi.fn()} />);
    const fileInput = container.querySelector('input[type="file"]');
    const csv = [
      'record_type,date,farm_group,name,category,unit,quantity,unit_cost,amount,supplier,payment_method,loss,mortality,notes',
      'farm_group,2026-01-01,,Old Layer House,,,,,,,,,,,',
      'expense,2026-01-05,Old Layer House,Old feed,feed,,50,75,3750,Agrovet,mpesa,,,,',
    ].join('\n');

    fireEvent.change(fileInput, { target: { files: [new File([csv], 'records.csv', { type: 'text/csv' })] } });
    await waitFor(() => expect(screen.getByText('Check your records')).toBeInTheDocument());
    expect(screen.getByText(/2 rows found/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /add these records/i }));
    expect(farm.addUnit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Old Layer House' }));
    expect(farm.addExpense).toHaveBeenCalledWith(expect.objectContaining({ amount: 3750, description: 'Old feed' }));
  });

  it('rejects a CSV without the required record_type column', async () => {
    const { container } = render(<ImportRecordsView farm={farm} onBack={vi.fn()} />);
    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [new File(['date,name\n2026-01-01,Test'], 'bad.csv', { type: 'text/csv' })] } });

    await waitFor(() => expect(screen.getByText(/csv needs a record_type column/i)).toBeInTheDocument());
    expect(farm.addExpense).not.toHaveBeenCalled();
    expect(farm.addUnit).not.toHaveBeenCalled();
  });
});
