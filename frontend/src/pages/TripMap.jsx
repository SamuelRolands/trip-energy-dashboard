import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { api, POWERTRAIN_COLOR, POWERTRAIN_TONE } from "../api";
import Badge from "../components/Badge";
import Chart from "../components/Chart";

const POWERTRAINS = ["ICE", "HEV", "PHEV", "EV"];

export default function TripMap() {
  const [trips, setTrips] = useState(null);
  const [active, setActive] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    api.sampleTrips().then((d) => {
      setTrips(d);
      if (d.length) setActive(d[0]);
    });
  }, []);

  useEffect(() => {
    if (!active) return;
    setDetail(null);
    api.sampleTripDetail(active.veh_id, active.trip_id).then(setDetail);
  }, [active]);

  const grouped = useMemo(() => {
    if (!trips) return {};
    return POWERTRAINS.reduce((acc, pt) => {
      acc[pt] = trips.filter((t) => t.powertrain === pt);
      return acc;
    }, {});
  }, [trips]);

  const path = detail?.path?.map(([lat, lon]) => [lat, lon]);
  const center = path && path.length ? path[Math.floor(path.length / 2)] : [42.28, -83.74];
  const color = detail ? POWERTRAIN_COLOR[detail.powertrain] : "#4285f4";

  return (
    <main className="page page-wide">
      <p className="eyebrow rise-in">Real trips, real routes</p>
      <h1 className="page-title rise-in" style={{ "--delay": "0.05s" }}>Predicted vs. actual, on the map</h1>
      <p className="page-subtitle rise-in" style={{ "--delay": "0.1s" }}>
        12 real trips from 57 vehicles the model has never seen. Petrol and hybrid
        predictions are checked against what each vehicle's sensors actually
        recorded; plug-in hybrid and electric trips are shown against the fleet
        average, since a reliable per-trip model isn't available for them yet.
      </p>

      <div className="trip-layout">
        <div className="trip-list rise-in" style={{ "--delay": "0.15s" }}>
          {POWERTRAINS.map((pt) => (
            <div key={pt} className="trip-group">
              <p className="trip-group-label" style={{ color: POWERTRAIN_COLOR[pt] }}>{pt}</p>
              {(grouped[pt] || []).map((t) => (
                <button
                  key={`${t.veh_id}-${t.trip_id}`}
                  className={"trip-item" + (active && active.veh_id === t.veh_id && active.trip_id === t.trip_id ? " active" : "")}
                  onClick={() => setActive(t)}
                >
                  <span className="trip-item-label">{t.label} trip · {t.distance_km} km</span>
                  <span className="trip-item-sub">Vehicle #{t.veh_id}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="trip-main">
          <div className="card map-card rise-in" style={{ "--delay": "0.2s" }}>
            {path && (
              <MapContainer
                center={center}
                zoom={14}
                scrollWheelZoom={false}
                style={{ height: "420px", width: "100%", borderRadius: "12px" }}
                key={`${detail.veh_id}-${detail.trip_id}`}
              >
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                  attribution='&copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
                />
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
                />
                <Polyline positions={path} pathOptions={{ color, weight: 4, opacity: 0.85 }} />
                <CircleMarker center={path[0]} radius={6} pathOptions={{ color: "#34a853", fillColor: "#34a853", fillOpacity: 1 }} />
                <CircleMarker center={path[path.length - 1]} radius={6} pathOptions={{ color: "#ea4335", fillColor: "#ea4335", fillOpacity: 1 }} />
              </MapContainer>
            )}
          </div>

          {detail && (
            <div className="card card-pad trip-detail rise-in" style={{ "--delay": "0.25s" }} key={`${detail.veh_id}-${detail.trip_id}-detail`}>
              <div className="trip-detail-head">
                <Badge tone={POWERTRAIN_TONE[detail.powertrain]}>
                  {detail.powertrain} · Vehicle #{detail.veh_id} · Trip #{detail.trip_id}
                </Badge>
                <span className="trip-detail-meta">{detail.distance_km} km · {detail.duration_min} min</span>
              </div>

              {detail.mode === "prediction" ? (
                <>
                  <Chart
                    data={[{
                      type: "bar",
                      x: ["Actual (recorded)", "Predicted (model)"],
                      y: [detail.actual_kwh, detail.predicted_kwh],
                      marker: { color: ["#6b7488", color] },
                      text: [detail.actual_kwh.toFixed(2), detail.predicted_kwh.toFixed(2)],
                      textposition: "outside",
                      textfont: { color: "#a3adc2" },
                    }]}
                    layout={{ height: 220, margin: { t: 20, r: 20, b: 40, l: 50 }, yaxis: { title: "kWh" } }}
                    style={{ height: 220 }}
                  />
                  <p className="trip-error-note">
                    Model error on this trip:{" "}
                    <strong style={{ color: Math.abs(detail.error_kwh) < 0.4 ? "var(--green-text)" : "var(--orange-text)" }}>
                      {detail.error_kwh > 0 ? "+" : ""}{detail.error_kwh.toFixed(3)} kWh
                    </strong>
                    {detail.label === "long" && detail.powertrain === "HEV" && (
                      <> — outside the model's typical error band.</>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <Chart
                    data={[{
                      type: "bar",
                      x: ["Actual (recorded)", "Fleet average"],
                      y: [detail.actual_kwh, detail.fleet_avg_kwh],
                      marker: { color: ["#6b7488", color] },
                      text: [detail.actual_kwh.toFixed(3), detail.fleet_avg_kwh.toFixed(3)],
                      textposition: "outside",
                      textfont: { color: "#a3adc2" },
                    }]}
                    layout={{ height: 220, margin: { t: 20, r: 20, b: 40, l: 50 }, yaxis: { title: "kWh" } }}
                    style={{ height: 220 }}
                  />
                  <p className="trip-error-note">
                    {detail.actual_kwh < 0
                      ? "This trip shows net-negative energy — the vehicle recovered more through regenerative braking and downhill coasting than it consumed."
                      : `${detail.powertrain} trips are shown against the fleet average — a per-trip model isn't available for them yet.`}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .page-wide { max-width: 1180px; }
        .trip-layout { display: grid; grid-template-columns: 220px 1fr; gap: 20px; margin-top: 28px; }
        .trip-list { display: flex; flex-direction: column; gap: 18px; }
        .trip-group-label { font-size: 11.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; margin: 0 0 6px 4px; }
        .trip-item {
          display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
          width: 100%; text-align: left; padding: 9px 12px; border-radius: 8px;
          background: transparent; margin-bottom: 3px; transition: background 0.15s ease, transform 0.15s ease;
        }
        .trip-item:hover { background: var(--bg-2); transform: translateX(2px); }
        .trip-item.active { background: var(--bg-3); }
        .trip-item-label { font-size: 13px; font-weight: 600; color: var(--text-primary); }
        .trip-item-sub { font-size: 11.5px; color: var(--text-muted); font-family: var(--font-mono); }
        .trip-main { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
        .map-card { padding: 8px; overflow: hidden; }
        .trip-detail-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
        .trip-detail-meta { font-size: 12.5px; color: var(--text-muted); font-family: var(--font-mono); }
        .trip-error-note { font-size: 13px; color: var(--text-secondary); margin-top: 10px; line-height: 1.55; }
        @media (max-width: 800px) {
          .trip-layout { grid-template-columns: 1fr; }
        }
      `}</style>
    </main>
  );
}
