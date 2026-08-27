#!/usr/bin/env bash
set -euo pipefail

pip install -r requirements.txt

MODEL_URL="https://github.com/SamuelRolands/trip-energy-dashboard/releases/download/model-v1/final_model.joblib"
MODEL_PATH="app/data/final_model.joblib"

if [ ! -f "$MODEL_PATH" ]; then
  echo "Downloading trained model from GitHub Releases..."
  curl -L -A "Mozilla/5.0" -o "$MODEL_PATH" "$MODEL_URL"
fi
