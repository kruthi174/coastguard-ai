"""
Explainable Coastal Risk Intelligence Endpoints
"""

from typing import Any, Dict, List
from fastapi import APIRouter
from database.database import get_db_connection
from ml_engine.risk_scorer import RISK_DISCLAIMER, calculate_explainable_risk

router = APIRouter(prefix="/api/risk", tags=["Risk Intelligence"])

COASTAL_SECTOR_COORDINATES = {
    "Gujarat": {"lat": 21.7000, "lon": 70.0000},
    "Maharashtra": {"lat": 18.5000, "lon": 72.8000},
    "Goa": {"lat": 15.4000, "lon": 73.8000},
    "Karnataka": {"lat": 13.5000, "lon": 74.7000},
    "Kerala": {"lat": 9.9000, "lon": 76.3000},
    "Tamil Nadu": {"lat": 11.0000, "lon": 79.8000},
    "Andhra Pradesh": {"lat": 16.5000, "lon": 82.0000},
    "Odisha": {"lat": 20.0000, "lon": 86.0000},
    "West Bengal": {"lat": 21.7000, "lon": 87.8000}
}


@router.get("/zones")
def get_coastal_risk_zones():
    """
    Compute explainable 0-100 risk indices for all 9 Indian coastal states/sectors
    based on active crowdsourced incidents.
    """
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("""
    SELECT id, incident_id, hazard_category, description, location_name,
           state, latitude, longitude, severity, status, reported_at, image_url
    FROM incidents
    WHERE status != 'Rejected'
    """)
    all_incidents = [dict(r) for r in c.fetchall()]
    conn.close()

    # Group incidents by state
    state_incidents: Dict[str, List[Dict[str, Any]]] = {}
    for state in COASTAL_SECTOR_COORDINATES.keys():
        state_incidents[state] = []

    for inc in all_incidents:
        st = inc.get("state")
        if st in state_incidents:
            state_incidents[st].append(inc)

    zones_output = []
    for state, coords in COASTAL_SECTOR_COORDINATES.items():
        inc_list = state_incidents.get(state, [])
        risk_data = calculate_explainable_risk(inc_list, zone_name=f"{state} Coastal Zone")
        risk_data["state"] = state
        risk_data["center_latitude"] = coords["lat"]
        risk_data["center_longitude"] = coords["lon"]
        zones_output.append(risk_data)

    # Sort descending by risk score
    zones_output.sort(key=lambda x: x["risk_score"], reverse=True)

    return {
        "total_zones": len(zones_output),
        "disclaimer": RISK_DISCLAIMER,
        "methodology": {
            "frequency_weight": "25% (Volume of crowdsourced reports)",
            "severity_weight": "30% (Weighted peak & average severity)",
            "recency_weight": "20% (Exponential decay over time)",
            "density_weight": "15% (Spatial proximity & clustering concentration)",
            "evidence_weight": "10% (Verified status & photo documentation)"
        },
        "zones": zones_output
    }


@router.get("/explain/{state}")
def get_state_risk_explanation(state: str):
    """Get deep explainable breakdown for a specific coastal state."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
    SELECT id, incident_id, hazard_category, description, location_name,
           state, latitude, longitude, severity, status, reported_at, image_url
    FROM incidents
    WHERE state = ? AND status != 'Rejected'
    """, (state,))
    incidents = [dict(r) for r in c.fetchall()]
    conn.close()

    coords = COASTAL_SECTOR_COORDINATES.get(state, {"lat": 15.0, "lon": 75.0})
    risk_data = calculate_explainable_risk(incidents, zone_name=f"{state} Coastal Zone")
    risk_data["state"] = state
    risk_data["center_latitude"] = coords["lat"]
    risk_data["center_longitude"] = coords["lon"]
    risk_data["incidents"] = incidents
    return risk_data
