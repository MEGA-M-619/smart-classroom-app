export function BarChart({ data = [], color = '#6366f1', height = 160 }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (!data.length) {
    return <p style={{ fontSize: 13, color: 'var(--sca-text-muted)', padding: '20px 0' }}>No data yet.</p>;
  }
  return (
    <div className="sca-bar-chart" style={{ height }} role="img" aria-label="Bar chart">
      {data.map((d) => (
        <div key={d.label} className="sca-bar-chart__item">
          <div
            className="sca-bar-chart__bar"
            style={{ height: `${(d.value / max) * 100}%`, background: color }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="sca-bar-chart__label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
