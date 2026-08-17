import { useEffect, useState } from 'react';

// Simple localStorage-backed state. Data lives in the visitor's browser only
// (per device, per browser) — there is no server yet, so nothing syncs
// across devices or workers. That's the tradeoff for a zero-backend MVP;
// swap this hook out once the real API (Node/Express + Postgres, per the
// design plan) exists.
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
    } catch {
      // Storage can fail (private browsing, quota) — fail silently rather
      // than crash the app; the in-memory state still works for the session.
    }
  }, [key, state]);

  return [state, setState];
}
