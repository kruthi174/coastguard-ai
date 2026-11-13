"""
Analytics, Trends & Reporting Endpoints
"""

import csv
import io
from fastapi import APIRouter
from fastapi.responses import Response
from database.database import get_db_connection

router = APIRouter(prefix="/api/analytics", tags=["Analytics & Reports"])


@router.get("/dashboard")
def get_dashboard_summary():
    """Retrieve high-level command center KPIs calculated from actual database records."""
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("SELECT COUNT(*) as total FROM incidents")
    total_incidents = c.fetchone()["total"]

    c.execute("SELECT COUNT(*) as active FROM incidents WHERE status != 'Rejected'")
    active_incidents = c.fetchone()["active"]

    c.execute("SELECT COUNT(*) as critical FROM incidents WHERE severity = 'Critical' AND status != 'Rejected'")
    critical_incidents = c.fetchone()["critical"]

    c.execute("SELECT COUNT(*) as verified FROM incidents WHERE status = 'Verified'")
    verified_reports = c.fetchone()["verified"]

    c.execute("SELECT COUNT(*) as pending FROM incidents WHERE status = 'Pending'")
    pending_reports = c.fetchone()["pending"]

    c.execute("SELECT COUNT(*) as total_clusters FROM clusters WHERE status = 'Active'")
    active_clusters = c.fetchone()["total_clusters"]

    c.execute("SELECT COUNT(*) as demo_cnt FROM incidents WHERE is_demo_data = 1")
    demo_count = c.fetchone()["demo_cnt"]

    # Recent incident feed (last 6)
    c.execute("""
    SELECT incident_id, hazard_category, location_name, state, severity, status, reported_at, is_demo_data
    FROM incidents ORDER BY reported_at DESC LIMIT 6
    """)
    recent_activity = [dict(r) for r in c.fetchall()]
    for r in recent_activity:
        r["is_demo_data"] = bool(r["is_demo_data"])

    conn.close()

    return {
        "kpis": {
            "total_incidents": total_incidents,
            "active_incidents": active_incidents,
            "critical_incidents": critical_incidents,
            "verified_reports": verified_reports,
            "pending_reports": pending_reports,
            "active_clusters": active_clusters,
            "demo_incidents": demo_count,
            "user_incidents": total_incidents - demo_count
        },
        "recent_activity": recent_activity
    }


@router.get("/hazard-distribution")
def get_hazard_distribution():
    """Count of incidents per coastal hazard category."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
    SELECT hazard_category, COUNT(*) as count
    FROM incidents
    WHERE status != 'Rejected'
    GROUP BY hazard_category
    ORDER BY count DESC
    """)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


@router.get("/state-distribution")
def get_state_distribution():
    """Count of incidents across all 9 Indian coastal states."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
    SELECT state, COUNT(*) as count,
           SUM(CASE WHEN severity = 'Critical' THEN 1 ELSE 0 END) as critical_count,
           SUM(CASE WHEN status = 'Verified' THEN 1 ELSE 0 END) as verified_count
    FROM incidents
    GROUP BY state
    ORDER BY count DESC
    """)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


@router.get("/severity-distribution")
def get_severity_distribution():
    """Distribution of incidents by threat severity."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
    SELECT severity, COUNT(*) as count
    FROM incidents
    GROUP BY severity
    ORDER BY CASE severity
        WHEN 'Critical' THEN 1
        WHEN 'High' THEN 2
        WHEN 'Medium' THEN 3
        WHEN 'Low' THEN 4
        ELSE 5 END
    """)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


@router.get("/status-distribution")
def get_status_distribution():
    """Distribution of incidents by verification status."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
    SELECT status, COUNT(*) as count
    FROM incidents
    GROUP BY status
    """)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


@router.get("/trends")
def get_incident_timeline_trends():
    """Aggregated daily timeline of hazard occurrences."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
    SELECT substr(reported_at, 1, 10) as report_date,
           COUNT(*) as total,
           SUM(CASE WHEN severity IN ('High', 'Critical') THEN 1 ELSE 0 END) as severe_count
    FROM incidents
    GROUP BY report_date
    ORDER BY report_date ASC
    LIMIT 14
    """)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows


@router.get("/export-csv")
def export_incidents_csv():
    """Generate and stream a comprehensive CSV export of all coastal incident records."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
    SELECT incident_id, hazard_category, location_name, state, latitude, longitude,
           severity, status, cluster_id, reported_at, verified_by, is_demo_data
    FROM incidents
    ORDER BY reported_at DESC
    """)
    rows = c.fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Incident ID", "Hazard Category", "Location", "State", "Latitude", "Longitude",
        "Severity", "Status", "Cluster ID", "Reported At", "Verified By", "Is Demo Data"
    ])

    for r in rows:
        writer.writerow([
            r["incident_id"],
            r["hazard_category"],
            r["location_name"],
            r["state"],
            r["latitude"],
            r["longitude"],
            r["severity"],
            r["status"],
            r["cluster_id"] or "Unclustered",
            r["reported_at"],
            r["verified_by"] or "N/A",
            "YES (Demo)" if r["is_demo_data"] else "NO (Citizen Report)"
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=coastguard_ai_incidents.csv"}
    )
