#!/usr/bin/env python3
"""
CarePulse Medicine Catalog Migration & Seed Script.

Creates the `medicines` table with `pg_trgm` GIN indexes for typo-tolerant fuzzy search.
Seeds standard medications across major therapeutic classes (Analgesics, Antibiotics,
Antihistamines, PPIs, Antidiabetics, Cardiovascular, etc.).
"""

import sys
import json
import logging
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from database import get_pg_connection, use_pg, JSON_DB_PATH

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("carepulse.medicines")

MEDICINES_CATALOG = [
    # Analgesics & Antipyretics (Pain & Fever)
    {
        "id": "med-pcm-650",
        "name": "Paracetamol 650",
        "generic_name": "Paracetamol",
        "brand_names": ["Dolo 650", "Crocin 650", "Calpol 650", "Pacimol 650", "Pyregesic"],
        "dosage_form": "Tablet",
        "strengths": ["500mg", "650mg", "1000mg"],
        "category": "Analgesic & Antipyretic",
        "purpose": "Relief of mild-to-moderate fever, headache, body aches, and toothache."
    },
    {
        "id": "med-dolo-650",
        "name": "Dolo 650",
        "generic_name": "Paracetamol",
        "brand_names": ["Crocin", "Calpol", "Pacimol"],
        "dosage_form": "Tablet",
        "strengths": ["650mg"],
        "category": "Analgesic & Antipyretic",
        "purpose": "Fast-acting relief from high fever, viral body pain, and headache."
    },
    {
        "id": "med-crocin-650",
        "name": "Crocin 650",
        "generic_name": "Paracetamol",
        "brand_names": ["Dolo", "Calpol"],
        "dosage_form": "Tablet",
        "strengths": ["500mg", "650mg"],
        "category": "Analgesic & Antipyretic",
        "purpose": "Reduces fever and temporarily relieves aches, pains, and throat soreness."
    },
    {
        "id": "med-calpol-500",
        "name": "Calpol 500",
        "generic_name": "Paracetamol",
        "brand_names": ["Dolo", "Crocin"],
        "dosage_form": "Tablet",
        "strengths": ["250mg", "500mg", "650mg"],
        "category": "Analgesic & Antipyretic",
        "purpose": "Antipyretic and pain reliever for fever, cold symptoms, and immunization pain."
    },
    {
        "id": "med-ibu-400",
        "name": "Ibuprofen 400",
        "generic_name": "Ibuprofen",
        "brand_names": ["Brufen 400", "Advil", "Motrin"],
        "dosage_form": "Tablet",
        "strengths": ["200mg", "400mg", "600mg"],
        "category": "NSAID Pain Reliever",
        "purpose": "Reduces pain, swelling, and inflammation in arthritis, sprains, and dental pain."
    },
    {
        "id": "med-combiflam",
        "name": "Combiflam",
        "generic_name": "Ibuprofen and Paracetamol",
        "brand_names": ["Flexon", "Ibugesic Plus"],
        "dosage_form": "Tablet",
        "strengths": ["400mg + 325mg"],
        "category": "Combination NSAID",
        "purpose": "Dual-action relief for muscular pain, joint inflammation, and fever."
    },
    {
        "id": "med-meftal-spas",
        "name": "Meftal-Spas",
        "generic_name": "Mefenamic Acid and Dicyclomine",
        "brand_names": ["Colimex", "Spasmonil"],
        "dosage_form": "Tablet",
        "strengths": ["250mg + 10mg", "500mg + 20mg"],
        "category": "Antispasmodic & Analgesic",
        "purpose": "Treatment of menstrual cramps, intestinal spasms, and abdominal colic."
    },
    {
        "id": "med-aspirin-75",
        "name": "Aspirin 75",
        "generic_name": "Aspirin",
        "brand_names": ["Ecosprin 75", "Disprin", "Bayer"],
        "dosage_form": "Tablet",
        "strengths": ["75mg", "150mg", "325mg"],
        "category": "Antiplatelet & NSAID",
        "purpose": "Cardiovascular protection, blood clot prevention, and minor pain relief."
    },
    {
        "id": "med-ecosprin-150",
        "name": "Ecosprin 150",
        "generic_name": "Aspirin",
        "brand_names": ["Disprin", "Loprin"],
        "dosage_form": "Tablet",
        "strengths": ["75mg", "150mg"],
        "category": "Cardiovascular Antiplatelet",
        "purpose": "Low-dose cardio protection against blood clots, heart attacks, and stroke."
    },

    # Antibiotics
    {
        "id": "med-amox-500",
        "name": "Amoxicillin 500",
        "generic_name": "Amoxicillin",
        "brand_names": ["Mox 500", "Novamox 500", "Amoxil"],
        "dosage_form": "Capsule",
        "strengths": ["250mg", "500mg"],
        "category": "Penicillin Antibiotic",
        "purpose": "Treatment of bacterial respiratory, throat, ear, and urinary tract infections."
    },
    {
        "id": "med-augmentin-625",
        "name": "Augmentin 625 Duo",
        "generic_name": "Amoxicillin and Clavulanic Acid",
        "brand_names": ["Clavam 625", "Moxikind-CV 625", "Advent 625"],
        "dosage_form": "Tablet",
        "strengths": ["375mg", "625mg", "1000mg"],
        "category": "Broad-Spectrum Antibiotic",
        "purpose": "Treatment of resistant bacterial infections of lungs, sinuses, skin, and urinary tract."
    },
    {
        "id": "med-azithral-500",
        "name": "Azithral 500",
        "generic_name": "Azithromycin",
        "brand_names": ["Azee 500", "Zithromax", "Azimax 500"],
        "dosage_form": "Tablet",
        "strengths": ["250mg", "500mg"],
        "category": "Macrolide Antibiotic",
        "purpose": "Treatment of chest infections, pneumonia, sinusitis, strep throat, and skin infections."
    },
    {
        "id": "med-azee-500",
        "name": "Azee 500",
        "generic_name": "Azithromycin",
        "brand_names": ["Azithral", "Zithromax"],
        "dosage_form": "Tablet",
        "strengths": ["250mg", "500mg"],
        "category": "Macrolide Antibiotic",
        "purpose": "Bacterial respiratory tract infections, tonsillitis, and ear infections."
    },
    {
        "id": "med-cifran-500",
        "name": "Cifran 500",
        "generic_name": "Ciprofloxacin",
        "brand_names": ["Ciplox 500", "Cipro"],
        "dosage_form": "Tablet",
        "strengths": ["250mg", "500mg"],
        "category": "Fluoroquinolone Antibiotic",
        "purpose": "Treatment of severe bacterial urinary tract infections (UTIs) and infectious diarrhea."
    },
    {
        "id": "med-doxy-100",
        "name": "Doxycycline 100",
        "generic_name": "Doxycycline",
        "brand_names": ["Doxt-SL", "Doryx", "Vibramycin"],
        "dosage_form": "Capsule",
        "strengths": ["100mg"],
        "category": "Tetracycline Antibiotic",
        "purpose": "Treatment of bacterial acne, tick-borne infections, bronchitis, and traveler's diarrhea."
    },
    {
        "id": "med-cefixime-200",
        "name": "Cefixime 200",
        "generic_name": "Cefixime",
        "brand_names": ["Taxim-O 200", "Zifi 200", "Suprax"],
        "dosage_form": "Tablet",
        "strengths": ["100mg", "200mg"],
        "category": "Cephalosporin Antibiotic",
        "purpose": "Oral third-generation cephalosporin for typhoid fever, ENT, and respiratory infections."
    },

    # Antihistamines & Allergy
    {
        "id": "med-cetirizine-10",
        "name": "Cetirizine 10",
        "generic_name": "Cetirizine",
        "brand_names": ["Cetzine", "Zyrtec", "Okacet", "Alerdice"],
        "dosage_form": "Tablet",
        "strengths": ["5mg", "10mg"],
        "category": "Antihistamine",
        "purpose": "Allergy relief for runny nose, sneezing, itchy watery eyes, and hives."
    },
    {
        "id": "med-cetzine-10",
        "name": "Cetzine 10",
        "generic_name": "Cetirizine",
        "brand_names": ["Zyrtec", "Okacet"],
        "dosage_form": "Tablet",
        "strengths": ["10mg"],
        "category": "Antihistamine",
        "purpose": "Relief of allergic rhinitis, seasonal allergies, and itchy skin rashes."
    },
    {
        "id": "med-allegra-120",
        "name": "Allegra 120",
        "generic_name": "Fexofenadine",
        "brand_names": ["Fexova", "Telfast"],
        "dosage_form": "Tablet",
        "strengths": ["60mg", "120mg", "180mg"],
        "category": "Non-Drowsy Antihistamine",
        "purpose": "Non-sedating allergy relief for hay fever, skin allergies, and urticaria."
    },
    {
        "id": "med-levocet-5",
        "name": "Levocetirizine 5",
        "generic_name": "Levocetirizine",
        "brand_names": ["Vozet", "L-Hist", "Xyzal"],
        "dosage_form": "Tablet",
        "strengths": ["5mg"],
        "category": "Antihistamine",
        "purpose": "Advanced relief for chronic allergic skin conditions and indoor/outdoor allergens."
    },
    {
        "id": "med-montair-lc",
        "name": "Montair LC",
        "generic_name": "Montelukast and Levocetirizine",
        "brand_names": ["Telekast-L", "Monticope"],
        "dosage_form": "Tablet",
        "strengths": ["10mg + 5mg"],
        "category": "Antiallergic & Bronchodilator",
        "purpose": "Treatment of allergic rhinitis with associated asthma or airway hyper-reactivity."
    },

    # Gastrointestinal, Antacids & PPIs
    {
        "id": "med-pan-40",
        "name": "Pan 40",
        "generic_name": "Pantoprazole",
        "brand_names": ["Pantocid 40", "Pantop 40", "Protonix"],
        "dosage_form": "Tablet",
        "strengths": ["20mg", "40mg"],
        "category": "Proton Pump Inhibitor (PPI)",
        "purpose": "Treatment of acid reflux, heartburn, GERD, and stomach ulcer prevention."
    },
    {
        "id": "med-pantocid-40",
        "name": "Pantocid 40",
        "generic_name": "Pantoprazole",
        "brand_names": ["Pan 40", "Pantodac"],
        "dosage_form": "Tablet",
        "strengths": ["20mg", "40mg"],
        "category": "Proton Pump Inhibitor (PPI)",
        "purpose": "Reduces gastric acid to heal gastritis, esophagitis, and peptic ulcers."
    },
    {
        "id": "med-omez-20",
        "name": "Omez 20",
        "generic_name": "Omeprazole",
        "brand_names": ["Prilosec", "Omecid 20", "Omizac"],
        "dosage_form": "Capsule",
        "strengths": ["10mg", "20mg", "40mg"],
        "category": "Proton Pump Inhibitor (PPI)",
        "purpose": "Decreases excess stomach acid for severe heartburn, acid indigestion, and ulcer care."
    },
    {
        "id": "med-razo-20",
        "name": "Razo 20",
        "generic_name": "Rabeprazole",
        "brand_names": ["Pariet", "Rabicip"],
        "dosage_form": "Tablet",
        "strengths": ["10mg", "20mg"],
        "category": "Proton Pump Inhibitor (PPI)",
        "purpose": "Fast-acting suppression of stomach acid secretion in acid reflux disease."
    },
    {
        "id": "med-digene-gel",
        "name": "Digene Antacid",
        "generic_name": "Magnesium Hydroxide and Aluminium Hydroxide",
        "brand_names": ["Gelusil", "Mylanta"],
        "dosage_form": "Syrup",
        "strengths": ["Liquid 200ml", "Chewable Tablet"],
        "category": "Antacid & Antigas",
        "purpose": "Instant neutralizing relief from acidity, heartburn, gas, and stomach bloating."
    },
    {
        "id": "med-gelusil-mps",
        "name": "Gelusil MPS",
        "generic_name": "Aluminium Hydroxide, Dimethicone and Magnesium Hydroxide",
        "brand_names": ["Digene"],
        "dosage_form": "Tablet",
        "strengths": ["Chewable Tablet"],
        "category": "Antacid & Antiflatulent",
        "purpose": "Relieves acute hyperacidity, stomach sourness, and painful gas pressure."
    },

    # Antidiabetics (Blood Sugar Management)
    {
        "id": "med-glycomet-500",
        "name": "Glycomet 500",
        "generic_name": "Metformin",
        "brand_names": ["Glucophage", "Glyciphage", "Riomet"],
        "dosage_form": "Tablet",
        "strengths": ["250mg", "500mg", "850mg", "1000mg"],
        "category": "Oral Antidiabetic",
        "purpose": "Blood sugar regulation in patients with type 2 diabetes mellitus."
    },
    {
        "id": "med-metformin-850",
        "name": "Metformin 850",
        "generic_name": "Metformin",
        "brand_names": ["Glycomet", "Glucophage"],
        "dosage_form": "Tablet",
        "strengths": ["500mg", "850mg", "1000mg"],
        "category": "Oral Antidiabetic",
        "purpose": "Improves cellular insulin sensitivity and lowers hepatic glucose production."
    },
    {
        "id": "med-glimepiride-2",
        "name": "Glimepiride 2",
        "generic_name": "Glimepiride",
        "brand_names": ["Amaryl", "Glimy", "Zoryl"],
        "dosage_form": "Tablet",
        "strengths": ["1mg", "2mg", "3mg", "4mg"],
        "category": "Sulfonylurea Antidiabetic",
        "purpose": "Stimulates pancreatic insulin secretion to lower high blood glucose."
    },
    {
        "id": "med-januvia-100",
        "name": "Januvia 100",
        "generic_name": "Sitagliptin",
        "brand_names": ["Zita", "Janumet"],
        "dosage_form": "Tablet",
        "strengths": ["25mg", "50mg", "100mg"],
        "category": "DPP-4 Inhibitor",
        "purpose": "Enhances incretin hormone levels to stabilize post-meal blood sugar."
    },
    {
        "id": "med-forxiga-10",
        "name": "Forxiga 10",
        "generic_name": "Dapagliflozin",
        "brand_names": ["Farxiga", "Oxra"],
        "dosage_form": "Tablet",
        "strengths": ["5mg", "10mg"],
        "category": "SGLT2 Inhibitor",
        "purpose": "Excretes excess glucose through urine, providing cardiovascular and kidney protection."
    },

    # Cardiovascular & Blood Pressure
    {
        "id": "med-atorva-10",
        "name": "Atorva 10",
        "generic_name": "Atorvastatin",
        "brand_names": ["Lipitor", "Atocor", "Storvas"],
        "dosage_form": "Tablet",
        "strengths": ["10mg", "20mg", "40mg", "80mg"],
        "category": "Statin Lipid-Lowering",
        "purpose": "Lowers bad cholesterol (LDL) and triglycerides; reduces stroke and heart attack risk."
    },
    {
        "id": "med-rosuvas-10",
        "name": "Rosuvas 10",
        "generic_name": "Rosuvastatin",
        "brand_names": ["Crestor", "Rosulip"],
        "dosage_form": "Tablet",
        "strengths": ["5mg", "10mg", "20mg"],
        "category": "Statin Lipid-Lowering",
        "purpose": "Potent cholesterol management and prevention of coronary atherosclerosis."
    },
    {
        "id": "med-telma-40",
        "name": "Telma 40",
        "generic_name": "Telmisartan",
        "brand_names": ["Micardis", "Telmikind"],
        "dosage_form": "Tablet",
        "strengths": ["20mg", "40mg", "80mg"],
        "category": "Angiotensin Receptor Blocker (ARB)",
        "purpose": "Treats hypertension (high blood pressure) and protects kidney function."
    },
    {
        "id": "med-amlodipine-5",
        "name": "Amlodipine 5",
        "generic_name": "Amlodipine",
        "brand_names": ["Norvasc", "Amlong", "Stamlo"],
        "dosage_form": "Tablet",
        "strengths": ["2.5mg", "5mg", "10mg"],
        "category": "Calcium Channel Blocker",
        "purpose": "Relaxes vascular smooth muscle to lower blood pressure and control angina chest pain."
    },
    {
        "id": "med-metoprolol-50",
        "name": "Metoprolol 50",
        "generic_name": "Metoprolol",
        "brand_names": ["Betaloc", "Lopressor", "Metolar"],
        "dosage_form": "Tablet",
        "strengths": ["25mg", "50mg", "100mg"],
        "category": "Beta-Blocker",
        "purpose": "Lowers heart rate and blood pressure; treats arrhythmias and post-infarction recovery."
    },

    # Respiratory & Cough
    {
        "id": "med-ascoril-d",
        "name": "Ascoril D Plus",
        "generic_name": "Dextromethorphan and Chlorpheniramine",
        "brand_names": ["Benadryl DR", "TusQ-DX"],
        "dosage_form": "Syrup",
        "strengths": ["100ml Syrup"],
        "category": "Cough Suppressant",
        "purpose": "Symptomatic relief of dry hacking cough, throat tickle, and throat irritation."
    },
    {
        "id": "med-benadryl",
        "name": "Benadryl Cough Formula",
        "generic_name": "Diphenhydramine and Ammonium Chloride",
        "brand_names": ["Cofsil"],
        "dosage_form": "Syrup",
        "strengths": ["100ml Syrup"],
        "category": "Cough Expectorant",
        "purpose": "Relieves chest congestion, thins mucous, and soothes irritating coughs."
    },
    {
        "id": "med-asthalin-inhaler",
        "name": "Asthalin Inhaler",
        "generic_name": "Salbutamol",
        "brand_names": ["Ventolin", "Albuterol"],
        "dosage_form": "Inhaler",
        "strengths": ["100mcg/puff"],
        "category": "Bronchodilator",
        "purpose": "Rapid rescue bronchodilator for acute asthma attacks, wheezing, and COPD flare-ups."
    },
    {
        "id": "med-budecort-200",
        "name": "Budecort 200",
        "generic_name": "Budesonide",
        "brand_names": ["Pulmicort"],
        "dosage_form": "Inhaler",
        "strengths": ["100mcg", "200mcg"],
        "category": "Inhaled Corticosteroid",
        "purpose": "Daily maintenance controller inhaler to prevent bronchial inflammation and asthma symptoms."
    }
]

