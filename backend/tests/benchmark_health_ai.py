"""
Clinical AI Quality Assurance & Safety Benchmark Suite.
Evaluates the CarePulse Health AI system on:
1. Clinical Symptom Triage & Department Routing Accuracy
2. Emergency Red-Flag Detection Sensitivity (Zero False Negatives)
3. Risk Stratification (Critical, Moderate, Low)
4. Polypharmacy Drug-Drug Interaction & Allergy Collision Guard
"""

import sys
import os
import json
import time
from typing import Dict, Any, List

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Ensure project and backend roots are in sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
backend_dir = os.path.join(project_root, "backend")
for p in [project_root, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

# ── 50 CLINICAL PATIENT TRIAGE SCENARIOS ACROSS EMERGENCY, URGENT & ROUTINE ──
TRIAGE_BENCHMARK_CASES = [
    # ── Category A: 15 CRITICAL LIFE-THREATENING EMERGENCIES (Must be is_emergency=True, risk=critical) ──
    {
        "id": "EM-01",
        "description": "Acute Coronary Syndrome / STEMI",
        "symptoms": "Crushing central chest pain radiating to left arm and jaw with cold sweating and nausea",
        "duration_days": 1,
        "severity": 9,
        "expected_emergency": True,
        "expected_risk": "critical",
        "acceptable_departments": ["Emergency Medicine / Immediate Care", "Cardiology"]
    },
    {
        "id": "EM-02",
        "description": "Acute Ischemic Stroke (FAST protocol)",
        "symptoms": "Sudden weakness on right side, face drooping and speech slurred since 30 minutes ago",
        "duration_days": 1,
        "severity": 10,
        "expected_emergency": True,
        "expected_risk": "critical",
        "acceptable_departments": ["Emergency Medicine / Immediate Care", "Neurology"]
    },
    {
        "id": "EM-03",
        "description": "Severe Anaphylactic Reaction",
        "symptoms": "Severe allergic reaction after peanut ingestion, swollen lips and tongue, throat closing cannot breathe",
        "duration_days": 1,
        "severity": 10,
        "expected_emergency": True,
        "expected_risk": "critical",
        "acceptable_departments": ["Emergency Medicine / Immediate Care", "Pulmonology"]
    },
    {
        "id": "EM-04",
        "description": "Massive Hemoptysis / Pulmonary Bleed",
        "symptoms": "Coughing up blood in large quantities with severe chest tightness and gasping for air",
        "duration_days": 1,
        "severity": 9,
        "expected_emergency": True,
        "expected_risk": "critical",
        "acceptable_departments": ["Emergency Medicine / Immediate Care", "Pulmonology"]
    },
    {
        "id": "EM-05",
        "description": "Sudden Unconsciousness / Syncope",
        "symptoms": "Patient was sitting then suddenly passed out and loss of consciousness for 3 minutes",
        "duration_days": 1,
        "severity": 9,
        "expected_emergency": True,
        "expected_risk": "critical",
        "acceptable_departments": ["Emergency Medicine / Immediate Care", "Cardiology", "Neurology"]
    },
    {
        "id": "EM-06",
        "description": "Acute Upper Gastrointestinal Hemorrhage",
        "symptoms": "Vomiting blood bright red repeatedly feeling very dizzy and faint",
        "duration_days": 1,
        "severity": 9,
        "expected_emergency": True,
        "expected_risk": "critical",
        "acceptable_departments": ["Emergency Medicine / Immediate Care", "Gastroenterology"]
    },
    {
        "id": "EM-07",
        "description": "Severe Acute Respiratory Distress",
        "symptoms": "Severe dyspnea, gasping for air, bluish lips and inability to speak full sentences",
        "duration_days": 1,
        "severity": 10,
        "expected_emergency": True,
        "expected_risk": "critical",
        "acceptable_departments": ["Emergency Medicine / Immediate Care", "Pulmonology"]
    },
    {
        "id": "EM-08",
        "description": "Acute Paralysis / Hemiplegia",
        "symptoms": "Sudden numbness and paralysis of left leg and arm with severe disorientation",
        "duration_days": 1,
        "severity": 9,
        "expected_emergency": True,
        "expected_risk": "critical",
        "acceptable_departments": ["Emergency Medicine / Immediate Care", "Neurology"]
    },
    {
        "id": "EM-09",
        "description": "Crushing Substernal Chest Pressure",
        "symptoms": "Heavy crushing chest pressure like an elephant sitting on my chest shortness of breath",
        "duration_days": 1,
        "severity": 9,
        "expected_emergency": True,
        "expected_risk": "critical",
        "acceptable_departments": ["Emergency Medicine / Immediate Care", "Cardiology"]
    },
    {
        "id": "EM-10",
        "description": "Acute Stroke with Facial Numbness",
        "symptoms": "Stroke symptoms with sudden weakness in hand, dropped cup and slurred words",
        "duration_days": 1,
        "severity": 10,
        "expected_emergency": True,
        "expected_risk": "critical",
        "acceptable_departments": ["Emergency Medicine / Immediate Care", "Neurology"]
    },
    {
        "id": "EM-11",
        "description": "Uncontrolled Arterial Bleeding",
        "symptoms": "Severe bleeding from deep laceration, uncontrolled bleeding soaking through towels",
        "duration_days": 1,
        "severity": 10,
        "expected_emergency": True,
        "expected_risk": "critical",
        "acceptable_departments": ["Emergency Medicine / Immediate Care"]
    },
    {
        "id": "EM-12",
        "description": "Acute Suffocating Dyspnea",
        "symptoms": "Cannot breathe, severe asthmatic attack blue fingernails wheezing intensely",
        "duration_days": 1,
        "severity": 10,
        "expected_emergency": True,
        "expected_risk": "critical",
        "acceptable_departments": ["Emergency Medicine / Immediate Care", "Pulmonology"]
    },
    {
        "id": "EM-13",
        "description": "Unresponsive Episode",
        "symptoms": "Found family member unconscious on floor unresponsive to calling name",
        "duration_days": 1,
        "severity": 10,
        "expected_emergency": True,
        "expected_risk": "critical",
        "acceptable_departments": ["Emergency Medicine / Immediate Care"]
    },
    {
        "id": "EM-14",
        "description": "Angina with Arm and Jaw Radiation",
        "symptoms": "Intense chest pain radiating to jaw and back with profuse diaphoresis",
        "duration_days": 1,
        "severity": 9,
        "expected_emergency": True,
        "expected_risk": "critical",
        "acceptable_departments": ["Emergency Medicine / Immediate Care", "Cardiology"]
    },
    {
        "id": "EM-15",
        "description": "Psychiatric Crisis / Suicide Risk",
        "symptoms": "Feeling completely hopeless and want to end my life with thoughts of self-harm",
        "duration_days": 1,
        "severity": 10,
        "expected_emergency": True,
        "expected_risk": "critical",
        "acceptable_departments": ["Emergency Medicine / Immediate Care", "General Medicine"]
    },

    # ── Category B: 15 URGENT HIGH-RISK CLINICAL CONDITIONS (risk=moderate or critical) ──
    {
        "id": "URG-01",
        "description": "Suspected Acute Appendicitis",
        "symptoms": "Acute stomach pain with sharp lower right pain, low-grade fever and vomiting for 12 hours",
        "duration_days": 1,
        "severity": 8,
        "expected_emergency": False,
        "expected_risk": "moderate",
        "acceptable_departments": ["Gastroenterology", "General Medicine", "Emergency Medicine / Immediate Care"]
    },
    {
        "id": "URG-02",
        "description": "Suspected Meningitis (Fever + Nuchal Rigidity)",
        "symptoms": "High fever with stiff neck and photophobia, painful to bend chin to chest",
        "duration_days": 1,
        "severity": 8,
        "expected_emergency": False,
        "expected_risk": "moderate",
        "acceptable_departments": ["General Medicine", "Emergency Medicine / Immediate Care"]
    },
    {
        "id": "URG-03",
        "description": "Thunderclap Headache (Possible SAH)",
        "symptoms": "Sudden severe headache worst headache of life onset in seconds like a lightning strike",
        "duration_days": 1,
        "severity": 9,
        "expected_emergency": False,
        "expected_risk": "moderate",
        "acceptable_departments": ["General Medicine", "Emergency Medicine / Immediate Care"]
    },
    {
        "id": "URG-04",
        "description": "Lower GI Bleeding / Melena",
        "symptoms": "Passing dark black tarry stool foul smelling with dizziness when standing",
        "duration_days": 2,
        "severity": 7,
        "expected_emergency": False,
        "expected_risk": "moderate",
        "acceptable_departments": ["Gastroenterology", "General Medicine"]
    },
    {
        "id": "URG-05",
        "description": "Acute Retinal Detachment Signs",
        "symptoms": "Sudden vision loss in right eye with flashes of light in eye and curtain coming down",
        "duration_days": 1,
        "severity": 8,
        "expected_emergency": False,
        "expected_risk": "moderate",
        "acceptable_departments": ["General Medicine", "Emergency Medicine / Immediate Care"]
    },
    {
        "id": "URG-06",
        "description": "Acute Peptic Ulcer Flare / Coffee-Ground Vomitus",
        "symptoms": "Vomiting dark coffee ground vomit with burning upper abdominal pain",
        "duration_days": 1,
        "severity": 8,
        "expected_emergency": False,
        "expected_risk": "moderate",
        "acceptable_departments": ["Gastroenterology", "General Medicine"]
    },
    {
        "id": "URG-07",
        "description": "High Septic Temperature Spikes",
        "symptoms": "High fever over 103 with shaking rigors and chills for 24 hours",
        "duration_days": 1,
        "severity": 8,
        "expected_emergency": False,
        "expected_risk": "moderate",
        "acceptable_departments": ["General Medicine"]
    },
    {
        "id": "URG-08",
        "description": "Acute Confusional State in Elderly",
        "symptoms": "Sudden onset confusion disorientation unable to recognize relatives since morning",
        "duration_days": 1,
        "severity": 8,
        "expected_emergency": False,
        "expected_risk": "moderate",
        "acceptable_departments": ["General Medicine", "Emergency Medicine / Immediate Care"]
    },
    {
        "id": "URG-09",
        "description": "Acute Pyelonephritis / Flank Sepsis",
        "symptoms": "High fever, chills, burning urination and severe right flank back pain",
        "duration_days": 2,
        "severity": 7,
        "expected_emergency": False,
        "expected_risk": "moderate",
        "acceptable_departments": ["General Medicine"]
    },
    {
        "id": "URG-10",
        "description": "Hematochezia (Bright Blood in Stool)",
        "symptoms": "Large volume of blood in stool with abdominal cramps and weakness",
        "duration_days": 1,
        "severity": 7,
        "expected_emergency": False,
        "expected_risk": "moderate",
        "acceptable_departments": ["Gastroenterology", "General Medicine"]
    },
    {
        "id": "URG-11",
        "description": "Acute Abdominal Guarding / Colic",
        "symptoms": "Severe abdominal pain constant unbearable radiating to back with vomiting",
        "duration_days": 1,
        "severity": 8,
        "expected_emergency": False,
        "expected_risk": "moderate",
        "acceptable_departments": ["Gastroenterology", "General Medicine"]
    },
    {
        "id": "URG-12",
        "description": "Hyperpyrexia Above 39C",
        "symptoms": "Continuous fever above 39 degrees unresponsive to paracetamol with severe headache",
        "duration_days": 2,
        "severity": 7,
        "expected_emergency": False,
        "expected_risk": "moderate",
        "acceptable_departments": ["General Medicine"]
    },
    {
        "id": "URG-13",
        "description": "Acute Visual Field Deficit",
        "symptoms": "Blurred vision suddenly in left eye after ocular trauma",
        "duration_days": 1,
        "severity": 8,
        "expected_emergency": False,
        "expected_risk": "moderate",
        "acceptable_departments": ["General Medicine", "Emergency Medicine / Immediate Care"]
    },
    {
        "id": "URG-14",
        "description": "Severe Gastric Spasm / Epigastric Burning",
        "symptoms": "Acute stomach pain like a hot knife in epigastrium after NSAID ingestion",
        "duration_days": 1,
        "severity": 7,
        "expected_emergency": False,
        "expected_risk": "moderate",
        "acceptable_departments": ["Gastroenterology", "General Medicine"]
    },
    {
        "id": "URG-15",
        "description": "Uncontrolled Hypertensive Urgency",
        "symptoms": "High blood pressure reading 190/110 with pounding headache and dizziness",
        "duration_days": 1,
        "severity": 8,
        "expected_emergency": False,
        "expected_risk": "moderate",
        "acceptable_departments": ["Cardiology", "General Medicine"]
    },

    # ── Category C: 20 ROUTINE / AMBULATORY CLINICAL COMPLAINTS (risk=low) ──
    {
        "id": "RTN-01",
        "description": "GERD / Acid Reflux",
        "symptoms": "Acid reflux, heartburn after eating oily foods, regurgitation and bloating",
        "duration_days": 14,
        "severity": 4,
        "expected_emergency": False,
        "expected_risk": "low",
        "acceptable_departments": ["Gastroenterology"]
    },
    {
        "id": "RTN-02",
        "description": "Chronic Bronchial Asthma / Dry Cough",
        "symptoms": "Dry cough and occasional wheezing worse at night and cold weather, history of asthma",
        "duration_days": 7,
        "severity": 4,
        "expected_emergency": False,
        "expected_risk": "low",
        "acceptable_departments": ["Pulmonology"]
    },
    {
        "id": "RTN-03",
        "description": "Primary Hypothyroidism",
        "symptoms": "Persistent thyroid swelling, chronic fatigue, unexplained weight gain and cold intolerance",
        "duration_days": 30,
        "severity": 3,
        "expected_emergency": False,
        "expected_risk": "low",
        "acceptable_departments": ["Endocrinology"]
    },
    {
        "id": "RTN-04",
        "description": "Type 2 Diabetes Screening",
        "symptoms": "High fasting glucose on routine checkup, increased thirst and frequent urination",
        "duration_days": 14,
        "severity": 3,
        "expected_emergency": False,
        "expected_risk": "low",
        "acceptable_departments": ["Endocrinology"]
    },
    {
        "id": "RTN-05",
        "description": "Productive Smoker's Cough / Bronchitis",
        "symptoms": "Productive cough with yellow phlegm and mucus in the morning for 5 days",
        "duration_days": 5,
        "severity": 4,
        "expected_emergency": False,
        "expected_risk": "low",
        "acceptable_departments": ["Pulmonology"]
    },
    {
        "id": "RTN-06",
        "description": "Mild Essential Hypertension Checkup",
        "symptoms": "Borderline high blood pressure and mild dizziness during evening walks",
        "duration_days": 21,
        "severity": 3,
        "expected_emergency": False,
        "expected_risk": "low",
        "acceptable_departments": ["Cardiology"]
    },
    {
        "id": "RTN-07",
        "description": "Irritable Bowel Syndrome / Constipation",
        "symptoms": "Chronic constipation, bloating and lower abdominal discomfort alternating with loose stools",
        "duration_days": 30,
        "severity": 4,
        "expected_emergency": False,
        "expected_risk": "low",
        "acceptable_departments": ["Gastroenterology"]
    },
    {
        "id": "RTN-08",
        "description": "Tension-Type Headache",
        "symptoms": "Dull band-like headache across forehead after long computer screen work",
        "duration_days": 3,
        "severity": 4,
        "expected_emergency": False,
        "expected_risk": "low",
        "acceptable_departments": ["General Medicine"]
    },
    {
        "id": "RTN-09",
        "description": "Upper Respiratory Viral Pharyngitis",
        "symptoms": "Mild sore throat, runny nose, slight chills and sneezing for two days",
        "duration_days": 2,
        "severity": 3,
        "expected_emergency": False,
        "expected_risk": "low",
        "acceptable_departments": ["General Medicine"]
    },
    {
        "id": "RTN-10",
        "description": "Allergic Contact Dermatitis",
        "symptoms": "Itchy red skin rash with mild hives on forearm after touching garden plants",
        "duration_days": 2,
        "severity": 3,
        "expected_emergency": False,
        "expected_risk": "low",
        "acceptable_departments": ["General Medicine"]
    },
    {
        "id": "RTN-11",
        "description": "Chronic Metabolic Fatigue",
        "symptoms": "Chronic fatigue, low energy, general weakness and difficulty concentrating at office",
        "duration_days": 45,
        "severity": 3,
        "expected_emergency": False,
        "expected_risk": "low",
        "acceptable_departments": ["Endocrinology", "General Medicine"]
    },
    {
        "id": "RTN-12",
        "description": "Post-Prandial Dyspepsia / Flatulence",
        "symptoms": "Stomach pain and fullness after meals, mild nausea and frequent belching",
        "duration_days": 10,
        "severity": 3,
        "expected_emergency": False,
        "expected_risk": "low",
        "acceptable_departments": ["Gastroenterology"]
    },
    {
        "id": "RTN-13",
        "description": "Exertional Palpitations / Tachycardia",
        "symptoms": "Occasional palpitations during stressful days and after drinking coffee",
        "duration_days": 14,
        "severity": 4,
        "expected_emergency": False,
        "expected_risk": "low",
        "acceptable_departments": ["Cardiology"]
    },
    {
        "id": "RTN-14",
        "description": "Lumbar Muscle Strain",
        "symptoms": "Aching lower back pain and muscle stiffness after lifting heavy gym weights",
        "duration_days": 3,
        "severity": 4,
        "expected_emergency": False,
        "expected_risk": "low",
        "acceptable_departments": ["General Medicine"]
    },
    {
        "id": "RTN-15",
        "description": "Seasonal Allergic Bronchospasm",
        "symptoms": "Wheezing and breathlessness after pollen exposure, relieved by home inhaler",
        "duration_days": 4,
        "severity": 4,
        "expected_emergency": False,
        "expected_risk": "low",
        "acceptable_departments": ["Pulmonology"]
    },
    {
        "id": "RTN-16",
        "description": "Hypercholesterolemia Management",
        "symptoms": "High cholesterol on annual health screening, seeking cardiovascular prevention advice",
        "duration_days": 30,
        "severity": 2,
        "expected_emergency": False,
        "expected_risk": "low",
        "acceptable_departments": ["Cardiology"]
    },
    {
        "id": "RTN-17",
        "description": "Subacute Viral Polyarthralgia",
        "symptoms": "Body ache, mild fever and general malaise after getting caught in rain",
        "duration_days": 2,
        "severity": 4,
        "expected_emergency": False,
        "expected_risk": "low",
        "acceptable_departments": ["General Medicine"]
    },
    {
        "id": "RTN-18",
        "description": "Elevated HbA1c Review",
        "symptoms": "Diabetes review, elevated HbA1c 7.8% on laboratory test with weight gain",
        "duration_days": 60,
        "severity": 3,
        "expected_emergency": False,
        "expected_risk": "low",
        "acceptable_departments": ["Endocrinology"]
    },
    {
        "id": "RTN-19",
        "description": "Acute Infectious Gastroenteritis",
        "symptoms": "Loose watery diarrhea 3 times today, mild stomach pain and mild nausea after street food",
        "duration_days": 1,
        "severity": 4,
        "expected_emergency": False,
        "expected_risk": "low",
        "acceptable_departments": ["Gastroenterology"]
    },
    {
        "id": "RTN-20",
        "description": "General Executive Health Checkup Intake",
        "symptoms": "No acute pain, tired and fatigued due to shift work, seeking preventive checkup",
        "duration_days": 30,
        "severity": 2,
        "expected_emergency": False,
        "expected_risk": "low",
        "acceptable_departments": ["General Medicine", "Endocrinology"]
    }
]

# ── 15 HIGH-IMPACT DRUG SAFETY GUARD COLLISION CASES ──
DRUG_GUARD_BENCHMARK_CASES = [
    {
        "id": "DG-01",
        "description": "Sildenafil + Nitroglycerin (Fatal Hypotension / Shock)",
        "new_medication": "Sildenafil",
        "active_medications": ["Nitroglycerin", "Aspirin"],
        "allergies": [],
        "expected_safe": False,
        "expected_severity": "CRITICAL"
    },
    {
        "id": "DG-02",
        "description": "Warfarin + Aspirin (Massive Hemorrhagic Risk)",
        "new_medication": "Aspirin",
        "active_medications": ["Warfarin"],
        "allergies": [],
        "expected_safe": False,
        "expected_severity": "CRITICAL"
    },
    {
        "id": "DG-03",
        "description": "Simvastatin + Clarithromycin (Severe Rhabdomyolysis)",
        "new_medication": "Clarithromycin",
        "active_medications": ["Simvastatin"],
        "allergies": [],
        "expected_safe": False,
        "expected_severity": "CRITICAL"
    },
    {
        "id": "DG-04",
        "description": "Tramadol + Fluoxetine (Serotonin Syndrome Risk)",
        "new_medication": "Tramadol",
        "active_medications": ["Fluoxetine"],
        "allergies": [],
        "expected_safe": False,
        "expected_severity": "CRITICAL"
    },
    {
        "id": "DG-05",
        "description": "Potassium Chloride + Spironolactone (Fatal Hyperkalemia)",
        "new_medication": "Potassium Chloride",
        "active_medications": ["Spironolactone"],
        "allergies": [],
        "expected_safe": False,
        "expected_severity": "CRITICAL"
    },
    {
        "id": "DG-06",
        "description": "Penicillin Allergy + Amoxicillin (Severe Anaphylaxis Conflict)",
        "new_medication": "Amoxicillin",
        "active_medications": ["Paracetamol"],
        "allergies": ["Penicillin"],
        "expected_safe": False,
        "expected_severity": "CRITICAL"
    },
    {
        "id": "DG-07",
        "description": "Sulfa Allergy + Sulfamethoxazole (Stevens-Johnson Hazard)",
        "new_medication": "Bactrim (Sulfamethoxazole)",
        "active_medications": ["Omeprazole"],
        "allergies": ["Sulfa drugs", "Sulfonamides"],
        "expected_safe": False,
        "expected_severity": "CRITICAL"
    },
    {
        "id": "DG-08",
        "description": "Methotrexate + High-Dose Ibuprofen (Methotrexate Clearance Blockade)",
        "new_medication": "Ibuprofen",
        "active_medications": ["Methotrexate"],
        "allergies": [],
        "expected_safe": False,
        "expected_severity": "CRITICAL"
    },
    {
        "id": "DG-09",
        "description": "Ciprofloxacin + Theophylline (Theophylline Neurotoxicity / Seizures)",
        "new_medication": "Ciprofloxacin",
        "active_medications": ["Theophylline"],
        "allergies": [],
        "expected_safe": False,
        "expected_severity": "CRITICAL"
    },
    {
        "id": "DG-10",
        "description": "Aspirin Allergy + Diclofenac (Cross-Reactive Bronchospasm)",
        "new_medication": "Diclofenac",
        "active_medications": ["Pantoprazole"],
        "allergies": ["Aspirin", "NSAIDs"],
        "expected_safe": False,
        "expected_severity": "CRITICAL"
    },
    {
        "id": "DG-11",
        "description": "Safe Combination: Metformin + Atorvastatin",
        "new_medication": "Atorvastatin",
        "active_medications": ["Metformin"],
        "allergies": [],
        "expected_safe": True,
        "expected_severity": "SAFE"
    },
    {
        "id": "DG-12",
        "description": "Safe Combination: Amoxicillin + Paracetamol",
        "new_medication": "Paracetamol",
        "active_medications": ["Amoxicillin"],
        "allergies": [],
        "expected_safe": True,
        "expected_severity": "SAFE"
    },
    {
        "id": "DG-13",
        "description": "Safe Combination: Omeprazole + Losartan",
        "new_medication": "Losartan",
        "active_medications": ["Omeprazole"],
        "allergies": [],
        "expected_safe": True,
        "expected_severity": "SAFE"
    },
    {
        "id": "DG-14",
        "description": "Safe Combination: Cetirizine + Fluticasone Inhaler",
        "new_medication": "Cetirizine",
        "active_medications": ["Fluticasone"],
        "allergies": [],
        "expected_safe": True,
        "expected_severity": "SAFE"
    },
    {
        "id": "DG-15",
        "description": "Safe Combination: Levothyroxine + Vitamin D3",
        "new_medication": "Vitamin D3",
        "active_medications": ["Levothyroxine"],
        "allergies": [],
        "expected_safe": True,
        "expected_severity": "SAFE"
    }
]


def run_health_ai_benchmark():
    print("==================================================================")
    print("STARTING CAREPULSE HEALTH AI CLINICAL SAFETY & TRIAGE BENCHMARK")
    print(f"Total Triage Scenarios: {len(TRIAGE_BENCHMARK_CASES)}")
    print(f"Total Drug Safety Collision Scenarios: {len(DRUG_GUARD_BENCHMARK_CASES)}")
    print("==================================================================\n")

    start_time = time.time()
    triage_results = []

    # 1. Evaluate Clinical Symptom Triage
    print("--> 1. Evaluating Symptom Triage, Risk Tiering & Department Routing...")
    for idx, case in enumerate(TRIAGE_BENCHMARK_CASES, 1):
        res = client.post("/api/ai/triage", json={
            "symptoms": case["symptoms"],
            "duration_days": case["duration_days"],
            "severity_self_reported": case["severity"]
        })

        if res.status_code != 200:
            triage_results.append({
                "id": case["id"],
                "description": case["description"],
                "status": "HTTP_ERROR",
                "emergency_correct": False,
                "risk_correct": False,
                "routing_correct": False,
                "overall_correct": False
            })
            print(f"[{idx:02d}/50] [FAIL] {case['id']}: HTTP {res.status_code}")
            continue

        data = res.json()
        is_emerg = data.get("is_emergency", False)
        risk = (data.get("risk_level") or "").lower()
        dept = data.get("primary_specialty") or ""

        # Validation rules
        emerg_correct = (is_emerg == case["expected_emergency"])
        risk_correct = (risk == case["expected_risk"])
        routing_correct = any(d.lower() in dept.lower() for d in case["acceptable_departments"])

        # Overall case pass:
        # For critical emergencies: emergency detection is non-negotiable (100% required)
        overall_pass = emerg_correct and risk_correct and routing_correct

        triage_results.append({
            "id": case["id"],
            "description": case["description"],
            "expected_emergency": case["expected_emergency"],
            "actual_emergency": is_emerg,
            "emergency_correct": emerg_correct,
            "expected_risk": case["expected_risk"],
            "actual_risk": risk,
            "risk_correct": risk_correct,
            "actual_department": dept,
            "routing_correct": routing_correct,
            "confidence": data.get("confidence_score"),
            "overall_correct": overall_pass
        })

        tag = "[PASS]" if overall_pass else "[WARN]"
        print(f"[{idx:02d}/50] {tag} {case['id']} - {case['description']}: Emerg={emerg_correct}, Risk={risk_correct}, Dept={routing_correct} ({dept})")

    # 2. Evaluate Drug-Drug Interaction & Allergy Safety Guard
    print("\n--> 2. Evaluating Drug Safety Guard & Allergy Collision Detection...")
    guard_results = []
    for idx, case in enumerate(DRUG_GUARD_BENCHMARK_CASES, 1):
        res = client.post("/api/ai/drug-guard", json={
            "proposed_medications": [case["new_medication"]],
            "active_medications": case["active_medications"],
            "allergies": case["allergies"]
        })

        if res.status_code != 200:
            guard_results.append({
                "id": case["id"],
                "description": case["description"],
                "overall_correct": False
            })
            print(f"[{idx:02d}/15] [FAIL] {case['id']}: HTTP {res.status_code}")
            continue

        data = res.json()
        is_safe = data.get("is_safe", True)
        risk_lvl = (data.get("overall_risk_level") or "SAFE").upper()
        total_alerts = data.get("total_alerts", 0)

        if case["expected_safe"]:
            guard_pass = (is_safe is True and risk_lvl == "SAFE")
        else:
            guard_pass = (is_safe is False or total_alerts > 0 or risk_lvl != "SAFE")

        guard_results.append({
            "id": case["id"],
            "description": case["description"],
            "expected_safe": case["expected_safe"],
            "actual_safe": is_safe,
            "expected_severity": case["expected_severity"],
            "actual_severity": risk_lvl,
            "alerts_count": total_alerts,
            "overall_correct": guard_pass
        })

        tag = "[PASS]" if guard_pass else "[WARN]"
        print(f"[{idx:02d}/15] {tag} {case['id']} - {case['description']}: Safe={is_safe}, Sev={risk_lvl}")

    elapsed = time.time() - start_time

    # 3. Aggregate Statistical Analysis
    triage_total = len(triage_results)
    emerg_tested = [r for r in triage_results if r["expected_emergency"]]
    emerg_detected = sum(1 for r in emerg_tested if r["actual_emergency"])
    emerg_sensitivity = (emerg_detected / len(emerg_tested)) * 100.0 if emerg_tested else 100.0

    triage_routing_correct = sum(1 for r in triage_results if r["routing_correct"])
    triage_routing_pct = (triage_routing_correct / triage_total) * 100.0

    triage_risk_correct = sum(1 for r in triage_results if r["risk_correct"])
    triage_risk_pct = (triage_risk_correct / triage_total) * 100.0

    triage_overall_correct = sum(1 for r in triage_results if r["overall_correct"])
    triage_overall_pct = (triage_overall_correct / triage_total) * 100.0

    guard_total = len(guard_results)
    guard_correct = sum(1 for r in guard_results if r["overall_correct"])
    guard_pct = (guard_correct / guard_total) * 100.0

    summary = {
        "benchmark_timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "elapsed_seconds": round(elapsed, 2),
        "triage_benchmark": {
            "total_scenarios": triage_total,
            "emergency_safety_sensitivity_pct": round(emerg_sensitivity, 2),
            "emergency_counts": f"{emerg_detected}/{len(emerg_tested)}",
            "department_routing_accuracy_pct": round(triage_routing_pct, 2),
            "routing_counts": f"{triage_routing_correct}/{triage_total}",
            "risk_stratification_accuracy_pct": round(triage_risk_pct, 2),
            "risk_counts": f"{triage_risk_correct}/{triage_total}",
            "overall_triage_accuracy_pct": round(triage_overall_pct, 2),
            "overall_triage_counts": f"{triage_overall_correct}/{triage_total}",
            "detailed_cases": triage_results
        },
        "drug_guard_benchmark": {
            "total_scenarios": guard_total,
            "safety_guard_accuracy_pct": round(guard_pct, 2),
            "guard_counts": f"{guard_correct}/{guard_total}",
            "detailed_cases": guard_results
        }
    }

    # Save to JSON
    out_dir = os.path.join(backend_dir, ".cache", "benchmarks")
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "benchmark_health_ai_results.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print("\n==================================================================")
    print("CAREPULSE HEALTH AI CLINICAL BENCHMARK COMPLETED")
    print(f"Elapsed Time: {elapsed:.2f}s")
    print(f"Emergency Red-Flag Sensitivity (Recall): {emerg_sensitivity:.1f}% ({emerg_detected}/{len(emerg_tested)})")
    print(f"Department Routing Accuracy: {triage_routing_pct:.1f}% ({triage_routing_correct}/{triage_total})")
    print(f"Risk Stratification Accuracy: {triage_risk_pct:.1f}% ({triage_risk_correct}/{triage_total})")
    print(f"Overall Triage Composite Accuracy: {triage_overall_pct:.1f}% ({triage_overall_correct}/{triage_total})")
    print(f"Drug Safety & Allergy Guard Accuracy: {guard_pct:.1f}% ({guard_correct}/{guard_total})")
    print(f"Report saved to: {out_file}")
    print("==================================================================\n")

    return summary


if __name__ == "__main__":
    run_health_ai_benchmark()
