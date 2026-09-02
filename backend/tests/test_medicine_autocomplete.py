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
        self.assertTrue(len(lookup_res.purpose) > 0)
        # Verify pain/fever content from OpenFDA
        self.assertTrue(
            "pain" in lookup_res.purpose.lower() or "fever" in lookup_res.purpose.lower(),
            f"Expected pain/fever in purpose, got: {lookup_res.purpose}"
        )

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


if __name__ == "__main__":
    unittest.main()
