"""
Database Access Layer for CoastGuard AI
Supports both SQLite (local zero-config) and Managed PostgreSQL (Render production).
Provides automatic schema initialization, non-destructive safe seeding, and user-record preservation.
"""

import json
import os
import sqlite3
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

DB_DIR = Path(__file__).resolve().parent.parent / "database"
DEFAULT_DB_FILE = DB_DIR / "coastguard.db"
SEED_FILE = Path(__file__).resolve().parent.parent / "datasets" / "sample_coastal_incidents.json"
SCHEMA_SQL = DB_DIR / "schema.sql"

# Detect if managed PostgreSQL is configured via DATABASE_URL
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
IS_POSTGRES = DATABASE_URL.startswith("postgres://") or DATABASE_URL.startswith("postgresql://")

# Normalize postgres:// to postgresql:// if needed for psycopg2
if IS_POSTGRES and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)


class PostgresCursorWrapper:
    """Wrapper around psycopg2 cursor providing SQLite-compatible parameter binding."""
    def __init__(self, cursor):
        self._cursor = cursor

    def execute(self, query: str, params: Any = None):
        if params is None:
            params = ()
        # Convert SQLite ? placeholder to PostgreSQL %s
        pg_query = query.replace("?", "%s")
        # Handle SQLite INSERT OR IGNORE syntax
        if "INSERT OR IGNORE INTO incidents" in pg_query:
            pg_query = pg_query.replace("INSERT OR IGNORE INTO incidents", "INSERT INTO incidents")
            pg_query += " ON CONFLICT (incident_id) DO NOTHING"
        elif "INSERT OR IGNORE INTO" in pg_query:
            pg_query = pg_query.replace("INSERT OR IGNORE INTO", "INSERT INTO")
        # Convert datetime('now') to CURRENT_TIMESTAMP
        pg_query = pg_query.replace("datetime('now')", "CURRENT_TIMESTAMP")
        return self._cursor.execute(pg_query, params)

    def fetchone(self):
        return self._cursor.fetchone()

    def fetchall(self):
        return self._cursor.fetchall()

    @property
    def rowcount(self):
        return self._cursor.rowcount

    def close(self):
        self._cursor.close()


class PostgresConnectionWrapper:
    """Wrapper around psycopg2 connection to provide uniform interface with SQLite."""
    def __init__(self, conn):
        self._conn = conn

    def cursor(self):
        import psycopg2.extras
        cur = self._conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        return PostgresCursorWrapper(cur)

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()


def resolve_db_path() -> Path:
    """Resolve SQLite file path, falling back to tempdir if local repo has restrictive permissions."""
    env_path = os.environ.get("COASTGUARD_DB_PATH")
    if env_path:
        return Path(env_path)

    try:
        DB_DIR.mkdir(parents=True, exist_ok=True)
        test_conn = sqlite3.connect(str(DEFAULT_DB_FILE), timeout=1.0)
        test_conn.execute("CREATE TABLE IF NOT EXISTS _perm_test (id INT)")
        test_conn.execute("INSERT INTO _perm_test (id) VALUES (1)")
        test_conn.execute("DELETE FROM _perm_test WHERE id = 1")
        test_conn.commit()
        test_conn.close()
        return DEFAULT_DB_FILE
    except Exception:
        return Path(tempfile.gettempdir()) / "coastguard_ai.db"


