# COASTGUARD AI
### Crowdsourced Coastal Hazard Intelligence and AI Incident Clustering System
**Smart India Hackathon (SIH) Full-Stack Application**

---

## 1. Problem Statement & Mission

> **Problem Statement**: "CROWDSOURCED COASTAL HAZARD INTELLIGENCE AND INCIDENT CLUSTERING SYSTEM"

India has a coastline spanning over 7,516 kilometers across 9 maritime states, vulnerable to sea surges, coastal erosion, anomalous high waves, cyclonic landfall, and marine pollution. Timely situational awareness is critical for the Indian Coast Guard, National Disaster Management Authority (NDMA), INCOIS, and state disaster authorities.

**COASTGUARD AI** provides a real, functional, full-stack maritime intelligence system combining crowdsourced citizen reporting with automated **DBSCAN spatio-temporal incident clustering**, **spherical Haversine distance calculations**, **NLP-based duplicate detection**, and an **explainable 5-factor coastal risk scoring index (0–100)**.

---

## 2. Technology Stack

* **Frontend**:
  * React.js (Vite)
  * Tailwind CSS (Custom enterprise maritime palette: Deep navy `#0A1526`, Muted teal `#0D9488`, Clean slate surfaces)
  * Lucide React (Enterprise iconography)
  * Recharts (Interactive trends, hazard typography, and severity distribution charts)
  * Leaflet & OpenStreetMap / CartoDB (Interactive GIS coastal map with custom pins and cluster boundary overlays)
* **Backend**:
  * Python 3.11+
  * FastAPI (REST APIs, CORS middleware, Static single-page application mounting)
  * Uvicorn (High-performance ASGI server)
* **AI / Machine Learning**:
  * Scikit-Learn architecture
  * DBSCAN clustering algorithm with spherical Haversine metric
  * Pairwise spherical great-circle distance matrix ($R = 6,371.0\text{ km}$)
  * TF-IDF Vectorization & Cosine Similarity for NLP duplicate corroboration
  * Multi-factor explainable coastal risk scoring engine
* **Database**:
  * SQLite (Zero-configuration with WAL journal mode and spatial math)
  * PostgreSQL & PostGIS migration schema provided (`database/schema.sql`)

---

## 3. Key Functional Modules

| # | Module | Description |
| :-: | :--- | :--- |
| **1** | **Command Center Dashboard** | Real-time KPIs (Total, Active, Critical, Verified, Pending, Clusters), 14-day trends, hazard pie charts, and coastal state density. |
| **2** | **Indian Coastal Intelligence Map** | Leaflet GIS map spanning all 9 Indian maritime states with color-coded severity markers, cluster boundaries, and popups. |
| **3** | **Citizen Hazard Reporting** | Working report intake form with interactive map coordinate picker, photo upload, and instant NLP duplicate detection warning. |
| **4** | **Incident Management** | Searchable, filterable enterprise table with state, hazard, severity, and status filters, detail drawer, and CSV export. |
| **5** | **AI Incident Clustering** | **Central Feature**: Real DBSCAN algorithm execution button, neighborhood radius ($\epsilon$) & min samples tuning, cluster breakdown, and noise detection. |
| **6** | **Coastal Risk Intelligence** | Explainable 0–100 risk scoring dashboard with transparent 5-factor breakdown and explicit operational disclaimer. |
| **7** | **Report Verification Portal** | Dedicated workflow for Disaster Management Officers to inspect photos, corroborate adjacent reports (within 40km), and mark status. |
| **8** | **Alerts & Notifications** | Real-time dispatch notifications generated on new reports, verified hazards, and newly identified clusters. |
| **9** | **Analytics & Reports** | Multi-dimensional statistical charts with date range filtering and one-click full CSV report streaming. |
| **10** | **Administration & Audit** | Role switcher (Citizen, Officer, Admin), chronological security audit logs, database diagnostics, and safe demo refresh. |

---

## 4. Project Directory Structure

```
CoastGuard-AI/
├── backend/
│   ├── main.py                     # FastAPI app assembly & SPA mounting
│   ├── config.py                   # App configuration & paths
│   ├── schemas.py                  # Pydantic request/response schemas
│   └── routes/
│       ├── incidents.py            # Reporting, filters, and image upload
│       ├── clusters.py             # DBSCAN execution & cluster APIs
│       ├── risk.py                 # 0-100 explainable risk scoring
│       ├── verification.py         # Officer inspection & nearby comparison
│       ├── alerts.py               # Operational notification dispatch
│       ├── analytics.py            # Dashboard KPIs & CSV stream
│       └── admin.py                # Audit logs & role management
├── ml_engine/
│   ├── clustering.py               # Canonical DBSCAN with Haversine metric
│   ├── duplicate_detector.py       # TF-IDF + spatial proximity duplicate detection
│   └── risk_scorer.py              # Explainable 5-factor risk scoring engine
├── database/
│   ├── database.py                 # SQLite/PostgreSQL connection layer & safe seed
│   ├── schema.sql                  # PostgreSQL & PostGIS production schema
│   └── seed_data.py                # Inspection & safe initialization script
├── datasets/
│   └── sample_coastal_incidents.json # 50 synthetic incidents across 9 coastal states
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   ├── dist/                       # Compiled production React SPA bundle
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── components/             # Reusable UI cards, badges, modal, navbar, sidebar
│       ├── pages/                  # 10 complete functional pages
│       └── services/api.js         # API client
├── documentation/
│   ├── ARCHITECTURE.md             # System architecture & data flow
│   ├── AI_CLUSTERING_METHODOLOGY.md# DBSCAN & Haversine mathematical formulation
│   ├── API_SPECIFICATION.md        # Comprehensive REST API reference
│   └── USER_GUIDE.md               # User manual & persona instructions
├── requirements.txt                # Python dependencies
├── package.json                    # Root package scripts
├── .env.example                    # Environment template
├── run_app.bat                     # Windows one-click launcher
└── test_direct_engine.py           # End-to-end verification test suite
```

