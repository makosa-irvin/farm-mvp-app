import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReportsView from '../../src/views/ReportsView.jsx';
import * as reportExport from '../../src/lib/reportExport.js';

describe('ReportsView', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows accurate totals and record counts for the report data', () => {
    render(
      <ReportsView
        units={[]}
        logs={[{ id: 'l1' }, { id: 'l2' }]}
        expenses={[{ id: 'e1' }]}
        inventory={[]}
        inventoryMoves={[{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }]}
      />,
    );
    expect(screen.getByText('Production').parentElement).toHaveTextContent('0');
    expect(screen.getByText('Stock movements').parentElement).toHaveTextContent('3');
    expect(screen.getByText('Production entries').parentElement).toHaveTextContent('2');
  });

  it('clicking Download CSV reports calls exportFarmReports with the current data', () => {
    const exportSpy = vi.spyOn(reportExport, 'exportFarmReports').mockImplementation(() => true);
    const units = [{ id: 'u1' }];
    const logs = [{ id: 'l1' }];
    const expenses = [];
    const inventory = [];
    const inventoryMoves = [];
    render(<ReportsView units={units} logs={logs} expenses={expenses} inventory={inventory} inventoryMoves={inventoryMoves} />);
    fireEvent.click(screen.getByRole('button', { name: /Download CSV reports/ }));
    expect(exportSpy).toHaveBeenCalledWith({ units, logs, expenses, inventory, inventoryMoves });
  });

  it('states plainly that exported files stay on the device', () => {
    render(<ReportsView units={[]} logs={[]} expenses={[]} inventory={[]} inventoryMoves={[]} />);
    expect(screen.getByText(/CSV files are copies of the records on this device/)).toBeInTheDocument();
  });
});
