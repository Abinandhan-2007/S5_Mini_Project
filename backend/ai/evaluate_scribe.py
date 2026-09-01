"""
CarePulse AI Scribe 8-Scenario Clinical Benchmark & Evaluation Suite

Validates:
1. Standard Acute Encounter (Fever + Cough + Vitals)
2. Chronic Multi-Drug Encounter (Diabetes + Hypertension: 4 drugs)
3. Incomplete / Missing Dosage (Inferred review flag)
4. Contradictory / Corrected Dialogue (Discard negated drugs)
5. Negative Findings & Red-Flag Exclusions (Non-cardiac chest pain)
6. Pediatric Weight-Based Liquid Dosage
7. Stored Database Allergy Conflict (Penicillin on-file vs. Amoxicillin)
8. Noisy / Garbled Dialogue Graceful Handling
"""

import sys
import time
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from ai.agents.scribe_agent import process_consultation_transcript, check_drug_allergy_conflicts

TEST_SCENARIOS = [
    {
        "name": "1. Standard Acute Infection (Fever + Cough + Vitals)",
        "transcript": (
            "Patient: Doctor, I have had a bad dry cough for 4 days and a fever since yesterday. "
            "Doctor: Let me check your vitals. Your pulse is 80 bpm, temperature is 100.2 F, and lungs are clear. "
            "I am prescribing Paracetamol 650mg twice daily and Azithromycin 500mg once daily for 3 days. "
            "Drink warm water and review in 5 days."
        ),
        "specialty": "General Medicine",
        "patient_context": {"name": "Arun Kumar", "age": 29, "gender": "Male"},
        "stored_allergies": None,
        "expectations": {
            "vitals_keys": ["pulse", "temperature"],
            "expected_drugs": ["Paracetamol", "Azithromycin"],
            "min_drugs": 2,
            "has_high_confidence": True
        }
    },
    {
        "name": "2. Chronic Multi-Drug Encounter (Diabetes + Hypertension)",
        "transcript": (
            "Doctor: Good morning Mrs. Sharma. Let us check your chronic vitals. "
            "Blood pressure is 135/85 mmHg. Your glucose levels need tighter control. "
            "I will continue Metformin 500mg twice daily, Telmisartan 40mg once daily, "
            "Atorvastatin 10mg at night, and Aspirin 75mg daily. "
            "Let's also order an HbA1c and Lipid Profile."
        ),
        "specialty": "Cardiology",
        "patient_context": {"name": "Sunita Sharma", "age": 58, "gender": "Female"},
        "stored_allergies": None,
        "expectations": {
            "vitals_keys": ["blood_pressure"],
            "expected_drugs": ["Metformin", "Telmisartan", "Atorvastatin", "Aspirin"],
            "min_drugs": 4,
            "expected_tests": ["HBA1C", "LIPID PROFILE"]
        }
    },
    {
        "name": "3. Incomplete / Missing Dosage (Inferred Review Tag)",
        "transcript": (
            "Patient: I have had continuous sneezing and runny nose for 2 days. "
            "Doctor: Looks like acute allergic rhinitis. I will prescribe Cetirizine for 5 days. "
            "Take it before bedtime."
        ),
        "specialty": "General Medicine",
        "patient_context": {"name": "Kavita Roy", "age": 24, "gender": "Female"},
        "stored_allergies": None,
        "expectations": {
            "expected_drugs": ["Cetirizine"],
            "inferred_confidence_drug": "Cetirizine"
        }
    },
    {
        "name": "4. Contradictory / Corrected Dialogue (Discard Canceled Drug)",
        "transcript": (
            "Patient: I took Ibuprofen yesterday for my knee pain but my stomach started burning. "
            "Doctor: Stop Ibuprofen immediately. Do not take Ibuprofen because of your gastric irritation. "
            "Instead, I am prescribing Paracetamol 650mg twice daily which is gentle on the stomach."
        ),
        "specialty": "Orthopedics",
        "patient_context": {"name": "Ramesh Patel", "age": 48, "gender": "Male"},
        "stored_allergies": None,
        "expectations": {
            "expected_drugs": ["Paracetamol"],
            "excluded_drugs": ["Ibuprofen"]
        }
    },
    {
        "name": "5. Negative Findings & Red-Flag Exclusions (Non-Cardiac Chest Pain)",
        "transcript": (
            "Patient: I had sharp left chest discomfort when moving my arm yesterday. "
            "Doctor: We ran an ECG and the ECG is completely normal. Pulse is 72 bpm and BP is 120/80. "
            "This is musculoskeletal chest wall pain, non-cardiac. No ischemic pathology. "
            "Take Paracetamol as needed and do gentle stretching."
        ),
        "specialty": "Cardiology",
        "patient_context": {"name": "David Miller", "age": 35, "gender": "Male"},
        "stored_allergies": None,
        "expectations": {
            "vitals_keys": ["pulse", "blood_pressure"],
            "diagnosis_keywords": ["Musculoskeletal", "Non-Cardiac", "Atypical Chest Wall Pain"]
        }
    },
    {
        "name": "6. Pediatric Weight-Based Formulation Scenario",
        "transcript": (
            "Doctor: Hello little Aarav. Weight is 16 kg, temperature is 101.0 F. "
            "He has a viral throat infection. Prescribing Syrup Paracetamol 5ml thrice daily for 3 days. "
            "Ensure plenty of fluids."
        ),
        "specialty": "Pediatrics",
        "patient_context": {"name": "Aarav Gupta", "age": 4, "gender": "Male"},
        "stored_allergies": None,
        "expectations": {
            "vitals_keys": ["weight", "temperature"],
            "expected_drugs": ["Syrup Paracetamol"]
        }
    },
    {
        "name": "7. Stored Database Allergy Conflict (Penicillin On-File vs. Amoxicillin)",
        "transcript": (
            "Patient: I have an ear ache and sinus pressure since Monday. "
            "Doctor: You have acute bacterial sinusitis. Let me prescribe Amoxicillin 500mg thrice daily for 5 days."
        ),
        "specialty": "ENT / General Medicine",
        "patient_context": {"name": "Meera Nair", "age": 31, "gender": "Female", "allergies": "Penicillin"},
        "stored_allergies": "Penicillin, Sulfa drugs",  # Patient's authoritative DB record
        "expectations": {
            "must_trigger_allergy_warning": True,
            "conflicting_drug": "Amoxicillin",
            "allergen": "Penicillin"
        }
    },
    {
        "name": "8. Noisy / Garbled Dialogue Graceful Fallback",
        "transcript": "um... yes... cough maybe... ok doctor... thank you...",
        "specialty": "General Medicine",
        "patient_context": {"name": "Unknown", "age": 40, "gender": "Other"},
        "stored_allergies": None,
        "expectations": {
            "must_not_crash": True,
            "status_success": True
        }
    }
]


