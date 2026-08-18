import { useEffect, useState } from 'react';

// Simple localStorage-backed state. This is the only persistence layer in
// the app — there is no backend and no server-side database. All data
// (units, logs, expenses, inventory, the transaction ledger) lives in the
// visitor's browser only, per device, per browser: nothing syncs across
// devices or users, and clearing site data deletes everything with no way
// to recover it. That's a deliberate tradeoff for a zero-infrastructure
// build, not an oversight — see README.md for the full scope discussion.
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
