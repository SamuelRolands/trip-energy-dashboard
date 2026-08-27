import { useEffect, useState } from "react";
import { api, PALETTE } from "../api";
import Chart from "../components/Chart";

const GROUP_COLOR = {
  distance_km: PALETTE.blue,
};

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

const FAMILY_COLOR = {
  "Distance & duration": PALETTE.blue,
  Speed: PALETTE.green,
  "Driving dynamics": PALETTE.orange,
  Elevation: "#9b7ee8",
  Vehicle: "#6b7488",
  "Route geometry": "#4ac3c9",
};

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

  return (
    <main className="page">
      <p className="eyebrow">Explainability</p>
      <h1 className="page-title">What drives the model's predictions</h1>
      <p className="page-subtitle">
        Permutation importance: each feature is shuffled and the model is re-scored — the
        drop in accuracy is that feature's real contribution, measured directly rather than
        assumed from its coefficient.
      </p>

      {importance && (
        <div className="section">
          <div className="card card-pad">
            <Chart
              data={[{
                type: "bar",
                orientation: "h",
                y: importance.map((f) => prettyFeature(f.feature)),
                x: importance.map((f) => f.importance_mean),
                error_x: { type: "data", array: importance.map((f) => f.importance_std), color: "#4a5468" },
                marker: { color: importance.map((f) => FAMILY_COLOR[familyOf(f.feature)] || PALETTE.grey) },
                hovertemplate: "%{y}: %{x:.4f}<extra></extra>",
              }]}
              layout={{
                height: 40 * importance.length + 60,
                margin: { t: 10, r: 30, b: 40, l: 190 },
                xaxis: { title: "Importance (drop in R² when shuffled)" },
              }}
              style={{ height: 40 * importance.length + 60 }}
            />
          </div>
          <div className="legend-row">
            {Object.entries(FAMILY_COLOR)
              .filter(([name]) => importance.some((f) => familyOf(f.feature) === name))
              .map(([name, color]) => (
              <span className="legend-item" key={name}>
                <span className="legend-dot" style={{ background: color }} />
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Reading this chart</h2>
        </div>
        <div className="grid grid-2">
          <div className="card card-pad">
            <p className="feature-body">
              <strong style={{ color: "var(--text)" }}>Distance dominates</strong> — which is
              expected: energy use scales with distance in almost any powertrain. It's the
              floor the model has to beat, which is exactly why every result on the
              performance page is reported as skill <em>above</em> a distance-only baseline,
              not as raw accuracy.
            </p>
          </div>
          <div className="card card-pad">
            <p className="feature-body">
              <strong style={{ color: "var(--text)" }}>Everything else is the value-add</strong> —
              speed, acceleration, elevation and road-context features are what let the model
              tell apart two trips of the same distance that consume very different amounts
              of energy: a flat highway cruise versus a stop-start hilly commute.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .legend-row { display: flex; flex-wrap: wrap; gap: 18px; margin-top: 16px; }
        .legend-item { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--text-secondary); }
        .legend-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
      `}</style>
    </main>
  );
}
