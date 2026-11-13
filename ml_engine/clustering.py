"""
DBSCAN Incident Clustering Module for Coastal Hazards
Implements the canonical DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
algorithm with true spherical Haversine distance metric.
"""

import math
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Tuple
import numpy as np

# Earth mean radius in kilometers
EARTH_RADIUS_KM = 6371.0088

SEVERITY_WEIGHTS = {
    "Low": 1.0,
    "Medium": 2.0,
    "High": 3.5,
    "Critical": 5.0
}


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two geographic coordinates
    on the earth (in decimal degrees) using the Haversine formula.
    """
    lat1_rad, lon1_rad = math.radians(lat1), math.radians(lon1)
    lat2_rad, lon2_rad = math.radians(lat2), math.radians(lon2)

    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad

    a = math.sin(dlat / 2.0) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2.0) ** 2
    c = 2.0 * math.asin(math.sqrt(max(0.0, min(1.0, a))))
    return EARTH_RADIUS_KM * c


def compute_cluster_severity(incident_list: List[Dict[str, Any]]) -> str:
    """Determine aggregate severity level for a cluster of incidents."""
    if not incident_list:
        return "Low"
    
    weights = [SEVERITY_WEIGHTS.get(inc.get("severity", "Low"), 1.0) for inc in incident_list]
    max_weight = max(weights)
    avg_weight = sum(weights) / len(weights)
    
    # Combined score emphasizing both highest threat and cluster density
    composite = (0.6 * max_weight) + (0.4 * avg_weight)
    
    if composite >= 4.2 or max_weight >= 5.0:
        return "Critical"
    elif composite >= 3.0 or max_weight >= 3.5:
        return "High"
    elif composite >= 1.8:
        return "Medium"
    else:
        return "Low"


def calculate_bounding_polygon(points: List[Tuple[float, float]], buffer_km: float = 8.0) -> List[List[float]]:
    """
    Compute polygon boundary [lat, lon] for Leaflet map overlay.
    Creates an approximate convex bounding polygon with buffer.
    """
    if not points:
        return []
    if len(points) == 1:
        lat, lon = points[0]
        # Small diamond buffer
        delta = buffer_km / 111.0
        return [
            [lat + delta, lon],
            [lat, lon + delta],
            [lat - delta, lon],
            [lat, lon - delta]
        ]
    
    # Graham scan or simple sorted polar boundary
    lats = [p[0] for p in points]
    lons = [p[1] for p in points]
    clat = sum(lats) / len(lats)
    clon = sum(lons) / len(lons)
    
    # Sort points radially around centroid
    def angle_from_centroid(p):
        return math.atan2(p[0] - clat, p[1] - clon)
    
    sorted_pts = sorted(points, key=angle_from_centroid)
    return [[p[0], p[1]] for p in sorted_pts]


def run_coastal_dbscan(
    incidents: List[Dict[str, Any]],
    eps_km: float = 35.0,
    min_samples: int = 2,
    group_by_hazard: bool = False
) -> Dict[str, Any]:
    """
    Execute DBSCAN clustering on crowdsourced coastal incidents using Haversine distance metric.
    
    Algorithm (Ester et al.):
    - Computes pairwise great-circle distance matrix.
    - Identifies core points with >= min_samples within eps_km.
    - Expands density-reachable clusters.
    - Marks noise points (label -1).
    """
    n = len(incidents)
    if n == 0:
        return {
            "clusters": [],
            "noise_incidents": [],
            "clustered_incidents": [],
            "metrics": {
                "total_incidents": 0,
                "clustered_count": 0,
                "noise_count": 0,
                "cluster_count": 0,
                "eps_km": eps_km,
                "min_samples": min_samples
            }
        }

    # Extract coordinates
    coords = [(float(inc["latitude"]), float(inc["longitude"])) for inc in incidents]

    # Precompute pairwise Haversine distance matrix in kilometers
    dist_matrix = np.zeros((n, n), dtype=np.float64)
    for i in range(n):
        for j in range(i + 1, n):
            d = haversine_distance_km(coords[i][0], coords[i][1], coords[j][0], coords[j][1])
            # Optional hazard restriction
            if group_by_hazard and incidents[i].get("hazard_category") != incidents[j].get("hazard_category"):
                d = 999999.0
            dist_matrix[i, j] = d
            dist_matrix[j, i] = d

    # DBSCAN execution
    labels = [-1] * n
    visited = [False] * n
    cluster_id_counter = 0

    for i in range(n):
        if visited[i]:
            continue
        visited[i] = True

        # Find epsilon neighbors of point i
        neighbors = [j for j in range(n) if dist_matrix[i, j] <= eps_km]

        if len(neighbors) < min_samples:
            labels[i] = -1  # Mark as noise
        else:
            # Start new cluster
            current_cluster = cluster_id_counter
            labels[i] = current_cluster
            cluster_id_counter += 1

            # Seed set expansion
            seed_set = list(neighbors)
            seed_set.remove(i)
            queue_idx = 0

            while queue_idx < len(seed_set):
                current_p = seed_set[queue_idx]
                queue_idx += 1

                if not visited[current_p]:
                    visited[current_p] = True
                    current_neighbors = [j for j in range(n) if dist_matrix[current_p, j] <= eps_km]
                    if len(current_neighbors) >= min_samples:
                        for n_point in current_neighbors:
                            if n_point not in seed_set and n_point != i:
                                seed_set.append(n_point)

                if labels[current_p] == -1:
                    labels[current_p] = current_cluster

    # Group results into clusters and noise
    clusters_dict: Dict[int, List[Dict[str, Any]]] = {}
    noise_list: List[Dict[str, Any]] = []

    for idx, label in enumerate(labels):
        inc = incidents[idx]
        if label == -1:
            inc["cluster_id"] = None
            inc["is_noise"] = True
            noise_list.append(inc)
        else:
            inc["cluster_id"] = f"CLS-{label + 1:03d}"
            inc["is_noise"] = False
            if label not in clusters_dict:
                clusters_dict[label] = []
            clusters_dict[label].append(inc)

    generated_clusters = []
    clustered_incidents = []

    for cluster_label, cluster_incidents in sorted(clusters_dict.items()):
        clustered_incidents.extend(cluster_incidents)

        lats = [float(inc["latitude"]) for inc in cluster_incidents]
        lons = [float(inc["longitude"]) for inc in cluster_incidents]
        centroid_lat = float(np.mean(lats))
        centroid_lon = float(np.mean(lons))

        distances = [
            haversine_distance_km(centroid_lat, centroid_lon, float(inc["latitude"]), float(inc["longitude"]))
            for inc in cluster_incidents
        ]
        max_dist_km = max(distances) if distances else 0.0
        display_radius_km = max(round(max_dist_km + 4.0, 2), 6.0)

        points = [(float(inc["latitude"]), float(inc["longitude"])) for inc in cluster_incidents]
        hull_coords = calculate_bounding_polygon(points, buffer_km=display_radius_km)

        state_counts: Dict[str, int] = {}
        hazard_counts: Dict[str, int] = {}
        for inc in cluster_incidents:
            st = inc.get("state") or "Coastal Zone"
            hz = inc.get("hazard_category") or "General Hazard"
            state_counts[st] = state_counts.get(st, 0) + 1
            hazard_counts[hz] = hazard_counts.get(hz, 0) + 1

        dominant_state = max(state_counts, key=state_counts.get)
        dominant_hazard = max(hazard_counts, key=hazard_counts.get)
        severity_level = compute_cluster_severity(cluster_incidents)

        # Cluster risk calculation (0-100)
        count_factor = min(len(cluster_incidents) * 5, 30)
        sev_factor = {"Low": 10, "Medium": 20, "High": 30, "Critical": 40}.get(severity_level, 15)
        density_factor = 25 if max_dist_km < 15.0 else (15 if max_dist_km < 30.0 else 10)
        cluster_risk_score = min(count_factor + sev_factor + density_factor, 100)

        cluster_id = f"CLS-{cluster_label + 1:03d}"
        cluster_name = f"{dominant_state} {dominant_hazard} Cluster ({cluster_id})"

        cluster_obj = {
            "cluster_id": cluster_id,
            "cluster_index": cluster_label + 1,
            "name": cluster_name,
            "state": dominant_state,
            "hazard_category": dominant_hazard,
            "centroid_latitude": round(centroid_lat, 5),
            "centroid_longitude": round(centroid_lon, 5),
            "radius_km": display_radius_km,
            "actual_max_distance_km": round(max_dist_km, 2),
            "incident_count": len(cluster_incidents),
            "severity_level": severity_level,
            "risk_score": cluster_risk_score,
            "polygon_hull": hull_coords,
            "hazard_distribution": hazard_counts,
            "state_distribution": state_counts,
            "incident_ids": [inc["incident_id"] for inc in cluster_incidents],
            "incidents": cluster_incidents,
            "created_at": datetime.utcnow().isoformat() + "Z"
        }
        generated_clusters.append(cluster_obj)

    metrics = {
        "total_incidents": len(incidents),
        "clustered_count": len(clustered_incidents),
        "noise_count": len(noise_list),
        "cluster_count": len(generated_clusters),
        "eps_km": eps_km,
        "min_samples": min_samples,
        "clustering_algorithm": "DBSCAN (Haversine Metric Distance Matrix)"
    }

    return {
        "clusters": generated_clusters,
        "noise_incidents": noise_list,
        "clustered_incidents": clustered_incidents,
        "metrics": metrics
    }
