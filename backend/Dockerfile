# ── Backend Dockerfile ────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (needed for asyncpg, psycopg2, etc.)
RUN apt-get update && apt-get install -y gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Copy uv binary for ultra-fast installs
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy requirements and install them (cached layer unless requirements change)
COPY requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt

# Set Hugging Face cache directory so it persists in the image
ENV HF_HOME=/app/.cache/huggingface

# Pre-download the SBERT model into the Docker image layer to avoid Cloud Run cold starts
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy the rest of the application code
COPY . .

# Create a non-root user for security
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Cloud Run compatibility: bind to the port defined by the PORT environment variable
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2"]