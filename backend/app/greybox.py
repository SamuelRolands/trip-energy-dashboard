"""Vendored, inference-only copy of the physics-informed grey-box hybrid.

This is a deliberate copy, not an import, of src/vecp/greybox.py from the
main project - the dashboard backend has no dependency on that package, so
this module is trimmed to what serving a prediction actually needs:
`predict()`, `coefficient_table()`, and `physics_contribution_shares()`.
`fit()` is kept (scipy imported lazily inside it, not at module level) only
so this stays a faithful copy; the deployed backend never calls it - the
bundle it loads was already fitted (see scripts/gen_greybox_bundle.py in the
main project) and only needs unpickling.

Class names and attributes must match the original exactly - joblib/pickle
restores instances by module path + class name, then repopulates their
__dict__ directly.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, RegressorMixin, clone

PHYSICS_TERMS: dict[str, str] = {
    "rolling": "Rolling resistance and drivetrain losses: proportional to mass x distance.",
    "potential": "Climbing: proportional to mass x cumulative elevation gain.",
    "kinetic": "Acceleration work: proportional to mass x summed positive changes in v^2.",
    "aerodynamic": "Air resistance: work rises with speed squared over distance.",
    "idle": "Fuel burned while stationary with the engine running.",
}


def build_physics_matrix(X: pd.DataFrame, mass_fill_kg: float) -> pd.DataFrame:
    mass_kg = X["vehicle_weight_kg"].fillna(mass_fill_kg)
    matrix = pd.DataFrame(index=X.index)
    matrix["rolling"] = mass_kg * X["distance_km"]
    matrix["potential"] = mass_kg * X["elevation_gain_m"]
    matrix["kinetic"] = mass_kg * X["positive_ke_sum"]
    matrix["aerodynamic"] = X["distance_km"] * (X["avg_speed_kmh"] ** 2)
    matrix["idle"] = X["idle_time_s"]
    return matrix


class PhysicsBaseline(BaseEstimator, RegressorMixin):
    def __init__(self) -> None:
        self.coefficients_: np.ndarray | None = None
        self.term_names_: list[str] = []
        self.scales_: np.ndarray | None = None
        self.mass_fill_kg_: float = 1500.0

    def fit(self, X: pd.DataFrame, y: np.ndarray) -> "PhysicsBaseline":
        from scipy.optimize import nnls  # lazy: only needed for training, never at inference

        self.mass_fill_kg_ = float(
            X["vehicle_weight_kg"].median()
            if X["vehicle_weight_kg"].notna().any()
            else 1500.0
        )
        matrix = build_physics_matrix(X, self.mass_fill_kg_)
        self.term_names_ = list(matrix.columns)
        values = matrix.to_numpy(dtype=float)
        values = np.nan_to_num(values, nan=0.0, posinf=0.0, neginf=0.0)
        self.scales_ = np.where(
            np.abs(values).max(axis=0) > 0, np.abs(values).max(axis=0), 1.0
        )
        scaled = values / self.scales_
        target = np.nan_to_num(np.asarray(y, dtype=float), nan=0.0)
        coefficients, _ = nnls(scaled, target)
        self.coefficients_ = coefficients
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        if self.coefficients_ is None:
            raise RuntimeError("PhysicsBaseline must be fitted before predict().")
        matrix = build_physics_matrix(X, self.mass_fill_kg_)
        values = np.nan_to_num(
            matrix.to_numpy(dtype=float), nan=0.0, posinf=0.0, neginf=0.0
        )
        return (values / self.scales_) @ self.coefficients_

    def coefficient_table(self) -> pd.DataFrame:
        if self.coefficients_ is None:
            raise RuntimeError("PhysicsBaseline must be fitted first.")
        return pd.DataFrame(
            {
                "term": self.term_names_,
                "coefficient_scaled": self.coefficients_,
                "meaning": [PHYSICS_TERMS[t] for t in self.term_names_],
            }
        )


class PhysicsInformedGreyBox(BaseEstimator, RegressorMixin):
    def __init__(self, residual_model=None, n_inner_folds: int = 5, random_state: int = 42):
        self.residual_model = residual_model
        self.n_inner_folds = n_inner_folds
        self.random_state = random_state

    def fit(self, X: pd.DataFrame, y: np.ndarray) -> "PhysicsInformedGreyBox":
        from sklearn.model_selection import KFold  # lazy: training-only

        X = X.reset_index(drop=True)
        y = np.asarray(y, dtype=float)
        out_of_fold_prediction = np.zeros(len(X), dtype=float)
        inner_cv = KFold(
            n_splits=self.n_inner_folds, shuffle=True, random_state=self.random_state
        )
        for inner_train_idx, inner_test_idx in inner_cv.split(X):
            fold_baseline = PhysicsBaseline().fit(
                X.iloc[inner_train_idx], y[inner_train_idx]
            )
            out_of_fold_prediction[inner_test_idx] = fold_baseline.predict(
                X.iloc[inner_test_idx]
            )
        residuals = y - out_of_fold_prediction
        self.physics_ = PhysicsBaseline().fit(X, y)
        if self.residual_model is None:
            raise ValueError("residual_model must be provided.")
        self.residual_ = clone(self.residual_model).fit(X, residuals)
        self.physics_only_prediction_ = self.physics_.predict(X)
        return self

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        physics_prediction = self.physics_.predict(X)
        residual_prediction = self.residual_.predict(X)
        return physics_prediction + residual_prediction

    def predict_physics_only(self, X: pd.DataFrame) -> np.ndarray:
        return self.physics_.predict(X)

    def coefficient_table(self) -> pd.DataFrame:
        return self.physics_.coefficient_table()


def physics_contribution_shares(
    baseline: PhysicsBaseline, X: pd.DataFrame
) -> pd.DataFrame:
    matrix = build_physics_matrix(X, baseline.mass_fill_kg_)
    values = np.nan_to_num(matrix.to_numpy(dtype=float), nan=0.0)
    scaled = values / baseline.scales_
    per_term_energy = scaled * baseline.coefficients_
    totals = per_term_energy.sum(axis=0)
    grand_total = totals.sum()
    return pd.DataFrame(
        {
            "term": baseline.term_names_,
            "total_kwh": totals,
            "share_of_predicted_energy": totals / grand_total if grand_total else np.nan,
            "meaning": [PHYSICS_TERMS[t] for t in baseline.term_names_],
        }
    ).sort_values("share_of_predicted_energy", ascending=False)
