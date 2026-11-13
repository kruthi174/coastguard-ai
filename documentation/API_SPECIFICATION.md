# COASTGUARD AI — REST API Reference Specification

Base URL: `http://localhost:8000/api`
Interactive Swagger Docs: `http://localhost:8000/api/docs`

---

## 1. Incidents API (`/api/incidents`)

### `GET /api/incidents`
Retrieve incident reports with multi-parameter filtering.
* **Query Parameters:**
  * `state`: Coastal state (e.g., `Gujarat`, `Maharashtra`, `All`)
  * `hazard_category`: Category filter
  * `severity`: `Low`, `Medium`, `High`, `Critical`
  * `status`: `Pending`, `Under Review`, `Verified`, `Rejected`
  * `cluster_id`: Associated cluster or `unclustered`
  * `search`: Free text search in description, location, or ID
  * `limit`: Page size (default: 100)
  * `offset`: Page offset (default: 0)

### `GET /api/incidents/{incident_id}`
Retrieve single incident details.

### `POST /api/incidents`
Submit a crowdsourced hazard report.
* **Request Body:**
  ```json
  {
    "reporter_name": "Ramesh Patel",
    "reporter_contact": "+91 98250 11234",
    "hazard_category": "High waves",
    "description": "Unusually intense swell waves exceeding 4m battering Dwarka seawall.",
    "location_name": "Dwarka Coastal Promenade",
    "state": "Gujarat",
    "latitude": 22.2405,
    "longitude": 68.9685,
    "severity": "High",
    "image_url": ""
  }
  ```

### `POST /api/incidents/upload-image`
Upload multipart photograph file (`.jpg`, `.png`, `.webp`).

### `PATCH /api/incidents/{incident_id}/status`
Update verification status and add officer notes.
* **Request Body:**
  ```json
  {
    "status": "Verified",
    "verification_remarks": "Field team confirmed road inundation.",
    "verified_by": "Disaster Officer Sharma"
  }
  ```

---

## 2. AI Incident Clustering API (`/api/clusters`)

### `POST /api/clusters/run-dbscan`
Execute real DBSCAN clustering on active incidents using Haversine distance.
* **Request Body:**
  ```json
  {
    "eps_km": 35.0,
    "min_samples": 2,
    "group_by_hazard": false
  }
  ```

### `GET /api/clusters`
Retrieve list of all active AI-identified incident clusters with centroids and risk indices.

### `DELETE /api/clusters/reset`
Clear all clusters and reset incidents to unclustered state.

---

## 3. Coastal Risk Intelligence API (`/api/risk`)

### `GET /api/risk/zones`
Calculate explainable 0–100 risk indices for all 9 Indian coastal sectors.

---

## 4. Verification Portal API (`/api/verification`)

### `GET /api/verification/queue`
Retrieve incidents awaiting officer review.

### `GET /api/verification/compare/{incident_id}?radius_km=40`
Fetch target incident alongside adjacent reports for side-by-side corroboration.

---

## 5. Alerts & Notifications API (`/api/alerts`)

### `GET /api/alerts?unread_only=true`
Retrieve operational alerts.

### `PATCH /api/alerts/{id}/read`
Mark alert notification as read.

### `POST /api/alerts/mark-all-read`
Mark all alerts as read.

---

## 6. Analytics API (`/api/analytics`)

### `GET /api/analytics/dashboard`
Command center summary KPIs.

### `GET /api/analytics/export-csv`
Stream CSV export of all coastal incident records.
