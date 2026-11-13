"""
Incident Management & Crowdsourced Reporting Endpoints
"""

import os
import shutil
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from backend.config import UPLOAD_DIR
from backend.schemas import IncidentCreate, IncidentStatusUpdate
from database.database import get_db_connection
from ml_engine.duplicate_detector import check_for_duplicates

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])


@router.get("")
def list_incidents(
    state: Optional[str] = Query(None, description="Filter by coastal state"),
    hazard_category: Optional[str] = Query(None, description="Filter by hazard type"),
    severity: Optional[str] = Query(None, description="Filter by severity level"),
    status: Optional[str] = Query(None, description="Filter by verification status"),
    cluster_id: Optional[str] = Query(None, description="Filter by cluster ID"),
    search: Optional[str] = Query(None, description="Search description or location"),
    is_demo: Optional[bool] = Query(None, description="Filter by demo data flag"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """Retrieve incidents with optional multi-parameter filtering."""
    conn = get_db_connection()
    c = conn.cursor()

    query = "SELECT * FROM incidents WHERE 1=1"
    params: List[Any] = []

    if isinstance(state, str) and state != "All":
        query += " AND state = ?"
        params.append(state)

    if isinstance(hazard_category, str) and hazard_category != "All":
        query += " AND hazard_category = ?"
        params.append(hazard_category)

    if isinstance(severity, str) and severity != "All":
        query += " AND severity = ?"
        params.append(severity)

    if isinstance(status, str) and status != "All":
        query += " AND status = ?"
        params.append(status)

    if isinstance(cluster_id, str) and cluster_id:
        if cluster_id == "unclustered":
            query += " AND (cluster_id IS NULL OR cluster_id = '')"
        else:
            query += " AND cluster_id = ?"
            params.append(cluster_id)

    if isinstance(is_demo, bool):
        query += " AND is_demo_data = ?"
        params.append(1 if is_demo else 0)

    if isinstance(search, str) and search.strip():
        query += " AND (description LIKE ? OR location_name LIKE ? OR incident_id LIKE ?)"
        s_term = f"%{search.strip()}%"
        params.extend([s_term, s_term, s_term])

    safe_limit = int(limit) if not hasattr(limit, "default") else 100
    safe_offset = int(offset) if not hasattr(offset, "default") else 0
    query += " ORDER BY reported_at DESC LIMIT ? OFFSET ?"
    params.extend([safe_limit, safe_offset])

    c.execute(query, params)
    rows = [dict(r) for r in c.fetchall()]

    # Format booleans and demo badges
    for r in rows:
        r["is_demo_data"] = bool(r["is_demo_data"])

    conn.close()
    return {"total": len(rows), "incidents": rows}


@router.get("/{incident_id}")
def get_incident(incident_id: str):
    """Retrieve details of a specific incident."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM incidents WHERE incident_id = ? OR id = ?", (incident_id, incident_id))
    row = c.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")

    res = dict(row)
    res["is_demo_data"] = bool(res["is_demo_data"])
    return res


@router.post("")
def create_incident(report: IncidentCreate):
    """
    Submit a citizen or officer crowdsourced hazard report.
    Executes NLP and spatial duplicate detection against recent incidents.
    """
    conn = get_db_connection()
    c = conn.cursor()

    # Generate sequential unique incident ID
    now_year = datetime.utcnow().year
    c.execute("SELECT COUNT(*) as cnt FROM incidents")
    next_num = c.fetchone()["cnt"] + 1
    incident_id = f"CG-{now_year}-{next_num:04d}"

    # Fetch recent active reports for duplicate checking
    c.execute("SELECT id, incident_id, hazard_category, description, location_name, state, latitude, longitude, reported_at FROM incidents ORDER BY reported_at DESC LIMIT 60")
    existing_reports = [dict(r) for r in c.fetchall()]

    candidate_dict = report.dict()
    candidate_dict["incident_id"] = incident_id
    candidate_dict["reported_at"] = datetime.utcnow().isoformat() + "Z"

    # Run duplicate detection
    duplicate_info = check_for_duplicates(candidate_dict, existing_reports, spatial_threshold_km=25.0, time_threshold_hours=72.0)

    dup_id = None
    dup_conf = 0.0
    if duplicate_info and duplicate_info.get("is_potential_duplicate"):
        dup_id = duplicate_info["matched_incident_id"]
        dup_conf = duplicate_info["duplicate_confidence_percent"]

    # Insert incident
    now_iso = datetime.utcnow().isoformat() + "Z"
    c.execute("""
    INSERT INTO incidents (
        incident_id, reporter_name, reporter_contact, hazard_category,
        description, location_name, state, latitude, longitude,
        severity, status, reported_at, image_url, duplicate_of_id,
        duplicate_confidence, is_demo_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?, 0)
    """, (
        incident_id,
        report.reporter_name,
        report.reporter_contact,
        report.hazard_category,
        report.description,
        report.location_name,
        report.state,
        report.latitude,
        report.longitude,
        report.severity,
        now_iso,
        report.image_url or "",
        dup_id,
        dup_conf
    ))

    # Generate Alert
    alert_title = f"New {report.hazard_category} Reported at {report.location_name}"
    alert_type = "New Report"
    if dup_id:
        alert_title = f"Possible Duplicate: {report.hazard_category} near {report.location_name}"
        alert_type = "Duplicate Detected"
    elif report.severity == "Critical":
        alert_title = f"CRITICAL HAZARD: {report.hazard_category} in {report.state}"
        alert_type = "Critical Alert"

    c.execute("""
    INSERT INTO alerts (alert_type, title, message, severity, incident_id, state)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        alert_type,
        alert_title,
        report.description[:180] + ("..." if len(report.description) > 180 else ""),
        report.severity,
        incident_id,
        report.state
    ))

    # Audit log
    c.execute("""
    INSERT INTO audit_logs (user_role, user_name, action, details)
    VALUES ('Citizen', ?, 'Incident Created', ?)
    """, (
        report.reporter_name or "Anonymous Citizen",
        f"Submitted report {incident_id} ({report.hazard_category} at {report.location_name})"
    ))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "incident_id": incident_id,
        "message": "Hazard report successfully registered in Coastal Intelligence System.",
        "duplicate_detection": duplicate_info,
        "reported_at": now_iso
    }


