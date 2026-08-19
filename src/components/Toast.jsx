import { Sparkles } from 'lucide-react';

// Transient bottom-of-screen confirmation banner. App.jsx holds the
// message in state and clears it on a timer after every action (see
// showToast in App.jsx) — this component just renders whatever it's
// currently given, or nothing.
//
// role="status" + aria-live="polite" means a screen reader announces the
// message when it appears, without interrupting whatever the user is
// currently doing (as a more assertive aria-live="assertive" would). The
// icon is aria-hidden since it's decorative — the message text alone is
// what should be announced.
export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg" style={{ background: 'var(--forest-dark)', color: '#fff', zIndex: 50 }} role="status" aria-live="polite">
      <Sparkles size={14} aria-hidden="true" />
      {message}
    </div>
  );
}
