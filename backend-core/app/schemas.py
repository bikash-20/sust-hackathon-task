from pydantic import BaseModel, Field
from typing import List, Optional

class Medication(BaseModel):
    name: str
    dosage: Optional[str]
    frequency: Optional[str]
    route: Optional[str]

class LabResult(BaseModel):
    test_name: str
    value: Optional[float]
    units: Optional[str]

class OCRParseResult(BaseModel):
    medications: List[Medication] = []
    diagnoses: List[str] = []
    labs: List[LabResult] = []
    raw_text: Optional[str]

class TriageResponse(BaseModel):
    triage_severity: str = Field(..., description='One of Green/Yellow/Red/Black')
    clinical_reasoning: str
    differential_diagnoses: List[str]
    immediate_recommendations: List[str]
    referral_urgency: str