def get_db_connection() -> Any:
    """Create and return configured database connection (PostgreSQL if DATABASE_URL is set, else SQLite)."""
    if IS_POSTGRES:
        try:
            import psycopg2
            conn = psycopg2.connect(DATABASE_URL)
            return PostgresConnectionWrapper(conn)
        except Exception as e:
            print(f"[!] Warning: Failed connecting to PostgreSQL ({e}). Falling back to SQLite.")

    # SQLite connection
    db_file = resolve_db_path()
    db_file.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_file), timeout=20.0)
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA journal_mode = DELETE")
    except Exception:
        pass
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    """Initialize database tables with IF NOT EXISTS (fully non-destructive)."""
    conn = get_db_connection()
    cursor = conn.cursor()

    if IS_POSTGRES and SCHEMA_SQL.exists():
        # Initialize PostgreSQL using production schema
        try:
            with open(SCHEMA_SQL, "r", encoding="utf-8") as f:
                schema_content = f.read()
            # Execute statement blocks
            for statement in schema_content.split(";"):
                stmt = statement.strip()
                if stmt:
                    cursor.execute(stmt)
            conn.commit()
            conn.close()
            return
        except Exception as e:
            print(f"[!] Warning: PostgreSQL schema.sql execution notice: {e}")

    # Standard SQLite schema tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        incident_id TEXT UNIQUE NOT NULL,
        reporter_name TEXT,
        reporter_contact TEXT,
        hazard_category TEXT NOT NULL,
        description TEXT NOT NULL,
        location_name TEXT NOT NULL,
        state TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        severity TEXT NOT NULL DEFAULT 'Medium',
        status TEXT NOT NULL DEFAULT 'Pending',
        reported_at TEXT DEFAULT (datetime('now')),
        image_url TEXT,
        cluster_id TEXT,
        duplicate_of_id TEXT,
        duplicate_confidence REAL DEFAULT 0.0,
        verification_remarks TEXT,
        verified_by TEXT,
        verified_at TEXT,
        is_demo_data INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS clusters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cluster_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        state TEXT NOT NULL,
        hazard_category TEXT NOT NULL,
        centroid_latitude REAL NOT NULL,
        centroid_longitude REAL NOT NULL,
        radius_km REAL NOT NULL,
        incident_count INTEGER NOT NULL DEFAULT 0,
        severity_level TEXT NOT NULL DEFAULT 'Medium',
        risk_score INTEGER NOT NULL DEFAULT 50,
        polygon_hull TEXT,
        status TEXT NOT NULL DEFAULT 'Active',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alert_type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'Medium',
        incident_id TEXT,
        cluster_id TEXT,
        state TEXT,
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_role TEXT NOT NULL,
        user_name TEXT,
        action TEXT NOT NULL,
        details TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS risk_zones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        zone_name TEXT UNIQUE NOT NULL,
        state TEXT NOT NULL,
        center_latitude REAL NOT NULL,
        center_longitude REAL NOT NULL,
        risk_score INTEGER NOT NULL DEFAULT 0,
        risk_level TEXT NOT NULL DEFAULT 'Low',
        active_incidents INTEGER NOT NULL DEFAULT 0,
        explanation TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
    )
    """)

    conn.commit()
    conn.close()


def inspect_database_status() -> Dict[str, Any]:
    """Inspect current database state without making any modifications."""
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as total FROM incidents")
    total_incidents = cursor.fetchone()["total"]

    cursor.execute("SELECT COUNT(*) as demo_cnt FROM incidents WHERE is_demo_data = 1")
    demo_incidents = cursor.fetchone()["demo_cnt"]

    cursor.execute("SELECT COUNT(*) as user_cnt FROM incidents WHERE is_demo_data = 0")
    user_incidents = cursor.fetchone()["user_cnt"]

    cursor.execute("SELECT COUNT(*) as total_clusters FROM clusters")
    total_clusters = cursor.fetchone()["total_clusters"]

    cursor.execute("SELECT COUNT(*) as total_alerts FROM alerts")
    total_alerts = cursor.fetchone()["total_alerts"]

    cursor.execute("SELECT COUNT(*) as total_logs FROM audit_logs")
    total_logs = cursor.fetchone()["total_logs"]

    db_descriptor = "Managed PostgreSQL" if IS_POSTGRES else str(resolve_db_path())
    conn.close()

    return {
        "db_type": "PostgreSQL" if IS_POSTGRES else "SQLite",
        "db_file": db_descriptor,
        "total_incidents": total_incidents,
        "demonstration_incidents": demo_incidents,
        "user_created_incidents": user_incidents,
        "total_clusters": total_clusters,
        "total_alerts": total_alerts,
        "total_audit_logs": total_logs,
        "is_empty": total_incidents == 0
    }


def seed_database_safely(allow_reset_demo_only: bool = False) -> Dict[str, Any]:
    """
    Safely seed the database with the 50 synthetic demonstration incidents.
    Guarantees:
    - Never deletes or modifies user-created incidents (where is_demo_data = 0).
    - If database is empty, loads the 50 demo incidents safely.
    - Uses INSERT OR IGNORE / ON CONFLICT DO NOTHING so no duplicate records are ever created.
    """
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) as total, SUM(CASE WHEN is_demo_data = 0 THEN 1 ELSE 0 END) as user_cnt FROM incidents")
    row = cursor.fetchone()
    total_before = row["total"] or 0
    user_records_preserved = row["user_cnt"] or 0

    if total_before > 0 and not allow_reset_demo_only:
        conn.close()
        return {
            "action": "skipped",
            "message": "Database already contains records. No changes made.",
            "total_incidents": total_before,
            "user_records_preserved": user_records_preserved,
            "new_inserted": 0
        }

    if allow_reset_demo_only:
        cursor.execute("DELETE FROM incidents WHERE is_demo_data = 1")

    if not SEED_FILE.exists():
        conn.close()
        return {"action": "error", "message": f"Seed file not found at {SEED_FILE}", "new_inserted": 0}

    with open(SEED_FILE, "r", encoding="utf-8") as f:
        incidents = json.load(f)

    inserted = 0
    for inc in incidents:
        cursor.execute("""
        INSERT OR IGNORE INTO incidents (
            incident_id, reporter_name, reporter_contact, hazard_category,
            description, location_name, state, latitude, longitude,
            severity, status, reported_at, image_url, is_demo_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, (
            inc["incident_id"],
            inc.get("reporter_name"),
            inc.get("reporter_contact"),
            inc["hazard_category"],
            inc["description"],
            inc["location_name"],
            inc["state"],
            float(inc["latitude"]),
            float(inc["longitude"]),
            inc.get("severity", "Medium"),
            inc.get("status", "Pending"),
            inc.get("reported_at", datetime.utcnow().isoformat() + "Z"),
            inc.get("image_url", "")
        ))
        if cursor.rowcount > 0:
            inserted += 1

    cursor.execute("SELECT COUNT(*) as alert_count FROM alerts")
    if cursor.fetchone()["alert_count"] == 0:
        initial_alerts = [
            ("High Risk Zone", "Critical Wave Action at Dwarka Seawall", "Dwarka temple promenade experiencing waves exceeding 4.2m with seawater ingress.", "High", "CG-2026-0001", "Gujarat"),
            ("New Report", "Oil Sheen Observed at Veraval Harbor", "Tar balls and dark oily sheen washed ashore along Veraval outer shore.", "Critical", "CG-2026-0005", "Gujarat"),
            ("High Risk Zone", "Coastal Dyke Breach at Chellanam", "Seawater gushing into Chellanam fishing hamlet; sea dyke breached.", "Critical", "CG-2026-0023", "Kerala"),
            ("New Report", "Old Digha Sea Dyke Inundation", "Bay of Bengal cyclonic swell breaches Old Digha sea dyke; seawater inundates hotel corridor.", "Critical", "CG-2026-0046", "West Bengal"),
            ("System Notice", "CoastGuard-AI Intelligence Engine Initialized", "Demonstration dataset of 50 Indian coastal incidents loaded safely.", "Low", None, "National")
        ]
        for alert_type, title, msg, sev, inc_id, state in initial_alerts:
            cursor.execute("""
            INSERT INTO alerts (alert_type, title, message, severity, incident_id, state)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (alert_type, title, msg, sev, inc_id, state))

    cursor.execute("""
    INSERT INTO audit_logs (user_role, user_name, action, details)
    VALUES ('System', 'Admin', 'Safe Data Initialization', ?)
    """, (f"Loaded {inserted} demonstration records. Preserved {user_records_preserved} existing user records.",))

    conn.commit()
    conn.close()

    return {
        "action": "completed",
        "message": f"Successfully initialized {inserted} demonstration records.",
        "new_inserted": inserted,
        "user_records_preserved": user_records_preserved,
        "total_incidents": total_before + inserted
    }