def run_scribe_evaluation():
    print("=" * 80)
    print("      CAREPULSE AI SCRIBE 8-SCENARIO CLINICAL BENCHMARK & EVALUATION      ")
    print("=" * 80)

    total_tests = len(TEST_SCENARIOS)
    passed_tests = 0
    start_time = time.time()

    for idx, sc in enumerate(TEST_SCENARIOS, 1):
        print(f"\n--- Scenario {idx}: {sc['name']} ---")
        res = process_consultation_transcript(
            transcript=sc["transcript"],
            doctor_specialty=sc["specialty"],
            patient_context=sc["patient_context"],
            stored_allergies=sc["stored_allergies"]
        )

        checks_passed = True
        exp = sc["expectations"]

        # Check 1: Vitals
        if "vitals_keys" in exp:
            vitals = res.get("vitals", {})
            for vk in exp["vitals_keys"]:
                if vk in vitals:
                    print(f"  [OK] Extracted Vital '{vk}': {vitals[vk]}")
                else:
                    print(f"  [FAIL] Missing vital '{vk}' (found: {list(vitals.keys())})")
                    checks_passed = False

        # Check 2: Expected Drugs
        if "expected_drugs" in exp:
            extracted_names = [m["name"].lower() for m in res.get("medications", [])]
            for ed in exp["expected_drugs"]:
                if any(ed.lower() in en for en in extracted_names):
                    print(f"  [OK] Prescribed Drug: '{ed}'")
                else:
                    print(f"  [FAIL] Expected drug '{ed}' not found in {extracted_names}")
                    checks_passed = False

        # Check 3: Excluded Drugs (Contradiction Filter)
        if "excluded_drugs" in exp:
            extracted_names = [m["name"].lower() for m in res.get("medications", [])]
            for xd in exp["excluded_drugs"]:
                if any(xd.lower() in en for en in extracted_names):
                    print(f"  [FAIL] Discontinued drug '{xd}' was mistakenly included in prescription!")
                    checks_passed = False
                else:
                    print(f"  [OK] Successfully excluded canceled drug '{xd}'")

        # Check 4: Inferred Confidence Flag
        if "inferred_confidence_drug" in exp:
            target_drug = exp["inferred_confidence_drug"].lower()
            matching_med = next((m for m in res.get("medications", []) if target_drug in m["name"].lower()), None)
            if matching_med and matching_med.get("confidence") == "inferred":
                print(f"  [OK] Drug '{target_drug}' correctly flagged with confidence: 'inferred' (Review Tag)")
            else:
                print(f"  [FAIL] Drug '{target_drug}' confidence expected 'inferred', got: {matching_med.get('confidence') if matching_med else 'None'}")
                checks_passed = False

        # Check 5: Diagnosis Keywords
        if "diagnosis_keywords" in exp:
            diag = res.get("primary_diagnosis", "")
            if any(dk.lower() in diag.lower() for dk in exp["diagnosis_keywords"]):
                print(f"  [OK] Accurate Diagnosis: '{diag}'")
            else:
                print(f"  [FAIL] Diagnosis '{diag}' missing keywords {exp['diagnosis_keywords']}")
                checks_passed = False

        # Check 6: Database Stored Allergy Conflict
        if exp.get("must_trigger_allergy_warning"):
            warnings = res.get("allergy_warnings", [])
            allergy_found = any(
                exp["conflicting_drug"].lower() in w.get("drug", "").lower() and
                exp["allergen"].lower() in w.get("allergy", "").lower()
                for w in warnings
            )
            if allergy_found:
                print(f"  [OK] CRITICAL ALLERGY CONFLICT DETECTED from database records:")
                for w in warnings:
                    print(f"       -> {w.get('warning')}")
            else:
                print(f"  [FAIL] Stored database allergy conflict was NOT detected! Warnings: {warnings}")
                checks_passed = False

        # Check 7: No-crash / status
        if exp.get("must_not_crash"):
            if res.get("status") in ["success", "empty_transcript"]:
                print(f"  [OK] Handled gracefully without crash (status: {res.get('status')})")
            else:
                print(f"  [FAIL] Unexpected failure status: {res.get('status')}")
                checks_passed = False

        if checks_passed:
            passed_tests += 1
            print(f"  >>> RESULT: PASS")
        else:
            print(f"  >>> RESULT: FAIL")

    elapsed = time.time() - start_time
    accuracy = (passed_tests / total_tests) * 100.0

    print("\n" + "=" * 80)
    print("                          BENCHMARK SUMMARY                           ")
    print("=" * 80)
    print(f"Total Scenarios Evaluated: {total_tests}")
    print(f"Passed Scenarios:          {passed_tests}")
    print(f"Failed Scenarios:          {total_tests - passed_tests}")
    print(f"SCRIBE OVERALL ACCURACY:   {accuracy:.2f}%")
    print(f"Execution Time:            {elapsed:.3f} seconds")
    print("=" * 80)


if __name__ == "__main__":
    run_scribe_evaluation()
