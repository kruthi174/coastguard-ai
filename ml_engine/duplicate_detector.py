"""
NLP and Spatio-Temporal Duplicate Report Detection Engine
Combines:
1. Haversine Geographic Distance (< 20 km)
2. Temporal Window (< 72 hours)
3. Hazard Category Match
4. TF-IDF Text Cosine Similarity on descriptions
"""

import math
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from ml_engine.clustering import haversine_distance_km


def parse_timestamp(ts_val: Any) -> Optional[datetime]:
    """Parse various timestamp formats into a datetime object."""
    if not ts_val:
        return None
    if isinstance(ts_val, datetime):
        return ts_val
    if isinstance(ts_val, str):
        clean_ts = ts_val.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(clean_ts)
        except Exception:
            for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d-%m-%Y %H:%M"):
                try:
                    return datetime.strptime(ts_val, fmt)
                except Exception:
                    pass
    return None


def calculate_text_similarity(text1: str, text2: str) -> float:
    """Calculate TF-IDF Cosine Similarity between two hazard descriptions."""
    if not text1 or not text2:
        return 0.0
    
    t1 = text1.strip().lower()
    t2 = text2.strip().lower()
    
    if t1 == t2:
        return 1.0
    
    try:
        vectorizer = TfidfVectorizer(stop_words='english', min_df=1, ngram_range=(1, 2))
        tfidf_matrix = vectorizer.fit_transform([t1, t2])
        sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        return float(sim)
    except Exception:
        # Fallback to Jaccard token overlap
        words1 = set(t1.split())
        words2 = set(t2.split())
        union = words1.union(words2)
        if not union:
            return 0.0
        return float(len(words1.intersection(words2)) / len(union))


def check_for_duplicates(
    candidate: Dict[str, Any],
    existing_incidents: List[Dict[str, Any]],
    spatial_threshold_km: float = 20.0,
    time_threshold_hours: float = 72.0,
    similarity_threshold: float = 0.55
) -> Optional[Dict[str, Any]]:
    """
    Evaluate candidate incident against existing reports.
    Returns details of the highest confidence match if above threshold, else None.
    """
    candidate_lat = float(candidate.get("latitude", 0.0))
    candidate_lon = float(candidate.get("longitude", 0.0))
    candidate_hazard = candidate.get("hazard_category", "").strip().lower()
    candidate_desc = candidate.get("description", "")
    candidate_id = candidate.get("id") or candidate.get("incident_id")
    candidate_time = parse_timestamp(candidate.get("reported_at")) or datetime.utcnow()

    best_match = None
    highest_score = 0.0

    for existing in existing_incidents:
        existing_id = existing.get("id") or existing.get("incident_id")
        # Do not compare against self
        if candidate_id and candidate_id == existing_id:
            continue

        existing_lat = float(existing.get("latitude", 0.0))
        existing_lon = float(existing.get("longitude", 0.0))
        dist_km = haversine_distance_km(candidate_lat, candidate_lon, existing_lat, existing_lon)

        # Check spatial threshold
        if dist_km > spatial_threshold_km:
            continue

        # Check temporal threshold if times exist
        existing_time = parse_timestamp(existing.get("reported_at"))
        time_diff_hours = 0.0
        if existing_time and candidate_time:
            time_diff_hours = abs((candidate_time - existing_time).total_seconds()) / 3600.0
            if time_diff_hours > time_threshold_hours:
                continue

        # Hazard category check
        existing_hazard = existing.get("hazard_category", "").strip().lower()
        hazard_match = 1.0 if candidate_hazard == existing_hazard else 0.4

        # Text similarity
        text_sim = calculate_text_similarity(candidate_desc, existing.get("description", ""))

        # Multi-factor composite confidence score (0 to 100%)
        # 1. Spatial proximity component (0 - 40 points): closer = higher
        spatial_score = max(0.0, (1.0 - (dist_km / spatial_threshold_km)) * 40.0)

        # 2. Semantic text similarity (0 - 35 points)
        semantic_score = text_sim * 35.0

        # 3. Hazard category match (0 - 15 points)
        category_score = 15.0 if candidate_hazard == existing_hazard else 0.0

        # 4. Temporal recency (0 - 10 points)
        time_score = max(0.0, (1.0 - (time_diff_hours / time_threshold_hours)) * 10.0)

        composite_score = spatial_score + semantic_score + category_score + time_score

        if composite_score > highest_score and composite_score >= (similarity_threshold * 100.0):
            highest_score = composite_score
            best_match = {
                "matched_incident_id": existing.get("incident_id") or str(existing.get("id")),
                "matched_incident_location": existing.get("location_name", "Unknown"),
                "matched_hazard": existing.get("hazard_category"),
                "distance_km": round(dist_km, 2),
                "time_difference_hours": round(time_diff_hours, 1),
                "text_similarity_percent": round(text_sim * 100, 1),
                "duplicate_confidence_percent": round(composite_score, 1),
                "is_potential_duplicate": True,
                "reasons": [
                    f"Reported {round(dist_km, 1)} km away (within {spatial_threshold_km} km zone)",
                    f"Reported {round(time_diff_hours, 1)} hours apart",
                    f"Text similarity {round(text_sim * 100)}% on incident description",
                    f"Category match: {'Identical' if candidate_hazard == existing_hazard else 'Related'}"
                ]
            }

    return best_match
