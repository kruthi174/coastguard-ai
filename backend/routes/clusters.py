"""
AI Incident Clustering Endpoints (DBSCAN + Haversine Metric)
"""

import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from backend.schemas import ClusterRunRequest
from database.database import get_db_connection
from ml_engine.clustering import run_coastal_dbscan

router = APIRouter(prefix="/api/clusters", tags=["AI Clustering"])


@router.get("")
def list_clusters():
    """Retrieve all active AI-identified incident clusters."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM clusters ORDER BY risk_score DESC, incident_count DESC")
    rows = [dict(r) for r in c.fetchall()]

    for r in rows:
        if r.get("polygon_hull"):
            try:
                r["polygon_hull"] = json.loads(r["polygon_hull"])
            except Exception:
                r["polygon_hull"] = []
        else:
            r["polygon_hull"] = []

        # Fetch incidents linked to this cluster
        c.execute("""
        SELECT incident_id, hazard_category, location_name, state, severity, status, latitude, longitude
        FROM incidents WHERE cluster_id = ?
        """, (r["cluster_id"],))
        r["incidents"] = [dict(inc) for inc in c.fetchall()]

    conn.close()
    return {"total": len(rows), "clusters": rows}


@router.get("/{cluster_id}")
def get_cluster(cluster_id: str):
    """Retrieve single cluster details and all associated incidents."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM clusters WHERE cluster_id = ? OR id = ?", (cluster_id, cluster_id))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Cluster '{cluster_id}' not found.")

    res = dict(row)
    if res.get("polygon_hull"):
        try:
            res["polygon_hull"] = json.loads(res["polygon_hull"])
        except Exception:
            res["polygon_hull"] = []

    c.execute("SELECT * FROM incidents WHERE cluster_id = ?", (res["cluster_id"],))
    res["incidents"] = [dict(inc) for inc in c.fetchall()]
    conn.close()
    return res


@router.post("/run-dbscan")
def execute_ai_clustering(params: ClusterRunRequest):
    """
    Execute Scikit-Learn DBSCAN clustering with Haversine distance on database incidents.
    Persists clusters and updates incident cluster associations.
    """
    conn = get_db_connection()
    c = conn.cursor()

    # 1. Fetch active incidents from database
    c.execute("""
    SELECT id, incident_id, reporter_name, hazard_category, description,
           location_name, state, latitude, longitude, severity, status,
           reported_at, image_url, is_demo_data
    FROM incidents
    WHERE status != 'Rejected'
    """)
    raw_incidents = [dict(r) for r in c.fetchall()]

    if not raw_incidents:
        conn.close()
        return {
            "success": True,
            "message": "No active incidents available for clustering.",
            "metrics": {"cluster_count": 0, "clustered_count": 0, "noise_count": 0}
        }

    # 2. Run DBSCAN Clustering via ML Engine
    results = run_coastal_dbscan(
        incidents=raw_incidents,
        eps_km=params.eps_km,
        min_samples=params.min_samples,
        group_by_hazard=params.group_by_hazard
    )

    clusters = results["clusters"]
    noise_incidents = results["noise_incidents"]
    clustered_incidents = results["clustered_incidents"]
    metrics = results["metrics"]

    # 3. Clear previous cluster assignments in DB
    c.execute("DELETE FROM clusters")
    c.execute("UPDATE incidents SET cluster_id = NULL")

    now_iso = datetime.utcnow().isoformat() + "Z"

    # 4. Save newly discovered clusters
    for cl in clusters:
        hull_json = json.dumps(cl.get("polygon_hull", []))
        c.execute("""
        INSERT INTO clusters (
            cluster_id, name, state, hazard_category,
            centroid_latitude, centroid_longitude, radius_km,
            incident_count, severity_level, risk_score, polygon_hull,
            status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?)
        """, (
            cl["cluster_id"],
            cl["name"],
            cl["state"],
            cl["hazard_category"],
            cl["centroid_latitude"],
            cl["centroid_longitude"],
            cl["radius_km"],
            cl["incident_count"],
            cl["severity_level"],
            cl["risk_score"],
            hull_json,
            now_iso,
            now_iso
        ))

        # Update member incidents with their cluster ID
        for inc_id in cl["incident_ids"]:
            c.execute("UPDATE incidents SET cluster_id = ? WHERE incident_id = ?", (cl["cluster_id"], inc_id))

        # Generate alert for newly identified clusters with high risk
        if cl["risk_score"] >= 60:
            c.execute("""
            INSERT INTO alerts (alert_type, title, message, severity, cluster_id, state)
            VALUES ('Cluster Identified', ?, ?, ?, ?, ?)
            """, (
                f"Cluster Detected: {cl['name']}",
                f"DBSCAN identified a dense cluster of {cl['incident_count']} incidents ({cl['hazard_category']}) across {cl['state']}.",
                cl["severity_level"],
                cl["cluster_id"],
                cl["state"]
            ))

    # Audit log
    c.execute("""
    INSERT INTO audit_logs (user_role, user_name, action, details)
    VALUES ('ML Engine', 'DBSCAN', 'Clustering Executed', ?)
    """, (
        f"Grouped {metrics['clustered_count']} incidents into {metrics['cluster_count']} clusters (eps={params.eps_km}km, min_samples={params.min_samples}). Noise: {metrics['noise_count']}.",
    ))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": f"DBSCAN successfully identified {len(clusters)} geographic incident clusters.",
        "clusters": clusters,
        "noise_count": len(noise_incidents),
        "metrics": metrics
    }


@router.delete("/reset")
def reset_clusters():
    """Clear all clusters and reset incident assignments."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("DELETE FROM clusters")
    c.execute("UPDATE incidents SET cluster_id = NULL")
    c.execute("""
    INSERT INTO audit_logs (user_role, user_name, action, details)
    VALUES ('Admin', 'Cluster Manager', 'Clusters Reset', 'Cleared all clusters and reset incident links')
    """)
    conn.commit()
    conn.close()
    return {"success": True, "message": "All clusters reset to unclustered state."}
