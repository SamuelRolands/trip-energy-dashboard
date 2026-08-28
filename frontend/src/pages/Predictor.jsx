import { useEffect, useState } from "react";
import { api, PALETTE, POWERTRAIN_COLOR, POWERTRAIN_TONE, withAlpha } from "../api";
import Badge from "../components/Badge";
import Chart from "../components/Chart";
import RoutePicker from "../components/RoutePicker";
import { useCountUp } from "../useCountUp";

const POWERTRAINS = [
  { code: "ICE", label: "Petrol (ICE)" },
  { code: "HEV", label: "Hybrid (HEV)" },
  { code: "PHEV", label: "Plug-in Hybrid" },
  { code: "EV", label: "Fully Electric" },
];
const MODELS = [
  { code: "extra_trees", label: "Extra Trees (most accurate)" },
  { code: "physics_hybrid", label: "Physics-informed hybrid" },
];
const INPUT_MODES = [
  { code: "manual", label: "Manual" },
  { code: "map", label: "Use map" },
];
const VEHICLE_CLASSES = ["Compact", "Mid-size", "Large/SUV"];
const ROUTE_TYPES = ["Urban", "Mixed", "Highway"];
const TERRAINS = ["Flat", "Rolling", "Hilly"];
const STYLES = ["Calm", "Normal", "Spirited"];

