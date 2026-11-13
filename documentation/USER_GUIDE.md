# COASTGUARD AI — User Guide & Demonstration Manual

This guide describes how to operate CoastGuard AI across its three primary personas:
1. **Citizen Observer**
2. **Disaster Management Officer**
3. **System Administrator**

---

## 1. Quick Start Guide

### Launching CoastGuard AI:
Open a command prompt in the project root:
```bash
python backend/main.py
```
Open your browser and navigate to:
```
http://localhost:8000
```
The unified full-stack application will launch, serving the compiled React frontend, REST API, and ML engine on a single unified port.

---

## 2. Complete Workflow Walkthrough

### Step 1: Command Center Surveillance
- Open the **Command Center** dashboard.
- Observe the 6 core KPIs (Total Incidents, Active Incidents, Critical Incidents, Verified Reports, Pending Reports, Active Clusters).
- Check the 14-day reporting timeline and state-wise hazard distribution.

### Step 2: Interactive Coastal Map Navigation
- Navigate to **Coastal Intelligence Map** from the sidebar.
- Click any coastal state chip at the top (e.g., `Gujarat`, `Kerala`, `West Bengal`) to fly directly to that state's coastal zone.
- Click any colored circle to view incident details and field photo evidence.
- Toggle **Show AI Clusters** to visualize the circular boundary and centroid of active clusters.

### Step 3: Submitting a Citizen Report
- Click **Citizen Hazard Reporting** in the sidebar.
- Select a hazard category (e.g. `High waves`, `Coastal flooding`).
- Click on the interactive Leaflet map to pin the exact geographic coordinates.
- Enter a description and location landmark.
- Click **Submit Hazard Report**.
- If the report is co-located with an existing recent incident, observe the **NLP Duplicate Corroboration** banner showing match percentage.

### Step 4: Executing AI Incident Clustering (DBSCAN)
- Navigate to **AI Incident Clustering** in the sidebar.
- Review or adjust the **Epsilon Radius** (e.g. 35 km) and **Min Samples** (2 incidents).
- Click the prominent **"RUN AI CLUSTERING"** button.
- Observe real-time execution statistics:
  - Total Clusters Identified
  - Clustered Incidents
  - Noise Points
- Inspect any cluster card on the left to see its constituent incidents and bounding geometry.

### Step 5: Disaster Officer Incident Verification
- Switch the role dropdown in the top navbar to **Disaster Management Officer**.
- Navigate to **Report Verification**.
- Select an incident from the pending queue.
- Inspect the submitted photo evidence and review the **Geographically Adjacent Reports (within 40 km)**.
- Enter official remarks and click **Verify Incident (Confirmed)**.
- Notice how the status immediately updates across the map, table, and analytics.

### Step 6: Inspecting Explainable Risk Intelligence
- Click **Coastal Risk Intelligence**.
- Select a coastal state (e.g., `Gujarat` or `Kerala`).
- Review the 0–100 score and the 5-factor transparent scoring breakdown.

### Step 7: Exporting Reports
- Open **Analytics & Reports**.
- Click **Download Full CSV Report** to export all incident records for external GIS or agency reporting.
