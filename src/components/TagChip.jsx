// Pill-style selector button — used to pick a production unit in
// DailyLogView. "active" highlights the current selection; "muted" is
// available for a dimmed/disabled look but isn't used yet.
import '../styles/components/tag-chip.css'
export default function TagChip({ label, active, onClick, icon: Icon, muted }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tag-chip ${active ? 'active' : ''} ${muted ? 'muted' : ''}`}
    >
      {Icon && <Icon size={14} strokeWidth={2.25} />}
      <span>{label}</span>
    </button>
  );
}
