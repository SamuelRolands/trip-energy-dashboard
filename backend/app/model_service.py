"""Loads the real trained model and turns simplified dashboard inputs into
the full 42-feature vector it actually expects.

The model was trained on 42 engineered features (route geometry, road
context, vehicle metadata, driving dynamics) - far too many to expose as
raw form fields to a dashboard user. Rather than inventing arbitrary
default values, every "simple" input below (vehicle class, route type,
terrain, driving style) maps to a preset feature vector computed from real
quantiles of the actual training data (see scripts/gen_dashboard_data.py
in the main project for how input_presets.json was built - each preset is
a real median from a real tercile of real trips, not a guess).
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd

from . import greybox  # noqa: F401 - required so unpickling greybox_model.joblib resolves

DATA_DIR = Path(__file__).parent / "data"

_model_bundle = joblib.load(DATA_DIR / "final_model.joblib")
MODEL = _model_bundle["model"]
FEATURE_COLUMNS: list[str] = _model_bundle["feature_columns"]

_greybox_bundle = joblib.load(DATA_DIR / "greybox_model.joblib")
GREYBOX_MODEL = _greybox_bundle["model"]
GREYBOX_FEATURE_COLUMNS: list[str] = _greybox_bundle["feature_columns"]

with open(DATA_DIR / "input_presets.json") as f:
    _presets_raw = json.load(f)
PRESETS = _presets_raw["presets"]
TRANSMISSION_BY_CLASS = _presets_raw["transmission_by_class"]

with open(DATA_DIR / "fleet_stats.json") as f:
    FLEET_STATS = json.load(f)

# Known model error, from the real final holdout evaluation (Stage 8) -
# used to build an honest +/- range around a prediction rather than
# presenting a single number as if it were exact. Each model gets its own
# figure since they are not equally accurate (Extra Trees is the stronger
# of the two - see the Model Performance page).
KNOWN_MAE_KWH = {"extra_trees": 0.4218, "physics_hybrid": 0.433}


def build_feature_vector(
    powertrain: str,
    distance_km: float,
    vehicle_class: str,
    route_type: str,
    terrain: str,
    driving_style: str,
    feature_columns: list[str] | None = None,
    terrain_override: dict | None = None,
) -> pd.DataFrame:
    """Assemble one full 42-column feature row from the simplified inputs.

    `terrain_override` (elevation/gradient values computed from a real
    routed path - see route_features.py) takes precedence over the
    `terrain` preset when supplied, for map-based input. Road-context
    values (speed limits, intersections) still come from the `route_type`
    preset either way - those aren't derivable from a route alone.
    """
    vehicle = PRESETS["vehicle"][vehicle_class]
    route = PRESETS["route"][route_type]
    terr = PRESETS["terrain"][terrain]
    style = PRESETS["style"][driving_style]
    ov = terrain_override or {}

    avg_speed_kmh = style["avg_speed_kmh"]
    duration_min = (distance_km / avg_speed_kmh) * 60.0 if avg_speed_kmh > 0 else 10.0
    duration_s = duration_min * 60.0

    row = {
        "distance_km": distance_km,
        "elevation_gain_m": ov.get("elevation_gain_m", terr["elevation_gain_m"]),
        "elevation_loss_m": ov.get("elevation_loss_m", terr["elevation_loss_m"]),
        "gradient_mean": ov.get("gradient_mean", terr["gradient_mean"]),
        "gradient_std": ov.get("gradient_std", terr["gradient_std"]),
        "gradient_p10": ov.get("gradient_p10", terr["gradient_p10"]),
        "gradient_p90": ov.get("gradient_p90", terr["gradient_p90"]),
        "gradient_abs_mean": ov.get("gradient_abs_mean", terr["gradient_abs_mean"]),
        "speed_limit_mean_kmh": route["speed_limit_mean_kmh"],
        "speed_limit_std_kmh": route["speed_limit_std_kmh"],
        "speed_limit_min_kmh": route["speed_limit_min_kmh"],
        "speed_limit_max_kmh": route["speed_limit_max_kmh"],
        "intersections_per_km": route["intersections_per_km"],
        "bus_stops_per_km": route["bus_stops_per_km"],
        "traffic_signal_count": route["traffic_signal_count"],
        "stop_sign_count": route["stop_sign_count"],
        "powertrain_type": powertrain,
        "vehicle_weight_kg": vehicle["vehicle_weight_kg"],
        "engine_cylinders": vehicle["engine_cylinders"],
        "engine_displacement_l": vehicle["engine_displacement_l"],
        "engine_is_turbo": vehicle["engine_is_turbo"],
        "transmission_group": TRANSMISSION_BY_CLASS.get(vehicle_class, "unknown"),
        "duration_s": duration_s,
        "avg_speed_kmh": avg_speed_kmh,
        "speed_mean_kmh": avg_speed_kmh,
        "speed_max_kmh": route["speed_limit_max_kmh"] * 1.05,
        "speed_std_kmh": style["speed_std_kmh"],
        "speed_p25_kmh": style["speed_p25_kmh"],
        "speed_p50_kmh": style["speed_p50_kmh"],
        "speed_p75_kmh": style["speed_p75_kmh"],
        "stop_count": round(style["stops_per_km"] * distance_km),
        "stops_per_km": style["stops_per_km"],
        "idle_time_s": style["idle_fraction"] * duration_s,
        "idle_fraction": style["idle_fraction"],
        "accel_mean_ms2": style["accel_mean_ms2"],
        "accel_std_ms2": style["accel_std_ms2"],
        "positive_accel_mean_ms2": style["positive_accel_mean_ms2"],
        "negative_accel_mean_ms2": style["negative_accel_mean_ms2"],
        "harsh_accel_count": style["harsh_accel_count"],
        "harsh_decel_count": style["harsh_decel_count"],
        "positive_ke_sum": style["positive_ke_per_km"] * distance_km,
        "positive_ke_per_km": style["positive_ke_per_km"],
    }

    columns = feature_columns if feature_columns is not None else FEATURE_COLUMNS
    missing = set(columns) - set(row.keys())
    if missing:
        raise ValueError(f"build_feature_vector is missing columns the model expects: {missing}")

    return pd.DataFrame([row])[columns]


def predict(
    powertrain: str,
    distance_km: float,
    vehicle_class: str,
    route_type: str,
    terrain: str,
    driving_style: str,
    model_choice: str = "extra_trees",
    terrain_override: dict | None = None,
) -> dict:
    """Run a real prediction through a real trained model.

    Two models are offered: Extra Trees (the strongest performer overall -
    see Model Performance) and the physics-informed grey-box hybrid, which
    trades a little accuracy for a breakdown of *why* - five physical
    mechanisms with non-negative, inspectable coefficients. Extra Trees is
    the default; the hybrid is opt-in.

    Only ICE and HEV are routed to a live model, regardless of which one is
    chosen - PHEV's target measures battery draw only, not total trip
    energy, and EV has too few vehicles (3) to support any per-trip claim.
    Both are handled honestly by returning fleet-average descriptive
    statistics instead of a fabricated per-trip number.
    """
    if powertrain in ("PHEV", "EV"):
        stats = FLEET_STATS[powertrain]
        return {
            "mode": "descriptive",
            "powertrain": powertrain,
            "reason": (
                "PHEV energy figures measure battery draw only, not total trip "
                "energy - not directly comparable to a per-trip prediction."
                if powertrain == "PHEV"
                else "Only 3 electric vehicles exist in the dataset - too few to "
                "support a reliable per-trip prediction for an unseen vehicle."
            ),
            "fleet_mean_kwh": stats["mean_kwh"],
            "fleet_median_kwh": stats["median_kwh"],
            "n_vehicles": stats["n_vehicles"],
            "n_trips": stats["n_trips"],
        }

    mae = KNOWN_MAE_KWH[model_choice]

    if model_choice == "physics_hybrid":
        X = build_feature_vector(
            powertrain, distance_km, vehicle_class, route_type, terrain, driving_style,
            feature_columns=GREYBOX_FEATURE_COLUMNS, terrain_override=terrain_override,
        )
        predicted_kwh = float(GREYBOX_MODEL.predict(X)[0])
        shares = greybox.physics_contribution_shares(GREYBOX_MODEL.physics_, X)
        breakdown = [
            {
                "term": row["term"],
                "meaning": row["meaning"],
                "share": round(float(row["share_of_predicted_energy"]), 4),
                "kwh": round(float(row["total_kwh"]), 3),
            }
            for _, row in shares.iterrows()
        ]
    else:
        X = build_feature_vector(
            powertrain, distance_km, vehicle_class, route_type, terrain, driving_style,
            terrain_override=terrain_override,
        )
        predicted_kwh = float(MODEL.predict(X)[0])
        breakdown = None

    result = {
        "mode": "prediction",
        "model": model_choice,
        "powertrain": powertrain,
        "predicted_kwh": round(predicted_kwh, 3),
        "range_low_kwh": round(max(0.0, predicted_kwh - mae), 3),
        "range_high_kwh": round(predicted_kwh + mae, 3),
        "known_mae_kwh": mae,
        "confidence": "high",
    }
    if breakdown is not None:
        result["physics_breakdown"] = breakdown
    return result
