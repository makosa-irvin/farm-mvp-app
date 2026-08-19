import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReportsView from '../../src/views/ReportsView.jsx';
import * as reportExport from '../../src/lib/reportExport.js';

describe('ReportsView', () => {
  it('shows accurate record counts for each report type', () => {
    render(
      <ReportsView
        units={[]}
        logs={[{ id: 'l1' }, { id: 'l2' }]}
        expenses={[{ id: 'e1' }]}
        inventory={[]}
        inventoryMoves={[{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }]}
      />
    );
    expect(screen.getByText('2')).toBeInTheDocument(); // production logs
    expect(screen.getByText('1')).toBeInTheDocument(); // expense records
    expect(screen.getByText('3')).toBeInTheDocument(); // stock movements
  });

  it('clicking "Download CSV reports" calls exportFarmReports with the current data', () => {
    const exportSpy = vi.spyOn(reportExport, 'exportFarmReports').mockImplementation(() => true);
    const units = [{ id: 'u1' }];
    const logs = [{ id: 'l1' }];
    const expenses = [];
    const inventory = [];
    const inventoryMoves = [];

    render(<ReportsView units={units} logs={logs} expenses={expenses} inventory={inventory} inventoryMoves={inventoryMoves} />);
    fireEvent.click(screen.getByRole('button', { name: /Download CSV reports/ }));

    expect(exportSpy).toHaveBeenCalledWith({ units, logs, expenses, inventory, inventoryMoves });
    exportSpy.mockRestore();
  });

  it('states plainly that exports do not sync to a server, matching the app\'s offline-first, no-cloud stance', () => {
    render(<ReportsView units={[]} logs={[]} expenses={[]} inventory={[]} inventoryMoves={[]} />);
    expect(screen.getByText(/They do not sync data to a server/)).toBeInTheDocument();
  });
});
