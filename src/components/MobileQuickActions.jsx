import { ClipboardList, Boxes, Receipt, X, Plus } from 'lucide-react';
import { useState } from 'react';

// Mobile-first quick capture menu. It keeps the most common farm actions
// reachable with one thumb without adding more permanent top-level tabs.
//
// Known overlap, not yet resolved: all three actions here (Daily log,
// Stock, Expense) are also directly one tap away on the persistent mobile
// bottom nav (see Header.jsx's mobilePrimary list) — this FAB currently
// adds a second, slower path to the same three destinations rather than
// covering something the bottom nav doesn't. Worth a product decision on
// whether this should cover different actions, or be removed in favor of
// the bottom nav alone.
export default function MobileQuickActions({ onNavigate }) {
  const [open, setOpen] = useState(false);

  const actions = [
    { value: 'log', label: 'Daily log', icon: ClipboardList },
    { value: 'inventory', label: 'Stock', icon: Boxes },
    { value: 'expenses', label: 'Expense', icon: Receipt },
  ];

  function navigate(value) {
    setOpen(false);
    onNavigate(value);
  }

  return (
    <div className="mobile-quick-actions" aria-label="Quick actions">
      {open && (
        <div className="mobile-quick-actions__menu">
          {actions.map(({ value, label, icon: Icon }) => (
            <button key={value} type="button" onClick={() => navigate(value)}>
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        className="mobile-quick-actions__fab"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Close quick actions' : 'Open quick actions'}
        aria-expanded={open}
      >
        {open ? <X size={22} /> : <Plus size={22} />}
      </button>
    </div>
  );
}
