// A small, dependency-free bar chart. Deliberately plain: no axes, no
// gridlines, no tooltips to tap-and-miss on a small screen — just bars
// scaled to the highest value in the series, today's bar picked out in a
// different color, and a label under the first/last bar so the range is
// clear without crowding every single day with text.
export default function TrendChart({ data, height = 72 }) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data.map((d) => d.value), 1); // avoid divide-by-zero when every day is 0
  const todayStr = new Date().toISOString().slice(0, 10);
  const barWidth = 100 / data.length;

  return (
    <div>
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height }}
        role="img"
        aria-label="Production over recent days"
      >
        {data.map((d, i) => {
          const barHeight = (d.value / max) * (height - 4);
          const isToday = d.date === todayStr;
          return (
            <rect
              key={d.date}
              x={i * barWidth + barWidth * 0.15}
              y={height - barHeight}
              width={barWidth * 0.7}
              height={Math.max(barHeight, 1.5)}
              rx={1}
              fill={isToday ? 'var(--forest)' : 'var(--forest-tint)'}
            />
          );
        })}
      </svg>
      <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
        <span>{formatShortDate(data[0].date)}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

function formatShortDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
