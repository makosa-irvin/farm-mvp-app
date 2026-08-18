import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act, renderHook } from '@testing-library/react';
import { useConfirmDialog } from '../../src/hooks/useConfirmDialog.js';
import ConfirmDialog from '../../src/components/ConfirmDialog.jsx';

describe('useConfirmDialog + ConfirmDialog', () => {
  it('is closed until confirm() is called', () => {
    const { result } = renderHook(() => useConfirmDialog());
    expect(result.current.dialogProps.isOpen).toBe(false);
  });

  it('opens with the given message when confirm() is called', () => {
    const { result } = renderHook(() => useConfirmDialog());
    act(() => {
      result.current.confirm('Remove this thing?');
    });
    expect(result.current.dialogProps.isOpen).toBe(true);
    expect(result.current.dialogProps.message).toBe('Remove this thing?');
  });

  it('resolves true when onConfirm fires, and closes the dialog', async () => {
    const { result } = renderHook(() => useConfirmDialog());
    let promise;
    act(() => {
      promise = result.current.confirm('Remove this thing?');
    });
    act(() => {
      result.current.dialogProps.onConfirm();
    });
    await expect(promise).resolves.toBe(true);
    expect(result.current.dialogProps.isOpen).toBe(false);
  });

  it('resolves false when onCancel fires', async () => {
    const { result } = renderHook(() => useConfirmDialog());
    let promise;
    act(() => {
      promise = result.current.confirm('Remove this thing?');
    });
    act(() => {
      result.current.dialogProps.onCancel();
    });
    await expect(promise).resolves.toBe(false);
  });

  it('renders nothing when closed', () => {
    render(<ConfirmDialog isOpen={false} message="" onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('renders the message and both buttons when open, and calls the right handler', () => {
    const calls = [];
    render(
      <ConfirmDialog
        isOpen
        message="Remove this thing? It cannot be undone."
        onConfirm={() => calls.push('confirm')}
        onCancel={() => calls.push('cancel')}
      />
    );
    expect(screen.getByText('Remove this thing? It cannot be undone.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Yes, remove it/ }));
    expect(calls).toEqual(['confirm']);

    fireEvent.click(screen.getByRole('button', { name: /No, keep it/ }));
    expect(calls).toEqual(['confirm', 'cancel']);
  });

  it('clicking the overlay also cancels', () => {
    const calls = [];
    render(<ConfirmDialog isOpen message="Remove?" onConfirm={() => calls.push('confirm')} onCancel={() => calls.push('cancel')} />);
    fireEvent.click(screen.getByRole('presentation'));
    expect(calls).toEqual(['cancel']);
  });
});
