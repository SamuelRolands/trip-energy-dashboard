# Trip Energy Dashboard

Live demo of a trip-level energy consumption model, trained on the extended
Vehicle Energy Dataset (eVED) across ICE, HEV, PHEV, and EV powertrains.

- `backend/` - FastAPI service serving the trained model and pre-computed
  validation results. The trained model (`final_model.joblib`, ~355MB) is
  attached as a GitHub Release asset rather than committed to git, and is
  downloaded during the Render build step (see `backend/build.sh`).
- `frontend/` - React + Vite + Plotly dashboard.

This repo contains only the dashboard application. The full modelling
pipeline, data processing scripts, and methodology documentation live in a
separate project repo.
