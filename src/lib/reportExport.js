// Escapes and quotes a single CSV field per RFC 4180: every field is
// wrapped in quotes, and any internal quote is doubled. Quoting every
// field unconditionally (not just ones that need it) is deliberately the
// simple, always-correct choice rather than trying to detect which
// fields contain commas/newlines/quotes and only escaping those.
function csvCell(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

// Builds a CSV from an array of same-shaped objects (using the first
// row's keys as the header order) and triggers a browser download.
// Returns false without downloading anything if there are no rows, so
// callers can skip showing a success message for an empty report.
export function downloadCsv(filename, rows) {
  if (!rows.length) return false;

  const headers = Object.keys(rows[0]);
  const csv = [headers, ...rows.map((row) => headers.map((key) => row[key]))]
    .map((row) => row.map(csvCell).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}

// Downloads three separate CSV files — production, expenses, stock —
// rather than one combined file, since the three record types don't
// share a natural row shape and forcing them into one sheet would mean
// a lot of columns that are blank for most rows.
export function exportFarmReports({ units, logs, expenses, inventory, inventoryMoves }) {
  const stamp = new Date().toISOString().slice(0, 10);

  downloadCsv(
    `field-ledger-production-${stamp}.csv`,
    logs.map((log) => ({
      date: log.date,
      group: units.find((u) => u.id === log.unitId)?.name || '',
      produced: log.produced || 0,
      feed: log.feedKg || 0,
      mortality: log.mortality || 0,
      notes: log.notes || '',
    }))
  );

  downloadCsv(
    `field-ledger-expenses-${stamp}.csv`,
    expenses.map((expense) => ({
      date: expense.date,
      category: expense.category || expense.expenseType || '',
      // Real cash expenses and the app's auto-generated non-cash entries
      // (stock used/lost — see buildInventoryCostExpense in
      // inventoryActions.js) share this same export, since both are real
      // farm costs. But only one of them is an actual payment, and
      // nothing else in this row says which — without this column,
      // someone reconciling the file against a bank or M-Pesa statement
      // has no way to tell them apart and could double-count.
      paymentType: expense.nonCash ? 'Non-cash (stock used or lost)' : 'Cash payment',
      amount: expense.amount || 0,
      supplier: expense.supplier || '',
      paymentMethod: expense.paymentMethod || '',
      description: expense.description || '',
    }))
  );

  downloadCsv(
    `field-ledger-stock-${stamp}.csv`,
    inventory.map((item) => ({
      item: item.name,
      category: item.category,
      unit: item.unit,
      openingStock: item.openingStock || 0,
      reorderLevel: item.reorderLevel || 0,
      usualUnitCost: item.unitCost || 0,
      movements: inventoryMoves.filter((move) => move.itemId === item.id).length,
    }))
  );

  return true;
}
