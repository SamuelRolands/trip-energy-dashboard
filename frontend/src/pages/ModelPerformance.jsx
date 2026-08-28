import { useEffect, useState } from "react";
import { api } from "../api";
import Chart from "../components/Chart";

const PRETTY = {
  mean_baseline: "Mean baseline",
  linear_regression: "Linear Regression",
  elasticnet: "ElasticNet",
  knn: "k-Nearest Neighbours",
  random_forest: "Random Forest",
  extra_trees: "Extra Trees",
  hist_gradient_boosting: "Hist. Gradient Boosting",
  svr: "Support Vector Regression",
  distance_only_baseline: "Distance-only baseline",
  greybox_hybrid: "Physics-informed hybrid",
};

const FS_LABEL = {
  F1_distance_only: "F1 · Distance only",
  F2_route_geometry: "F2 · + Route geometry",
  F3_road_context: "F3 · + Road context",
  F4_scenario_a: "F4 · + Vehicle metadata",
  F5_plus_speed: "F5 · + Speed statistics",
  F6_scenario_b: "F6 · + Acceleration dynamics",
};

// One chart shape reused for both tables: every model ranked by skill, with
// the other three metrics folded into the hover rather than crammed on
// screen - readable at a glance, complete on demand.
function SkillRankChart({ rows, skillKey, maeKey, rmseKey, r2Key }) {
  const sorted = [...rows].sort((a, b) => b[skillKey] - a[skillKey]);
  return (
    <Chart
      data={[{
        type: "bar",
        orientation: "h",
        y: sorted.map((r) => PRETTY[r.model] || r.model),
        x: sorted.map((r) => r[skillKey]),
        marker: { color: sorted.map((r) => (r[skillKey] >= 0 ? "#4285f4" : "#ea4335")) },
        text: sorted.map((r) => `${r[skillKey] > 0 ? "+" : ""}${r[skillKey].toFixed(2)}`),
        textposition: "outside",
        textfont: { color: "#a3adc2" },
        customdata: sorted.map((r) => [r[maeKey], r[rmseKey], r[r2Key]]),
        hovertemplate:
          "<b>%{y}</b><br>Skill %{x:.3f}<br>MAE %{customdata[0]:.3f} kWh<br>" +
          "RMSE %{customdata[1]:.3f} kWh<br>R² %{customdata[2]:.3f}<extra></extra>",
      }]}
      layout={{
        height: 44 * sorted.length + 40,
        margin: { t: 10, r: 60, b: 40, l: 176 },
        xaxis: { title: "Skill vs. distance-only baseline" },
      }}
      style={{ height: 44 * sorted.length + 40 }}
    />
  );
}

export default function ModelPerformance() {
  const [cv, setCv] = useState(null);
  const [final, setFinal] = useState(null);
  const [progression, setProgression] = useState(null);

  useEffect(() => {
    api.modelComparison().then(setCv);
    api.finalResults().then(setFinal);
    api.skillProgression().then(setProgression);
  }, []);

  return (
    <main className="page">
      <p className="eyebrow rise-in">Validation</p>
      <h1 className="page-title rise-in" style={{ "--delay": "0.05s" }}>Model performance</h1>
      <p className="page-subtitle rise-in" style={{ "--delay": "0.1s" }}>
        Eight models faced an identical cross-validation test, then the strongest
        went on to a single, final pass against 57 vehicles held back from the
        entire process — the only test that matters for a genuinely unseen vehicle.
      </p>

      {progression && (
        <div className="section rise-in" style={{ "--delay": "0.15s" }}>
          <div className="section-header">
            <h2 className="section-title">What each feature family is worth</h2>
            <p className="section-note">Skill vs. a distance-only baseline · Extra Trees</p>
          </div>
          <div className="card card-pad">
            <Chart
              data={[{
                type: "bar",
                x: progression.map((p) => FS_LABEL[p.feature_set] || p.feature_set),
                y: progression.map((p) => p.skill),
                marker: { color: progression.map((p) => (p.skill >= 0 ? "#4285f4" : "#ea4335")) },
                text: progression.map((p) => p.skill.toFixed(2)),
                textposition: "outside",
                textfont: { color: "#a3adc2" },
              }]}
              layout={{ yaxis: { title: "Skill score" }, margin: { t: 30, r: 20, b: 90, l: 56 } }}
            />
          </div>
        </div>
      )}

      {cv && (
        <div className="section rise-in" style={{ "--delay": "0.2s" }}>
          <div className="section-header">
            <h2 className="section-title">Cross-validation comparison</h2>
            <p className="section-note">All 8 models · full feature set · 230 vehicles</p>
          </div>
          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <SkillRankChart
              rows={cv}
              skillKey="skill_vs_distance_mean"
              maeKey="MAE_mean"
              rmseKey="RMSE_mean"
              r2Key="R2_mean"
            />
          </div>
          <div className="card">
            <table className="data-table">
              <thead>
                <tr><th>Model</th><th>Skill</th><th>MAE (kWh)</th><th>RMSE (kWh)</th><th>R²</th></tr>
              </thead>
              <tbody>
                {cv.map((r) => (
                  <tr key={r.model}>
                    <td>{PRETTY[r.model] || r.model}</td>
                    <td>{r.skill_vs_distance_mean > 0 ? "+" : ""}{r.skill_vs_distance_mean.toFixed(3)}</td>
                    <td>{r.MAE_mean.toFixed(3)}</td>
                    <td>{r.RMSE_mean.toFixed(3)}</td>
                    <td>{r.R2_mean.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {final && (
        <div className="section rise-in" style={{ "--delay": "0.25s" }}>
          <div className="section-header">
            <h2 className="section-title">Final held-out test</h2>
            <p className="section-note">57 vehicles never used in training or model selection</p>
          </div>
          <div className="card card-pad" style={{ marginBottom: 16 }}>
            <SkillRankChart rows={final} skillKey="skill_vs_distance" maeKey="MAE" rmseKey="RMSE" r2Key="R2" />
          </div>
          <div className="card">
            <table className="data-table">
              <thead>
                <tr><th>Model</th><th>Skill</th><th>MAE (kWh)</th><th>RMSE (kWh)</th><th>R²</th></tr>
              </thead>
              <tbody>
                {final.map((r) => (
                  <tr key={r.model}>
                    <td>{PRETTY[r.model] || r.model}{r.model === "extra_trees" ? " ★" : ""}</td>
                    <td>{r.skill_vs_distance > 0 ? "+" : ""}{r.skill_vs_distance.toFixed(3)}</td>
                    <td>{r.MAE.toFixed(3)}</td>
                    <td>{r.RMSE.toFixed(3)}</td>
                    <td>{r.R2.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="section-note" style={{ marginTop: 12 }}>
            ★ Extra Trees was the strongest model and is what powers the live predictor.
          </p>
        </div>
      )}
    </main>
  );
}
