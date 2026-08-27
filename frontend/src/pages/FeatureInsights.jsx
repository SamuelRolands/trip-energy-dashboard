import { useEffect, useMemo, useState } from "react";
import { api, PALETTE } from "../api";
import Chart from "../components/Chart";

function familyOf(feature) {
  if (feature === "distance_km" || feature === "duration_s") return "Distance & duration";
  if (feature.startsWith("speed_")) return "Speed";
  if (feature.includes("accel") || feature.includes("decel") || feature.includes("ke_sum") || feature.includes("jerk"))
    return "Driving dynamics";
  if (feature.includes("elevation") || feature.includes("gradient")) return "Elevation";
  if (feature === "idle_time_s") return "Driving dynamics";
  if (feature.includes("weight") || feature.includes("engine") || feature.includes("cylinder") || feature === "powertrain_type")
    return "Vehicle";
  return "Route geometry";
}

// Bright, CVD-checked hues (see dataviz palette validation) - fixed
// assignment, used consistently in both charts on this page so a colour
// always means the same family.
const FAMILY_COLOR = {
  "Distance & duration": PALETTE.blue,
  Speed: PALETTE.aqua,
  "Driving dynamics": PALETTE.orange,
  Elevation: PALETTE.green,
  Vehicle: PALETTE.grey,
};

const FAMILY_ORDER = ["Distance & duration", "Speed", "Driving dynamics", "Elevation", "Vehicle"];

function pct(share) {
  const v = share * 100;
  return (v < 1 ? v.toFixed(1) : v.toFixed(0)) + "%";
}

function prettyFeature(f) {
  return f
    .replace(/_/g, " ")
    .replace(/\bkmh\b/gi, "km/h")
    .replace(/\bkm\b/gi, "km")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function FeatureInsights() {
  const [importance, setImportance] = useState(null);

  useEffect(() => {
    api.featureImportance().then((d) => {
      const sorted = [...d].sort((a, b) => a.importance_mean - b.importance_mean);
      setImportance(sorted);
    });
  }, []);

  const composition = useMemo(() => {
    if (!importance) return null;
    const totals = {};
    let grandTotal = 0;
    for (const f of importance) {
      const fam = familyOf(f.feature);
      totals[fam] = (totals[fam] || 0) + Math.max(0, f.importance_mean);
      grandTotal += Math.max(0, f.importance_mean);
    }
    return FAMILY_ORDER
      .filter((fam) => totals[fam] > 0)
      .map((fam) => ({ family: fam, share: totals[fam] / grandTotal }))
      .sort((a, b) => b.share - a.share);
  }, [importance]);

  return (
    <main className="page">
      <p className="eyebrow rise-in">Explainability</p>
      <h1 className="page-title rise-in" style={{ "--delay": "0.05s" }}>What drives the model's predictions</h1>
      <p className="page-subtitle rise-in" style={{ "--delay": "0.1s" }}>
        Each feature is shuffled and the model is re-scored — the resulting drop in
        accuracy is that feature's real, measured contribution. Bars are coloured by
        feature family; the breakdown below turns that colour into a number.
      </p>

      {composition && (
        <div className="section rise-in" style={{ "--delay": "0.15s" }}>
          <div className="section-header">
            <h2 className="section-title">Where the signal comes from</h2>
            <p className="section-note">Share of total importance, by family</p>
          </div>
          <div className="card card-pad">
            <div className="comp-bar">
              {composition.map((c) => (
                <div
                  key={c.family}
                  className="comp-segment"
                  style={{ flexGrow: c.share, background: FAMILY_COLOR[c.family] }}
                  title={`${c.family}: ${pct(c.share)}`}
                />
              ))}
            </div>
            <div className="comp-legend">
              {composition.map((c) => (
                <div className="comp-legend-item" key={c.family}>
                  <span className="legend-dot" style={{ background: FAMILY_COLOR[c.family] }} />
                  <span className="comp-legend-name">{c.family}</span>
                  <span className="comp-legend-pct">{pct(c.share)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {importance && (
        <div className="section rise-in" style={{ "--delay": "0.2s" }}>
          <div className="section-header">
            <h2 className="section-title">Every feature, ranked</h2>
            <p className="section-note">Permutation importance · final held-out model</p>
          </div>
          <div className="card card-pad">
            <Chart
              data={[{
                type: "bar",
                orientation: "h",
                y: importance.map((f) => prettyFeature(f.feature)),
                x: importance.map((f) => f.importance_mean),
                marker: {
                  color: importance.map((f) => FAMILY_COLOR[familyOf(f.feature)] || PALETTE.grey),
                },
                text: importance.map((f) => f.importance_mean.toFixed(3)),
                textposition: "outside",
                textfont: { color: "#a3adc2", size: 11 },
                hovertemplate: "%{y}: %{x:.4f}<extra></extra>",
              }]}
              layout={{
                height: 36 * importance.length + 40,
                margin: { t: 10, r: 46, b: 40, l: 190 },
                xaxis: { title: "Importance (drop in R² when shuffled)" },
              }}
              style={{ height: 36 * importance.length + 40 }}
            />
          </div>
        </div>
      )}

      <div className="section rise-in" style={{ "--delay": "0.3s" }}>
        <div className="section-header">
          <h2 className="section-title">Reading this page</h2>
        </div>
        <div className="grid grid-2">
          <div className="card card-pad">
            <p className="feature-body">
              <strong style={{ color: "var(--text-primary)" }}>Distance leads, as expected</strong> —
              energy use scales with distance in almost any powertrain. It's the floor
              every model has to beat, which is why performance is always reported as
              skill <em>above</em> a distance-only baseline, not as raw accuracy.
            </p>
          </div>
          <div className="card card-pad">
            <p className="feature-body">
              <strong style={{ color: "var(--text-primary)" }}>Everything else is the edge</strong> —
              speed, acceleration, elevation, and vehicle attributes are what separate
              two trips of equal distance that use very different amounts of energy: a
              flat highway cruise versus a stop-start hilly commute.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .comp-bar {
          display: flex;
          height: 36px;
          border-radius: 10px;
          overflow: hidden;
          gap: 2px;
          background: var(--bg-2);
        }
        .comp-segment {
          min-width: 4px;
          transition: opacity 0.15s ease;
        }
        .comp-segment:hover { opacity: 0.85; }
        .comp-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-top: 18px;
        }
        .comp-legend-item {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 13px;
        }
        .legend-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
        .comp-legend-name { color: var(--text-secondary); }
        .comp-legend-pct { color: var(--text-primary); font-family: var(--font-mono); font-weight: 700; }
      `}</style>
    </main>
  );
}