---

## 5. Demonstration Dataset Details

The database is initialized with **50 geographically plausible synthetic incidents** distributed across all **9 coastal states of India**:
* **Gujarat (6)**: Dwarka, Okha, Porbandar, Madhavpur, Veraval, Alang
* **Maharashtra (6)**: Marine Drive, Versova, Alibaug, Ratnagiri, Dahanu, Malvan
* **Goa (5)**: Calangute, Baga, Miramar, Bogmalo, Colva
* **Karnataka (5)**: Ullal (Mangaluru), Tannirbhavi, Malpe, Karwar, Gokarna
* **Kerala (6)**: Chellanam, Fort Kochi, Purakkad (Alappuzha), Kozhikode, Vizhinjam, Kannur
* **Tamil Nadu (6)**: Marina Beach, Besant Nagar, Cuddalore, Nagapattinam, Dhanushkodi, Kanyakumari
* **Andhra Pradesh (6)**: RK Beach (Vizag), Rushikonda, Kakinada, Machilipatnam, Bapatla, Krishnapatnam
* **Odisha (5)**: Golden Beach (Puri), Blue Flag Beach, Paradeep, Gopalpur, Chandipur
* **West Bengal (5)**: Old Digha, New Digha, Sagar Island, Bakkhali, Haldia

> **Notice**: All 50 synthetic records are tagged with `is_demo_data: true` and displayed with clear `DEMO DATA` indicators to guarantee they are never confused with real-time emergencies. Any citizen reports submitted via the app are saved with `is_demo_data: false` and strictly preserved during any data sync.

---

## 6. How to Run the Application

### Option A: One-Click Launch (Windows)
Double-click `run_app.bat` in the project root.

### Option B: Manual Command Line
```bash
# Set PYTHONPATH to project directory
set PYTHONPATH=%cd%

# Start the unified backend server
python backend/main.py
```

Open your browser and navigate to:
```
http://localhost:8000
```
* **Web Application UI**: `http://localhost:8000`
* **Interactive OpenAPI Docs**: `http://localhost:8000/api/docs`

---

## 7. Online Deployment to Render via GitHub

CoastGuard AI is fully prepared for one-click online deployment on Render.

### Step 1: Push Code to GitHub
Initialize and push the repository to GitHub:
```bash
git init
git add .
git commit -m "feat: complete CoastGuard AI production build"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/CoastGuard-AI.git
git push -u origin main
```

### Step 2: Create Web Service on Render
1. Log in to [Render](https://dashboard.render.com/) and click **New + > Web Service**.
2. Connect your GitHub repository `CoastGuard-AI`.
3. Configure the service settings:
   * **Name**: `coastguard-ai`
   * **Region**: Oregon (US West) or your preferred region
   * **Branch**: `main`
   * **Environment**: `Python`
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   * **Health Check Path**: `/health`
   * **Plan**: `Free`
4. Add Environment Variables under **Environment**:
   * `PYTHON_VERSION`: `3.11.9`
   * `CORS_ORIGINS`: `*`
   * `ADMIN_SECRET_KEY`: `<Generate a random secure key>`
5. Click **Deploy Web Service**.

### Step 3: (Optional) Persistent PostgreSQL Database on Render
To persist user reports and clustering results across service redeployments on Render:
1. Click **New + > PostgreSQL** on the Render dashboard.
2. Name the database `coastguard-postgres` (Free tier).
3. Copy the **Internal Database URL** from the database dashboard.
4. Go to your `coastguard-ai` web service > **Environment** > add `DATABASE_URL` with the copied connection string.
5. CoastGuard AI will automatically detect PostgreSQL, create tables, and seed the demonstration dataset.

---

## 8. Verifying End-to-End Workflow

Run the built-in end-to-end verification suite:
```bash
python test_direct_engine.py
```
This tests all 7 core capabilities:
1. Database connectivity & 50 baseline demo records
2. Multi-parameter incident filtering (state, category, severity, status)
3. DBSCAN clustering execution with spherical Haversine metric (generating active clusters and noise points)
4. Citizen report submission & NLP duplicate corroboration (TF-IDF cosine similarity)
5. Disaster Management Officer verification workflow & remarks update
6. Explainable 5-factor coastal risk calculation across all 9 maritime states
7. Analytics dashboard KPI synthesis
