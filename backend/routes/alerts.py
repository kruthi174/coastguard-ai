"""
Alerts & Operational Notifications Endpoints
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from database.database import get_db_connection

router = APIRouter(prefix="/api/alerts", tags=["Alerts & Notifications"])


@router.get("")
def list_alerts(
    unread_only: bool = Query(False),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200)
):
    """Retrieve operational alerts and notifications."""
    conn = get_db_connection()
    c = conn.cursor()

    query = "SELECT * FROM alerts WHERE 1=1"
    params = []

    if unread_only:
        query += " AND is_read = 0"

    if severity and severity != "All":
        query += " AND severity = ?"
        params.append(severity)

    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)

    c.execute(query, params)
    rows = [dict(r) for r in c.fetchall()]

    for r in rows:
        r["is_read"] = bool(r["is_read"])

    # Count unread total
    c.execute("SELECT COUNT(*) as unread FROM alerts WHERE is_read = 0")
    unread_count = c.fetchone()["unread"]

    conn.close()
    return {"total": len(rows), "unread_count": unread_count, "alerts": rows}


@router.patch("/{alert_id}/read")
def mark_alert_read(alert_id: int):
    """Mark a single alert notification as read."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("UPDATE alerts SET is_read = 1 WHERE id = ?", (alert_id,))
    conn.commit()
    conn.close()
    return {"success": True, "alert_id": alert_id, "is_read": True}


@router.post("/mark-all-read")
def mark_all_alerts_read():
    """Mark all operational alerts as read."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("UPDATE alerts SET is_read = 1 WHERE is_read = 0")
    updated = c.rowcount
    conn.commit()
    conn.close()
    return {"success": True, "marked_count": updated}
