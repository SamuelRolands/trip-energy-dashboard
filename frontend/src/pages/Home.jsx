import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import Kpi from "../components/Kpi";
import Badge from "../components/Badge";

export default function Home() {
  const [finalResults, setFinalResults] = useState(null);

  useEffect(() => {
    api.finalResults().then(setFinalResults).catch(() => {});
  }, []);

  const best = finalResults?.find((r) => r.model === "extra_trees");
  const baseline = finalResults?.find((r) => r.model === "distance_only_baseline");
  const reduction =
    best && baseline ? (100 * (1 - best.MAE / baseline.MAE)).toFixed(1) : "60.6";

  return (
    <main className="page">
      <div className="hero">
        <Badge tone="blue">Live model · 384 vehicles · 22.4M readings</Badge>
        <h1 className="hero-title">
          Predict trip energy consumption<br />before the trip happens.
        </h1>
        <p className="hero-lede">
          A machine learning system trained on a full year of real telematics data,
          validated on 57 vehicles it never saw during training, covering petrol,
          hybrid, plug-in hybrid, and fully electric fleets.
        </p>
        <div className="hero-actions">
          <Link to="/predict" className="btn btn-primary">Try the predictor →</Link>
          <Link to="/performance" className="btn btn-secondary">See the validation</Link>
        </div>
      </div>

      <div className="section">
        <div className="grid grid-4">
          <Kpi
            label="Error reduction"
            value={`${reduction}%`}
            sub="vs. a distance-only baseline"
            color="var(--green)"
          />
          <Kpi
            label="Final MAE"
            value={best ? `${best.MAE.toFixed(2)} kWh` : "—"}
            sub="on 57 unseen vehicles"
          />
          <Kpi label="Models compared" value="8" sub="across 6 feature sets, 480 fits" />
          <Kpi label="Powertrains covered" value="4" sub="ICE · HEV · PHEV · EV" />
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
              body: "The model is tested on vehicles it has never encountered — not just trips it hasn't seen from a car it already knows.",
            },
            {
              tone: "green",
              title: "A rebuilt, validated target",
              body: "The dataset's own built-in energy figure was reverse-engineered, found to contain calculation defects, and rebuilt from raw sensors.",
            },
            {
              tone: "orange",
              title: "Honest about limitations",
              body: "Plug-in hybrid and electric vehicle results are reported separately and conservatively — not folded into one flattering headline number.",
            },
          ].map((c) => (
            <div className="card card-pad" key={c.title}>
              <Badge tone={c.tone}>{c.title}</Badge>
              <p className="feature-body">{c.body}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .hero { padding: 56px 0 40px; max-width: 720px; }
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
        @media (max-width: 640px) {
          .hero-title { font-size: 30px; }
        }
      `}</style>
    </main>
  );
}