// Fixed, meaning-based colour per physical mechanism - not by rank, so a
// term keeps its colour no matter how the breakdown is sorted.
const PHYSICS_TERM_COLOR = {
  rolling: PALETTE.blue,
  idle: PALETTE.orange,
  kinetic: PALETTE.aqua,
  aerodynamic: PALETTE.green,
  potential: PALETTE.grey,
};
const PHYSICS_TERM_LABEL = {
  rolling: "Rolling resistance",
  idle: "Idle burn",
  kinetic: "Acceleration",
  aerodynamic: "Aerodynamic drag",
  potential: "Climbing",
};

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
  const [modelChoice, setModelChoice] = useState("extra_trees");
  const [inputMode, setInputMode] = useState("manual");
  const [distance, setDistance] = useState(10);
  const [routeData, setRouteData] = useState(null);
  const [vehicleClass, setVehicleClass] = useState("Mid-size");
  const [routeType, setRouteType] = useState("Mixed");
  const [terrain, setTerrain] = useState("Rolling");
  const [style, setStyle] = useState("Normal");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fleetStats, setFleetStats] = useState(null);

  useEffect(() => {
    api.fleetStats().then(setFleetStats).catch(() => {});
  }, []);

  async function handlePredict() {
    if (inputMode === "map" && !routeData) {
      setError("Pick a start and destination point on the map first.");
      return;
    }
    setLoading(true);
    setError(null);
    const distanceUsed = inputMode === "map" ? routeData.distance_km : Number(distance);
    try {
      const data = await api.predict({
        powertrain,
        distance_km: distanceUsed,
        vehicle_class: vehicleClass,
        // Road-context detail (speed limits, intersections) isn't derivable
        // from a route alone, so map mode keeps a neutral "Mixed" assumption
        // for it - see RoutePicker's note to the user.
        route_type: inputMode === "map" ? "Mixed" : routeType,
        terrain,
        driving_style: style,
        model: modelChoice,
        ...(inputMode === "map"
          ? {
              terrain_override: {
                elevation_gain_m: routeData.elevation_gain_m,
                elevation_loss_m: routeData.elevation_loss_m,
                gradient_mean: routeData.gradient_mean,
                gradient_std: routeData.gradient_std,
                gradient_p10: routeData.gradient_p10,
                gradient_p90: routeData.gradient_p90,
                gradient_abs_mean: routeData.gradient_abs_mean,
              },
            }
          : {}),
      });
      setResult({ ...data, _distanceUsed: distanceUsed, _powertrain: powertrain });
    } catch (e) {
      setError("Could not reach the prediction service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const color = POWERTRAIN_COLOR[powertrain];
  const animatedValue = useCountUp(
    result?.mode === "prediction" ? result.predicted_kwh : 0,
    { decimals: 3, duration: 800 }
  );

  // Efficiency (kWh/km) rather than raw kWh - a fair comparison against the
  // fleet average regardless of how long this specific trip is, since the
  // fleet figure is itself an average over ~5km trips.
  const resultPowertrain = result?._powertrain;
  const fleetForPowertrain = resultPowertrain && fleetStats ? fleetStats[resultPowertrain] : null;
  const fleetRate = fleetForPowertrain ? fleetForPowertrain.mean_kwh / fleetForPowertrain.mean_distance_km : null;
  const thisRate =
    result?.mode === "prediction" && result._distanceUsed
      ? result.predicted_kwh / result._distanceUsed
      : null;
  const deltaPct = fleetRate && thisRate ? ((thisRate - fleetRate) / fleetRate) * 100 : null;
  const animatedRate = useCountUp(thisRate || 0, { decimals: 3, duration: 900 });

  return (
    <main className="page">
      <p className="eyebrow rise-in">Trip predictor</p>
      <h1 className="page-title rise-in" style={{ "--delay": "0.05s" }}>Predict a trip's energy consumption</h1>
      <p className="page-subtitle rise-in" style={{ "--delay": "0.1s" }}>
        Set a powertrain and describe the trip — GRADIA estimates its energy use in
        real time, straight from the trained model. Every preset below is drawn
        from real vehicles and real routes in the training fleet.
      </p>

      <div className="predictor-grid">
        <div className="card card-pad rise-in" style={{ "--delay": "0.15s" }}>
          <PillSelect label="Powertrain" options={POWERTRAINS} value={powertrain} onChange={setPowertrain} />

          {(powertrain === "ICE" || powertrain === "HEV") && (
            <PillSelect label="Model" options={MODELS} value={modelChoice} onChange={setModelChoice} />
          )}

          <PillSelect label="Trip details" options={INPUT_MODES} value={inputMode} onChange={setInputMode} />

          {inputMode === "manual" ? (
            <>
              <div className="field">
                <label className="field-label">Trip distance — {distance} km</label>
                <input
                  type="range" min="1" max="100" step="1"
                  value={distance} onChange={(e) => setDistance(e.target.value)}
                  className="slider"
                />
              </div>
              <PillSelect label="Route type" options={ROUTE_TYPES} value={routeType} onChange={setRouteType} />
              <PillSelect label="Terrain" options={TERRAINS} value={terrain} onChange={setTerrain} />
            </>
          ) : (
            <div className="field">
              <label className="field-label">Route</label>
              <RoutePicker onRouteComputed={setRouteData} onClear={() => setRouteData(null)} />
            </div>
          )}

          <PillSelect label="Vehicle class" options={VEHICLE_CLASSES} value={vehicleClass} onChange={setVehicleClass} />
          <PillSelect label="Driving style" options={STYLES} value={style} onChange={setStyle} />

          <button className="btn btn-primary predict-btn" onClick={handlePredict} disabled={loading}>
            {loading ? "Predicting…" : "Predict energy use"}
          </button>
          {error && <p className="error-text">{error}</p>}
        </div>

        <div className="card card-pad result-card rise-in" style={{ "--delay": "0.2s" }}>
          {!result && (
            <div className="result-empty">
              <p>Set the trip details and press <strong>Predict</strong> to see the estimate.</p>
            </div>
          )}

          {result && result.mode === "prediction" && (
            <>
              <Badge tone={POWERTRAIN_TONE[powertrain]}>
                {result.model === "physics_hybrid" ? "Physics-informed hybrid" : "Live model prediction"}
              </Badge>
              <p className="result-value" style={{ color }}>
                {animatedValue.toFixed(3)} <span className="result-unit">kWh</span>
              </p>
              <p className="result-range">
                Likely range: {result.range_low_kwh} – {result.range_high_kwh} kWh
                <span className="result-range-note"> (±{result.known_mae_kwh} kWh typical error)</span>
              </p>

              <Chart
                data={[{
                  type: "bar",
                  orientation: "h",
                  y: ["This prediction"],
                  x: [result.predicted_kwh],
                  marker: { color: withAlpha(color, 0.85), line: { color, width: 1.5 } },
                  error_x: { type: "data", array: [result.known_mae_kwh], color: "#a3adc2", thickness: 1.5, width: 4 },
                  hovertemplate: "%{x:.2f} kWh<extra></extra>",
                }]}
                layout={{ margin: { t: 10, r: 30, b: 40, l: 110 }, height: 140 }}
                style={{ height: 140 }}
              />

              {fleetRate !== null && thisRate !== null && (
                <div className="efficiency-section">
                  <p className="physics-breakdown-label">Efficiency vs. the {resultPowertrain} fleet</p>
                  <Chart
                    data={[{
                      type: "indicator",
                      mode: "gauge+number+delta",
                      value: animatedRate,
                      number: { suffix: " kWh/km", font: { size: 22, color: "#eef1f6" } },
                      delta: {
                        reference: fleetRate,
                        relative: true,
                        valueformat: ".0%",
                        increasing: { color: PALETTE.orange },
                        decreasing: { color: PALETTE.green },
                      },
                      gauge: {
                        axis: {
                          range: [0, Math.max(thisRate, fleetRate) * 1.5],
                          tickcolor: "#6b7488",
                          tickfont: { color: "#6b7488", size: 10 },
                        },
                        bar: { color: withAlpha(color, 0.88), line: { color, width: 1.5 } },
                        bgcolor: "transparent",
                        borderwidth: 0,
                        steps: [
                          { range: [0, fleetRate], color: withAlpha(color, 0.1) },
                          { range: [fleetRate, Math.max(thisRate, fleetRate) * 1.5], color: withAlpha(color, 0.04) },
                        ],
                        threshold: { line: { color: "#a3adc2", width: 3 }, thickness: 0.75, value: fleetRate },
                      },
                    }]}
                    layout={{ margin: { t: 20, r: 30, b: 10, l: 30 }, height: 190 }}
                    style={{ height: 190 }}
                  />
                  <p className="efficiency-note">
                    Grey line marks the {resultPowertrain} fleet average
                    ({fleetRate.toFixed(2)} kWh/km). This trip runs{" "}
                    <strong style={{ color: deltaPct > 0 ? "var(--orange-text)" : "var(--green-text)" }}>
                      {Math.abs(deltaPct).toFixed(0)}% {deltaPct > 0 ? "less" : "more"} efficient
                    </strong>.
                  </p>
                </div>
              )}

              {result.physics_breakdown && (
                <div className="physics-breakdown">
                  <p className="physics-breakdown-label">Where this trip's energy goes</p>
                  <div className="comp-bar">
                    {result.physics_breakdown.map((t) => (
                      <div
                        key={t.term}
                        className="comp-segment"
                        style={{
                          flexGrow: Math.max(t.share, 0.004),
                          background: `linear-gradient(135deg, ${PHYSICS_TERM_COLOR[t.term]} 0%, ${withAlpha(PHYSICS_TERM_COLOR[t.term], 0.65)} 100%)`,
                        }}
                        title={`${PHYSICS_TERM_LABEL[t.term]}: ${(t.share * 100).toFixed(1)}% (${t.kwh} kWh)`}
                      />
                    ))}
                  </div>
                  <div className="physics-legend">
                    {result.physics_breakdown.map((t) => (
                      <div className="physics-legend-item" key={t.term}>
                        <span className="legend-dot" style={{ background: PHYSICS_TERM_COLOR[t.term] }} />
                        <span className="physics-legend-name">{PHYSICS_TERM_LABEL[t.term]}</span>
                        <span className="physics-legend-pct">{(t.share * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {result && result.mode === "descriptive" && (
            <>
              <Badge tone="orange">Fleet statistics</Badge>
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
        .efficiency-section { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border-soft); }
        .efficiency-note { font-size: 12.5px; color: var(--text-secondary); line-height: 1.5; margin: 2px 0 0; }
        .physics-breakdown { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border-soft); }
        .physics-breakdown-label {
          font-size: 12px; font-weight: 600; color: var(--text-muted);
          text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 10px;
        }
        .comp-bar {
          display: flex;
          height: 28px;
          border-radius: 8px;
          overflow: hidden;
          gap: 2px;
          background: var(--bg-2);
        }
        .comp-segment { min-width: 3px; transition: opacity 0.15s ease; }
        .comp-segment:hover { opacity: 0.85; }
        .legend-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
        .physics-legend { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 12px; }
        .physics-legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; }
        .physics-legend-name { color: var(--text-secondary); }
        .physics-legend-pct { color: var(--text-primary); font-family: var(--font-mono); font-weight: 700; }
      `}</style>
    </main>
  );
}
