"""
Agent 2: Scheduling & Booking Agent
Manages appointment allocation, specialty matching, and conflict-free slot reservation.
"""

from typing import Dict, Any, List, Optional
import datetime

DEFAULT_SPECIALTY_DOCTORS = {
    "Cardiology": [
        {"id": "doc_card_1", "name": "Dr. Sarah Jenkins, MD", "title": "Senior Cardiologist", "room": "Clinic 302"},
        {"id": "doc_card_2", "name": "Dr. Robert Vance, MD", "title": "Interventional Cardiology", "room": "Clinic 304"}
    ],
    "Endocrinology": [
        {"id": "doc_endo_1", "name": "Dr. Emily Wong, MD", "title": "Endocrinologist & Metabolism", "room": "Clinic 201"},
        {"id": "doc_endo_2", "name": "Dr. Rajesh Patel, MD", "title": "Thyroid & Diabetes Specialist", "room": "Clinic 205"}
    ],
    "Pulmonology": [
        {"id": "doc_pulm_1", "name": "Dr. Michael Chang, MD", "title": "Pulmonologist & Sleep Medicine", "room": "Clinic 401"}
    ],
    "Gastroenterology": [
        {"id": "doc_gastro_1", "name": "Dr. Elena Rostova, MD", "title": "Gastroenterologist", "room": "Clinic 108"}
    ],
    "General Medicine": [
        {"id": "doc_gen_1", "name": "Dr. David Miller, MD", "title": "Internal Medicine Physician", "room": "Clinic 101"},
        {"id": "doc_gen_2", "name": "Dr. Lisa Taylor, MD", "title": "Primary Care Physician", "room": "Clinic 102"}
    ]
}

def get_available_specialists(department: str = "General Medicine") -> List[Dict[str, Any]]:
    """Retrieve available doctors and slots for a given clinical department."""
    doctors = DEFAULT_SPECIALTY_DOCTORS.get(department, DEFAULT_SPECIALTY_DOCTORS["General Medicine"])
    base_time = datetime.datetime.now() + datetime.timedelta(days=1)
    
    result = []
    for doc in doctors:
        slots = []
        for hour in [9, 10, 11, 14, 15, 16]:
            slot_dt = base_time.replace(hour=hour, minute=0, second=0, microsecond=0)
            slots.append({
                "slot_id": f"{doc['id']}_{slot_dt.strftime('%Y%m%d%H%M')}",
                "formatted_time": slot_dt.strftime("%A, %b %d at %I:%M %p"),
                "iso_time": slot_dt.isoformat(),
                "available": True
            })
        result.append({
            **doc,
            "department": department,
            "available_slots": slots
        })
    return result

def run_scheduling_agent(department: str, preferred_date: Optional[str] = None) -> Dict[str, Any]:
    """Execute doctor specialty lookup and available slots generation."""
    specialists = get_available_specialists(department)
    return {
        "department": department,
        "specialists_count": len(specialists),
        "specialists": specialists
    }
