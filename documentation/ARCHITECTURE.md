# COASTGUARD AI — System Architecture & Data Flow

## 1. High-Level Architecture Overview

CoastGuard AI is designed as an enterprise-grade maritime situational awareness platform for coastal disaster management authorities (NDMA, SDMAs, Coast Guard, INCOIS).

```
                                  +-------------------------------------+
                                  |         CITIZEN OBSERVER            |
                                  |  - Mobile/Web Hazard Reporting      |
                                  |  - GPS/Map Geolocation              |
                                  |  - Photo Evidence Upload            |
                                  +------------------+------------------+
                                                     |
                                                     v (HTTPS POST /api/incidents)
+----------------------------------------------------+----------------------------------------------------+
|                                    COASTGUARD AI REST API (FastAPI)                                    |
|                                                                                                         |
|  +--------------------+   +-----------------------+   +--------------------+   +---------------------+  |
|  |  Incidents Router  |   |   AI Clusters Router  |   |   Risk Intel Router|   | Verification Router |  |
|  +---------+----------+   +-----------+-----------+   +---------+----------+   +----------+----------+  |
|            |                          |                         |                         |             |
|            |                          v                         v                         |             |
|            |                 +------------------+     +-------------------+               |             |
|            +---------------->|  ML Engine Core  |<--->| Explainable Risk  |<--------------+             |
|            |                 |  DBSCAN Spatio-  |     | Scorer (0 - 100)  |               |             |
|            |                 |    Temporal      |     +-------------------+               |             |
|            |                 +------------------+                                         |             |
|            v                          ^                                                   v             |
|  +--------------------+               |                                        +---------------------+  |
|  | NLP Duplicate      |---------------+                                        | Alerts Dispatch     |  |
|  | Detection (TF-IDF) |                                                        | System              |  |
|  +--------------------+                                                        +---------------------+  |
+----------------------------------------------------+----------------------------------------------------+
                                                     |
                                                     v
                                  +-------------------------------------+
                                  |         DATABASE LAYER              |
                                  |  - SQLite (WAL Mode)                |
                                  |  - PostgreSQL / PostGIS Ready       |
                                  |  - Incidents, Clusters, Alerts      |
                                  +------------------+------------------+
                                                     |
                                                     v
                                  +-------------------------------------+
                                  |     DISASTER MANAGEMENT COMMAND     |
                                  |  - Leaflet 9-State Coastal GIS Map  |
                                  |  - DBSCAN Cluster Hull Overlays     |
                                  |  - Incident Verification Queue      |
                                  |  - Explainable Risk Indices         |
                                  +-------------------------------------+
```

## 2. Core Functional Modules

1. **Crowdsourced Hazard Intake**:
   - Geolocation tagging via interactive Leaflet map picker.
   - Validation against 10 coastal hazard categories.
   - Sequential unique incident ID generation (`CG-YYYY-XXXX`).

2. **NLP & Spatio-Temporal Duplicate Corroboration**:
   - Compares candidate reports with active incidents within 25 km and 72 hours.
   - Computes TF-IDF description vector cosine similarity.
   - Automatically flags potential duplicates with match percentage for officer review.

3. **AI DBSCAN Spatio-Temporal Clustering**:
   - Converts geographic coordinates to radians.
   - Precomputes pairwise spherical Haversine distances.
   - Identifies core dense regions with $\ge \text{min\_samples}$ within $\epsilon$ radius.
   - Computes cluster centroids, bounding radii, and convex hull polygon vertices.

4. **Explainable Risk Intelligence (0–100)**:
   - Evaluates incident frequency (25%), threat severity (30%), recency decay (20%), spatial concentration (15%), and evidence credibility (10%).
   - Provides plain-language justification and formula explanation for every score.

5. **Operational Verification Portal**:
   - Multi-tier lifecycle: Pending -> Under Review -> Verified / Rejected.
   - Side-by-side comparison with geographically adjacent reports (within 40 km).
