import { Sparkles } from 'lucide-react';

// Transient bottom-of-screen confirmation banner. App.jsx holds the
// message in state and clears it on a timer after every action (see
// showToast in App.jsx) — this component just renders whatever it's
// currently given, or nothing.
export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div
      className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg"
      style={{ background: 'var(--forest-dark)', color: '#fff', zIndex: 50 }}
    >
      <Sparkles size={14} />
      {message}
    </div>
  );
}
