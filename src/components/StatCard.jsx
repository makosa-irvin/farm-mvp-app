// One of the big summary numbers at the top of the Dashboard (active
// units, produced today, costs this month, etc.).
export default function StatCard({ label, value, sub, accent }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
      <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-soft)', letterSpacing: '0.06em' }}>
        {label}
      </div>
      <div className="font-mono mt-2 text-3xl font-semibold" style={{ color: accent || 'var(--ink)' }}>
        {value}
      </div>
      {sub && (
        <div className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
          {sub}
        </div>
      )}
    </div>
  );
}
