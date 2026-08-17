export default function FieldLabel({ children }) {
  return (
    <label
      className="block text-xs font-semibold uppercase tracking-wide mb-1.5"
      style={{ color: 'var(--ink-soft)', letterSpacing: '0.05em' }}
    >
      {children}
    </label>
  );
}
