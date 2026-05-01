FROM python:3.11-slim

# System deps for OpenCV headless + general build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (cache-friendly layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directories for outputs and models
RUN mkdir -p outputs models

# Expose port — Render sets $PORT automatically
EXPOSE 10000

# Start the server
# Render injects $PORT; default to 10000 if not set
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]
