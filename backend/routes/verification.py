"""
Disaster Management Officer Incident Verification Endpoints
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from backend.schemas import IncidentStatusUpdate
from database.database import get_db_connection
from ml_engine.clustering import haversine_distance_km

router = APIRouter(prefix="/api/verification", tags=["Incident Verification"])


@router.get("/queue")
def get_verification_queue(status: Optional[str] = Query(None)):
    """Fetch incidents awaiting officer inspection or currently under review."""
    conn = get_db_connection()
    c = conn.cursor()

    if status and status != "All":
        c.execute("SELECT * FROM incidents WHERE status = ? ORDER BY reported_at DESC", (status,))
    else:
        c.execute("SELECT * FROM incidents WHERE status IN ('Pending', 'Under Review') ORDER BY reported_at DESC")

    rows = [dict(r) for r in c.fetchall()]
    conn.close()

    for r in rows:
        r["is_demo_data"] = bool(r["is_demo_data"])

    return {"count": len(rows), "queue": rows}


@router.get("/compare/{incident_id}")
def compare_nearby_incidents(incident_id: str, radius_km: float = Query(40.0)):
    """
    Fetch target incident and all geographically adjacent reports (within radius_km)
    for side-by-side verification and corroboration.
    """
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("SELECT * FROM incidents WHERE incident_id = ? OR id = ?", (incident_id, incident_id))
    target = c.fetchone()
    if not target:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")

    target_dict = dict(target)
    target_dict["is_demo_data"] = bool(target_dict["is_demo_data"])
    t_lat = float(target_dict["latitude"])
    t_lon = float(target_dict["longitude"])

    # Fetch all other active incidents
    c.execute("SELECT * FROM incidents WHERE incident_id != ?", (target_dict["incident_id"],))
    candidates = [dict(r) for r in c.fetchall()]
    conn.close()

    nearby = []
    for cand in candidates:
        cand_lat = float(cand["latitude"])
        cand_lon = float(cand["longitude"])
        dist = haversine_distance_km(t_lat, t_lon, cand_lat, cand_lon)
        if dist <= radius_km:
            cand["distance_km"] = round(dist, 2)
            cand["is_demo_data"] = bool(cand["is_demo_data"])
            nearby.append(cand)

    nearby.sort(key=lambda x: x["distance_km"])

    return {
        "target_incident": target_dict,
        "radius_km": radius_km,
        "nearby_count": len(nearby),
        "nearby_incidents": nearby
    }
