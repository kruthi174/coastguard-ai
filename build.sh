#!/usr/bin/env bash
# ==============================================================================
# Render Build Script for CoastGuard AI
# ==============================================================================
set -o errexit

echo "==> Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# If Node.js is available in the environment, rebuild frontend
if command -v npm &> /dev/null; then
  echo "==> Node.js detected. Compiling React frontend..."
  cd frontend
  npm install
  npm run build
  cd ..
else
  echo "==> Using pre-compiled production React distribution from frontend/dist."
fi

echo "==> CoastGuard AI build completed successfully."
