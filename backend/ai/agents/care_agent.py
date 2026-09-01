"""
Agent 4: Care Agent (Post-Discharge & Medication Guidance)
Generates structured medication reminders, dosage precautions, and discharge instructions.
"""

from typing import Dict, Any, List, Optional

def generate_care_reminders(
    consultation_summary: str,
    prescribed_medications: Optional[List[Dict[str, str]]] = None
) -> List[Dict[str, Any]]:
    """Generates structured medication reminders and wellness check schedule."""
    reminders = []
    meds = prescribed_medications or []
    
    for idx, med in enumerate(meds, 1):
        name = med.get("name", f"Prescribed Medication #{idx}")
        frequency = med.get("frequency", "Once daily with food")
        reminders.append({
            "reminder_id": f"rem_{idx}",
            "title": f"Take {name}",
            "schedule": frequency,
            "instruction": f"Follow prescribing physician's directions. Do not exceed stated dosage.",
            "completed": False
        })

    # Default follow-up reminder
    reminders.append({
        "reminder_id": f"rem_followup",
        "title": "Specialist Follow-Up Consultation",
        "schedule": "Within 7–14 days",
        "instruction": "Schedule follow-up appointment if symptoms do not improve or worsen.",
        "completed": False
    })

    return reminders
