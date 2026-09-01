"""
CarePulse Real-Time Drug-Drug Interaction & Allergy Guard Engine.
Cross-checks proposed prescriptions against patient active medications and documented allergies.
"""

from typing import List, Dict, Any, Optional

# Clinical Contraindication & Drug Interaction Registry
INTERACTION_REGISTRY = [
    {
        "drug_a_keywords": ["ibuprofen", "naproxen", "aspirin", "diclofenac", "meloxicam", "nsaid"],
        "drug_b_keywords": ["lisinopril", "enalapril", "losartan", "valsartan", "ramipril", "ace inhibitor", "arb"],
        "risk_level": "CRITICAL_CONTRAINDICATION",
        "title": "NSAID + ACE Inhibitor / ARB Severe Interaction",
        "description": "Concurrent use attenuates antihypertensive effect and significantly elevates risk of acute kidney injury ('Triple Whammy' effect).",
        "alternative_recommendation": "Use Acetaminophen (Paracetamol) up to 3000mg/day for pain relief instead of NSAIDs."
    },
    {
        "drug_a_keywords": ["ibuprofen", "naproxen", "diclofenac", "nsaid"],
        "drug_b_keywords": ["warfarin", "aspirin", "apixaban", "rivaroxaban", "clopidogrel", "heparin"],
        "risk_level": "CRITICAL_CONTRAINDICATION",
        "title": "NSAID + Anticoagulant High Bleeding Risk",
        "description": "Synergistic inhibition of platelet aggregation and gastric mucosal erosion increases risk of severe upper gastrointestinal hemorrhage.",
        "alternative_recommendation": "Avoid NSAIDs completely. Use Acetaminophen for pain control."
    },
    {
        "drug_a_keywords": ["atorvastatin", "simvastatin", "rosuvastatin", "statin"],
        "drug_b_keywords": ["fluconazole", "ketoconazole", "itraconazole", "gemfibrozil", "fenofibrate"],
        "risk_level": "MAJOR_INTERACTION",
        "title": "Statin + Azole Antifungal / Fibrate Severe Myopathy Risk",
        "description": "Inhibition of CYP3A4 metabolism increases systemic statin concentration, elevating risk of severe myopathy and fatal rhabdomyolysis.",
        "alternative_recommendation": "Temporarily withhold statin during antifungal therapy course."
    },
    {
        "drug_a_keywords": ["metformin"],
        "drug_b_keywords": ["contrast", "radiocontrast", "iohexol"],
        "risk_level": "MODERATE_INTERACTION",
        "title": "Metformin + Iodinated Contrast Lactic Acidosis Warning",
        "description": "Contrast-induced acute renal failure may cause metformin accumulation and severe lactic acidosis.",
        "alternative_recommendation": "Discontinue Metformin prior to or at time of procedure and withhold for 48 hours post-procedure."
    }
]

ALLERGY_MAPPINGS = [
    {
        "allergy_keywords": ["penicillin", "penicillins", "amoxicillin", "ampicillin"],
        "trigger_keywords": ["amoxicillin", "ampicillin", "augmentin", "penicillin", "piperacillin"],
        "risk_level": "CRITICAL_CONTRAINDICATION",
        "title": "Severe Beta-Lactam Penicillin Allergy Trigger",
        "description": "Patient has documented Penicillin allergy. Administering beta-lactam antibiotics carries high risk of severe anaphylaxis, bronchospasm, and angioedema.",
        "alternative_recommendation": "Switch to Macrolides (Azithromycin, Clarithromycin) or Fluoroquinolones."
    },
    {
        "allergy_keywords": ["sulfa", "sulfonamide", "trimethoprim"],
        "trigger_keywords": ["bactrim", "septra", "sulfamethoxazole", "sulfasalazine"],
        "risk_level": "CRITICAL_CONTRAINDICATION",
        "title": "Sulfonamide Allergy Trigger",
        "description": "Patient has documented Sulfa allergy. Risk of severe cutaneous adverse reactions (SCAR / Stevens-Johnson syndrome).",
        "alternative_recommendation": "Use Nitrofurantoin or Ciprofloxacin for urinary tract infections."
    },
    {
        "allergy_keywords": ["nsaid", "aspirin", "ibuprofen"],
        "trigger_keywords": ["ibuprofen", "naproxen", "aspirin", "diclofenac", "ketorolac"],
        "risk_level": "CRITICAL_CONTRAINDICATION",
        "title": "NSAID Hypersensitivity Reaction",
        "description": "Patient has documented NSAID hypersensitivity. Risk of acute bronchospasm, urticaria, or anaphylaxis.",
        "alternative_recommendation": "Use Acetaminophen (Paracetamol) or Tramadol under medical supervision."
    }
]

