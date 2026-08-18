import { Sparkles } from 'lucide-react';

export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg" style={{ background: 'var(--forest-dark)', color: '#fff', zIndex: 50 }} role="status" aria-live="polite">
      <Sparkles size={14} aria-hidden="true" />
      {message}
    </div>
  );
}
