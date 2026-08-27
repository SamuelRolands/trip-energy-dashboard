import Badge from "../components/Badge";

const LIMITATIONS = [
  {
    tone: "orange",
    title: "PHEV: battery draw only",
    body: "The reconstructed target for plug-in hybrids captures electrical battery draw, not total trip energy including any petrol burned. A per-trip prediction would therefore be misleading, so the dashboard reports honest fleet statistics instead.",
  },
  {
    tone: "red",
    title: "EV: too few vehicles",
    body: "Only 3 fully electric vehicles exist in the entire dataset. That's enough to describe fleet-level tendencies, but nowhere near enough to train or validate a model that would generalise to an EV fleet it hasn't seen.",
  },
  {
    tone: "blue",
    title: "One geography, one year",
    body: "All data comes from Ann Arbor, Michigan over a single year. Predictions reflect that region's roads, speed limits, and driving conditions, and may not transfer directly elsewhere.",
  },
];

const STEPS = [
  { n: "01", title: "Rebuild the target", body: "The dataset's built-in energy figure was reverse-engineered and found to contain calculation defects. It was rebuilt from raw sensors using combustion chemistry (fuel mass-air-flow) and Joule's law (current × voltage), separately for each powertrain." },
  { n: "02", title: "Engineer features honestly", body: "42 route, vehicle, and driving-behaviour features were built with a hard rule: nothing that leaks information only available after the trip ends. Every feature was checked in code, not just by eye." },
  { n: "03", title: "Compare 8 models fairly", body: "Linear, tree-based, and kernel models were compared under identical 10-fold, vehicle-grouped cross-validation — meaning a vehicle in the test fold was never seen in training, mimicking a genuinely new vehicle joining the fleet." },
  { n: "04", title: "Test once, for real", body: "The strongest models were tested exactly once against 57 vehicles held back from every step of development, giving an honest estimate of real-world performance rather than an optimistic, tuned one." },
];

export default function About() {
  return (
    <main className="page">
      <p className="eyebrow">About this project</p>
      <h1 className="page-title">Why this exists, and how it was built</h1>
      <p className="page-subtitle">
        Fleet operators typically learn how much energy a trip used only after it's over.
        This project asks whether that number can be predicted reliably beforehand — using
        nothing but the kind of route and vehicle information a fleet manager already has.
      </p>

      <div className="section">
        <div className="section-header">
          <h2 className="section-title">The dataset</h2>
        </div>
        <div className="grid grid-4">
          <div className="card card-pad about-stat">
            <p className="about-stat-value">384</p>
            <p className="about-stat-label">Vehicles</p>
          </div>
          <div className="card card-pad about-stat">
            <p className="about-stat-value">22.4M</p>
            <p className="about-stat-label">Sensor readings</p>
          </div>
          <div className="card card-pad about-stat">
            <p className="about-stat-value">1 yr</p>
            <p className="about-stat-label">Continuous coverage</p>
          </div>
          <div className="card card-pad about-stat">
            <p className="about-stat-value">4</p>
            <p className="about-stat-label">Powertrain types</p>
          </div>
        </div>
        <p className="about-body">
          Built on the extended Vehicle Energy Dataset (eVED) — real GPS traces, engine and
          battery sensor readings, and road-network attributes collected from a mixed
          petrol, hybrid, plug-in hybrid, and electric fleet driving real routes in Ann
          Arbor, Michigan.
        </p>
      </div>

      <div className="section">
        <div className="section-header">
          <h2 className="section-title">How the model was built</h2>
        </div>
        <div className="grid grid-2">
          {STEPS.map((s) => (
            <div className="card card-pad about-step" key={s.n}>
              <span className="about-step-n">{s.n}</span>
              <div>
                <p className="about-step-title">{s.title}</p>
                <p className="about-step-body">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Where this falls short — on purpose, said plainly</h2>
          <p className="section-note">A model is only trustworthy if its limits are stated as clearly as its results.</p>
        </div>
        <div className="grid grid-3">
          {LIMITATIONS.map((l) => (
            <div className="card card-pad" key={l.title}>
              <Badge tone={l.tone}>{l.title}</Badge>
              <p className="feature-body">{l.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2 className="section-title">Built with</h2>
        </div>
        <p className="about-body">
          Python, scikit-learn and pandas for the modelling pipeline; FastAPI for the API
          serving live predictions from the trained model; React, Vite and Plotly for this
          dashboard. Every chart and prediction on this site is generated from the actual
          trained model and real held-out trip data — nothing here is mocked or illustrative.
        </p>
      </div>

      <style>{`
        .about-stat { text-align: center; }
        .about-stat-value { font-family: var(--font-mono); font-size: 30px; font-weight: 800; margin: 0; color: var(--blue); }
        .about-stat-label { font-size: 12.5px; color: var(--text-muted); margin: 6px 0 0; }
        .about-body { font-size: 14.5px; color: var(--text-secondary); line-height: 1.7; max-width: 780px; margin-top: 16px; }
        .about-step { display: flex; gap: 16px; align-items: flex-start; }
        .about-step-n { font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: var(--blue); flex-shrink: 0; padding-top: 2px; }
        .about-step-title { font-size: 14.5px; font-weight: 700; margin: 0 0 6px; }
        .about-step-body { font-size: 13.5px; color: var(--text-secondary); line-height: 1.6; margin: 0; }
      `}</style>
    </main>
  );
}