def check_drug_interactions(
    proposed_medications: List[str],
    active_medications: Optional[List[str]] = None,
    allergies: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Evaluates proposed medications against patient active meds and allergies.
    Returns detected safety alerts, overall risk tier, and clinical recommendations.
    """
    active_meds = [m.lower().strip() for m in (active_medications or [])]
    proposed_meds = [m.lower().strip() for m in proposed_medications]
    patient_allergies = [a.lower().strip() for a in (allergies or [])]

    alerts = []
    highest_risk = "SAFE"

    # 1. Allergy Cross-Checking
    for prop in proposed_meds:
        for allergy in patient_allergies:
            for rule in ALLERGY_MAPPINGS:
                allergy_match = any(ak in allergy for ak in rule["allergy_keywords"])
                trigger_match = any(tk in prop for tk in rule["trigger_keywords"])
                if allergy_match and trigger_match:
                    alerts.append({
                        "category": "ALLERGY_CONTRAINDICATION",
                        "proposed_drug": prop.capitalize(),
                        "conflict_item": f"Documented Allergy: {allergy.capitalize()}",
                        "risk_level": rule["risk_level"],
                        "title": rule["title"],
                        "description": rule["description"],
                        "alternative_recommendation": rule["alternative_recommendation"]
                    })
                    highest_risk = "CRITICAL_CONTRAINDICATION"

    # 2. Drug-Drug Interaction Checking
    all_meds = proposed_meds + active_meds
    for i in range(len(proposed_meds)):
        p_drug = proposed_meds[i]
        for existing in active_meds:
            if p_drug == existing:
                alerts.append({
                    "category": "DUPLICATE_THERAPY",
                    "proposed_drug": p_drug.capitalize(),
                    "conflict_item": f"Active Medication: {existing.capitalize()}",
                    "risk_level": "MODERATE_INTERACTION",
                    "title": "Duplicate Therapeutic Class / Exact Drug Overlap",
                    "description": f"Patient is already taking {existing.capitalize()}. Duplicate prescribing may cause dose toxicity.",
                    "alternative_recommendation": "Confirm if intention is dose adjustment rather than duplicate prescription."
                })
                if highest_risk not in ["CRITICAL_CONTRAINDICATION", "MAJOR_INTERACTION"]:
                    highest_risk = "MODERATE_INTERACTION"

            for rule in INTERACTION_REGISTRY:
                match_a_p = any(ka in p_drug for ka in rule["drug_a_keywords"])
                match_b_ex = any(kb in existing for kb in rule["drug_b_keywords"])
                match_b_p = any(kb in p_drug for kb in rule["drug_b_keywords"])
                match_a_ex = any(ka in existing for ka in rule["drug_a_keywords"])

                if (match_a_p and match_b_ex) or (match_b_p and match_a_ex):
                    r_lvl = rule["risk_level"]
                    alerts.append({
                        "category": "DRUG_DRUG_INTERACTION",
                        "proposed_drug": p_drug.capitalize(),
                        "conflict_item": f"Active Medication: {existing.capitalize()}",
                        "risk_level": r_lvl,
                        "title": rule["title"],
                        "description": rule["description"],
                        "alternative_recommendation": rule["alternative_recommendation"]
                    })
                    if r_lvl == "CRITICAL_CONTRAINDICATION":
                        highest_risk = "CRITICAL_CONTRAINDICATION"
                    elif r_lvl == "MAJOR_INTERACTION" and highest_risk != "CRITICAL_CONTRAINDICATION":
                        highest_risk = "MAJOR_INTERACTION"
                    elif r_lvl == "MODERATE_INTERACTION" and highest_risk not in ["CRITICAL_CONTRAINDICATION", "MAJOR_INTERACTION"]:
                        highest_risk = "MODERATE_INTERACTION"

    is_safe = (highest_risk == "SAFE")
    summary_text = (
        "Prescription verified safe. No documented drug collisions or allergy contraindications detected."
        if is_safe else
        f"SAFETY ALERT: Found {len(alerts)} clinical contraindications/interactions. Highest severity: {highest_risk}."
    )

    return {
        "is_safe": is_safe,
        "overall_risk_level": highest_risk,
        "total_alerts": len(alerts),
        "alerts": alerts,
        "summary": summary_text,
        "disclaimer": "Clinical Decision Support System (CDSS) alert. Prescribing physician maintains ultimate responsibility for patient therapy."
    }
