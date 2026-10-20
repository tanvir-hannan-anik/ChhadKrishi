# syntax=docker/dockerfile:1
# ChhadKrishi ML service: Microsoft neural TTS (edge-tts) + OpenCV and YOLO (ONNX). CPU only,
# small enough for a 512 MB host. The 44 MB YOLO model ships in models/ (no build-time download).
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 MALLOC_ARENA_MAX=2 CPU_THREADS=1
RUN apt-get update && apt-get install -y --no-install-recommends libglib2.0-0 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
COPY models ./models
RUN useradd --create-home app && chown -R app /app
USER app
# Render injects PORT (10000 by default).
EXPOSE 10000
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-10000} --workers 1"]
