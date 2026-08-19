const BACKUP_VERSION = 1;
const BACKUP_KIND = 'field-ledger-backup';

export const PERSISTED_KEYS = [
  'farm-units',
  'farm-logs',
  'farm-expenses',
  'farm-inventory',
  'farm-inventory-ledger',
];

export function buildBackup({ units, logs, expenses, inventory, inventoryTransactions }) {
  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: { units, logs, expenses, inventory, inventoryTransactions },
  };
}

export function downloadBackup(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `field-ledger-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function validateBackup(payload) {
  if (!payload || payload.kind !== BACKUP_KIND) {
    throw new Error('This file is not a Field Ledger backup.');
  }
  if (payload.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${payload.version ?? 'unknown'}.`);
  }
  if (!payload.data || typeof payload.data !== 'object') {
    throw new Error('The backup does not contain farm data.');
  }

  return {
    units: asArray(payload.data.units),
    logs: asArray(payload.data.logs),
    expenses: asArray(payload.data.expenses),
    inventory: asArray(payload.data.inventory),
    inventoryTransactions: asArray(payload.data.inventoryTransactions),
  };
}

export async function readBackupFile(file) {
  const text = await file.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }
  return validateBackup(payload);
}
