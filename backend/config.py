"""
Configuration Settings for CoastGuard AI Backend
Production Ready & Render Compatible
"""

import os
import tempfile
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent

# Persistent upload directory
DEFAULT_UPLOAD_DIR = BASE_DIR / "backend" / "uploads"
UPLOAD_DIR = Path(os.environ.get("COASTGUARD_UPLOAD_DIR", str(DEFAULT_UPLOAD_DIR)))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# App Settings
APP_NAME = "COASTGUARD AI"
APP_VERSION = "2.0.0"
APP_DESCRIPTION = "Crowdsourced Coastal Hazard Intelligence and AI Incident Clustering System (Smart India Hackathon)"

# Administrative protection key (optional; if set, required on administrative reset endpoints)
ADMIN_SECRET_KEY = os.environ.get("ADMIN_SECRET_KEY", "coastguard-admin-default-key")

# CORS Origins (configurable via env var, defaults to all/common development origins)
_env_origins = os.environ.get("CORS_ORIGINS")
if _env_origins:
    CORS_ORIGINS = [orig.strip() for orig in _env_origins.split(",") if orig.strip()]
else:
    CORS_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "*"
    ]
