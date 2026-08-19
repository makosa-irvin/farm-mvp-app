import { useEffect, useState } from 'react';

const LAST_SAVED_KEY = 'mazaosmart-last-saved-at';

export function usePersistentState(key, initialValue) {
  const [state, setState] = useState(() => {
    try { const stored = window.localStorage.getItem(key); return stored ? JSON.parse(stored) : initialValue; }
    catch { return initialValue; }
  });
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(state)); window.localStorage.setItem(LAST_SAVED_KEY, String(Date.now())); window.dispatchEvent(new Event('mazaosmart-saved')); }
    catch { /* Storage can fail; keep the current session usable. */ }
  }, [key, state]);
  return [state, setState];
}
export { LAST_SAVED_KEY };
