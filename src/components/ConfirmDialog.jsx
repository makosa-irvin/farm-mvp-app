import { AlertTriangle } from 'lucide-react';
import '../styles/components/confirm-dialog.css';

// A styled replacement for window.confirm(). Rendered by App.jsx, driven
// by the useConfirmDialog() hook (see src/hooks/useConfirmDialog.js) —
// this component itself has no state of its own, it just displays
// whatever the hook currently holds.
//
// Accessibility/UX details worth knowing if this gets modified:
// - role="alertdialog" + aria-modal="true" mark this as a modal that
//   demands a decision, distinct from a passive dialog.
// - Clicking the dimmed overlay counts as Cancel (a common, expected
//   pattern), but a click inside the dialog itself must not bubble up
//   and also trigger that Cancel — hence the stopPropagation() on the
//   inner div's onClick.
// - autoFocus on "Yes, remove it" means pressing Enter immediately after
//   the dialog opens confirms the action. This is intentional for a
//   keyboard/quick-confirm flow, but worth knowing since it's not the
//   safer default (focusing Cancel first) some confirm dialogs use.
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
