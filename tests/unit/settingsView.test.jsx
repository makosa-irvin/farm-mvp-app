import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsView from '../../src/views/SettingsView.jsx';

describe('SettingsView', () => {
  it('clicking "Download backup" calls exportData', () => {
    const exportData = vi.fn();
    render(<SettingsView exportData={exportData} importData={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Download backup/ }));
    expect(exportData).toHaveBeenCalledTimes(1);
  });

  it('the file input only accepts JSON files', () => {
    render(<SettingsView exportData={vi.fn()} importData={vi.fn()} />);
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput.accept).toBe('application/json,.json');
  });

  it('clicking "Choose backup file" opens the (hidden) file picker', () => {
    render(<SettingsView exportData={vi.fn()} importData={vi.fn()} />);
    const fileInput = document.querySelector('input[type="file"]');
    const clickSpy = vi.spyOn(fileInput, 'click');
    fireEvent.click(screen.getByRole('button', { name: /Choose backup file/ }));
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('selecting a file calls importData with that file', async () => {
    const importData = vi.fn().mockResolvedValue(true);
    render(<SettingsView exportData={vi.fn()} importData={importData} />);
    const fileInput = document.querySelector('input[type="file"]');
    const fakeFile = new File(['{}'], 'backup.json', { type: 'application/json' });

    await fireEvent.change(fileInput, { target: { files: [fakeFile] } });

    expect(importData).toHaveBeenCalledTimes(1);
    expect(importData.mock.calls[0][0].name).toBe('backup.json');
  });

  it('the file input is reset after a selection, so re-selecting the same file fires onChange again', async () => {
    const importData = vi.fn().mockResolvedValue(true);
    render(<SettingsView exportData={vi.fn()} importData={importData} />);
    const fileInput = document.querySelector('input[type="file"]');
    const fakeFile = new File(['{}'], 'backup.json', { type: 'application/json' });

    await fireEvent.change(fileInput, { target: { files: [fakeFile] } });
    expect(fileInput.value).toBe('');
  });

  it('does not call importData if the file picker is dismissed with no file chosen', async () => {
    const importData = vi.fn();
    render(<SettingsView exportData={vi.fn()} importData={importData} />);
    const fileInput = document.querySelector('input[type="file"]');
    await fireEvent.change(fileInput, { target: { files: [] } });
    expect(importData).not.toHaveBeenCalled();
  });

  it('states the privacy boundary plainly, without implying any sync exists', () => {
    render(<SettingsView exportData={vi.fn()} importData={vi.fn()} />);
    expect(screen.getByText(/no backend account or automatic cloud sync/)).toBeInTheDocument();
  });
});
