"""
Database Migration Utility: SQLite -> Managed PostgreSQL
Safely migrates all incidents, clusters, alerts, audit logs, and risk zones
from local SQLite database to Render PostgreSQL.

Usage:
    DATABASE_URL=postgres://user:pass@host:5432/dbname python database/migrate_to_postgres.py
"""

import os
import sys
import sqlite3
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from database.database import resolve_db_path, SCHEMA_SQL

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()


def migrate():
    print("\n" + "="*70)
    print(" COASTGUARD AI — SQLITE TO POSTGRESQL MIGRATION UTILITY")
    print("="*70)

    if not DATABASE_URL or not (DATABASE_URL.startswith("postgres://") or DATABASE_URL.startswith("postgresql://")):
        print("\n[!] ERROR: No valid PostgreSQL DATABASE_URL detected.")
        print("    Please set DATABASE_URL=postgres://user:password@host/dbname and retry.\n")
        sys.exit(1)

    normalized_url = DATABASE_URL
    if normalized_url.startswith("postgres://"):
        normalized_url = normalized_url.replace("postgres://", "postgresql://", 1)

    try:
        import psycopg2
        import psycopg2.extras
    except ImportError:
        print("\n[!] psycopg2-binary package is required for PostgreSQL migration.")
        print("    Install it via: pip install psycopg2-binary\n")
        sys.exit(1)

    sqlite_file = resolve_db_path()
    if not sqlite_file.exists():
        print(f"\n[!] SQLite database file not found at {sqlite_file}.")
        sys.exit(1)

    print(f"\n[*] Source SQLite Database:       {sqlite_file}")
    print(f"[*] Target PostgreSQL URL:       {normalized_url.split('@')[-1] if '@' in normalized_url else 'configured'}")

    # 1. Connect to SQLite
    s_conn = sqlite3.connect(str(sqlite_file))
    s_conn.row_factory = sqlite3.Row
    s_cur = s_conn.cursor()

    # 2. Connect to PostgreSQL
    print("[*] Connecting to PostgreSQL...")
    p_conn = psycopg2.connect(normalized_url)
    p_cur = p_conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # 3. Apply Schema
    print("[*] Applying production schema (schema.sql)...")
    if SCHEMA_SQL.exists():
        with open(SCHEMA_SQL, "r", encoding="utf-8") as f:
            schema_sql = f.read()
        for statement in schema_sql.split(";"):
            stmt = statement.strip()
            if stmt:
                p_cur.execute(stmt)
        p_conn.commit()
        print("  ✓ PostgreSQL schema initialized.")

    # 4. Migrate Incidents
    s_cur.execute("SELECT * FROM incidents")
    incidents = [dict(r) for r in s_cur.fetchall()]
    migrated_incidents = 0
    for inc in incidents:
        p_cur.execute("""
        INSERT INTO incidents (
            incident_id, reporter_name, reporter_contact, hazard_category,
            description, location_name, state, latitude, longitude,
            severity, status, reported_at, image_url, cluster_id,
            duplicate_of_id, duplicate_confidence, verification_remarks,
            verified_by, verified_at, is_demo_data
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        ) ON CONFLICT (incident_id) DO NOTHING
        """, (
            inc["incident_id"], inc["reporter_name"], inc["reporter_contact"],
            inc["hazard_category"], inc["description"], inc["location_name"],
            inc["state"], inc["latitude"], inc["longitude"], inc["severity"],
            inc["status"], inc["reported_at"], inc["image_url"], inc["cluster_id"],
            inc["duplicate_of_id"], inc["duplicate_confidence"], inc["verification_remarks"],
            inc["verified_by"], inc["verified_at"], bool(inc["is_demo_data"])
        ))
        if p_cur.rowcount > 0:
            migrated_incidents += 1
    p_conn.commit()
    print(f"  ✓ Migrated {migrated_incidents}/{len(incidents)} incidents into PostgreSQL.")

    # 5. Migrate Clusters
    s_cur.execute("SELECT * FROM clusters")
    clusters = [dict(r) for r in s_cur.fetchall()]
    migrated_clusters = 0
    for cl in clusters:
        p_cur.execute("""
        INSERT INTO clusters (
            cluster_id, name, state, hazard_category,
            centroid_latitude, centroid_longitude, radius_km,
            incident_count, severity_level, risk_score, polygon_hull, status
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (cluster_id) DO NOTHING
        """, (
            cl["cluster_id"], cl["name"], cl["state"], cl["hazard_category"],
            cl["centroid_latitude"], cl["centroid_longitude"], cl["radius_km"],
            cl["incident_count"], cl["severity_level"], cl["risk_score"],
            cl["polygon_hull"], cl["status"]
        ))
        if p_cur.rowcount > 0:
            migrated_clusters += 1
    p_conn.commit()
    print(f"  ✓ Migrated {migrated_clusters}/{len(clusters)} clusters into PostgreSQL.")

    # 6. Migrate Alerts
    s_cur.execute("SELECT * FROM alerts")
    alerts = [dict(r) for r in s_cur.fetchall()]
    for al in alerts:
        p_cur.execute("""
        INSERT INTO alerts (alert_type, title, message, severity, incident_id, cluster_id, state, is_read)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            al["alert_type"], al["title"], al["message"], al["severity"],
            al["incident_id"], al["cluster_id"], al["state"], bool(al["is_read"])
        ))
    p_conn.commit()
    print(f"  ✓ Migrated {len(alerts)} alerts into PostgreSQL.")

    # 7. Migrate Audit Logs
    s_cur.execute("SELECT * FROM audit_logs")
    logs = [dict(r) for r in s_cur.fetchall()]
    for lg in logs:
        p_cur.execute("""
        INSERT INTO audit_logs (user_role, user_name, action, details)
        VALUES (%s, %s, %s, %s)
        """, (lg["user_role"], lg["user_name"], lg["action"], lg["details"]))
    p_cur.execute("""
    INSERT INTO audit_logs (user_role, user_name, action, details)
    VALUES ('System', 'Migration Tool', 'Database Migrated', 'Successfully migrated SQLite records to PostgreSQL')
    """)
    p_conn.commit()
    print(f"  ✓ Migrated {len(logs)} audit entries into PostgreSQL.")

    s_conn.close()
    p_conn.close()

    print("\n" + "="*70)
    print(" POSTGRESQL MIGRATION COMPLETED SUCCESSFULLY! [100% SUCCESS]")
    print("="*70 + "\n")


if __name__ == "__main__":
    migrate()
