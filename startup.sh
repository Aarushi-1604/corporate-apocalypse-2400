#!/bin/bash
# Azure Web App startup script for Corporate Apocalypse 2400
echo "Starting Corporate Apocalypse 2400..."

# Set port from PORT environment variable provided by Azure (default 8000)
PORT=${PORT:-8000}

# Run database migrations if alembic config is present
if [ -f "apps/api/alembic.ini" ]; then
    echo "Running database migrations..."
    cd apps/api && alembic upgrade head && cd ../..
elif [ -f "alembic.ini" ]; then
    echo "Running database migrations..."
    alembic upgrade head
fi

# Run Uvicorn from apps/api directory or root
if [ -d "apps/api" ]; then
    cd apps/api
    exec python -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
else
    exec python -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
fi
