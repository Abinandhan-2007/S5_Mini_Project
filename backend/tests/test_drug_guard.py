"""
Comprehensive Clinical Verification Test Suite for CarePulse Drug-Drug Interaction & Allergy Guard.
Tests all 20 clinical interaction rules and 11 cross-class allergy hypersensitivity rules.
"""

import sys
import os
import unittest

project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
backend_dir = os.path.join(project_root, "backend")
for p in [project_root, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.ai.drug_guard import check_drug_interactions, INTERACTION_REGISTRY, ALLERGY_MAPPINGS


class TestDrugGuardExpanded(unittest.TestCase):

    def test_registry_and_mapping_counts(self):
        """Verify registry expansion counts meet target specifications."""
        self.assertGreaterEqual(len(INTERACTION_REGISTRY), 20)
        self.assertGreaterEqual(len(ALLERGY_MAPPINGS), 11)

    # -------------------------------------------------------------------------
    # 20 DRUG-DRUG INTERACTION PAIR TESTS
    # -------------------------------------------------------------------------
    def test_01_nsaid_acei_interaction(self):
        res = check_drug_interactions(["Ibuprofen"], active_medications=["Lisinopril"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "CRITICAL_CONTRAINDICATION")
        self.assertTrue(any("NSAID + ACE Inhibitor" in a["title"] for a in res["alerts"]))

    def test_02_nsaid_anticoagulant_interaction(self):
        res = check_drug_interactions(["Naproxen"], active_medications=["Warfarin"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "CRITICAL_CONTRAINDICATION")
        self.assertTrue(any("NSAID + Anticoagulant" in a["title"] for a in res["alerts"]))

    def test_03_statin_cyp3a4_inhibitor_interaction(self):
        res = check_drug_interactions(["Atorvastatin"], active_medications=["Fluconazole"])
        self.assertFalse(res["is_safe"])
        self.assertIn(res["overall_risk_level"], ["MAJOR_INTERACTION", "CRITICAL_CONTRAINDICATION"])
        self.assertTrue(any("Statin + CYP3A4 Inhibitor" in a["title"] for a in res["alerts"]))

    def test_04_metformin_radiocontrast_interaction(self):
        res = check_drug_interactions(["Metformin"], active_medications=["Iohexol Contrast"])
        self.assertFalse(res["is_safe"])
        self.assertTrue(any("Metformin + Iodinated Contrast" in a["title"] for a in res["alerts"]))

    def test_05_nitrate_pde5_inhibitor_interaction(self):
        res = check_drug_interactions(["Sildenafil"], active_medications=["Nitroglycerin"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "CRITICAL_CONTRAINDICATION")
        self.assertTrue(any("Nitrate + PDE-5 Inhibitor" in a["title"] for a in res["alerts"]))

    def test_06_raas_blocker_k_sparing_diuretic_interaction(self):
        res = check_drug_interactions(["Spironolactone"], active_medications=["Ramipril"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "MAJOR_INTERACTION")
        self.assertTrue(any("Potassium-Sparing Diuretic" in a["title"] for a in res["alerts"]))

    def test_07_maoi_ssri_interaction(self):
        res = check_drug_interactions(["Phenelzine"], active_medications=["Sertraline"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "CRITICAL_CONTRAINDICATION")
        self.assertTrue(any("Serotonin Syndrome" in a["title"] for a in res["alerts"]))

    def test_08_methotrexate_nsaid_interaction(self):
        res = check_drug_interactions(["Methotrexate"], active_medications=["Diclofenac"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "CRITICAL_CONTRAINDICATION")
        self.assertTrue(any("Methotrexate + NSAID" in a["title"] for a in res["alerts"]))

    def test_09_digoxin_amiodarone_interaction(self):
        res = check_drug_interactions(["Digoxin"], active_medications=["Amiodarone"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "MAJOR_INTERACTION")
        self.assertTrue(any("Digoxin + P-gp Inhibitor" in a["title"] for a in res["alerts"]))

    def test_10_lithium_nsaid_interaction(self):
        res = check_drug_interactions(["Lithium"], active_medications=["Indomethacin"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "MAJOR_INTERACTION")
        self.assertTrue(any("Lithium" in a["title"] for a in res["alerts"]))

    def test_11_opioid_benzodiazepine_interaction(self):
        res = check_drug_interactions(["Morphine"], active_medications=["Alprazolam"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "CRITICAL_CONTRAINDICATION")
        self.assertTrue(any("Opioid + Benzodiazepine" in a["title"] for a in res["alerts"]))

    def test_12_ssri_tramadol_interaction(self):
        res = check_drug_interactions(["Escitalopram"], active_medications=["Tramadol"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "MAJOR_INTERACTION")
        self.assertTrue(any("Serotonin Toxicity" in a["title"] for a in res["alerts"]))

    def test_13_clopidogrel_omeprazole_interaction(self):
        res = check_drug_interactions(["Clopidogrel"], active_medications=["Omeprazole"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "MAJOR_INTERACTION")
        self.assertTrue(any("Clopidogrel + Omeprazole" in a["title"] for a in res["alerts"]))

    def test_14_fluoroquinolone_antacid_interaction(self):
        res = check_drug_interactions(["Ciprofloxacin"], active_medications=["Gelusil Antacid"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "MODERATE_INTERACTION")
        self.assertTrue(any("Chelation" in a["title"] for a in res["alerts"]))

    def test_15_theophylline_ciprofloxacin_interaction(self):
        res = check_drug_interactions(["Theophylline"], active_medications=["Ciprofloxacin"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "MAJOR_INTERACTION")
        self.assertTrue(any("Theophylline" in a["title"] for a in res["alerts"]))

    def test_16_warfarin_azole_antifungal_interaction(self):
        res = check_drug_interactions(["Warfarin"], active_medications=["Fluconazole"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "CRITICAL_CONTRAINDICATION")
        self.assertTrue(any("Warfarin + CYP2C9 Inhibitor" in a["title"] for a in res["alerts"]))

    def test_17_beta_blocker_non_dhp_ccb_interaction(self):
        res = check_drug_interactions(["Metoprolol"], active_medications=["Verapamil"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "MAJOR_INTERACTION")
        self.assertTrue(any("AV Block" in a["title"] for a in res["alerts"]))

    def test_18_allopurinol_azathioprine_interaction(self):
        res = check_drug_interactions(["Allopurinol"], active_medications=["Azathioprine"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "CRITICAL_CONTRAINDICATION")
        self.assertTrue(any("Allopurinol + Azathioprine" in a["title"] for a in res["alerts"]))

    def test_19_oral_contraceptive_enzyme_inducer_interaction(self):
        res = check_drug_interactions(["Ethinyl Estradiol"], active_medications=["Carbamazepine"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "MAJOR_INTERACTION")
        self.assertTrue(any("Contraceptive Failure" in a["title"] for a in res["alerts"]))

    def test_20_sglt2i_loop_diuretic_interaction(self):
        res = check_drug_interactions(["Empagliflozin"], active_medications=["Furosemide"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "MODERATE_INTERACTION")
        self.assertTrue(any("Volume Depletion" in a["title"] for a in res["alerts"]))

    # -------------------------------------------------------------------------
    # 11 ALLERGY CROSS-CLASS HYPERSENSITIVITY TESTS
    # -------------------------------------------------------------------------
    def test_allergy_01_penicillin_cross_amoxicillin(self):
        res = check_drug_interactions(["Amoxicillin"], allergies=["Penicillin"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "CRITICAL_CONTRAINDICATION")
        self.assertTrue(any("Penicillin Allergy" in a["title"] for a in res["alerts"]))

    def test_allergy_02_penicillin_cephalosporin_cross_reactivity(self):
        res = check_drug_interactions(["Cefixime"], allergies=["Penicillin"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "MAJOR_INTERACTION")
        self.assertTrue(any("Cephalosporin Cross-Reactivity" in a["title"] for a in res["alerts"]))

    def test_allergy_03_sulfa_cross_bactrim(self):
        res = check_drug_interactions(["Bactrim"], allergies=["Sulfa"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "CRITICAL_CONTRAINDICATION")
        self.assertTrue(any("Sulfonamide" in a["title"] for a in res["alerts"]))

    def test_allergy_04_nsaid_cross_combiflam(self):
        res = check_drug_interactions(["Combiflam"], allergies=["Aspirin"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "CRITICAL_CONTRAINDICATION")
        self.assertTrue(any("NSAID" in a["title"] for a in res["alerts"]))

    def test_allergy_05_macrolide_cross_azithral(self):
        res = check_drug_interactions(["Azithral"], allergies=["Clarithromycin"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "CRITICAL_CONTRAINDICATION")
        self.assertTrue(any("Macrolide" in a["title"] for a in res["alerts"]))

    def test_allergy_06_quinolone_cross_ciprofloxacin(self):
        res = check_drug_interactions(["Ciprofloxacin"], allergies=["Levofloxacin"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "CRITICAL_CONTRAINDICATION")
        self.assertTrue(any("Fluoroquinolone" in a["title"] for a in res["alerts"]))

    def test_allergy_07_tetracycline_cross_doxycycline(self):
        res = check_drug_interactions(["Doxycycline"], allergies=["Tetracycline"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "CRITICAL_CONTRAINDICATION")
        self.assertTrue(any("Tetracycline" in a["title"] for a in res["alerts"]))

    def test_allergy_08_opioid_cross_ultracet(self):
        res = check_drug_interactions(["Ultracet"], allergies=["Codeine"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "MAJOR_INTERACTION")
        self.assertTrue(any("Opioid" in a["title"] for a in res["alerts"]))

    def test_allergy_09_statin_cross_rosuvastatin(self):
        res = check_drug_interactions(["Rosuvastatin"], allergies=["Atorvastatin"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "MAJOR_INTERACTION")
        self.assertTrue(any("Statin" in a["title"] for a in res["alerts"]))

    def test_allergy_10_acei_angioedema_cross_enalapril(self):
        res = check_drug_interactions(["Enalapril"], allergies=["Lisinopril Angioedema"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "CRITICAL_CONTRAINDICATION")
        self.assertTrue(any("ACE Inhibitor" in a["title"] for a in res["alerts"]))

    def test_allergy_11_local_anesthetic_cross_lidocaine(self):
        res = check_drug_interactions(["Lidocaine"], allergies=["Bupivacaine"])
        self.assertFalse(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "CRITICAL_CONTRAINDICATION")
        self.assertTrue(any("Local Anesthetic" in a["title"] for a in res["alerts"]))

    # -------------------------------------------------------------------------
    # ZERO-ALERT SAFE CASE TEST
    # -------------------------------------------------------------------------
    def test_safe_prescription_no_conflicts(self):
        res = check_drug_interactions(
            proposed_medications=["Paracetamol", "Cetirizine"],
            active_medications=["Pantoprazole"],
            allergies=["Penicillin"]
        )
        self.assertTrue(res["is_safe"])
        self.assertEqual(res["overall_risk_level"], "SAFE")
        self.assertEqual(res["total_alerts"], 0)


if __name__ == "__main__":
    unittest.main()
