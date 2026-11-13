-- ==============================================================================
-- COASTGUARD AI — POSTGRESQL & POSTGIS PRODUCTION SCHEMA
-- Smart India Hackathon: Crowdsourced Coastal Hazard Intelligence & Incident Clustering
-- ==============================================================================

-- Optional PostGIS extension if available on PostgreSQL instance
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. INCIDENTS TABLE
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    incident_id VARCHAR(32) UNIQUE NOT NULL,
    reporter_name VARCHAR(120),
    reporter_contact VARCHAR(120),
    hazard_category VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    state VARCHAR(64) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    severity VARCHAR(32) NOT NULL DEFAULT 'Medium',
    status VARCHAR(32) NOT NULL DEFAULT 'Pending',
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    image_url VARCHAR(512),
    cluster_id VARCHAR(32),
    duplicate_of_id VARCHAR(32),
    duplicate_confidence DOUBLE PRECISION DEFAULT 0.0,
    verification_remarks TEXT,
    verified_by VARCHAR(120),
    verified_at TIMESTAMP WITH TIME ZONE,
    is_demo_data BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial index for geographic fast lookup
CREATE INDEX IF NOT EXISTS idx_incidents_lat_lon ON incidents (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_incidents_state ON incidents (state);
CREATE INDEX IF NOT EXISTS idx_incidents_hazard ON incidents (hazard_category);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents (status);
CREATE INDEX IF NOT EXISTS idx_incidents_cluster ON incidents (cluster_id);

-- 2. CLUSTERS TABLE
CREATE TABLE IF NOT EXISTS clusters (
    id SERIAL PRIMARY KEY,
    cluster_id VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    state VARCHAR(64) NOT NULL,
    hazard_category VARCHAR(64) NOT NULL,
    centroid_latitude DOUBLE PRECISION NOT NULL,
    centroid_longitude DOUBLE PRECISION NOT NULL,
    radius_km DOUBLE PRECISION NOT NULL,
    incident_count INTEGER NOT NULL DEFAULT 0,
    severity_level VARCHAR(32) NOT NULL DEFAULT 'Medium',
    risk_score INTEGER NOT NULL DEFAULT 50,
    polygon_hull JSONB,
    status VARCHAR(32) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. ALERTS & NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    alert_type VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(32) NOT NULL DEFAULT 'Medium',
    incident_id VARCHAR(32),
    cluster_id VARCHAR(32),
    state VARCHAR(64),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON alerts (is_read);

-- 4. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_role VARCHAR(64) NOT NULL,
    user_name VARCHAR(120),
    action VARCHAR(128) NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. RISK ZONES TABLE
CREATE TABLE IF NOT EXISTS risk_zones (
    id SERIAL PRIMARY KEY,
    zone_name VARCHAR(128) UNIQUE NOT NULL,
    state VARCHAR(64) NOT NULL,
    center_latitude DOUBLE PRECISION NOT NULL,
    center_longitude DOUBLE PRECISION NOT NULL,
    risk_score INTEGER NOT NULL DEFAULT 0,
    risk_level VARCHAR(32) NOT NULL DEFAULT 'Low',
    active_incidents INTEGER NOT NULL DEFAULT 0,
    explanation TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
