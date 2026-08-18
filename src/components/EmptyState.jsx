// Centered placeholder shown when a view has nothing to display yet (no
// units, no inventory items, etc.), with an optional call-to-action button.
export default function EmptyState({ icon: Icon, title, body, actionLabel, onAction }) {
  return (
    <div className="text-center py-16 px-6 rounded-2xl" style={{ background: 'var(--surface-alt)', border: '1.5px dashed var(--line)' }}>
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4" style={{ background: 'var(--forest-tint)' }}>
        <Icon size={22} style={{ color: 'var(--forest)' }} strokeWidth={2} />
      </div>
      <div className="font-display text-xl font-semibold mb-1.5" style={{ color: 'var(--ink)' }}>{title}</div>
      <div className="text-sm mb-5 max-w-sm mx-auto" style={{ color: 'var(--ink-soft)' }}>{body}</div>
      {actionLabel && (
        <button onClick={onAction} className="btn-primary rounded-full px-5 py-2.5 text-sm">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
