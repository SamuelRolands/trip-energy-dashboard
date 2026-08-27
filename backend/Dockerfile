FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN if [ ! -f app/data/final_model.joblib ]; then \
      curl -sL -A "Mozilla/5.0" -o app/data/final_model.joblib \
        https://github.com/SamuelRolands/trip-energy-dashboard/releases/download/model-v1/final_model.joblib; \
    fi

EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
