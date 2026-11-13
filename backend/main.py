"""
COASTGUARD AI — Crowdsourced Coastal Hazard Intelligence & Incident Clustering
FastAPI Application Entrypoint
Supports unified full-stack serving (React Frontend + REST API + ML Engine)
Production-ready for online deployment on Render & Cloud Providers
"""

import os
import sys
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.config import APP_DESCRIPTION, APP_NAME, APP_VERSION, CORS_ORIGINS, UPLOAD_DIR
from backend.routes import admin, alerts, analytics, clusters, incidents, risk, verification
from database.database import init_db, seed_database_safely

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description=APP_DESCRIPTION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for evidence uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Include API Routers under /api
app.include_router(incidents.router)
app.include_router(clusters.router)
app.include_router(risk.router)
app.include_router(verification.router)
app.include_router(alerts.router)
app.include_router(analytics.router)
app.include_router(admin.router)

# Mount compiled production frontend if exists
FRONTEND_DIST = ROOT_DIR / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="static_assets")


@app.on_event("startup")
def on_startup():
    """Ensure database tables and baseline demonstration dataset are initialized safely."""
    init_db()
    seed_database_safely(allow_reset_demo_only=False)


# Primary Render Health Check Endpoint
@app.get("/health")
@app.get("/api/health")
def health_check():
    """System health check endpoint for Render platform and uptime monitors."""
    return {
        "status": "healthy",
        "app": APP_NAME,
        "version": APP_VERSION,
        "environment": os.environ.get("RENDER", "local") if "RENDER" in os.environ else "production"
    }


# Single-Page Application (SPA) Client-Side Route Handler
# Ensures requests to /, /map, /report, /incidents, /clustering, etc. serve index.html
@app.get("/{full_path:path}")
async def serve_spa_frontend(request: Request, full_path: str):
    # Don't intercept API routes or documentation
    if full_path.startswith("api/") or full_path.startswith("uploads/"):
        return JSONResponse(status_code=404, content={"detail": f"Path '{full_path}' not found."})

    # Serve specific static file if it exists in frontend/dist (e.g. vite.svg, favicon)
    if FRONTEND_DIST.exists():
        target_file = FRONTEND_DIST / full_path
        if full_path and target_file.is_file():
            return FileResponse(target_file)
        # Otherwise serve index.html for React SPA client routing
        index_file = FRONTEND_DIST / "index.html"
        if index_file.exists():
            return FileResponse(index_file)

    return JSONResponse({
        "app": APP_NAME,
        "status": "Backend Online",
        "message": "Frontend distribution not found. Run 'npm --prefix frontend run build' to generate static assets.",
        "docs": "/api/docs"
    })


if __name__ == "__main__":
    import uvicorn
    # Render binds dynamic port via PORT environment variable, listens on all interfaces (0.0.0.0)
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"[*] Starting {APP_NAME} on http://{host}:{port}")
    uvicorn.run("backend.main:app", host=host, port=port, reload=False)
