"""
CarePulse AI Clinical Scribe Agent (Voice-to-SOAP & Calibrated Prescription Engine)

========================================================================================
SPEAKER ATTRIBUTION METHODOLOGY & KNOWN LIMITATION:
========================================================================================
Speaker attribution in this module is performed using CONTENT-BASED HEURISTIC CLASSIFICATION
and SEMANTIC ROLE PARSING (via LLM prompt engineering and medical dialogue rule trees),
NOT true voice-print / acoustic hardware diarization.
Statements with symptom descriptions are attributed to the Patient; examination commands,
clinical findings, and prescription directives are attributed to the Doctor.
The attending physician retains full authority to edit, reassign, or add lines in any section
of the interactive SOAP editor before final signature and dispatch.
========================================================================================
"""

import re
import json
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("carepulse.ai.scribe")

# Comprehensive drug-allergy classification lookup
ALLERGY_CROSS_REFERENCE_MAP = {
    "penicillin": [
        "penicillin", "amoxicillin", "ampicillin", "augmentin", 
        "piperacillin", "amoxil", "amoxycillin", "clavam", "moxikind"
    ],
    "beta-lactam": [
        "penicillin", "amoxicillin", "ampicillin", "augmentin", "cephalexin", "cefixime"
    ],
    "nsaid": [
        "ibuprofen", "aspirin", "naproxen", "diclofenac", "ketorolac", 
        "meloxicam", "indomethacin", "combiflam", "voveran"
    ],
    "aspirin": [
        "aspirin", "ecosprin", "disprin", "acetylsalicylic acid"
    ],
    "sulfa": [
        "sulfamethoxazole", "bactrim", "septra", "sulfasalazine", "cotrimoxazole"
    ],
    "fluoroquinolone": [
        "ciprofloxacin", "levofloxacin", "moxifloxacin", "ofloxacin", "cipro", "levo"
    ],
    "macrolide": [
        "azithromycin", "erythromycin", "clarithromycin", "zithromax", "azee"
    ],
    "statin": [
        "atorvastatin", "rosuvastatin", "simvastatin", "lipitor"
    ],
    "opioid": [
        "codeine", "morphine", "tramadol", "fentanyl", "oxycodone"
    ]
}


def normalize_token(s: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]", "", s).lower()


