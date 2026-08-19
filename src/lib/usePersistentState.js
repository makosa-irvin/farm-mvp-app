import { useEffect, useState } from 'react';

const LAST_SAVED_KEY = 'mazaosmart-last-saved-at';

// Local-first persistence boundary. The timestamp is shared by all persisted
// domains so the UI can show when the latest browser write completed.
export function usePersistentState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
      window.localStorage.setItem(LAST_SAVED_KEY, String(Date.now()));
      window.dispatchEvent(new Event('mazaosmart-saved'));
    } catch {
      // Storage can fail (private browsing or quota); keep the current
      // session usable rather than crashing the application.
    }
  }, [key, state]);

  return [state, setState];
}

export { LAST_SAVED_KEY };
