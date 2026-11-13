# COASTGUARD AI — AI Incident Clustering Methodology

## 1. DBSCAN (Density-Based Spatial Clustering of Applications with Noise)

Unlike centroid-based clustering (such as K-Means), DBSCAN requires no prior assumption regarding the number of clusters. This is essential for maritime hazard surveillance because:
- The number of active emergencies is dynamic and unpredictable.
- Hazard zones form arbitrary, non-spherical shapes along coastal contours (e.g., elongated beaches, estuarine inlets).
- Isolated reports that do not meet density criteria must be isolated as **noise points**, preventing false alarms.

## 2. Spherical Haversine Distance Formulation

Euclidean distance calculations on planar $(x, y)$ coordinates fail on geographic coordinates due to the curvature of the Earth and meridional convergence towards higher latitudes.

CoastGuard AI implements the spherical **Haversine formula**:

$$\Delta\sigma = 2 \arcsin \left( \sqrt{ \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right) } \right)$$

$$d = R \cdot \Delta\sigma$$

Where:
- $\phi_1, \phi_2$ = latitudes of points in radians
- $\Delta\phi = \phi_2 - \phi_1$
- $\Delta\lambda = \lambda_2 - \lambda_1$ (longitude difference in radians)
- $R = 6,371.0088\text{ km}$ (Earth volumetric mean radius)
- $d$ = Great-circle distance in kilometers

## 3. Density-Reachability & Cluster Identification

For each incident $P \in \mathcal{D}$:
1. **$\epsilon$-Neighborhood**:
   $$N_\epsilon(P) = \{ Q \in \mathcal{D} \mid \text{dist}_{\text{haversine}}(P, Q) \le \epsilon \}$$

2. **Core Point Condition**:
   $$|N_\epsilon(P)| \ge \text{MinSamples}$$

3. **Cluster Expansion**:
   If $P$ is a core point, it forms a cluster seed. Any point $Q \in N_\epsilon(P)$ is added to the cluster. If $Q$ is also a core point, its neighborhood is transitively merged into the cluster.

4. **Noise Identification**:
   Points not density-reachable from any core point are assigned label `-1` (noise).

## 4. Parameter Tuning Guidelines

- **$\epsilon$ (Neighborhood Radius)**: Default is $35\text{ km}$. Tunable from $10\text{ km}$ (localized bay) to $100\text{ km}$ (regional cyclone/storm surge swell).
- **MinSamples**: Default is $2\text{ incidents}$. Tunable from $2$ to $6$. Setting to $2$ allows two corroborating reports to flag an emergent cluster.
