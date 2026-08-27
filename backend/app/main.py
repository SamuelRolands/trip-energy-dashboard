"""API for the Vehicle Trip Energy Prediction dashboard.

Every GET endpoint here serves a JSON file produced by the main project's
own analysis pipeline (see scripts/gen_dashboard_data.py) - no numbers are
computed or invented here, only read and returned. /api/predict is the one
endpoint that does real work: it runs an actual prediction through the
actual trained model.
"""

from __future__ import annotations

import json
from pathlib import Path

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import model_service, route_features

DATA_DIR = Path(__file__).parent / "data"

app = FastAPI(title="Vehicle Trip Energy Prediction API")

# The frontend is hosted on a different domain (Vercel) than this API
# (Render), so CORS must explicitly allow it. Open to any origin: this is a
# read-mostly demo API with no authentication or user data, so the usual
# risk a strict CORS policy guards against does not apply here.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def _load_json(filename: str):
    with open(DATA_DIR / filename) as f:
        return json.load(f)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/model-comparison")
def model_comparison():
    """10-fold cross-validation results, all 8 models, full feature set."""
    return _load_json("model_comparison.json")


@app.get("/api/final-results")
def final_results():
    """Final one-time evaluation on the 57 sealed holdout vehicles."""
    return _load_json("final_results.json")


@app.get("/api/feature-importance")
def feature_importance():
    """Permutation importance, computed on the held-out vehicles."""
    return _load_json("feature_importance.json")


@app.get("/api/skill-progression")
def skill_progression():
    """Skill score as each feature family is added, F1 through F6."""
    return _load_json("skill_progression.json")


@app.get("/api/fleet-stats")
def fleet_stats():
    """Descriptive statistics by powertrain, including PHEV/EV."""
    return _load_json("fleet_stats.json")


@app.get("/api/sample-trips")
def sample_trips_list():
    """Metadata for the 12 curated real trips (no GPS path - list view)."""
    trips = _load_json("sample_trips.json")
    return [{k: v for k, v in t.items() if k != "path"} for t in trips]


@app.get("/api/sample-trips/{veh_id}/{trip_id}")
def sample_trip_detail(veh_id: int, trip_id: int):
    """Full detail for one curated trip, including its real GPS path."""
    trips = _load_json("sample_trips.json")
    for t in trips:
        if t["veh_id"] == veh_id and t["trip_id"] == trip_id:
            return t
    raise HTTPException(status_code=404, detail="Trip not found")


class TerrainOverride(BaseModel):
    elevation_gain_m: float
    elevation_loss_m: float
    gradient_mean: float
    gradient_std: float
    gradient_p10: float
    gradient_p90: float
    gradient_abs_mean: float


class PredictRequest(BaseModel):
    powertrain: str = Field(pattern="^(ICE|HEV|PHEV|EV)$")
    distance_km: float = Field(gt=0, le=200)
    vehicle_class: str = Field(pattern="^(Compact|Mid-size|Large/SUV)$")
    route_type: str = Field(pattern="^(Urban|Mixed|Highway)$")
    terrain: str = Field(pattern="^(Flat|Rolling|Hilly)$")
    driving_style: str = Field(pattern="^(Calm|Normal|Spirited)$")
    model: str = Field(default="extra_trees", pattern="^(extra_trees|physics_hybrid)$")
    terrain_override: TerrainOverride | None = None


@app.post("/api/predict")
def predict(request: PredictRequest):
    """Run a real prediction through a real trained model (ICE/HEV), or
    return honest descriptive fleet statistics (PHEV/EV - see
    model_service.predict for why those two have no live model).

    `model` selects Extra Trees (default, strongest overall) or the
    physics-informed grey-box hybrid (slightly less accurate, but returns
    an inspectable breakdown of five physical energy mechanisms).
    `terrain_override`, when supplied by the map input (see
    /api/route-features), replaces the elevation/gradient values the
    `terrain` preset would otherwise provide.
    """
    return model_service.predict(
        powertrain=request.powertrain,
        distance_km=request.distance_km,
        vehicle_class=request.vehicle_class,
        route_type=request.route_type,
        terrain=request.terrain,
        driving_style=request.driving_style,
        model_choice=request.model,
        terrain_override=request.terrain_override.model_dump() if request.terrain_override else None,
    )


class RouteFeaturesRequest(BaseModel):
    start_lat: float = Field(ge=-90, le=90)
    start_lon: float = Field(ge=-180, le=180)
    end_lat: float = Field(ge=-90, le=90)
    end_lon: float = Field(ge=-180, le=180)


@app.post("/api/route-features")
def route_features_endpoint(request: RouteFeaturesRequest):
    """Compute real routed distance and elevation/gradient profile between
    two map points, via OSRM (routing) and Open-Elevation (elevation) -
    both free, third-party, public services. See route_features.py for
    exactly what is and isn't derived this way.
    """
    try:
        return route_features.compute_route_features(
            request.start_lat, request.start_lon, request.end_lat, request.end_lon
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except requests.RequestException:
        raise HTTPException(
            status_code=503,
            detail="Routing or elevation service is unavailable right now. Please try again.",
        )


@app.get("/api/input-options")
def input_options():
    """The valid choices for each simplified input, for the frontend form."""
    return {
        "powertrain": ["ICE", "HEV", "PHEV", "EV"],
        "vehicle_class": ["Compact", "Mid-size", "Large/SUV"],
        "route_type": ["Urban", "Mixed", "Highway"],
        "terrain": ["Flat", "Rolling", "Hilly"],
        "driving_style": ["Calm", "Normal", "Spirited"],
    }
