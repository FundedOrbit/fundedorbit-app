"use client";

function buildPath(series, width, height, padding) {
  if (!series || series.length === 0) return "";
  const values = series.map((p) => p.value);
  const min = Math.min(0, ...values);
  const max = Math.max(0.01, ...values);
  const range = max - min || 1;
  const xs = series.map((_, i) =>
    series.length === 1 ? width / 2 : padding + (i / (series.length - 1)) * (width - 2 * padding)
  );
  const ys = series.map((p) => height - padding - ((p.value - min) / range) * (height - 2 * padding));
  return { path: xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" "), zeroY: height - padding - ((0 - min) / range) * (height - 2 * padding) };
}

export default function LineChartSVG({ series, color = "#a78bfa" }) {
  const width = 600;
  const height = 160;
  const padding = 8;

  if (!series || series.length === 0) {
    return <div className="empty-state">—</div>;
  }

  const { path, zeroY } = buildPath(series, width, height, padding);
  const last = series[series.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="line-chart-svg" preserveAspectRatio="none">
      <line x1="0" y1={zeroY} x2={width} y2={zeroY} stroke="rgba(255,255,255,.08)" strokeWidth="1" />
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {series.length > 0 && (
        <circle
          cx={width - padding}
          cy={height - padding - ((last.value - Math.min(0, ...series.map((p) => p.value))) / (Math.max(0.01, ...series.map((p) => p.value)) - Math.min(0, ...series.map((p) => p.value)) || 1)) * (height - 2 * padding)}
          r="4"
          fill={color}
        />
      )}
    </svg>
  );
}