@router.post("/upload-image")
async def upload_incident_image(file: UploadFile = File(...)):
    """Upload a photograph of coastal hazard evidence."""
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        raise HTTPException(status_code=400, detail="Invalid image file format. Allowed: jpg, png, webp")

    filename = f"hazard_{uuid.uuid4().hex[:12]}{ext}"
    dest_path = UPLOAD_DIR / filename

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_url = f"/uploads/{filename}"
    return {"url": file_url, "filename": filename}


@router.patch("/{incident_id}/status")
def update_incident_status(incident_id: str, update: IncidentStatusUpdate):
    """Officer verification endpoint to review and update report status."""
    valid_statuses = ["Pending", "Under Review", "Verified", "Rejected"]
    if update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Choose from: {valid_statuses}")

    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM incidents WHERE incident_id = ? OR id = ?", (incident_id, incident_id))
    row = c.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")

    actual_id = row["incident_id"]
    now_iso = datetime.utcnow().isoformat() + "Z"

    c.execute("""
    UPDATE incidents
    SET status = ?, verification_remarks = ?, verified_by = ?, verified_at = ?, updated_at = ?
    WHERE incident_id = ?
    """, (
        update.status,
        update.verification_remarks or row["verification_remarks"],
        update.verified_by,
        now_iso,
        now_iso,
        actual_id
    ))

    # Alert generation on status change
    alert_title = f"Report {actual_id} Marked as {update.status}"
    c.execute("""
    INSERT INTO alerts (alert_type, title, message, severity, incident_id, state)
    VALUES ('Report Verified', ?, ?, ?, ?, ?)
    """, (
        alert_title,
        f"Officer '{update.verified_by}' updated status to '{update.status}'. Remarks: {update.verification_remarks or 'None'}",
        row["severity"],
        actual_id,
        row["state"]
    ))

    # Audit log
    c.execute("""
    INSERT INTO audit_logs (user_role, user_name, action, details)
    VALUES ('Officer', ?, 'Verification Status Updated', ?)
    """, (
        update.verified_by,
        f"Updated {actual_id} to '{update.status}'. Remarks: {update.verification_remarks}"
    ))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "incident_id": actual_id,
        "status": update.status,
        "verified_at": now_iso
    }
