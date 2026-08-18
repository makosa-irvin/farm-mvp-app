function csvCell(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

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

export function exportFarmReports({ units, logs, expenses, inventory, inventoryMoves }) {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadCsv(`field-ledger-production-${stamp}.csv`, logs.map((log) => ({ date: log.date, group: units.find((u) => u.id === log.unitId)?.name || '', produced: log.produced || 0, feed: log.feedKg || 0, mortality: log.mortality || 0, notes: log.notes || '' })));
  downloadCsv(`field-ledger-expenses-${stamp}.csv`, expenses.map((expense) => ({ date: expense.date, category: expense.category || expense.expenseType || '', amount: expense.amount || 0, supplier: expense.supplier || '', paymentMethod: expense.paymentMethod || '', description: expense.description || '' })));
  downloadCsv(`field-ledger-stock-${stamp}.csv`, inventory.map((item) => ({ item: item.name, category: item.category, unit: item.unit, openingStock: item.openingStock || 0, reorderLevel: item.reorderLevel || 0, usualUnitCost: item.unitCost || 0, movements: inventoryMoves.filter((move) => move.itemId === item.id).length })));
  return true;
}
