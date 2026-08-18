// A single labeled number/value pair, used in the Analytics per-unit cards.
export default function Metric({ label, value, accent }) {
  return (
    <div>
      <div className="text-xs" style={{ color: 'var(--ink-soft)' }}>{label}</div>
      <div className="font-mono text-lg font-semibold mt-0.5" style={{ color: accent || 'var(--ink)' }}>{value}</div>
    </div>
  );
}
