import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, withAlpha } from "../api";
import Kpi from "../components/Kpi";
import Badge from "../components/Badge";
import Chart from "../components/Chart";
import { useCountUp } from "../useCountUp";

const FS_LABEL = {
  F1_distance_only: "F1",
  F2_route_geometry: "F2",
  F3_road_context: "F3",
  F4_scenario_a: "F4",
  F5_plus_speed: "F5",
  F6_scenario_b: "F6",
};

function AnimatedKpi({ label, value, decimals = 0, suffix = "", sub, color }) {
  const n = useCountUp(typeof value === "number" ? value : 0, { decimals, duration: 900 });
  return (
    <Kpi
      label={label}
      value={typeof value === "number" ? `${n}${suffix}` : "—"}
      sub={sub}
      color={color}
    />
  );
}

export default function Home() {
  const [finalResults, setFinalResults] = useState(null);
  const [progression, setProgression] = useState(null);

  useEffect(() => {
    api.finalResults().then(setFinalResults).catch(() => {});
    api.skillProgression().then(setProgression).catch(() => {});
  }, []);

  const best = finalResults?.find((r) => r.model === "extra_trees");
  const baseline = finalResults?.find((r) => r.model === "distance_only_baseline");
  const reduction = best && baseline ? 100 * (1 - best.MAE / baseline.MAE) : 60.6;

  return (
    <main className="page">
      <div className="hero-wrap">
        <div className="hero-glow" aria-hidden="true">
          <span className="blob blob-a" />
          <span className="blob blob-b" />
          <span className="blob blob-c" />
        </div>
        <div className="hero-grid">
          <div className="hero">
            <Badge tone="blue">Live model · 384 vehicles · 22.4M readings</Badge>
            <h1 className="hero-title rise-in" style={{ "--delay": "0.05s" }}>
              See a trip's energy cost<br />before you drive it.
            </h1>
            <p className="hero-lede rise-in" style={{ "--delay": "0.1s" }}>
              GRADIA is trained on a full year of real telematics data and validated
              on 57 vehicles it never saw during training — across petrol, hybrid,
              plug-in hybrid, and electric fleets.
            </p>
            <div className="hero-actions rise-in" style={{ "--delay": "0.15s" }}>
              <Link to="/predict" className="btn btn-primary">Try the predictor →</Link>
              <Link to="/performance" className="btn btn-secondary">See the validation</Link>
            </div>
          </div>

          <div className="hero-chart card card-pad rise-in" style={{ "--delay": "0.2s" }}>
            <p className="hero-chart-label">Skill by feature family</p>
            {progression && (
              <Chart
                data={[{
                  type: "bar",
                  x: progression.map((p) => FS_LABEL[p.feature_set] || p.feature_set),
                  y: progression.map((p) => p.skill),
                  marker: {
                    color: progression.map((p) => withAlpha(p.skill >= 0 ? "#4285f4" : "#ea4335", 0.85)),
                    line: { color: progression.map((p) => (p.skill >= 0 ? "#4285f4" : "#ea4335")), width: 1.5 },
                  },
                  hovertemplate: "%{x}: %{y:.2f}<extra></extra>",
                }]}
                layout={{
                  margin: { t: 10, r: 10, b: 30, l: 36 },
                  height: 200,
                  yaxis: { title: "" },
                }}
                style={{ height: 200 }}
                config={{ displayModeBar: false }}
              />
            )}
            <p className="hero-chart-note">Distance alone → the full model, one feature family at a time.</p>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="grid grid-4">
          <AnimatedKpi
            label="Error reduction"
            value={reduction}
            decimals={1}
            suffix="%"
            sub="vs. a distance-only baseline"
            color="var(--aqua)"
          />
          <AnimatedKpi
            label="Final MAE"
            value={best ? best.MAE : null}
            decimals={2}
            suffix=" kWh"
            sub="on 57 unseen vehicles"
          />
          <AnimatedKpi label="Models compared" value={8} sub="across 6 feature sets, 480 fits" />
          <AnimatedKpi label="Powertrains covered" value={4} sub="ICE · HEV · PHEV · EV" />
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2 className="section-title">What makes this trustworthy</h2>
        </div>
        <div className="grid grid-3">
          {[
            {
              tone: "blue",
              title: "Vehicle-grouped testing",
              body: "GRADIA is tested on vehicles it has never encountered — not just trips it hasn't seen from a car it already knows.",
            },
            {
              tone: "aqua",
              title: "A rebuilt, validated target",
              body: "The dataset's own built-in energy figure was reverse-engineered, found to contain calculation defects, and rebuilt from raw sensors.",
            },
            {
              tone: "orange",
              title: "Honest about limitations",
              body: "Plug-in hybrid and electric vehicle results are reported separately and conservatively — never folded into one flattering headline number.",
            },
          ].map((c, i) => (
            <div className="card card-pad rise-in" style={{ "--delay": `${0.05 * i}s` }} key={c.title}>
              <Badge tone={c.tone}>{c.title}</Badge>
              <p className="feature-body">{c.body}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .hero-wrap { position: relative; overflow: hidden; margin: 0 -32px; padding: 0 32px; }
        .hero-glow { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(50px);
          opacity: 0.55;
          will-change: transform;
        }
        .blob-a {
          top: -10%; left: -6%;
          width: 420px; height: 420px;
          background: radial-gradient(circle, rgba(66,133,244,0.55), transparent 70%);
          animation: drift-a 16s ease-in-out infinite alternate;
        }
        .blob-b {
          top: 5%; right: -8%;
          width: 380px; height: 380px;
          background: radial-gradient(circle, rgba(0,191,165,0.5), transparent 70%);
          animation: drift-b 20s ease-in-out infinite alternate;
        }
        .blob-c {
          bottom: -25%; left: 30%;
          width: 320px; height: 320px;
          background: radial-gradient(circle, rgba(251,188,5,0.28), transparent 70%);
          animation: drift-c 24s ease-in-out infinite alternate;
        }
        @keyframes drift-a {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(6%, 8%) scale(1.12); }
        }
        @keyframes drift-b {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(-8%, 6%) scale(1.08); }
        }
        @keyframes drift-c {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(4%, -6%) scale(1.15); }
        }
        @media (prefers-reduced-motion: reduce) {
          .blob-a, .blob-b, .blob-c { animation: none; }
        }
        .hero-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 32px;
          align-items: center;
          padding: 56px 0 40px;
        }
        .hero { max-width: 620px; }
        .hero-title {
          font-size: 42px;
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.15;
          margin: 20px 0 18px;
        }
        .hero-lede {
          font-size: 16.5px;
          color: var(--text-secondary);
          line-height: 1.65;
          margin: 0 0 28px;
        }
        .hero-actions { display: flex; gap: 12px; }
        .hero-chart-label {
          font-size: 12.5px; font-weight: 600; color: var(--text-muted);
          text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 8px;
        }
        .hero-chart-note { font-size: 12px; color: var(--text-muted); margin: 8px 0 0; }
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr; padding: 40px 0 32px; }
        }
        @media (max-width: 640px) {
          .hero-title { font-size: 30px; }
        }
      `}</style>
    </main>
  );
}
