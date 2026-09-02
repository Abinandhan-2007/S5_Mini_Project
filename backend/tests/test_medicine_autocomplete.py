"""
Unit tests for Fuzzy/Typo-Tolerant Medicine Search & OpenFDA Generic Delegation.

Verifies:
1. Searching brand names (e.g. "Dolo 650", "Crocin") delegates OpenFDA lookup to generic_name (Paracetamol).
2. Real-time autocomplete handles prefix matches ("par"), typos ("paracetmol"), and merged numbers ("dolo650").
3. "Did you mean" suggestion is returned when a close fuzzy typo occurs.
4. Fast fallback execution if pg_trgm is bypassed.
"""

import unittest
from unittest.mock import patch, MagicMock
from backend.services.medicine_search_service import (
    search_medicines,
    clean_search_query,
    search_medicines_fallback,
)
from backend.services.drug_info_service import (
    get_drug_info,
    split_into_bullets,
    clean_clinical_text,
)
from backend.main import lookup_medicine_info
from backend.schemas import MedicineInfoLookupRequest


class TestMedicineAutocompleteAndLookup(unittest.TestCase):

    def test_query_cleaner(self):
        """Test splitting merged digits and punctuation cleaning."""
        self.assertEqual(clean_search_query("dolo650"), "dolo 650")
        self.assertEqual(clean_search_query("pan40"), "pan 40")
        self.assertEqual(clean_search_query("augmentin-625!"), "augmentin-625")
        self.assertEqual(clean_search_query("  paracetamol   "), "paracetamol")

    def test_prefix_search(self):
        """Test that typing 'par' returns Paracetamol with prefix match."""
        res = search_medicines("par", limit=5)
        self.assertGreater(res["total"], 0)
        top = res["matches"][0]
        self.assertIn("Paracetamol", top["name"])
        self.assertIn(top["match_type"], ("prefix", "exact"))

    def test_typo_fuzzy_search(self):
        """Test that typing misspelled 'paracetmol' returns Paracetamol with did_you_mean."""
        res = search_medicines("paracetmol", limit=5)
        self.assertGreater(res["total"], 0)
        self.assertIsNotNone(res["did_you_mean"])
        self.assertIn("Paracetamol", res["did_you_mean"])
        self.assertEqual(res["matches"][0]["match_type"], "fuzzy")

    def test_spacing_typo_search(self):
        """Test that 'dolo650' matches 'Dolo 650'."""
        res = search_medicines("dolo650", limit=5)
        self.assertGreater(res["total"], 0)
        top = res["matches"][0]
        self.assertEqual(top["name"], "Dolo 650")

    def test_generic_name_search(self):
        """Test searching by active substance name (e.g. 'amoxicillin')."""
        res = search_medicines("amoxicillin", limit=5)
        self.assertGreater(res["total"], 0)
        names = [m["name"] for m in res["matches"]]
        self.assertTrue(any("Amoxicillin" in n or "Augmentin" in n for n in names))

    def test_openfda_generic_name_delegation(self):
        """
        CRITICAL TEST:
        Search 'Dolo 650' -> select it -> confirm the OpenFDA API call uses
        the medicine's generic_name ('Paracetamol' / 'Acetaminophen') and returns real OpenFDA data.
        """
        # Step 1: Search for Dolo 650
        search_res = search_medicines("Dolo 650", limit=1)
        self.assertGreater(len(search_res["matches"]), 0)
        selected_med = search_res["matches"][0]
        self.assertEqual(selected_med["name"], "Dolo 650")
        self.assertEqual(selected_med["generic_name"], "Paracetamol")

        # Step 2: Lookup drug info passing drugName and genericName
        req = MedicineInfoLookupRequest(
            drugName=selected_med["name"],
            genericName=selected_med["generic_name"],
            medicineId=selected_med["id"],
        )
        lookup_res = lookup_medicine_info(req)

        # Step 3: Verify the response used generic_name for OpenFDA
        self.assertEqual(lookup_res.status, "FOUND")
        self.assertEqual(lookup_res.drugName, "Dolo 650")
        self.assertEqual(lookup_res.genericName, "Paracetamol")
        self.assertEqual(lookup_res.source, "OpenFDA")
        self.assertIsNotNone(lookup_res.mainUses)
        self.assertGreater(len(lookup_res.mainUses), 0)

    def test_difflib_fallback_engine(self):
        """Verify the difflib in-memory search returns valid results without PostgreSQL."""
        res = search_medicines_fallback("paracetmol", limit=5)
        self.assertGreater(res["total"], 0)
        self.assertIsNotNone(res["did_you_mean"])
        self.assertTrue(len(res["did_you_mean"]) > 0)

    def test_global_medicine_resolver(self):
        """Verify that rare/international medicines across the world resolve via NIH RxTerms."""
        res = search_medicines("olaparib", limit=5)
        self.assertGreater(res["total"], 0)
        names = [m["name"].lower() for m in res["matches"]]
        self.assertTrue(any("olaparib" in n for n in names), f"Expected 'olaparib' in {names}")

    def test_numbered_dosage_list_split(self):
        """Verify numbered dosage text splits correctly on list markers without sentence fragmentation."""
        sample_dosage = "1. Take 1 tablet daily with food. 2. Do not crush or chew. 3. Swallow whole with a full glass of water."
        bullets = split_into_bullets(sample_dosage, section_type="dosage")
        self.assertIsNotNone(bullets)
        self.assertEqual(len(bullets), 3)
        self.assertEqual(bullets[0], "Take 1 tablet daily with food.")
        self.assertEqual(bullets[1], "Do not crush or chew.")
        self.assertEqual(bullets[2], "Swallow whole with a full glass of water.")

    def test_medical_abbreviations_protection(self):
        """Verify that dosing abbreviations (q.d., b.i.d., mg., a.m., p.m.) do not cause erroneous sentence splits."""
        sample_text = "Take 500 mg. orally b.i.d. for 7 days (e.g. at 8 a.m. and 8 p.m.). May take p.r.n. for pain."
        bullets = split_into_bullets(sample_text, section_type="dosage")
        self.assertIsNotNone(bullets)
        self.assertEqual(len(bullets), 2)
        self.assertIn("Take 500 mg. orally b.i.d. for 7 days (e.g. at 8 a.m. and 8 p.m.).", bullets[0])
        self.assertIn("May take p.r.n. for pain.", bullets[1])

    def test_safety_critical_warnings_non_truncation(self):
        """Verify that safety-critical sections (warnings, sideEffects) NEVER hard-truncate at max_bullets."""
        warnings_text = ". ".join([f"Warning number {i} regarding important drug interaction and contraindication" for i in range(1, 9)])
        bullets = split_into_bullets(warnings_text, max_bullets=5, section_type="warnings")
        self.assertIsNotNone(bullets)
        # Must return ALL 8 bullets, not hard-truncated to 5
        self.assertEqual(len(bullets), 8)

    def test_bullet_deduplication(self):
        """Verify duplicate or near-duplicate sentences in a section are de-duplicated."""
        sample_text = "Take with food. Take with food! Take with plenty of water."
        bullets = split_into_bullets(sample_text)
        self.assertIsNotNone(bullets)
        self.assertEqual(len(bullets), 2)
        self.assertEqual(bullets[0], "Take with food.")
        self.assertEqual(bullets[1], "Take with plenty of water.")

    def test_html_entity_decoding(self):
        """Verify HTML entities like &amp; &lt; &gt; &quot; &#39; are properly decoded."""
        sample_text = "Relieves minor aches &amp; pains in adults &lt;65 years old. Do not use &quot;off-label&quot;."
        bullets = split_into_bullets(sample_text)
        self.assertIsNotNone(bullets)
        self.assertEqual(len(bullets), 2)
        self.assertIn("aches & pains", bullets[0])
        self.assertIn("adults <65", bullets[0])
        self.assertIn('"off-label"', bullets[1])

    def test_real_openfda_acetaminophen_structured_output(self):
        """
        Verify real OpenFDA parsing for Acetaminophen:
        - found == True
        - mainUses contains separate short symptom bullets (e.g. Headache, The common cold, etc.) NOT a run-on sentence
        - No bullet ends in trailing '...'
        - howToTake and warnings are populated
        - sideEffects is None (OTC drug label lacks adverse reaction section, gracefully omitted)
        """
        info = get_drug_info("acetaminophen")
        self.assertTrue(info["found"])
        self.assertEqual(info["source"], "OpenFDA")
        self.assertIsNotNone(info["mainUses"])
        self.assertGreater(len(info["mainUses"]), 1, "Expected separate symptom bullets, not one run-on sentence")

        # Confirm separate symptom items exist
        main_uses_text = " ".join(info["mainUses"]).lower()
        self.assertTrue(any(s in main_uses_text for s in ["headache", "cold", "backache", "toothache"]))

        # Verify NO mid-sentence '...' truncation in any section
        for bullet in (info["mainUses"] or []):
            self.assertFalse(bullet.endswith("..."), f"Bullet unexpectedly truncated: {bullet}")
        for bullet in (info["howToTake"] or []):
            self.assertFalse(bullet.endswith("..."), f"Bullet unexpectedly truncated: {bullet}")
        for bullet in (info["warnings"] or []):
            self.assertFalse(bullet.endswith("..."), f"Bullet unexpectedly truncated: {bullet}")

        # OTC label gracefully omits sideEffects
        self.assertIsNone(info["sideEffects"])

    def test_real_openfda_pantoprazole_structured_output(self):
        """
        Verify real OpenFDA parsing for Pantoprazole:
        - found == True
        - mainUses, howToTake, warnings, sideEffects are all populated
        - No bullet ends in trailing '...'
        - purpose is None (Rx drug label lacks OTC purpose section, gracefully omitted)
        """
        info = get_drug_info("pantoprazole")
        self.assertTrue(info["found"])
        self.assertEqual(info["source"], "OpenFDA")
        self.assertIsNotNone(info["mainUses"])
        self.assertGreater(len(info["mainUses"]), 0)
        self.assertIsNotNone(info["howToTake"])
        self.assertGreater(len(info["howToTake"]), 0)
        self.assertIsNotNone(info["warnings"])
        self.assertGreater(len(info["warnings"]), 0)
        self.assertIsNotNone(info["sideEffects"])
        self.assertGreater(len(info["sideEffects"]), 0)

        # Verify NO mid-sentence '...' truncation
        for bullet in (info["warnings"] or []):
            self.assertFalse(bullet.endswith("..."), f"Warning bullet unexpectedly truncated: {bullet}")
        for bullet in (info["sideEffects"] or []):
            self.assertFalse(bullet.endswith("..."), f"Side effect bullet unexpectedly truncated: {bullet}")

        # Rx label gracefully omits purpose
        self.assertIsNone(info["purpose"])

    def test_real_openfda_boxed_warning_extraction(self):
        """
        Verify real OpenFDA Black Box Warning extraction on a drug known to carry one (Metformin):
        - found == True
        - boxedWarning is populated as a separate section
        - No bullet ends in trailing '...'
        """
        info = get_drug_info("metformin")
        self.assertTrue(info["found"])
        self.assertEqual(info["source"], "OpenFDA")
        self.assertIsNotNone(info["boxedWarning"], "Expected boxedWarning for Metformin")
        self.assertGreater(len(info["boxedWarning"]), 0)

        # Verify boxed warning content mentions lactic acidosis
        bw_text = " ".join(info["boxedWarning"]).lower()
        self.assertIn("lactic acidosis", bw_text)

        # Verify NO trailing '...'
        for bullet in info["boxedWarning"]:
            self.assertFalse(bullet.endswith("..."), f"Boxed warning bullet unexpectedly truncated: {bullet}")


if __name__ == "__main__":
    unittest.main()
