import { describe, it, expect, vi, afterEach } from 'vitest';
import { downloadCsv, exportFarmReports } from '../../src/lib/reportExport.js';

function captureDownloadedCsv(callback) {
  let capturedText = null;
  const originalBlob = global.Blob;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  global.Blob = class {
    constructor(parts) {
      capturedText = parts.join('');
    }
  };
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  const clickSpy = vi.fn();
  const originalCreateElement = document.createElement.bind(document);
  const restore = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
    const el = originalCreateElement(tag);
    if (tag === 'a') el.click = clickSpy;
    return el;
  });
  try {
    callback();
    return { csvText: capturedText, clicked: clickSpy.mock.calls.length > 0 };
  } finally {
    global.Blob = originalBlob;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    restore.mockRestore();
  }
}

describe('downloadCsv', () => {
  it('returns false and downloads nothing for an empty row set', () => {
    const { csvText, clicked } = captureDownloadedCsv(() => expect(downloadCsv('empty.csv', [])).toBe(false));
    expect(csvText).toBeNull();
    expect(clicked).toBe(false);
  });
  it('quotes every field and escapes internal quotes per RFC 4180', () => {
    const { csvText } = captureDownloadedCsv(() => downloadCsv('test.csv', [{ name: 'Wanjiku "Best" Agrovet', note: 'has, a comma' }]));
    expect(csvText).toBe('"name","note"\n"Wanjiku ""Best"" Agrovet","has, a comma"');
  });
  it('uses the first row keys as the header, in order', () => {
    const { csvText } = captureDownloadedCsv(() => downloadCsv('test.csv', [{ b: 1, a: 2 }]));
    expect(csvText.split('\n')[0]).toBe('"b","a"');
  });
  it('represents null/undefined cells as empty quoted strings', () => {
    const { csvText } = captureDownloadedCsv(() => downloadCsv('test.csv', [{ value: null, other: undefined }]));
    expect(csvText).toBe('"value","other"\n"",""');
  });
});

describe('exportFarmReports', () => {
  function captureAllReports(callback) {
    const blobTexts = [],
      filenames = [],
      originalBlob = global.Blob,
      originalCreateObjectURL = URL.createObjectURL,
      originalRevokeObjectURL = URL.revokeObjectURL;
    global.Blob = class {
      constructor(parts) {
        blobTexts.push(parts.join(''));
      }
    };
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const restore = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') el.click = () => filenames.push(el.download);
      return el;
    });
    try {
      callback();
    } finally {
      global.Blob = originalBlob;
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      restore.mockRestore();
    }
    const written = {};
    filenames.forEach((name, i) => {
      written[name] = blobTexts[i];
    });
    return written;
  }

  it('downloads the five Mazaosmart report files', () => {
    const units = [{ id: 'u1', name: 'Layer House A' }],
      logs = [{ date: '2026-08-01', unitId: 'u1', produced: 20, feedKg: 3, mortality: 0, notes: '' }],
      expenses = [
        { date: '2026-08-01', category: 'feed', amount: 500, supplier: 'Agrovet', paymentMethod: 'cash', description: '', nonCash: false },
      ],
      inventory = [{ id: 'i1', name: 'Layer Mash', category: 'Feed', unit: 'kg', openingStock: 50, reorderLevel: 10, unitCost: 70 }],
      inventoryMoves = [{ itemId: 'i1' }];
    const filenames = Object.keys(captureAllReports(() => exportFarmReports({ units, logs, expenses, inventory, inventoryMoves })));
    expect(filenames.some((f) => f.startsWith('mazaosmart-production-'))).toBe(true);
    expect(filenames.some((f) => f.startsWith('mazaosmart-expenses-'))).toBe(true);
    expect(filenames.some((f) => f.startsWith('mazaosmart-stock-items-'))).toBe(true);
    expect(filenames.some((f) => f.startsWith('mazaosmart-stock-movements-'))).toBe(true);
    expect(filenames.some((f) => f.startsWith('mazaosmart-groups-'))).toBe(true);
  });

  it('marks a real cash expense as Cash payment', () => {
    const expenses = [
      { date: '2026-08-01', category: 'feed', amount: 500, supplier: '', paymentMethod: '', description: '', nonCash: false },
    ];
    const written = captureAllReports(() => exportFarmReports({ units: [], logs: [], expenses, inventory: [], inventoryMoves: [] }));
    const csv = Object.entries(written).find(([name]) => name.includes('expenses'))[1];
    expect(csv).toContain('"Cash payment"');
    expect(csv).not.toContain('Non-cash');
  });

  it('marks synthetic stock loss as Non-cash (stock used or lost)', () => {
    const expenses = [
      { date: '2026-08-01', category: 'feed', amount: 500, nonCash: false },
      { date: '2026-08-02', expenseType: 'inventory_loss', amount: 350, nonCash: true, description: 'Lost/spoiled: 5 kg of Layer Mash' },
    ];
    const written = captureAllReports(() => exportFarmReports({ units: [], logs: [], expenses, inventory: [], inventoryMoves: [] }));
    const csv = Object.entries(written).find(([name]) => name.includes('expenses'))[1];
    const rows = csv.split('\n');
    expect(rows[1]).toContain('"Cash payment"');
    expect(rows[2]).toContain('"Non-cash (stock used or lost)"');
  });
});
