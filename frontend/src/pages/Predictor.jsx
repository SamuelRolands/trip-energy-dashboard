import { useState } from "react";
import { api, POWERTRAIN_COLOR } from "../api";
import Badge from "../components/Badge";
import Chart from "../components/Chart";

const POWERTRAINS = [
  { code: "ICE", label: "Petrol (ICE)" },
  { code: "HEV", label: "Hybrid (HEV)" },
  { code: "PHEV", label: "Plug-in Hybrid" },
  { code: "EV", label: "Fully Electric" },
];
const VEHICLE_CLASSES = ["Compact", "Mid-size", "Large/SUV"];
const ROUTE_TYPES = ["Urban", "Mixed", "Highway"];
const TERRAINS = ["Flat", "Rolling", "Hilly"];
const STYLES = ["Calm", "Normal", "Spirited"];

function PillSelect({ label, options, value, onChange }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <div className="pill-group">
        {options.map((opt) => {
          const code = typeof opt === "string" ? opt : opt.code;
          const text = typeof opt === "string" ? opt : opt.label;
          return (
            <button
              key={code}
              type="button"
              className={"pill" + (value === code ? " active" : "")}
              onClick={() => onChange(code)}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Predictor() {
  const [powertrain, setPowertrain] = useState("ICE");
  const [distance, setDistance] = useState(10);
  const [vehicleClass, setVehicleClass] = useState("Mid-size");
  const [routeType, setRouteType] = useState("Mixed");
  const [terrain, setTerrain] = useState("Rolling");
  const [style, setStyle] = useState("Normal");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handlePredict() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.predict({
        powertrain,
        distance_km: Number(distance),
        vehicle_class: vehicleClass,
        route_type: routeType,
        terrain,
        driving_style: style,
      });
      setResult(data);
    } catch (e) {
      setError("Could not reach the prediction service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const color = POWERTRAIN_COLOR[powertrain];

  return (
    <main className="page">
      <p className="eyebrow">Trip predictor</p>
      <h1 className="page-title">Predict a trip's energy consumption</h1>
      <p className="page-subtitle">
        Choose a powertrain, describe the trip in plain terms, and get an estimate from
        the actual trained model — not a lookup table. Route and vehicle presets below are
        each grounded in real quantiles from the training data, not arbitrary defaults.
      </p>

      <div className="predictor-grid">
        <div className="card card-pad">
          <PillSelect label="Powertrain" options={POWERTRAINS} value={powertrain} onChange={setPowertrain} />

          <div className="field">
            <label className="field-label">Trip distance — {distance} km</label>
            <input
              type="range" min="1" max="100" step="1"
              value={distance} onChange={(e) => setDistance(e.target.value)}
              className="slider"
            />
          </div>

          <PillSelect label="Vehicle class" options={VEHICLE_CLASSES} value={vehicleClass} onChange={setVehicleClass} />
          <PillSelect label="Route type" options={ROUTE_TYPES} value={routeType} onChange={setRouteType} />
          <PillSelect label="Terrain" options={TERRAINS} value={terrain} onChange={setTerrain} />
          <PillSelect label="Driving style" options={STYLES} value={style} onChange={setStyle} />

          <button className="btn btn-primary predict-btn" onClick={handlePredict} disabled={loading}>
            {loading ? "Predicting…" : "Predict energy use"}
          </button>
          {error && <p className="error-text">{error}</p>}
        </div>

        <div className="card card-pad result-card">
          {!result && (
            <div className="result-empty">
              <p>Set the trip details and press <strong>Predict</strong> to see the model's estimate.</p>
            </div>
          )}

          {result && result.mode === "prediction" && (
            <>
              <Badge tone={powertrain === "ICE" ? "blue" : "green"}>Live model prediction</Badge>
              <p className="result-value" style={{ color }}>
                {result.predicted_kwh} <span className="result-unit">kWh</span>
              </p>
              <p className="result-range">
                Likely range: {result.range_low_kwh} – {result.range_high_kwh} kWh
                <span className="result-range-note"> (based on ±{result.known_mae_kwh} kWh known model error)</span>
              </p>

              <Chart
                data={[{
                  type: "bar",
                  orientation: "h",
                  y: ["This prediction"],
                  x: [result.predicted_kwh],
                  marker: { color },
                  error_x: { type: "data", array: [result.known_mae_kwh], color: "#a3adc2", thickness: 1.5, width: 4 },
                  hovertemplate: "%{x:.2f} kWh<extra></extra>",
                }]}
                layout={{ margin: { t: 10, r: 30, b: 40, l: 110 }, height: 140 }}
                style={{ height: 140 }}
              />
            </>
          )}

          {result && result.mode === "descriptive" && (
            <>
              <Badge tone="orange">Fleet statistics — not a per-trip prediction</Badge>
              <p className="result-explain">{result.reason}</p>
              <div className="result-stats">
                <div>
                  <p className="kpi-label">Fleet average</p>
                  <p className="result-value-sm">{result.fleet_mean_kwh} kWh</p>
                </div>
                <div>
                  <p className="kpi-label">Fleet median</p>
                  <p className="result-value-sm">{result.fleet_median_kwh} kWh</p>
                </div>
              </div>
              <p className="result-range-note">
                Based on {result.n_trips.toLocaleString()} real trips across {result.n_vehicles} vehicles.
              </p>
            </>
          )}
        </div>
      </div>

      <style>{`
        .predictor-grid {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .predictor-grid { grid-template-columns: 1fr; }
        }
        .slider {
          width: 100%;
          accent-color: var(--blue);
          height: 6px;
        }
        .predict-btn { width: 100%; margin-top: 8px; padding: 13px; font-size: 15px; }
        .error-text { color: var(--red); font-size: 13px; margin-top: 10px; }
        .result-card { min-height: 340px; display: flex; flex-direction: column; justify-content: center; }
        .result-empty { color: var(--text-muted); font-size: 14px; text-align: center; padding: 40px 20px; }
        .result-value {
          font-family: var(--font-mono);
          font-size: 48px;
          font-weight: 800;
          margin: 18px 0 4px;
          letter-spacing: -0.02em;
        }
        .result-value-sm {
          font-family: var(--font-mono);
          font-size: 26px;
          font-weight: 700;
          margin: 4px 0 0;
        }
        .result-unit { font-size: 20px; font-weight: 600; color: var(--text-muted); }
        .result-range { font-size: 13.5px; color: var(--text-secondary); margin: 0 0 16px; }
        .result-range-note { color: var(--text-muted); }
        .result-explain { font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin: 16px 0 20px; }
        .result-stats { display: flex; gap: 32px; margin-bottom: 14px; }
      `}</style>
    </main>
  );
}