CREATE_MEDICINES_TABLE_SQL = """
-- 1. Enable pg_trgm for fast fuzzy trigram matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create medicines catalog table
CREATE TABLE IF NOT EXISTS medicines (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255) NOT NULL,
    brand_names JSONB DEFAULT '[]'::jsonb,
    dosage_form VARCHAR(50) DEFAULT 'Tablet',
    strengths JSONB DEFAULT '[]'::jsonb,
    category VARCHAR(100) DEFAULT 'General',
    purpose TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. High-performance Trigram GIN indexes
CREATE INDEX IF NOT EXISTS idx_medicines_name_trgm ON medicines USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_medicines_generic_trgm ON medicines USING gin (generic_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_medicines_name_lower ON medicines (LOWER(name));
"""

INSERT_MEDICINE_SQL = """
INSERT INTO medicines (id, name, generic_name, brand_names, dosage_form, strengths, category, purpose)
VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    generic_name = EXCLUDED.generic_name,
    brand_names = EXCLUDED.brand_names,
    dosage_form = EXCLUDED.dosage_form,
    strengths = EXCLUDED.strengths,
    category = EXCLUDED.category,
    purpose = EXCLUDED.purpose;
"""


def seed_medicines_catalog():
    logger.info("Initializing medicines table with pg_trgm GIN indexes...")

    # 1. Update PostgreSQL if reachable
    try:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(CREATE_MEDICINES_TABLE_SQL)
                conn.commit()

                logger.info(f"Seeding {len(MEDICINES_CATALOG)} catalog medicines into PostgreSQL...")
                for med in MEDICINES_CATALOG:
                    cur.execute(
                        INSERT_MEDICINE_SQL,
                        (
                            med["id"],
                            med["name"],
                            med["generic_name"],
                            json.dumps(med["brand_names"]),
                            med["dosage_form"],
                            json.dumps(med["strengths"]),
                            med["category"],
                            med["purpose"],
                        )
                    )
                conn.commit()

                # Test a trigram fuzzy search
                cur.execute(
                    """
                    SELECT name, generic_name, similarity(name, 'paracetmol') as sim
                    FROM medicines
                    WHERE similarity(name, 'paracetmol') > 0.4
                    ORDER BY sim DESC
                    LIMIT 3;
                    """
                )
                test_rows = cur.fetchall()
                logger.info(f"✅ pg_trgm GIN search test for 'paracetmol': {test_rows}")

        logger.info("✅ PostgreSQL medicines catalog successfully seeded.")
    except Exception as e:
        logger.warning(f"Note on PostgreSQL medicines table seed: {e}")

    # 2. Update database.json for offline JSON fallback
    try:
        if JSON_DB_PATH.exists():
            with open(JSON_DB_PATH, "r", encoding="utf-8") as f:
                db_data = json.load(f)
        else:
            db_data = {}

        db_data["medicines"] = MEDICINES_CATALOG
        with open(JSON_DB_PATH, "w", encoding="utf-8") as f:
            json.dump(db_data, f, indent=2)
        logger.info(f"✅ JSON DB ({JSON_DB_PATH}) updated with {len(MEDICINES_CATALOG)} medicines.")
    except Exception as e:
        logger.error(f"Failed to update JSON DB with medicines: {e}")


if __name__ == "__main__":
    seed_medicines_catalog()
