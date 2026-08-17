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
