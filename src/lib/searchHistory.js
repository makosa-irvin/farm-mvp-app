const KEY = 'mazaosmart-search-history'; const MAX = 6;
export function readSearchHistory(storage = globalThis.localStorage) { try { const value = JSON.parse(storage.getItem(KEY) || '[]'); return Array.isArray(value) ? value.slice(0, MAX) : []; } catch { return []; } }
export function rememberSearch(query, storage = globalThis.localStorage) { const value = String(query || '').trim(); if (!value) return readSearchHistory(storage); const next = [value, ...readSearchHistory(storage).filter((x) => x.toLowerCase() !== value.toLowerCase())].slice(0, MAX); storage.setItem(KEY, JSON.stringify(next)); return next; }
export function clearSearchHistory(storage = globalThis.localStorage) { storage.removeItem(KEY); }