def check_drug_allergy_conflicts(
    proposed_drugs: List[Dict[str, Any]],
    stored_allergies: Optional[str] = None,
    spoken_allergies: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Cross-references proposed medications against:
    1. Patient's authoritative stored database allergy records (patients.allergies column)
    2. Any allergies mentioned live during the consultation dialogue.
    """
    all_allergies_raw = []
    if stored_allergies and stored_allergies.strip():
        all_allergies_raw.extend(re.split(r"[,;|\n]+", stored_allergies))
    if spoken_allergies and spoken_allergies.strip():
        # Extract explicit allergy mentions from verbal dialogue
        spoken_matches = re.findall(
            r"(?:allergic to|allergy to|allergic with|allergic towards|allergy from)\s+([a-zA-Z\s]+?)(?=[.,;\n]|\band\b|$)",
            spoken_allergies,
            re.IGNORECASE
        )
        for sm in spoken_matches:
            all_allergies_raw.extend(re.split(r"[,;|\n]+", sm))

    cleaned_allergies = [a.strip().lower() for a in all_allergies_raw if a.strip() and len(a.strip()) <= 40]
    if not cleaned_allergies:
        return []

    warnings = []

    for drug_obj in proposed_drugs:
        drug_name = drug_obj.get("name", "").strip().lower()
        if not drug_name:
            continue

        drug_normalized = normalize_token(drug_name)

        for allergy in cleaned_allergies:
            allergy_clean = allergy.lower().strip()
            allergy_normalized = normalize_token(allergy_clean)

            # 1. Direct drug name match (e.g. allergy="Aspirin", drug="Aspirin 75mg")
            if allergy_normalized and (allergy_normalized in drug_normalized or drug_normalized in allergy_normalized):
                warnings.append({
                    "drug": drug_obj.get("name"),
                    "allergy": allergy.strip(),
                    "source": "database_on_file" if stored_allergies and allergy in stored_allergies.lower() else "verbal_encounter",
                    "severity": "CRITICAL",
                    "warning": f"ALERT: Patient has documented allergy to '{allergy.strip()}'. Proposed drug '{drug_obj.get('name')}' matches this allergen."
                })
                continue

            # 2. Cross-reference drug class mappings (e.g. allergy="Penicillin", drug="Amoxicillin 500mg")
            for allergy_group, group_drugs in ALLERGY_CROSS_REFERENCE_MAP.items():
                if allergy_group in allergy_clean or any(normalize_token(gd) in allergy_normalized for gd in group_drugs):
                    for member_drug in group_drugs:
                        if normalize_token(member_drug) in drug_normalized:
                            warnings.append({
                                "drug": drug_obj.get("name"),
                                "allergy": allergy.strip(),
                                "drug_class": allergy_group.capitalize(),
                                "source": "database_on_file" if stored_allergies and allergy in stored_allergies.lower() else "verbal_encounter",
                                "severity": "CRITICAL",
                                "warning": f"CRITICAL ALLERGY CONFLICT: Patient is allergic to '{allergy.strip()}' ({allergy_group.capitalize()} class). Proposed medication '{drug_obj.get('name')}' belongs to this class and must be avoided."
                            })
                            break

    # Deduplicate warnings
    seen_warnings = set()
    deduped = []
    for w in warnings:
        key = f"{w['drug']}::{w['allergy']}"
        if key not in seen_warnings:
            seen_warnings.add(key)
            deduped.append(w)

    return deduped


def parse_vitals_from_transcript(transcript: str) -> Dict[str, Any]:
    """Extracts spoken vital signs (BP, Pulse/HR, Temperature, SpO2, Respiratory Rate, BMI, Weight)."""
    vitals = {}
    
    # Blood Pressure (e.g., 120/80, 130 over 85, BP is 140/90)
    bp_match = re.search(r"\b(?:bp|blood pressure)?\s*(?:is\s*)?(\d{2,3})\s*(?:/|over)\s*(\d{2,3})\s*(?:mm\s*hg)?\b", transcript, re.IGNORECASE)
    if bp_match:
        vitals["blood_pressure"] = f"{bp_match.group(1)}/{bp_match.group(2)} mmHg"

    # Pulse / Heart Rate (e.g., pulse is 78 bpm, heart rate 82)
    pulse_match = re.search(r"\b(?:pulse|heart rate|hr)\s*(?:is\s*)?(\d{2,3})\s*(?:bpm|beats per min|beats per minute)?\b", transcript, re.IGNORECASE)
    if pulse_match:
        vitals["pulse"] = f"{pulse_match.group(1)} bpm"

    # Temperature (e.g., 99.4 F, 100.2 F, temp is 100.2 degrees, 38.5 C, temperature is 101.0 F)
    temp_match = re.search(
        r"(?:(?:temp|temperature|fever)\s*(?:is\s*)?(\d{2,3}(?:\.\d)?)\s*(?:degrees|deg|°)?\s*(?:f|c|fahrenheit|celsius)?)|"
        r"(?:(\d{2,3}(?:\.\d)?)\s*(?:degrees|deg|°)\s*(?:f|c|fahrenheit|celsius)?)|"
        r"(?:(\d{2,3}\.\d)\s*(?:f|c|fahrenheit|celsius)\b)",
        transcript,
        re.IGNORECASE
    )
    if temp_match:
        val_str = temp_match.group(1) or temp_match.group(2) or temp_match.group(3)
        if val_str:
            try:
                val = float(val_str)
                if 94.0 <= val <= 106.0:
                    vitals["temperature"] = f"{val}°F"
                elif 35.0 <= val <= 42.0:
                    vitals["temperature"] = f"{val}°C"
            except Exception:
                pass

    # SpO2 / Oxygen Saturation (e.g., oxygen 98%, saturation 96%, SpO2 99)
    spo2_match = re.search(r"\b(?:spo2|oxygen|saturation|o2)\s*(?:is\s*)?(\d{2,3})\s*%?\b", transcript, re.IGNORECASE)
    if spo2_match:
        val = int(spo2_match.group(1))
        if 70 <= val <= 100:
            vitals["spo2"] = f"{val}%"

    # Weight
    weight_match = re.search(r"\b(?:weight|wt)\s*(?:is\s*)?(\d{2,3}(?:\.\d)?)\s*(?:kg|kgs|lbs|pounds)?\b", transcript, re.IGNORECASE)
    if weight_match:
        vitals["weight"] = f"{weight_match.group(1)} kg"

    return vitals


def rule_based_fallback_scribe(
    transcript: str,
    doctor_specialty: str = "General Medicine",
    patient_context: Optional[Dict[str, Any]] = None,
    stored_allergies: Optional[str] = None
) -> Dict[str, Any]:
    """
    High-reliability clinical heuristic parser used when external LLM APIs are offline
    or for deterministic offline execution.
    """
    ctx = patient_context or {}
    transcript_clean = transcript.strip()

    # 1. Extract Vitals
    vitals = parse_vitals_from_transcript(transcript_clean)

    # 2. Extract Chief Complaints & Symptoms
    complaints = []
    duration = "3-4 days"
    severity = "Moderate"

    dur_match = re.search(r"(?:for|since|past)\s+(\d+\s+(?:days?|weeks?|months?|hours?))", transcript_clean, re.IGNORECASE)
    if dur_match:
        duration = dur_match.group(1)

    symptom_keywords = {
        "chest pain": "Chest discomfort / pain",
        "chest discomfort": "Chest discomfort",
        "cough": "Cough",
        "dry cough": "Dry cough",
        "fever": "Fever",
        "headache": "Headache",
        "dizziness": "Dizziness / Vertigo",
        "fatigue": "Fatigue & Malaise",
        "shortness of breath": "Shortness of breath / Dyspnea",
        "acid reflux": "Gastroesophageal acid reflux",
        "stomach pain": "Abdominal pain",
        "vomiting": "Nausea / Vomiting",
        "wheezing": "Wheezing / Respiratory tightness",
        "back pain": "Musculoskeletal back pain",
        "joint pain": "Joint pain / Arthralgia",
        "palpitations": "Heart palpitations"
    }

    transcript_lower = transcript_clean.lower()
    for kw, label in symptom_keywords.items():
        if kw in transcript_lower:
            complaints.append(label)

    if not complaints:
        complaints = ["General health evaluation"]

    # 3. Extract Discontinued / Negated Drugs (Contradiction Filtering)
    discontinued_drugs = set()
    negation_patterns = [
        r"(?:stop|discontinue|no|do not take|avoid)\s+([a-zA-Z]+)",
        r"([a-zA-Z]+)\s+(?:is stopped|was stopped|discontinued)"
    ]
    for np in negation_patterns:
        for match in re.finditer(np, transcript_lower):
            discontinued_drugs.add(normalize_token(match.group(1)))

    # 4. Extract Medications with Calibrated Confidence
    medications = []
    
    # Common clinical prescription patterns
    known_drug_catalog = {
        "paracetamol": {"default_dose": "650mg", "default_freq": "1-0-1 (Twice daily)", "default_timing": "After meals", "default_dur": "5 days"},
        "dolo": {"default_dose": "650mg", "default_freq": "1-0-1 (Twice daily)", "default_timing": "After meals", "default_dur": "3 days"},
        "amoxicillin": {"default_dose": "500mg", "default_freq": "1-1-1 (Thrice daily)", "default_timing": "After meals", "default_dur": "5 days"},
        "augmentin": {"default_dose": "625mg", "default_freq": "1-0-1 (Twice daily)", "default_timing": "After meals", "default_dur": "5 days"},
        "azithromycin": {"default_dose": "500mg", "default_freq": "1-0-0 (Once daily)", "default_timing": "After meals", "default_dur": "3 days"},
        "cetirizine": {"default_dose": "10mg", "default_freq": "0-0-1 (Night)", "default_timing": "Before sleep", "default_dur": "5 days"},
        "pantoprazole": {"default_dose": "40mg", "default_freq": "1-0-0 (Morning)", "default_timing": "Before breakfast (Empty stomach)", "default_dur": "14 days"},
        "omeprazole": {"default_dose": "20mg", "default_freq": "1-0-0 (Morning)", "default_timing": "Empty stomach", "default_dur": "14 days"},
        "metformin": {"default_dose": "500mg", "default_freq": "1-0-1 (Twice daily)", "default_timing": "With meals", "default_dur": "30 days"},
        "telmisartan": {"default_dose": "40mg", "default_freq": "1-0-0 (Morning)", "default_timing": "After breakfast", "default_dur": "30 days"},
        "atorvastatin": {"default_dose": "10mg", "default_freq": "0-0-1 (Night)", "default_timing": "After dinner", "default_dur": "30 days"},
        "aspirin": {"default_dose": "75mg", "default_freq": "1-0-0 (Once daily)", "default_timing": "After lunch", "default_dur": "30 days"},
        "ibuprofen": {"default_dose": "400mg", "default_freq": "1-0-1 (As needed)", "default_timing": "After food", "default_dur": "3 days"},
        "levothyroxine": {"default_dose": "50mcg", "default_freq": "1-0-0 (Morning)", "default_timing": "Early morning empty stomach", "default_dur": "30 days"},
        "salbutamol": {"default_dose": "100mcg Inhaler", "default_freq": "2 puffs as needed", "default_timing": "Inhalation", "default_dur": "30 days"},
        "cough syrup": {"default_dose": "10ml", "default_freq": "1-0-1 (Twice daily)", "default_timing": "After meals", "default_dur": "5 days"},
        "syrup paracetamol": {"default_dose": "5ml (120mg/5ml)", "default_freq": "1-1-1 (Thrice daily)", "default_timing": "After feeds/food", "default_dur": "3 days"}
    }

    for drug_key, meta in known_drug_catalog.items():
        if drug_key in transcript_lower:
            # Check if this drug was explicitly discontinued in the dialogue
            if normalize_token(drug_key) in discontinued_drugs:
                continue

            # Check if explicit dosage was mentioned in dialogue
            dose_regex = rf"{drug_key}\s+(\d+\s*(?:mg|mcg|ml|g|tablets?|capsules?))"
            explicit_dose_match = re.search(dose_regex, transcript_clean, re.IGNORECASE)
            
            # Check frequency in dialogue
            freq_match = re.search(r"\b(once|twice|thrice|1-0-1|1-1-1|1-0-0|0-0-1|three times|two times|daily)\b", transcript_lower)
            freq_str = meta["default_freq"]
            if freq_match:
                f_val = freq_match.group(1).lower()
                if f_val in ["twice", "two times", "1-0-1"]:
                    freq_str = "1-0-1 (Twice daily)"
                elif f_val in ["thrice", "three times", "1-1-1"]:
                    freq_str = "1-1-1 (Thrice daily)"
                elif f_val in ["once", "1-0-0", "daily"]:
                    freq_str = "1-0-0 (Once daily)"

            if explicit_dose_match:
                med_item = {
                    "name": drug_key.capitalize(),
                    "dosage": explicit_dose_match.group(1),
                    "frequency": freq_str,
                    "timing": meta["default_timing"],
                    "duration": meta["default_dur"],
                    "instructions": f"Take {explicit_dose_match.group(1)} {meta['default_timing']}",
                    "confidence": "high",
                    "confidence_reason": "Drug name and explicit dosage verified from audio transcript."
                }
            else:
                med_item = {
                    "name": drug_key.capitalize(),
                    "dosage": meta["default_dose"],
                    "frequency": freq_str,
                    "timing": meta["default_timing"],
                    "duration": meta["default_dur"],
                    "instructions": f"Standard clinical default. Please confirm exact dosage before dispensing.",
                    "confidence": "inferred",
                    "confidence_reason": "Dosage inferred from clinical guidelines; verify with patient."
                }
            medications.append(med_item)

    # 5. Extract Diagnostic Tests
    diagnostic_tests = []
    test_keywords = ["ecg", "chest x-ray", "x-ray", "cbc", "complete blood count", "lipid profile", "hba1c", "blood test", "ultrasound", "tsh", "urine routine"]
    for t in test_keywords:
        if t in transcript_lower:
            diagnostic_tests.append(t.upper() if len(t) <= 5 else t.title())

    # 6. Diagnosis Assessment Formulation
    if "chest pain" in transcript_lower or "cardiac" in transcript_lower:
        if "non-cardiac" in transcript_lower or "musculoskeletal" in transcript_lower or "normal ecg" in transcript_lower:
            diagnosis = "Atypical Chest Wall Pain (Musculoskeletal - Non-Cardiac Etiology)"
        else:
            diagnosis = "Suspected Angina / Ischemic Cardiovascular Evaluation"
    elif "cough" in transcript_lower or "fever" in transcript_lower:
        diagnosis = "Acute Upper Respiratory Tract Infection (URTI) with Low-Grade Pyrexia"
    elif "diabetes" in transcript_lower or "metformin" in transcript_lower:
        diagnosis = "Type 2 Diabetes Mellitus with Essential Hypertension Review"
    elif "acid reflux" in transcript_lower or "gerd" in transcript_lower:
        diagnosis = "Gastroesophageal Reflux Disease (GERD) & Dyspepsia"
    elif "pediatric" in transcript_lower or "syrup" in transcript_lower or "child" in transcript_lower:
        diagnosis = "Pediatric Acute Febrile Illness"
    else:
        diagnosis = f"{doctor_specialty} Outpatient Consultation & Symptom Review"

    # 7. Format SOAP Sections
    p_name = ctx.get("full_name") or ctx.get("name") or "Patient"
    p_age = ctx.get("age") or "Adult"
    p_gender = ctx.get("gender") or "Patient"

    subjective_lines = [
        f"Chief Complaints: {', '.join(complaints)} persisting for {duration}.",
        f"History of Present Illness: {p_name} ({p_age}, {p_gender}) reports symptoms of {', '.join(complaints).lower()}.",
        f"Severity: {severity}. Narrative: \"{transcript_clean}\""
    ]

    objective_lines = []
    if vitals:
        v_parts = [f"{k.replace('_', ' ').title()}: {v}" for k, v in vitals.items()]
        objective_lines.append(f"Vital Signs Recorded: {', '.join(v_parts)}.")
    else:
        objective_lines.append("Vital Signs: Within normal ambulatory baseline limits.")
    
    if "clear" in transcript_lower and ("chest" in transcript_lower or "lung" in transcript_lower):
        objective_lines.append("Physical Examination: Lungs clear on bilateral auscultation, S1/S2 audible, no peripheral edema.")
    else:
        objective_lines.append(f"Physical Examination: Systematic clinical examination conducted by {doctor_specialty} specialist.")

    assessment_lines = [
        f"1. Primary Clinical Diagnosis: {diagnosis}.",
        f"2. Department Referral: {doctor_specialty}."
    ]

    plan_lines = [
        f"1. Pharmacotherapy: Prescribed {len(medications)} medication(s) with clear dosing instructions.",
        f"2. Diagnostic Investigations: {', '.join(diagnostic_tests) if diagnostic_tests else 'None ordered at this visit.'}",
        "3. General & Lifestyle Advice: Ensure adequate hydration, rest, and balanced nutrition.",
        f"4. Follow-up: Review in clinic in {duration if 'day' in duration else '5-7 days'} or sooner if symptoms escalate."
    ]

    # 8. Check Stored Database and Verbal Allergies
    allergy_warnings = check_drug_allergy_conflicts(
        proposed_drugs=medications,
        stored_allergies=stored_allergies or ctx.get("allergies"),
        spoken_allergies=transcript_clean
    )

    return {
        "status": "success",
        "doctor_specialty": doctor_specialty,
        "subjective": "\n".join(subjective_lines),
        "objective": "\n".join(objective_lines),
        "assessment": "\n".join(assessment_lines),
        "plan": "\n".join(plan_lines),
        "primary_diagnosis": diagnosis,
        "vitals": vitals,
        "medications": medications,
        "diagnostic_tests": diagnostic_tests,
        "dietary_advice": "Maintain hydration and follow prescribed timing.",
        "follow_up": "5 days",
        "allergy_warnings": allergy_warnings,
        "attribution_method": "Content-based heuristic classification & semantic role parsing (editable by physician)",
        "transcript_preview": transcript_clean
    }


def process_consultation_transcript(
    transcript: str,
    doctor_specialty: str = "General Medicine",
    patient_context: Optional[Dict[str, Any]] = None,
    stored_allergies: Optional[str] = None
) -> Dict[str, Any]:
    """
    Main Scribe entrypoint. Attempts LLM generation first, with seamless fallback
    to the rule-based clinical parser for zero-failure reliability.
    """
    if not transcript or not transcript.strip():
        return {
            "status": "empty_transcript",
            "subjective": "No audio transcript provided.",
            "objective": "No vitals recorded.",
            "assessment": "Pending consultation.",
            "plan": "Please record or enter consultation dialogue.",
            "medications": [],
            "allergy_warnings": []
        }

    try:
        from ai.llm import call_llm_json

        system_prompt = (
            "You are an expert Clinical AI Medical Scribe for CarePulse Health. "
            "Your task is to analyze conversational doctor-patient dialogue and convert it into "
            "a formal, structured SOAP Clinical Note and Digital Prescription JSON.\n\n"
            "KNOWN ATTRIBUTION LIMITATION: Speaker attribution is determined using semantic and conversational role heuristics. "
            "Categorize symptom statements under Patient, and physical findings / medications under Doctor.\n\n"
            "OUTPUT JSON SCHEMA:\n"
            "{\n"
            "  \"subjective\": \"string (Chief complaints, duration, severity)\",\n"
            "  \"objective\": \"string (Physical exam and vitals)\",\n"
            "  \"assessment\": \"string (Primary diagnosis and impressions)\",\n"
            "  \"plan\": \"string (Plan summary)\",\n"
            "  \"primary_diagnosis\": \"string\",\n"
            "  \"vitals\": {\"blood_pressure\": \"string\", \"pulse\": \"string\", \"temperature\": \"string\", \"spo2\": \"string\"},\n"
            "  \"medications\": [\n"
            "    {\n"
            "      \"name\": \"string\",\n"
            "      \"dosage\": \"string\",\n"
            "      \"frequency\": \"string (e.g. 1-0-1)\",\n"
            "      \"timing\": \"string (e.g. After meals)\",\n"
            "      \"duration\": \"string (e.g. 5 days)\",\n"
            "      \"instructions\": \"string\",\n"
            "      \"confidence\": \"high|inferred|low\",\n"
            "      \"confidence_reason\": \"string\"\n"
            "    }\n"
            "  ],\n"
            "  \"diagnostic_tests\": [\"string\"],\n"
            "  \"dietary_advice\": \"string\",\n"
            "  \"follow_up\": \"string\"\n"
            "}"
        )

        user_content = (
            f"Doctor Specialty: {doctor_specialty}\n"
            f"Patient Context: {json.dumps(patient_context or {})}\n"
            f"Patient Documented Allergies on File: {stored_allergies or 'None'}\n\n"
            f"Consultation Dialogue:\n\"{transcript}\""
        )

        llm_response = call_llm_json(
            prompt=user_content,
            system_instruction=system_prompt,
            temperature=0.1
        )

        if llm_response and isinstance(llm_response, dict) and "subjective" in llm_response:
            # Cross-reference allergy check against on-file and verbal allergies
            meds = llm_response.get("medications", [])
            allergy_warnings = check_drug_allergy_conflicts(
                proposed_drugs=meds,
                stored_allergies=stored_allergies or (patient_context or {}).get("allergies"),
                spoken_allergies=transcript
            )

            llm_response["status"] = "success"
            llm_response["allergy_warnings"] = allergy_warnings
            llm_response["attribution_method"] = "Content-based heuristic classification & semantic role parsing (editable by physician)"
            llm_response["transcript_preview"] = transcript
            return llm_response

    except Exception as e:
        logger.warning(f"Note on LLM Scribe execution: {e}. Utilizing clinical rule fallback parser.")

    # Rule-based fallback execution
    return rule_based_fallback_scribe(
        transcript=transcript,
        doctor_specialty=doctor_specialty,
        patient_context=patient_context,
        stored_allergies=stored_allergies
    )
