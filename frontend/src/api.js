import axios from "axios";

// In production this is set to the deployed Render URL at build time
// (see .env.production). In development it falls back to the local
// backend, so `npm run dev` works against `uvicorn app.main:app` running
// on localhost without any extra configuration.
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const client = axios.create({ baseURL: API_BASE, timeout: 20000 });

export const api = {
  modelComparison: () => client.get("/api/model-comparison").then((r) => r.data),
  finalResults: () => client.get("/api/final-results").then((r) => r.data),
  featureImportance: () => client.get("/api/feature-importance").then((r) => r.data),
  skillProgression: () => client.get("/api/skill-progression").then((r) => r.data),
  fleetStats: () => client.get("/api/fleet-stats").then((r) => r.data),
  sampleTrips: () => client.get("/api/sample-trips").then((r) => r.data),
  sampleTripDetail: (vehId, tripId) =>
    client.get(`/api/sample-trips/${vehId}/${tripId}`).then((r) => r.data),
  inputOptions: () => client.get("/api/input-options").then((r) => r.data),
  predict: (payload) => client.post("/api/predict", payload).then((r) => r.data),
};

// A validated categorical palette (CVD-checked against this app's dark
// surface via the dataviz skill's validator) - fixed assignment, never
// reshuffled: ICE=blue, HEV=aqua, PHEV=amber, EV=green.
export const PALETTE = {
  blue: "#3987e5",
  aqua: "#199e70",
  orange: "#c98500",
  green: "#008300",
  red: "#e66767",
  grey: "#6b7488",
  text: "#eef1f6",
  textSecondary: "#a3adc2",
  bg1: "#11151d",
  bg2: "#171c26",
  border: "#2a3140",
};

export const POWERTRAIN_COLOR = {
  ICE: PALETTE.blue,
  HEV: PALETTE.aqua,
  PHEV: PALETTE.orange,
  EV: PALETTE.green,
};

export const POWERTRAIN_TONE = {
  ICE: "blue",
  HEV: "aqua",
  PHEV: "orange",
  EV: "green",
};
