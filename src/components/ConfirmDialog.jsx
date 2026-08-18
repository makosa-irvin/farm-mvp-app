import { AlertTriangle } from 'lucide-react';
import '../styles/components/confirm-dialog.css';

export default function ConfirmDialog({ isOpen, message, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="confirm-dialog-overlay" role="presentation" onClick={onCancel}>
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label="Please confirm"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirm-dialog__icon">
          <AlertTriangle size={20} />
        </div>
        <p className="confirm-dialog__message">{message}</p>
        <div className="confirm-dialog__actions">
          <button type="button" className="confirm-dialog__button confirm-dialog__button--ghost" onClick={onCancel}>
            No, keep it
          </button>
          <button type="button" className="confirm-dialog__button confirm-dialog__button--danger" onClick={onConfirm} autoFocus>
            Yes, remove it
          </button>
        </div>
      </div>
    </div>
  );
}
