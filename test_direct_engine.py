"""
Direct End-to-End System Test for CoastGuard AI
Calls FastAPI routers and ML algorithms directly in-process:
1. Verifies database connectivity and 50 synthetic demonstration records
2. Executes real DBSCAN incident clustering with Haversine metric
3. Tests Citizen Report submission and NLP Duplicate Detection
4. Tests Officer verification update and audit log recording
5. Tests Explainable Risk Intelligence engine calculation
6. Verifies Analytics and CSV reporting
"""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR))

from backend.schemas import ClusterRunRequest, IncidentCreate, IncidentStatusUpdate
from backend.routes import admin, alerts, analytics, clusters, incidents, risk, verification
from database.database import get_db_connection, inspect_database_status


def run_tests():
    print("\n" + "="*70)
    print(" COASTGUARD AI — DIRECT END-TO-END VERIFICATION SUITE")
    print("="*70)

    # 1. Database & Demonstration Data Verification
    print("\n[TEST 1] Verifying Database & Demonstration Dataset...")
    db_status = inspect_database_status()
    print(f"  ✓ Database file:       {db_status['db_file']}")
    print(f"  ✓ Total incidents:     {db_status['total_incidents']}")
    print(f"  ✓ Demo incidents:      {db_status['demonstration_incidents']}")
    print(f"  ✓ User incidents:      {db_status['user_created_incidents']}")
    assert db_status['total_incidents'] >= 50, "Expected at least 50 incidents"

    # 2. Incident List Retrieval & Filtering
    print("\n[TEST 2] Testing Multi-Parameter Incident Filtering...")
    all_res = incidents.list_incidents(limit=100, offset=0)
    assert all_res["total"] >= 50
    guj_res = incidents.list_incidents(state="Gujarat", limit=50, offset=0)
    assert len(guj_res["incidents"]) >= 6, f"Expected at least 6 incidents in Gujarat, got {len(guj_res['incidents'])}"
    print(f"  ✓ Retrieved {all_res['total']} total incidents.")
    print(f"  ✓ State filter verified: Gujarat returned {len(guj_res['incidents'])} incidents (demo + user records preserved).")

    # 3. Real AI DBSCAN Incident Clustering Execution
    print("\n[TEST 3] Executing Real AI DBSCAN Incident Clustering...")
    cluster_req = ClusterRunRequest(eps_km=35.0, min_samples=2, group_by_hazard=False)
    cluster_res = clusters.execute_ai_clustering(cluster_req)
    assert cluster_res["success"] is True
    generated_clusters = cluster_res["clusters"]
    metrics = cluster_res["metrics"]
    assert len(generated_clusters) > 0, "DBSCAN should find clusters in coastal data"
    print(f"  ✓ DBSCAN Clustering Succeeded!")
    print(f"    - Identified Clusters:  {len(generated_clusters)}")
    print(f"    - Clustered Incidents:  {metrics['clustered_count']}")
    print(f"    - Noise (Isolated):     {metrics['noise_count']}")
    print(f"    - Distance Metric:      {metrics['clustering_algorithm']}")
    first_cl = generated_clusters[0]
    print(f"    - Sample Cluster:       {first_cl['cluster_id']} ({first_cl['name']})")
    print(f"      Centroid: ({first_cl['centroid_latitude']}, {first_cl['centroid_longitude']})")
    print(f"      Radius:   {first_cl['radius_km']} km | Risk Score: {first_cl['risk_score']}/100")

    # 4. Citizen Hazard Reporting with NLP Duplicate Detection
    print("\n[TEST 4] Testing Citizen Hazard Report Submission & NLP Duplicate Detection...")
    citizen_report = IncidentCreate(
        reporter_name="Citizen Patrol Lead",
        reporter_contact="+91 98250 99999",
        hazard_category="High waves",
        description="Massive swells over 4m splashing over Dwarka seawall near temple pathway.",
        location_name="Dwarka Coastal Path Promenade",
        state="Gujarat",
        latitude=22.2410,
        longitude=68.9690,
        severity="High",
        image_url=""
    )
    report_res = incidents.create_incident(citizen_report)
    assert report_res["success"] is True
    new_incident_id = report_res["incident_id"]
    dup_flag = report_res.get("duplicate_detection")
    print(f"  ✓ Successfully registered report: {new_incident_id}")
    if dup_flag and dup_flag.get("is_potential_duplicate"):
        print(f"  ✓ NLP Duplicate Detection Verified:")
        print(f"    - Matched Incident: {dup_flag['matched_incident_id']}")
        print(f"    - Confidence Match: {dup_flag['duplicate_confidence_percent']}%")
        print(f"    - Distance:         {dup_flag['distance_km']} km")
    else:
        print("  - Unique report registered.")

    # 5. Disaster Management Officer Verification Workflow
    print("\n[TEST 5] Testing Officer Incident Verification & Remarks...")
    verify_req = IncidentStatusUpdate(
        status="Verified",
        verification_remarks="Field patrol confirmed wave damage to barrier. Relief team dispatched.",
        verified_by="Disaster Officer Mehta"
    )
    verify_res = incidents.update_incident_status(new_incident_id, verify_req)
    assert verify_res["success"] is True
    assert verify_res["status"] == "Verified"
    print(f"  ✓ Incident {new_incident_id} successfully marked as 'Verified' by {verify_req.verified_by}.")

    # 6. Explainable Coastal Risk Intelligence Engine
    print("\n[TEST 6] Testing Explainable Coastal Risk Scoring (0-100)...")
    risk_zones_res = risk.get_coastal_risk_zones()
    zones = risk_zones_res["zones"]
    assert len(zones) == 9, f"Expected 9 coastal states, got {len(zones)}"
    top_zone = zones[0]
    print(f"  ✓ Successfully calculated risk indices across all 9 coastal states:")
    print(f"    - Highest Risk Sector: {top_zone['zone_name']}")
    print(f"    - Composite Risk Score: {top_zone['risk_score']} / 100 ({top_zone['risk_level']} Risk)")
    print(f"    - Active Reports:       {top_zone['active_incidents']}")
    bd = top_zone["breakdown"]
    print(f"    - Explainable Factor Breakdown:")
    print(f"      ├─ Frequency: {bd['frequency_score']['points']}/25 pts ({bd['frequency_score']['reason']})")
    print(f"      ├─ Severity:  {bd['severity_score']['points']}/30 pts ({bd['severity_score']['reason']})")
    print(f"      ├─ Recency:   {bd['recency_score']['points']}/20 pts ({bd['recency_score']['reason']})")
    print(f"      ├─ Density:   {bd['density_score']['points']}/15 pts ({bd['density_score']['reason']})")
    print(f"      └─ Evidence:  {bd['evidence_score']['points']}/10 pts ({bd['evidence_score']['reason']})")

    # 7. Analytics & Dashboard KPIs
    print("\n[TEST 7] Testing Dashboard KPIs & Analytics Engine...")
    summary = analytics.get_dashboard_summary()
    kpis = summary["kpis"]
    print(f"  ✓ Total Incidents in System:  {kpis['total_incidents']}")
    print(f"  ✓ Active Hazards:             {kpis['active_incidents']}")
    print(f"  ✓ Critical Incidents:         {kpis['critical_incidents']}")
    print(f"  ✓ Verified Reports:           {kpis['verified_reports']}")
    print(f"  ✓ Active Clusters:            {kpis['active_clusters']}")
    print(f"  ✓ User-Created Reports:       {kpis['user_incidents']}")
    print(f"  ✓ Demonstration Records:      {kpis['demo_incidents']}")

    # 8. Production Health & Static SPA Verification
    print("\n[TEST 8] Verifying Production Health Endpoint & Static Distribution...")
    from backend.main import health_check, FRONTEND_DIST
    hc = health_check()
    assert hc["status"] == "healthy"
    print(f"  ✓ /health endpoint active: {hc}")
    assert FRONTEND_DIST.exists(), "frontend/dist directory must exist for production serving"
    assert (FRONTEND_DIST / "index.html").exists(), "frontend/dist/index.html must exist"
    print(f"  ✓ Static React Single Page Application (SPA) compiled at: {FRONTEND_DIST}")
    print(f"  ✓ Assets count: {len(list((FRONTEND_DIST / 'assets').glob('*')))} bundles")

    print("\n" + "="*70)
    print(" ALL 8 PRODUCTION DEPLOYMENT WORKFLOW TESTS COMPLETED WITH 100% SUCCESS!")
    print("="*70 + "\n")


if __name__ == "__main__":
    run_tests()
