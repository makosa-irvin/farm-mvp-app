const KEY = 'mazaosmart-accessibility'; const DEFAULTS = { textSize: 'default', reducedMotion: false };
export function readAccessibility(storage = globalThis.localStorage) { try { return { ...DEFAULTS, ...(JSON.parse(storage.getItem(KEY) || '{}')) }; } catch { return { ...DEFAULTS }; } }
export function writeAccessibility(next, storage = globalThis.localStorage) { const value = { ...DEFAULTS, ...next }; storage.setItem(KEY, JSON.stringify(value)); return value; }
