"""Turns two map coordinates into real route features.

Two things are computed honestly here, from real routing/elevation data:
distance and the elevation/gradient profile. Road-context detail (speed
limits, intersection density) is NOT computable from a route alone without
a further data source (OpenStreetMap's Overpass API), so those columns
keep using the "Mixed" route-type preset regardless - see model_service.py.
Driving-behaviour features (speed achieved, harsh braking, idle time) stay
on the manual "Driving style" input for the same reason: they describe how
a trip was driven, not a property of the road itself.

Uses OSRM's public demo routing server and Open-Elevation's public API -
both free, no key required. Both are third-party services outside this
project's control, so failures are caught and surfaced as a clear error
rather than a stack trace.
"""

from __future__ import annotations

import math

import requests

OSRM_URL = "http://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}"
ELEVATION_URL = "https://api.open-elevation.com/api/v1/lookup"
MAX_ELEVATION_SAMPLES = 25


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6_371_000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def compute_route_features(start_lat: float, start_lon: float, end_lat: float, end_lon: float) -> dict:
    url = OSRM_URL.format(lon1=start_lon, lat1=start_lat, lon2=end_lon, lat2=end_lat)
    resp = requests.get(url, params={"overview": "full", "geometries": "geojson"}, timeout=12)
    resp.raise_for_status()
    data = resp.json()
    if data.get("code") != "Ok" or not data.get("routes"):
        raise ValueError("No drivable route found between these two points.")

    route = data["routes"][0]
    distance_km = route["distance"] / 1000.0
    duration_min = route["duration"] / 60.0
    coords = route["geometry"]["coordinates"]  # [[lon, lat], ...]

    step = max(1, len(coords) // MAX_ELEVATION_SAMPLES)
    sample_coords = coords[::step]
    if sample_coords[-1] != coords[-1]:
        sample_coords.append(coords[-1])

    locations = [{"latitude": lat, "longitude": lon} for lon, lat in sample_coords]
    er = requests.post(ELEVATION_URL, json={"locations": locations}, timeout=15)
    er.raise_for_status()
    elevations = [pt["elevation"] for pt in er.json()["results"]]

    gain = loss = 0.0
    gradients: list[float] = []
    for i in range(1, len(elevations)):
        d_elev = elevations[i] - elevations[i - 1]
        lon1, lat1 = sample_coords[i - 1]
        lon2, lat2 = sample_coords[i]
        dist_m = _haversine_m(lat1, lon1, lat2, lon2)
        if d_elev > 0:
            gain += d_elev
        else:
            loss += -d_elev
        if dist_m > 1:
            gradients.append(d_elev / dist_m)

    def percentile(values: list[float], p: float) -> float:
        if not values:
            return 0.0
        s = sorted(values)
        k = (len(s) - 1) * (p / 100)
        f, c = math.floor(k), math.ceil(k)
        if f == c:
            return s[int(k)]
        return s[f] + (s[c] - s[f]) * (k - f)

    abs_gradients = [abs(g) for g in gradients]

    return {
        "distance_km": round(distance_km, 3),
        "duration_min": round(duration_min, 2),
        "elevation_gain_m": round(gain, 2),
        "elevation_loss_m": round(loss, 2),
        "gradient_mean": round(sum(gradients) / len(gradients), 5) if gradients else 0.0,
        "gradient_std": round(
            math.sqrt(sum((g - sum(gradients) / len(gradients)) ** 2 for g in gradients) / len(gradients)), 5
        ) if gradients else 0.0,
        "gradient_p10": round(percentile(gradients, 10), 5),
        "gradient_p90": round(percentile(gradients, 90), 5),
        "gradient_abs_mean": round(sum(abs_gradients) / len(abs_gradients), 5) if abs_gradients else 0.0,
        "path": [[lat, lon] for lon, lat in coords],
    }
