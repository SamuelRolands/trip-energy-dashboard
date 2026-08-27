export default function Kpi({ label, value, sub, color = "var(--text-primary)" }) {
  return (
    <div className="card kpi">
      <p className="kpi-label">{label}</p>
      <p className="kpi-value" style={{ color }}>{value}</p>
      {sub && <p className="kpi-sub">{sub}</p>}
    </div>
  );
}
