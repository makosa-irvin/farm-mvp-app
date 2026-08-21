import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import PWAInstallPrompt from '../../src/components/PWAInstallPrompt.jsx';

function fireBeforeInstallPrompt({ promptResolves = true } = {}) {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = promptResolves ? Promise.resolve({ outcome: 'accepted' }) : Promise.reject(new Error('dismissed'));
  window.dispatchEvent(event);
  return event;
}

describe('PWAInstallPrompt', () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it('renders nothing before any beforeinstallprompt event fires', () => {
    render(<PWAInstallPrompt />);
    expect(screen.queryByLabelText('Install Mazaosmart')).not.toBeInTheDocument();
  });

  it('shows the prompt once the browser fires beforeinstallprompt', async () => {
    render(<PWAInstallPrompt />);
    await act(async () => {
      fireBeforeInstallPrompt();
    });
    expect(screen.getByLabelText('Install Mazaosmart')).toBeInTheDocument();
  });

  it('calls preventDefault on the browser event', async () => {
    render(<PWAInstallPrompt />);
    let event;
    await act(async () => {
      event = fireBeforeInstallPrompt();
    });
    expect(event.defaultPrevented).toBe(true);
  });

  it('clicking Install app calls prompt() and hides the banner', async () => {
    render(<PWAInstallPrompt />);
    let event;
    await act(async () => {
      event = fireBeforeInstallPrompt();
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Install app' }));
    });
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Install Mazaosmart')).not.toBeInTheDocument();
  });

  it('clicking dismiss hides the banner and remembers the dismissal', async () => {
    render(<PWAInstallPrompt />);
    await act(async () => {
      fireBeforeInstallPrompt();
    });
    fireEvent.click(screen.getByLabelText('Dismiss install prompt'));
    expect(screen.queryByLabelText('Install Mazaosmart')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('mazaosmart-install-dismissed')).toBe('1');
  });

  it('does not show the prompt when it was already dismissed this session', async () => {
    sessionStorage.setItem('mazaosmart-install-dismissed', '1');
    render(<PWAInstallPrompt />);
    await act(async () => {
      fireBeforeInstallPrompt();
    });
    expect(screen.queryByLabelText('Install Mazaosmart')).not.toBeInTheDocument();
  });
});
