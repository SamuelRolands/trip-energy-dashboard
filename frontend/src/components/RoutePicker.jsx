import { useState } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../api";

// Ann Arbor, MI - the region the training fleet actually drove in. Panning
// elsewhere still works (OSRM/Open-Elevation are global services), this is
// just a sensible starting view.
const DEFAULT_CENTER = [42.2808, -83.743];

function ClickHandler({ onClick }) {
  useMapEvents({ click: (e) => onClick([e.latlng.lat, e.latlng.lng]) });
  return null;
}

export default function RoutePicker({ onRouteComputed, onClear }) {
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [path, setPath] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);

  async function handleMapClick(point) {
    if (!start || (start && end)) {
      // Fresh start (either the very first click, or starting over after a
      // completed route).
      setStart(point);
      setEnd(null);
      setPath(null);
      setSummary(null);
      setError(null);
      onClear?.();
      return;
    }
    // Second click: we have a start, now compute the route to here.
    setEnd(point);
    setLoading(true);
    setError(null);
    try {
      const data = await api.routeFeatures({
        start_lat: start[0], start_lon: start[1],
        end_lat: point[0], end_lon: point[1],
      });
      setPath(data.path);
      setSummary(data);
      onRouteComputed(data);
    } catch (e) {
      setError(
        e.response?.status === 422
          ? "No drivable route found between these points — try two points on a real road network."
          : "Couldn't reach the routing service. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStart(null);
    setEnd(null);
    setPath(null);
    setSummary(null);
    setError(null);
    onClear?.();
  }

  return (
    <div className="route-picker">
      <p className="route-picker-hint">
        {!start
          ? "Click a starting point on the map."
          : !end
          ? "Now click a destination."
          : loading
          ? "Computing the route…"
          : "Route computed — click anywhere to start over."}
      </p>
      <div className="route-picker-map">
        <MapContainer center={DEFAULT_CENTER} zoom={13} scrollWheelZoom={true} style={{ height: "280px", width: "100%", borderRadius: "12px" }}>
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
          />
          <ClickHandler onClick={handleMapClick} />
          {start && <CircleMarker center={start} radius={7} pathOptions={{ color: "#34a853", fillColor: "#34a853", fillOpacity: 1 }} />}
          {end && <CircleMarker center={end} radius={7} pathOptions={{ color: "#ea4335", fillColor: "#ea4335", fillOpacity: 1 }} />}
          {path && <Polyline positions={path} pathOptions={{ color: "#4285f4", weight: 4, opacity: 0.85 }} />}
        </MapContainer>
      </div>

      {error && <p className="error-text">{error}</p>}

      {summary && (
        <div className="route-summary">
          <div className="route-summary-item">
            <span className="route-summary-label">Distance</span>
            <span className="route-summary-value">{summary.distance_km} km</span>
          </div>
          <div className="route-summary-item">
            <span className="route-summary-label">Elevation gain</span>
            <span className="route-summary-value">+{summary.elevation_gain_m} m</span>
          </div>
          <div className="route-summary-item">
            <span className="route-summary-label">Elevation loss</span>
            <span className="route-summary-value">−{summary.elevation_loss_m} m</span>
          </div>
        </div>
      )}

      {(start || end) && (
        <button type="button" className="btn btn-secondary route-reset-btn" onClick={reset}>
          Clear points
        </button>
      )}

      <p className="route-picker-note">
        Distance and elevation come from your actual route. Road detail like speed
        limits still uses a "Mixed road" assumption — that needs a further data
        source this demo doesn't call.
      </p>

      <style>{`
        .route-picker-hint { font-size: 13px; color: var(--text-secondary); margin: 0 0 10px; }
        .route-picker-map { border-radius: 12px; overflow: hidden; }
        .route-summary { display: flex; gap: 20px; margin-top: 14px; flex-wrap: wrap; }
        .route-summary-item { display: flex; flex-direction: column; gap: 2px; }
        .route-summary-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .route-summary-value { font-family: var(--font-mono); font-weight: 700; font-size: 14px; color: var(--text-primary); }
        .route-reset-btn { margin-top: 12px; padding: 8px 14px; font-size: 13px; }
        .route-picker-note { font-size: 11.5px; color: var(--text-muted); line-height: 1.5; margin-top: 12px; }
      `}</style>
    </div>
  );
}
