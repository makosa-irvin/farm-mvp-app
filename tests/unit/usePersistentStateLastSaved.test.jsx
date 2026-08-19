import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersistentState, LAST_SAVED_KEY } from '../../src/lib/usePersistentState.js';

describe('usePersistentState — last-saved tracking', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('records a last-saved timestamp on the very first render, not just on subsequent updates', () => {
    renderHook(() => usePersistentState('test-key', []));
    expect(localStorage.getItem(LAST_SAVED_KEY)).not.toBeNull();
    expect(Number(localStorage.getItem(LAST_SAVED_KEY))).toBeGreaterThan(0);
  });

  it('updates the last-saved timestamp again when the state changes', async () => {
    const { result } = renderHook(() => usePersistentState('test-key', []));
    const firstSaved = localStorage.getItem(LAST_SAVED_KEY);

    await new Promise((resolve) => setTimeout(resolve, 5)); // ensure Date.now() actually advances
    act(() => {
      result.current[1](['a new value']);
    });

    const secondSaved = localStorage.getItem(LAST_SAVED_KEY);
    expect(Number(secondSaved)).toBeGreaterThan(Number(firstSaved));
  });

  it('dispatches a field-ledger-saved window event on every write, which is what App.jsx listens for to refresh PWAStatus', () => {
    const seen = [];
    const listener = () => seen.push(true);
    window.addEventListener('field-ledger-saved', listener);

    renderHook(() => usePersistentState('test-key', []));

    expect(seen.length).toBeGreaterThan(0);
    window.removeEventListener('field-ledger-saved', listener);
  });

  it('the last-saved key is shared across different persisted state keys, not per-key', () => {
    renderHook(() => usePersistentState('key-one', []));
    const afterFirst = localStorage.getItem(LAST_SAVED_KEY);
    renderHook(() => usePersistentState('key-two', []));
    const afterSecond = localStorage.getItem(LAST_SAVED_KEY);
    // Both writes update the exact same shared key, not e.g.
    // "key-one-last-saved" / "key-two-last-saved".
    expect(afterFirst).not.toBeNull();
    expect(afterSecond).not.toBeNull();
  });
});
