import { describe, it, expect, vi, afterEach } from 'vitest';
import { downloadCsv, exportFarmReports } from '../../src/lib/reportExport.js';

// downloadCsv triggers a real browser download (Blob + object URL + a
// clicked <a> tag) — none of that is meaningful to assert on directly in
// jsdom, so every test here intercepts the Blob constructor to capture
// the actual CSV text that would have been written to the file, and
// checks that instead.
function captureDownloadedCsv(callback) {
  let capturedText = null;
  const originalBlob = global.Blob;
  global.Blob = class {
    constructor(parts) {
      capturedText = parts.join('');
    }
  };
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  URL.createObjectURL = vi.fn(() => 'blob:fake');
  URL.revokeObjectURL = vi.fn();
  const clickSpy = vi.fn();
  const originalCreateElement = document.createElement.bind(document);
  const restoreCreateElement = vi.spyOn(document, 'createElement').mockImplementation((tag) => {
    const el = originalCreateElement(tag);
    if (tag === 'a') el.click = clickSpy;
    return el;
  });

  callback();

  global.Blob = originalBlob;
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
  restoreCreateElement.mockRestore();

  return { csvText: capturedText, clicked: clickSpy.mock.calls.length > 0 };
}

describe('downloadCsv', () => {
  it('returns false and downloads nothing for an empty row set', () => {
    const { csvText, clicked } = captureDownloadedCsv(() => {
      const result = downloadCsv('empty.csv', []);
      expect(result).toBe(false);
    });
    expect(csvText).toBeNull();
    expect(clicked).toBe(false);
  });

  it('quotes every field and escapes internal quotes per RFC 4180', () => {
    const { csvText } = captureDownloadedCsv(() => {
      downloadCsv('test.csv', [{ name: 'Wanjiku "Best" Agrovet', note: 'has, a comma' }]);
    });
    expect(csvText).toBe('"name","note"\n"Wanjiku ""Best"" Agrovet","has, a comma"');
  });

  it('uses the first row\'s keys as the header, in order', () => {
    const { csvText } = captureDownloadedCsv(() => {
      downloadCsv('test.csv', [{ b: 1, a: 2 }]);
    });
    expect(csvText.split('\n')[0]).toBe('"b","a"');
  });

  it('represents null/undefined cells as an empty quoted string, not the literal word "null"', () => {
    const { csvText } = captureDownloadedCsv(() => {
      downloadCsv('test.csv', [{ value: null, other: undefined }]);
    });
    expect(csvText).toBe('"value","other"\n"",""');
  });
});

describe('exportFarmReports', () => {  // exportFarmReports calls downloadCsv three times internally (once per
  // report), each running fully synchronously (create Blob, create object
  // URL, create anchor, set its filename, click it) before the next call
  // starts. Tracking Blob text and filenames as two parallel arrays in
  // call order, then zipping them together at the end, avoids depending
  // on *when* within each call the filename becomes available — an
  // earlier version of this helper tried to read the filename inside the
  // click handler, which runs after the Blob is already constructed, so
  // it was always one call behind.
  function captureAllReports(callback) {
    const blobTexts = [];
    const filenames = [];
    const originalBlob = global.Blob;
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
      if (tag === 'a') {
        el.click = () => filenames.push(el.download);
      }
      return el;
    });

    callback();

    global.Blob = originalBlob;
    restore.mockRestore();

    const written = {};
    filenames.forEach((name, i) => { written[name] = blobTexts[i]; });
    return written;
  }

  it('downloads three separate files: production, expenses, stock', () => {
    const units = [{ id: 'u1', name: 'Layer House A' }];
    const logs = [{ date: '2026-08-01', unitId: 'u1', produced: 20, feedKg: 3, mortality: 0, notes: '' }];
    const expenses = [{ date: '2026-08-01', category: 'feed', amount: 500, supplier: 'Agrovet', paymentMethod: 'cash', description: '', nonCash: false }];
    const inventory = [{ id: 'i1', name: 'Layer Mash', category: 'Feed', unit: 'kg', openingStock: 50, reorderLevel: 10, unitCost: 70 }];
    const inventoryMoves = [{ itemId: 'i1' }];

    const written = captureAllReports(() => {
      exportFarmReports({ units, logs, expenses, inventory, inventoryMoves });
    });

    const filenames = Object.keys(written);
    expect(filenames.some((f) => f.startsWith('mazaosmart-production-'))).toBe(true);
    expect(filenames.some((f) => f.startsWith('mazaosmart-expenses-'))).toBe(true);
    expect(filenames.some((f) => f.startsWith('mazaosmart-stock-'))).toBe(true);
  });

  it('the expenses report marks a real cash expense as "Cash payment"', () => {
    const expenses = [{ date: '2026-08-01', category: 'feed', amount: 500, supplier: '', paymentMethod: '', description: '', nonCash: false, inventoryItemId: null }];
    const written = captureAllReports(() => {
      exportFarmReports({ units: [], logs: [], expenses, inventory: [], inventoryMoves: [] });
    });
    const expensesCsv = Object.entries(written).find(([name]) => name.includes('expenses'))[1];
    expect(expensesCsv).toContain('"paymentType"');
    expect(expensesCsv).toContain('"Cash payment"');
    expect(expensesCsv).not.toContain('Non-cash');
  });

  // Regression test for a confirmed gap: this report used to have no way
  // to tell a real cash payment apart from the app's auto-generated
  // non-cash "stock used or lost" entries — someone reconciling the file
  // against a bank/M-Pesa statement could double-count. This proves the
  // fix actually distinguishes them in the exported file.
  it('the expenses report marks a synthetic non-cash entry as "Non-cash (stock used or lost)", distinctly from a real payment', () => {
    const expenses = [
      { date: '2026-08-01', category: 'feed', amount: 500, supplier: '', paymentMethod: '', description: '', nonCash: false, inventoryItemId: null },
      { date: '2026-08-02', expenseType: 'inventory_loss', amount: 350, supplier: null, paymentMethod: null, description: 'Lost/spoiled: 5 kg of Layer Mash', nonCash: true, inventoryItemId: 'i1' },
    ];
    const written = captureAllReports(() => {
      exportFarmReports({ units: [], logs: [], expenses, inventory: [], inventoryMoves: [] });
    });
    const expensesCsv = Object.entries(written).find(([name]) => name.includes('expenses'))[1];
    const rows = expensesCsv.split('\n');
    expect(rows[1]).toContain('"Cash payment"');
    expect(rows[2]).toContain('"Non-cash (stock used or lost)"');
  });
});
