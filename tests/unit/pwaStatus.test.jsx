import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import PWAStatus from '../../src/components/PWAStatus.jsx';

describe('PWAStatus', () => {
  afterEach(() => {
    delete navigator.storage;
    delete navigator.serviceWorker;
    vi.restoreAllMocks();
  });

  it('shows "Not saved yet" when no save timestamp has ever been recorded', () => {
    render(<PWAStatus lastSavedAt={null} />);
    expect(screen.getByLabelText('Last saved')).toHaveTextContent('Not saved yet');
  });

  it('shows a formatted time when a save timestamp is provided', () => {
    render(<PWAStatus lastSavedAt={Date.now()} />);
    expect(screen.getByLabelText('Last saved')).toHaveTextContent(/Saved \d{1,2}:\d{2}/);
  });

  it('falls back gracefully for a timestamp that cannot be parsed as a date, rather than showing "Invalid Date"', () => {
    render(<PWAStatus lastSavedAt="not-a-real-timestamp" />);
    expect(screen.getByLabelText('Last saved')).toHaveTextContent('Saved recently');
    expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
  });

  it('does not show a storage warning when storage.estimate is unavailable', async () => {
    render(<PWAStatus lastSavedAt={null} />);
    await act(async () => {}); // flush the effect's microtask
    expect(screen.queryByText(/Storage.*full/)).not.toBeInTheDocument();
  });

  it('does not show a storage warning when usage is comfortably below quota', async () => {
    navigator.storage = { estimate: () => Promise.resolve({ usage: 10, quota: 1000 }) }; // 1%
    render(<PWAStatus lastSavedAt={null} />);
    await act(async () => {});
    expect(screen.queryByText(/Storage.*full/)).not.toBeInTheDocument();
  });

  it('shows a storage warning once usage reaches 80% of quota', async () => {
    navigator.storage = { estimate: () => Promise.resolve({ usage: 800, quota: 1000 }) }; // 80%
    render(<PWAStatus lastSavedAt={null} />);
    await act(async () => {});
    expect(screen.getByText('Storage 80% full')).toBeInTheDocument();
  });

  it('does not crash or warn when storage.estimate rejects', async () => {
    navigator.storage = { estimate: () => Promise.reject(new Error('not supported')) };
    render(<PWAStatus lastSavedAt={null} />);
    await act(async () => {});
    expect(screen.queryByText(/Storage.*full/)).not.toBeInTheDocument();
  });

  it('shows no "Update available" button until the service worker actually announces one', () => {
    navigator.serviceWorker = new EventTarget();
    render(<PWAStatus lastSavedAt={null} />);
    expect(screen.queryByRole('button', { name: /Update available/ })).not.toBeInTheDocument();
  });

  it('shows "Update available" after the service worker posts MAZAOSMART_UPDATE_READY', () => {
    const sw = new EventTarget();
    navigator.serviceWorker = sw;
    render(<PWAStatus lastSavedAt={null} />);

    act(() => {
      const event = new MessageEvent('message', { data: { type: 'MAZAOSMART_UPDATE_READY' } });
      sw.dispatchEvent(event);
    });

    expect(screen.getByRole('button', { name: /Update available/ })).toBeInTheDocument();
  });

  it('ignores an unrelated service worker message', () => {
    const sw = new EventTarget();
    navigator.serviceWorker = sw;
    render(<PWAStatus lastSavedAt={null} />);

    act(() => {
      sw.dispatchEvent(new MessageEvent('message', { data: { type: 'SOME_OTHER_MESSAGE' } }));
    });

    expect(screen.queryByRole('button', { name: /Update available/ })).not.toBeInTheDocument();
  });

  it('clicking "Update available" reloads the page', () => {
    const sw = new EventTarget();
    navigator.serviceWorker = sw;
    const reloadSpy = vi.fn();
    const originalLocation = window.location;
    delete window.location;
    window.location = { ...originalLocation, reload: reloadSpy };

    render(<PWAStatus lastSavedAt={null} />);
    act(() => {
      sw.dispatchEvent(new MessageEvent('message', { data: { type: 'MAZAOSMART_UPDATE_READY' } }));
    });
    screen.getByRole('button', { name: /Update available/ }).click();

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    window.location = originalLocation;
  });
});
