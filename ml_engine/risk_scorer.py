"""
Explainable Coastal Risk Intelligence Engine
Calculates transparent 0-100 risk indices for coastal regions and incident clusters.
Explicitly designed as an algorithmic decision-support tool, not an official meteorological forecast.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
import numpy as np
from ml_engine.clustering import haversine_distance_km

RISK_DISCLAIMER = (
    "DISCLAIMER: The Coastal Risk Index is an algorithmic decision-support indicator "
    "synthesized from crowdsourced hazard reports and spatial density calculations. "
    "It is NOT an official oceanographic, meteorological or tsunami forecast. "
    "Official warnings must always be corroborated with INCOIS and IMD bulletins."
)


def calculate_explainable_risk(
    incidents: List[Dict[str, Any]],
    zone_name: str = "Coastal Zone",
    area_sq_km: float = 2500.0
) -> Dict[str, Any]:
    """
    Calculate an explainable risk score (0-100) with detailed component breakdown.
    
    Components:
    1. Incident Frequency Score (0-25 pts): Volume of active crowdsourced reports
    2. Threat Severity Score (0-30 pts): Weighted severity of reports
    3. Temporal Recency Score (0-20 pts): How recently incidents occurred
    4. Geographic Density Score (0-15 pts): Concentration of reports
    5. Evidence & Verification Credibility (0-10 pts): Presence of photos & verified reports
    """
    if not incidents:
        return {
            "zone_name": zone_name,
            "risk_score": 0,
            "risk_level": "Low",
            "risk_color": "green",
            "active_incidents": 0,
            "breakdown": {
                "frequency_score": {"points": 0, "max": 25, "reason": "No active incidents recorded."},
                "severity_score": {"points": 0, "max": 30, "reason": "Baseline threat level."},
                "recency_score": {"points": 0, "max": 20, "reason": "No recent hazard activity."},
                "density_score": {"points": 0, "max": 15, "reason": "No geographic clustering."},
                "evidence_score": {"points": 0, "max": 10, "reason": "No reports to verify."}
            },
            "formula_explanation": "Total Risk = Frequency + Severity + Recency + Density + Credibility",
            "disclaimer": RISK_DISCLAIMER
        }

    count = len(incidents)

    # 1. Frequency Score (0-25)
    # Log-linear scaling up to 15 incidents for full points
    frequency_pts = min(25.0, (count / 12.0) * 25.0)
    frequency_reason = f"{count} crowdsourced incident{'s' if count > 1 else ''} active in this zone."

    # 2. Threat Severity Score (0-30)
    sev_weights = {"Low": 1.0, "Medium": 2.0, "High": 3.5, "Critical": 5.0}
    weights = [sev_weights.get(i.get("severity", "Low"), 1.0) for i in incidents]
    avg_sev_weight = sum(weights) / len(weights)
    max_sev_weight = max(weights)
    # 60% driven by peak threat, 40% by average threat
    sev_ratio = ((0.6 * max_sev_weight) + (0.4 * avg_sev_weight)) / 5.0
    severity_pts = min(30.0, sev_ratio * 30.0)
    highest_sev = [k for k, v in sev_weights.items() if v == max_sev_weight][0]
    severity_reason = f"Peak severity '{highest_sev}' with average severity index {round(avg_sev_weight, 1)}/5.0."

    # 3. Recency Score (0-20)
    # Exponential decay over hours
    now = datetime.utcnow()
    hours_diffs = []
    for inc in incidents:
        ts = inc.get("reported_at")
        if isinstance(ts, str):
            try:
                dt = datetime.fromisoformat(ts.replace("Z", "+00:00")).replace(tzinfo=None)
                diff = max(0.0, (now - dt).total_seconds() / 3600.0)
                hours_diffs.append(diff)
            except Exception:
                hours_diffs.append(24.0)
        else:
            hours_diffs.append(24.0)
    
    min_hours = min(hours_diffs) if hours_diffs else 24.0
    # If reported within 6 hours -> 18-20 pts; 24 hrs -> 14 pts; 48 hrs -> 8 pts; 72+ hrs -> 4 pts
    recency_factor = max(0.2, 1.0 - (min_hours / 72.0))
    recency_pts = min(20.0, recency_factor * 20.0)
    recency_reason = f"Most recent report received {round(min_hours, 1)} hours ago."

    # 4. Density Score (0-15)
    # Approximate cluster spread if coordinates are available
    if len(incidents) >= 2:
        lats = [float(i.get("latitude", 0)) for i in incidents]
        lons = [float(i.get("longitude", 0)) for i in incidents]
        clat, clon = np.mean(lats), np.mean(lons)
        dists = [haversine_distance_km(clat, clon, lat, lon) for lat, lon in zip(lats, lons)]
        spread_km = max(dists) if dists else 1.0
        # If clustered tightly within 15km -> high density
        if spread_km < 15.0:
            density_pts = 15.0
            density_reason = f"High spatial clustering: reports within {round(spread_km, 1)} km radius."
        elif spread_km < 35.0:
            density_pts = 10.0
            density_reason = f"Moderate geographic grouping: reports spread over {round(spread_km, 1)} km radius."
        else:
            density_pts = 6.0
            density_reason = f"Dispersed incidents spread over {round(spread_km, 1)} km radius."
    else:
        density_pts = 7.0
        density_reason = "Single incident location point."

    # 5. Evidence & Verification Credibility (0-10)
    verified_count = sum(1 for i in incidents if i.get("status") == "Verified")
    photo_count = sum(1 for i in incidents if i.get("image_url"))
    verified_ratio = verified_count / count
    photo_ratio = photo_count / count
    evidence_pts = min(10.0, (verified_ratio * 6.0) + (photo_ratio * 4.0))
    evidence_reason = (
        f"{verified_count}/{count} verified reports, "
        f"{photo_count}/{count} accompanied by photographic field evidence."
    )

    total_score = round(frequency_pts + severity_pts + recency_pts + density_pts + evidence_pts)
    total_score = max(0, min(100, total_score))

    if total_score >= 80:
        risk_level = "Critical"
        risk_color = "red"
    elif total_score >= 55:
        risk_level = "High"
        risk_color = "orange"
    elif total_score >= 30:
        risk_level = "Medium"
        risk_color = "amber"
    else:
        risk_level = "Low"
        risk_color = "emerald"

    return {
        "zone_name": zone_name,
        "risk_score": total_score,
        "risk_level": risk_level,
        "risk_color": risk_color,
        "active_incidents": count,
        "breakdown": {
            "frequency_score": {
                "points": round(frequency_pts, 1),
                "max": 25,
                "percentage": round((frequency_pts / 25) * 100),
                "reason": frequency_reason
            },
            "severity_score": {
                "points": round(severity_pts, 1),
                "max": 30,
                "percentage": round((severity_pts / 30) * 100),
                "reason": severity_reason
            },
            "recency_score": {
                "points": round(recency_pts, 1),
                "max": 20,
                "percentage": round((recency_pts / 20) * 100),
                "reason": recency_reason
            },
            "density_score": {
                "points": round(density_pts, 1),
                "max": 15,
                "percentage": round((density_pts / 15) * 100),
                "reason": density_reason
            },
            "evidence_score": {
                "points": round(evidence_pts, 1),
                "max": 10,
                "percentage": round((evidence_pts / 10) * 100),
                "reason": evidence_reason
            }
        },
        "formula_explanation": (
            "Composite Risk Score (0-100) = Frequency (25%) + Peak/Average Severity (30%) + "
            "Temporal Recency (20%) + Spatial Density (15%) + Evidence Credibility (10%)."
        ),
        "disclaimer": RISK_DISCLAIMER
    }
