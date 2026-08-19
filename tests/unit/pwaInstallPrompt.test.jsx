import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import PWAInstallPrompt from '../../src/components/PWAInstallPrompt.jsx';

// jsdom doesn't implement the real `beforeinstallprompt` browser event, so
// this builds a fake one with the same shape the component actually reads
// from it: preventDefault(), prompt(), and a userChoice promise.
function fireBeforeInstallPrompt({ promptResolves = true } = {}) {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = promptResolves ? Promise.resolve({ outcome: 'accepted' }) : Promise.reject(new Error('dismissed'));
  window.dispatchEvent(event);
  return event;
}

describe('PWAInstallPrompt', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('renders nothing before any beforeinstallprompt event fires', () => {
    render(<PWAInstallPrompt />);
    expect(screen.queryByLabelText('Install Field Ledger')).not.toBeInTheDocument();
  });

  it('shows the prompt once the browser fires beforeinstallprompt', async () => {
    render(<PWAInstallPrompt />);
    await act(async () => {
      fireBeforeInstallPrompt();
    });
    expect(screen.getByLabelText('Install Field Ledger')).toBeInTheDocument();
  });

  it('calls preventDefault on the browser event, so the browser\'s own native prompt does not also appear', async () => {
    render(<PWAInstallPrompt />);
    let event;
    await act(async () => {
      event = fireBeforeInstallPrompt();
    });
    expect(event.defaultPrevented).toBe(true);
  });

  it('clicking "Install app" calls prompt() on the captured event, then hides the banner', async () => {
    render(<PWAInstallPrompt />);
    let event;
    await act(async () => {
      event = fireBeforeInstallPrompt();
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Install app' }));
    });

    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Install Field Ledger')).not.toBeInTheDocument();
  });

  it('clicking dismiss hides the banner and remembers the dismissal in sessionStorage', async () => {
    render(<PWAInstallPrompt />);
    await act(async () => {
      fireBeforeInstallPrompt();
    });

    fireEvent.click(screen.getByLabelText('Dismiss install prompt'));

    expect(screen.queryByLabelText('Install Field Ledger')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('field-ledger-install-dismissed')).toBe('1');
  });

  it('does not show the prompt on a fresh mount if it was already dismissed this session', async () => {
    sessionStorage.setItem('field-ledger-install-dismissed', '1');
    render(<PWAInstallPrompt />);
    await act(async () => {
      fireBeforeInstallPrompt();
    });
    expect(screen.queryByLabelText('Install Field Ledger')).not.toBeInTheDocument();
  });
});
