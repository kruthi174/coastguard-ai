"""
System Administration & Audit Endpoints
"""

from typing import Optional
from fastapi import APIRouter, Header, HTTPException, Query
from backend.config import ADMIN_SECRET_KEY
from database.database import get_db_connection, inspect_database_status, seed_database_safely

router = APIRouter(prefix="/api/admin", tags=["Administration"])


@router.get("/audit-logs")
def get_audit_logs(limit: int = Query(50, ge=1, le=200)):
    """Retrieve system security and operational audit logs."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return {"total": len(rows), "logs": rows}


@router.get("/system-status")
def get_system_status():
    """Retrieve database, machine learning model parameters, and storage health."""
    db_status = inspect_database_status()
    return {
        "status": "Operational",
        "system_name": "CoastGuard AI Intelligence Hub",
        "database": db_status,
        "ml_engine": {
            "clustering_algorithm": "DBSCAN (Haversine Distance Metric)",
            "duplicate_detector": "TF-IDF Vectorizer + Cosine Similarity + Spatio-temporal Filter",
            "risk_engine": "Explainable 5-Factor Risk Scorer (0-100)"
        },
        "roles_available": [
            {"role": "Citizen", "permissions": ["Submit Reports", "View Public Map", "View Alerts"]},
            {"role": "Disaster Management Officer", "permissions": ["All Citizen Rights", "Run AI Clustering", "Verify Incidents", "Review Duplicates"]},
            {"role": "Administrator", "permissions": ["Full System Control", "Audit Logs", "System Configuration", "Data Management"]}
        ]
    }


@router.post("/refresh-demo-data")
def refresh_demonstration_data(x_admin_secret: Optional[str] = Header(None)):
    """
    Safely refresh synthetic demonstration incidents.
    Strictly preserves all user-submitted citizen reports.
    Protected by optional X-Admin-Secret header if ADMIN_SECRET_KEY is configured.
    """
    if ADMIN_SECRET_KEY and ADMIN_SECRET_KEY != "coastguard-admin-default-key":
        if x_admin_secret != ADMIN_SECRET_KEY:
            raise HTTPException(status_code=403, detail="Invalid admin secret key.")

    res = seed_database_safely(allow_reset_demo_only=True)
    return res
