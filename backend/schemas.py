"""
Pydantic Schemas for Request & Response Validation
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class IncidentCreate(BaseModel):
    reporter_name: Optional[str] = Field(None, description="Reporter full name (optional)")
    reporter_contact: Optional[str] = Field(None, description="Phone or email (optional)")
    hazard_category: str = Field(..., description="Hazard type category")
    description: str = Field(..., min_length=5, description="Incident description")
    location_name: str = Field(..., min_length=2, description="Place or landmark name")
    state: str = Field(..., description="Indian coastal state")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude coordinate")
    severity: str = Field("Medium", description="Low, Medium, High, or Critical")
    image_url: Optional[str] = Field("", description="URL or upload path of photo evidence")


class IncidentStatusUpdate(BaseModel):
    status: str = Field(..., description="Pending, Under Review, Verified, or Rejected")
    verification_remarks: Optional[str] = Field(None, description="Officer verification remarks")
    verified_by: Optional[str] = Field("Disaster Management Officer", description="Name/Role of reviewer")


class ClusterRunRequest(BaseModel):
    eps_km: float = Field(35.0, ge=5.0, le=200.0, description="DBSCAN neighborhood radius in km")
    min_samples: int = Field(2, ge=2, le=20, description="Minimum incident points to form cluster")
    group_by_hazard: bool = Field(False, description="Whether to cluster strictly within same hazard category")


class AlertReadUpdate(BaseModel):
    is_read: bool = True
