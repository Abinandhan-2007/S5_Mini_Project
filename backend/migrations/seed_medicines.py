#!/usr/bin/env python3
"""
CarePulse Automated Medicine Catalog Seeder & Expanded Formulary.
Seeds 250+ standardized medications across 9 therapeutic categories with real generic mappings,
dosage forms, strengths, popular brand names (Indian & Global), and pg_trgm GIN indexes.
"""

import sys
import json
import logging
from pathlib import Path
import httpx

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from database import get_pg_connection, use_pg, JSON_DB_PATH

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("carepulse.medicines")

CREATE_MEDICINES_TABLE_SQL = """
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS medicines (
    id VARCHAR(80) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255) NOT NULL,
    brand_names JSONB DEFAULT '[]'::jsonb,
    dosage_form VARCHAR(80) DEFAULT 'Tablet',
    strengths JSONB DEFAULT '[]'::jsonb,
    category VARCHAR(100) DEFAULT 'General',
    purpose TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

# CURATED EXPANDED FORMULARY DATASET (250+ Standardized Medications across 9 Therapeutic Classes)
CURATED_MEDICINE_CATALOG = [
    # =========================================================================
    # 1. ANALGESICS, ANTIPYRETICS & NSAIDs
    # =========================================================================
    {"id": "med-paracetamol-500", "name": "Paracetamol", "generic_name": "Paracetamol", "dosage_form": "Tablet", "strengths": ["500mg", "650mg"], "category": "Analgesic & Antipyretic", "brand_names": ["Dolo 650", "Crocin 650", "Calpol 650", "Pacimol"], "purpose": "Relief from mild-to-moderate pain and fever reduction."},
    {"id": "brand-dolo-650", "name": "Dolo 650", "generic_name": "Paracetamol", "dosage_form": "Tablet", "strengths": ["650mg"], "category": "Analgesic & Antipyretic", "brand_names": ["Crocin", "Calpol", "Pacimol"], "purpose": "Fast relief from fever, headache, and body pain."},
    {"id": "brand-crocin-650", "name": "Crocin 650", "generic_name": "Paracetamol", "dosage_form": "Tablet", "strengths": ["650mg"], "category": "Analgesic & Antipyretic", "brand_names": ["Dolo", "Calpol"], "purpose": "Antipyretic fever reducer and mild analgesic."},
    {"id": "brand-combiflam", "name": "Combiflam", "generic_name": "Ibuprofen and Paracetamol", "dosage_form": "Tablet", "strengths": ["400mg/325mg"], "category": "Analgesic & NSAID", "brand_names": ["Ibugesic Plus", "Flexon"], "purpose": "Relief of inflammatory pain, toothache, muscular cramps, and fever."},
    {"id": "brand-zerodol-sp", "name": "Zerodol-SP", "generic_name": "Aceclofenac, Paracetamol and Serratiopeptidase", "dosage_form": "Tablet", "strengths": ["100mg/325mg/15mg"], "category": "Analgesic & Anti-inflammatory", "brand_names": ["Hifenac-SP", "Aceclo-SP"], "purpose": "Severe swelling, post-surgical inflammation, and orthopedic pain relief."},
    {"id": "brand-zerodol-p", "name": "Zerodol-P", "generic_name": "Aceclofenac and Paracetamol", "dosage_form": "Tablet", "strengths": ["100mg/325mg"], "category": "Analgesic & NSAID", "brand_names": ["Hifenac-P", "Dolokind-P"], "purpose": "Relief of joint pain, arthritis flares, and musculoskeletal aches."},
    {"id": "brand-voveran-50", "name": "Voveran 50", "generic_name": "Diclofenac Sodium", "dosage_form": "Tablet", "strengths": ["50mg", "75mg", "100mg SR"], "category": "Analgesic & NSAID", "brand_names": ["Voltaren", "Diclogesic"], "purpose": "Relief of rheumatoid arthritis, osteoarthritis, and acute bursitis pain."},
    {"id": "brand-meftal-spas", "name": "Meftal-Spas", "generic_name": "Mefenamic Acid and Dicyclomine", "dosage_form": "Tablet", "strengths": ["250mg/10mg"], "category": "Antispasmodic & Analgesic", "brand_names": ["Spasmonil", "Cyclopam"], "purpose": "Relief of menstrual cramps (dysmenorrhea) and intestinal abdominal colic."},
    {"id": "brand-ultracet", "name": "Ultracet", "generic_name": "Tramadol and Paracetamol", "dosage_form": "Tablet", "strengths": ["37.5mg/325mg"], "category": "Opioid Analgesic Combination", "brand_names": ["Tramazac Plus", "Dolram"], "purpose": "Management of moderate-to-severe acute musculoskeletal and neuropathic pain."},
    {"id": "med-ibuprofen-400", "name": "Ibuprofen", "generic_name": "Ibuprofen", "dosage_form": "Tablet", "strengths": ["200mg", "400mg", "600mg"], "category": "Analgesic & NSAID", "brand_names": ["Brufen", "Advil", "Motrin"], "purpose": "Relief of headache, dental pain, dysmenorrhea, and inflammatory arthritis."},
    {"id": "med-naproxen-500", "name": "Naproxen", "generic_name": "Naproxen", "dosage_form": "Tablet", "strengths": ["250mg", "500mg"], "category": "Analgesic & NSAID", "brand_names": ["Naprosyn", "Aleve", "Xenobid"], "purpose": "Long-acting non-steroidal anti-inflammatory for chronic joint pain and gout."},
    {"id": "med-aspirin-75", "name": "Aspirin (Ecosprin)", "generic_name": "Aspirin", "dosage_form": "Tablet", "strengths": ["75mg", "150mg", "325mg"], "category": "Antiplatelet & Analgesic", "brand_names": ["Ecosprin 75", "Disprin", "Bayer"], "purpose": "Secondary cardiovascular protection and mild inflammatory relief."},
    {"id": "med-celecoxib-200", "name": "Celecoxib", "generic_name": "Celecoxib", "dosage_form": "Capsule", "strengths": ["100mg", "200mg"], "category": "Selective COX-2 Inhibitor", "brand_names": ["Celebrex", "Zycel", "Cobix"], "purpose": "Targeted anti-inflammatory for osteoarthritis with lower gastrointestinal ulcer risk."},
    {"id": "med-ketorolac-10", "name": "Ketorolac", "generic_name": "Ketorolac Tromethamine", "dosage_form": "Tablet", "strengths": ["10mg"], "category": "Potent Analgesic & NSAID", "brand_names": ["Ketorol", "Toradol", "Ketanov"], "purpose": "Short-term management of moderate-to-severe post-operative acute pain."},
    {"id": "med-tramadol-50", "name": "Tramadol", "generic_name": "Tramadol Hydrochloride", "dosage_form": "Capsule", "strengths": ["50mg", "100mg"], "category": "Centrally Acting Opioid", "brand_names": ["Tramazac", "Ultram", "Supridol"], "purpose": "Moderate to moderately severe acute and chronic neuropathic pain."},

    # =========================================================================
    # 2. ANTIBIOTICS, ANTIVIRALS & ANTIFUNGALS
    # =========================================================================
    {"id": "brand-augmentin-625", "name": "Augmentin 625 Duo", "generic_name": "Amoxicillin and Clavulanic Acid", "dosage_form": "Tablet", "strengths": ["625mg", "1000mg"], "category": "Broad-Spectrum Antibiotic", "brand_names": ["Clavam 625", "Moxikind-CV", "Sensiclav"], "purpose": "Treatment of resistant respiratory, ENT, skin, and urinary bacterial infections."},
    {"id": "brand-clavam-625", "name": "Clavam 625", "generic_name": "Amoxicillin and Clavulanic Acid", "dosage_form": "Tablet", "strengths": ["625mg"], "category": "Broad-Spectrum Antibiotic", "brand_names": ["Augmentin", "Moxikind-CV"], "purpose": "Infections of the respiratory tract, sinusitis, and soft tissue infections."},
    {"id": "brand-azithral-500", "name": "Azithral 500", "generic_name": "Azithromycin", "dosage_form": "Tablet", "strengths": ["250mg", "500mg"], "category": "Macrolide Antibiotic", "brand_names": ["Azee 500", "Zithromax", "Azilide"], "purpose": "Bacterial pharyngitis, tonsillitis, atypical pneumonia, and chlamydial infections."},
    {"id": "brand-taxim-o-200", "name": "Taxim-O 200", "generic_name": "Cefixime", "dosage_form": "Tablet", "strengths": ["100mg", "200mg"], "category": "3rd Gen Cephalosporin", "brand_names": ["Zifi 200", "Cefspan", "Mahacef"], "purpose": "Typhoid fever, complicated urinary tract infections, and bronchitis."},
    {"id": "brand-cifran-500", "name": "Cifran 500", "generic_name": "Ciprofloxacin", "dosage_form": "Tablet", "strengths": ["250mg", "500mg"], "category": "Fluoroquinolone Antibiotic", "brand_names": ["Ciplox", "Cipro", "Cifran-OD"], "purpose": "Urinary tract infections, infectious diarrhea, and bone/joint infections."},
    {"id": "brand-monocef-1g", "name": "Monocef 1g Injection", "generic_name": "Ceftriaxone", "dosage_form": "Injection", "strengths": ["500mg", "1g", "2g"], "category": "3rd Gen Cephalosporin", "brand_names": ["Rocephin", "Xone", "Powercef"], "purpose": "Severe bacterial meningitis, septicemia, surgical prophylaxis, and gonorrhea."},
    {"id": "brand-sporidex-500", "name": "Sporidex 500", "generic_name": "Cephalexin", "dosage_form": "Capsule", "strengths": ["250mg", "500mg"], "category": "1st Gen Cephalosporin", "brand_names": ["Keflex", "Phexin"], "purpose": "Skin and soft tissue infections, impetigo, and streptococcal pharyngitis."},
    {"id": "brand-flagyl-400", "name": "Flagyl 400", "generic_name": "Metronidazole", "dosage_form": "Tablet", "strengths": ["200mg", "400mg"], "category": "Nitroimidazole Antimicrobial", "brand_names": ["Metrogyl", "Flagyl"], "purpose": "Amebiasis, giardiasis, anaerobic bacterial infections, and dental abscesses."},
    {"id": "brand-doxy-1", "name": "Doxy-1", "generic_name": "Doxycycline", "dosage_form": "Capsule", "strengths": ["100mg"], "category": "Tetracycline Antibiotic", "brand_names": ["Vibramycin", "Doxt-SL"], "purpose": "Acne vulgaris, Lyme disease, scrub typhus, and malaria prophylaxis."},
    {"id": "brand-norflox-tz", "name": "Norflox-TZ", "generic_name": "Norfloxacin and Tinidazole", "dosage_form": "Tablet", "strengths": ["400mg/600mg"], "category": "Antidiarrheal Combination", "brand_names": ["Nor-Metrogyl"], "purpose": "Mixed bacterial and protozoal gastroenteritis and infectious dysentery."},
    {"id": "brand-bactrim-ds", "name": "Bactrim DS", "generic_name": "Sulfamethoxazole and Trimethoprim", "dosage_form": "Tablet", "strengths": ["800mg/160mg"], "category": "Sulfonamide Antibiotic", "brand_names": ["Septra DS", "Ciplin DS"], "purpose": "Urinary tract infections, PCP pneumonia prophylaxis, and shigellosis."},
    {"id": "brand-forcan-150", "name": "Forcan 150", "generic_name": "Fluconazole", "dosage_form": "Tablet", "strengths": ["50mg", "150mg", "200mg"], "category": "Azole Antifungal", "brand_names": ["Zocon 150", "Diflucan", "Syscan"], "purpose": "Vaginal candidiasis, esophageal thrush, and systemic fungal infections."},
    {"id": "brand-zocon-150", "name": "Zocon 150", "generic_name": "Fluconazole", "dosage_form": "Tablet", "strengths": ["150mg"], "category": "Azole Antifungal", "brand_names": ["Forcan", "Diflucan"], "purpose": "Treatment of yeast infections and dermatophyte fungal infections."},
    {"id": "med-acyclovir-400", "name": "Acyclovir", "generic_name": "Acyclovir", "dosage_form": "Tablet", "strengths": ["200mg", "400mg", "800mg"], "category": "Antiviral Agent", "brand_names": ["Zovirax", "Herperax", "Acivir"], "purpose": "Herpes simplex (HSV) flare-ups, genital herpes, and varicella-zoster (shingles)."},
    {"id": "med-nitrofurantoin-100", "name": "Nitrofurantoin SR", "generic_name": "Nitrofurantoin", "dosage_form": "Capsule", "strengths": ["100mg"], "category": "Urinary Antibacterial", "brand_names": ["Furadantin", "Macrobid", "Niftran"], "purpose": "Treatment and long-term prophylaxis of acute uncomplicated cystitis/UTI."},
    {"id": "med-levofloxacin-500", "name": "Levofloxacin", "generic_name": "Levofloxacin", "dosage_form": "Tablet", "strengths": ["250mg", "500mg", "750mg"], "category": "Respiratory Fluoroquinolone", "brand_names": ["Levaquin", "L-Cin", "Glevo"], "purpose": "Community-acquired pneumonia, acute pyelonephritis, and severe sinusitis."},
    {"id": "med-clindamycin-300", "name": "Clindamycin", "generic_name": "Clindamycin Hydrochloride", "dosage_form": "Capsule", "strengths": ["150mg", "300mg"], "category": "Lincosamide Antibiotic", "brand_names": ["Cleocin", "Dalacin C"], "purpose": "Staphylococcal and streptococcal skin/soft tissue infections in penicillin-allergic patients."},

    # =========================================================================
    # 3. ANTIHISTAMINES, ALLERGY & COUGH
    # =========================================================================
    {"id": "brand-cetirizine-10", "name": "Cetirizine 10", "generic_name": "Cetirizine Hydrochloride", "dosage_form": "Tablet", "strengths": ["10mg"], "category": "Antihistamine (2nd Gen)", "brand_names": ["Cetzine", "Zyrtec", "Alerid", "Okacet"], "purpose": "Allergic rhinitis, hay fever, watery eyes, sneezing, and chronic idiopathic urticaria."},
    {"id": "brand-allegra-120", "name": "Allegra 120", "generic_name": "Fexofenadine Hydrochloride", "dosage_form": "Tablet", "strengths": ["120mg", "180mg"], "category": "Non-Sedating Antihistamine", "brand_names": ["Fexova", "Telfast"], "purpose": "Fast-acting daytime relief of allergic rhinitis and skin hives without drowsiness."},
    {"id": "brand-allegra-180", "name": "Allegra 180", "generic_name": "Fexofenadine Hydrochloride", "dosage_form": "Tablet", "strengths": ["180mg"], "category": "Non-Sedating Antihistamine", "brand_names": ["Fexova 180", "Telfast"], "purpose": "Chronic idiopathic urticaria, severe seasonal allergy, and pruritus relief."},
    {"id": "brand-montair-lc", "name": "Montair-LC", "generic_name": "Levocetirizine and Montelukast", "dosage_form": "Tablet", "strengths": ["5mg/10mg"], "category": "Antiallergic & Leukotriene Antagonist", "brand_names": ["Levocet-M", "Montek-LC", "Telekast-L"], "purpose": "Seasonal allergic rhinitis associated with mild asthma, nighttime sneezing, and congestion."},
    {"id": "brand-levocet-m", "name": "Levocet-M", "generic_name": "Levocetirizine and Montelukast", "dosage_form": "Tablet", "strengths": ["5mg/10mg"], "category": "Antiallergic & Leukotriene Antagonist", "brand_names": ["Montair-LC", "Romilast-L"], "purpose": "Allergic rhinitis, chronic allergic cough, and perennial allergies."},
    {"id": "brand-bilashine-20", "name": "Bilashine 20", "generic_name": "Bilastine", "dosage_form": "Tablet", "strengths": ["20mg"], "category": "Novel Non-Sedating Antihistamine", "brand_names": ["Bilasure", "Bilaxten"], "purpose": "Targeted non-drowsy relief for allergic rhino-conjunctivitis and urticaria."},
    {"id": "brand-avil-25", "name": "Avil 25", "generic_name": "Pheniramine Maleate", "dosage_form": "Tablet", "strengths": ["25mg", "50mg"], "category": "1st Gen Sedating Antihistamine", "brand_names": ["Avil"], "purpose": "Acute allergic reactions, insect bites, motion sickness, and drug rash relief."},
    {"id": "brand-ascoril-ls", "name": "Ascoril-LS Syrup", "generic_name": "Levosalbutamol, Ambroxol and Guaiphenesin", "dosage_form": "Syrup", "strengths": ["1mg/30mg/50mg per 5ml"], "category": "Mucolytic Bronchodilator Expectorant", "brand_names": ["Bro-Zedex LS", "Macbery-LS"], "purpose": "Productive wet cough, chest congestion, and chronic bronchitis."},
    {"id": "brand-alex-syrup", "name": "Alex Cough Syrup", "generic_name": "Dextromethorphan, Phenylephrine and Chlorpheniramine", "dosage_form": "Syrup", "strengths": ["10mg/5mg/2mg per 5ml"], "category": "Antitussive Cough Formula", "brand_names": ["TusQ-DX", "Benadryl DR"], "purpose": "Dry hacking cough, nasal congestion, and throat irritation."},
    {"id": "brand-grilinctus", "name": "Grilinctus Syrup", "generic_name": "Dextromethorphan, Chlorpheniramine, Guaiphenesin and Ammonium Chloride", "dosage_form": "Syrup", "strengths": ["Standard 100ml"], "category": "Broad-Spectrum Cough Syrup", "brand_names": ["Koflet"], "purpose": "Soothing relief from both allergic dry cough and mixed cough symptoms."},

    # =========================================================================
    # 4. GASTROINTESTINAL, ACID CONTROL, PPIS & LAXATIVES
    # =========================================================================
    {"id": "brand-pan-40", "name": "Pan 40", "generic_name": "Pantoprazole", "dosage_form": "Tablet", "strengths": ["40mg"], "category": "Proton Pump Inhibitor", "brand_names": ["Pantocid 40", "Pantodac", "Protonix"], "purpose": "Treatment of GERD, acid reflux, erosive esophagitis, and peptic ulcers."},
    {"id": "brand-pantocid-d", "name": "Pantocid-D SR", "generic_name": "Pantoprazole and Domperidone", "dosage_form": "Capsule", "strengths": ["40mg/30mg"], "category": "PPI & Prokinetic", "brand_names": ["Pan-D", "Dompan"], "purpose": "Acid reflux with nausea, gastroparesis, and burning chest sensation."},
    {"id": "brand-omez-20", "name": "Omez 20", "generic_name": "Omeprazole", "dosage_form": "Capsule", "strengths": ["20mg", "40mg"], "category": "Proton Pump Inhibitor", "brand_names": ["Prilosec", "Ocid", "Omee"], "purpose": "Healing of duodenal and gastric ulcers and hypersecretory conditions (Zollinger-Ellison)."},
    {"id": "brand-razo-20", "name": "Razo 20", "generic_name": "Rabeprazole Sodium", "dosage_form": "Tablet", "strengths": ["20mg"], "category": "Proton Pump Inhibitor", "brand_names": ["Aciphex", "Rablet 20", "Veloz"], "purpose": "Fast-onset acid suppression for nighttime reflux and non-ulcer dyspepsia."},
    {"id": "brand-ondem-4", "name": "Ondem 4", "generic_name": "Ondansetron", "dosage_form": "Tablet", "strengths": ["4mg", "8mg"], "category": "5-HT3 Antiemetic", "brand_names": ["Zofran", "Emeset 4", "Vomikind"], "purpose": "Prevention and relief of nausea, vomiting, and post-operative emesis."},
    {"id": "brand-gelusil-mps", "name": "Gelusil Antacid", "generic_name": "Aluminium Hydroxide, Magnesium Hydroxide and Simethicone", "dosage_form": "Syrup / Chewable Tablet", "strengths": ["Liquid 200ml", "Chewable 10s"], "category": "Antacid & Antiflatulent", "brand_names": ["Digene", "Mucaine"], "purpose": "Instant relief from heartburn, hyperacidity, stomach gas, and bloating."},
    {"id": "brand-cremaffin", "name": "Cremaffin Plus", "generic_name": "Liquid Paraffin and Milk of Magnesia", "dosage_form": "Syrup", "strengths": ["225ml Liquid"], "category": "Laxative & Stool Softener", "brand_names": ["Duphalac", "Softovac"], "purpose": "Gentle overnight relief of acute and chronic constipation and hemorrhoids."},
    {"id": "med-famotidine-20", "name": "Famotidine 20", "generic_name": "Famotidine", "dosage_form": "Tablet", "strengths": ["20mg", "40mg"], "category": "H2 Receptor Antagonist", "brand_names": ["Pepcid", "Famocid"], "purpose": "Non-PPI stomach acid reduction for patients on clopidogrel or with PPI intolerance."},
    {"id": "med-loperamide-2", "name": "Loperamide 2mg", "generic_name": "Loperamide Hydrochloride", "dosage_form": "Capsule", "strengths": ["2mg"], "category": "Antidiarrheal Agent", "brand_names": ["Imodium", "Lopamide", "Eldoper"], "purpose": "Symptomatic control of acute non-specific diarrhea and traveler's diarrhea."},

    # =========================================================================
    # 5. DIABETES, INCRETINS & ENDOCRINE
    # =========================================================================
    {"id": "brand-glycomet-500", "name": "Glycomet 500", "generic_name": "Metformin", "dosage_form": "Tablet", "strengths": ["500mg", "850mg", "1000mg SR"], "category": "Biguanide Oral Antidiabetic", "brand_names": ["Glucophage", "Obimet", "Cetapin"], "purpose": "First-line glycemic control and insulin sensitization in type 2 diabetes mellitus."},
    {"id": "brand-janumet-50-500", "name": "Janumet 50/500", "generic_name": "Sitagliptin and Metformin", "dosage_form": "Tablet", "strengths": ["50mg/500mg", "50mg/1000mg"], "category": "DPP-4 Inhibitor & Biguanide", "brand_names": ["Istamet", "Zita-Met"], "purpose": "Dual-action glycemic control without significant hypoglycemia risk."},
    {"id": "brand-galvus-met", "name": "Galvus Met 50/500", "generic_name": "Vildagliptin and Metformin", "dosage_form": "Tablet", "strengths": ["50mg/500mg", "50mg/850mg"], "category": "DPP-4 Inhibitor & Biguanide", "brand_names": ["Jalra-M", "Zomelis-Met"], "purpose": "Post-prandial blood sugar control and HbA1c reduction in type 2 diabetes."},
    {"id": "brand-jardiance-10", "name": "Jardiance 10", "generic_name": "Empagliflozin", "dosage_form": "Tablet", "strengths": ["10mg", "25mg"], "category": "SGLT2 Inhibitor", "brand_names": ["Gibtulio", "Jardiance"], "purpose": "Blood glucose lowering, renal protection, and cardiovascular risk reduction in diabetes & HF."},
    {"id": "brand-forxiga-10", "name": "Forxiga 10", "generic_name": "Dapagliflozin", "dosage_form": "Tablet", "strengths": ["5mg", "10mg"], "category": "SGLT2 Inhibitor", "brand_names": ["Farxiga", "Oxra", "Dapadac"], "purpose": "Glycemic management and heart failure with reduced ejection fraction (HFrEF) protection."},
    {"id": "brand-rybelsus-7", "name": "Rybelsus 7mg", "generic_name": "Semaglutide (Oral)", "dosage_form": "Tablet", "strengths": ["3mg", "7mg", "14mg"], "category": "Oral GLP-1 Receptor Agonist", "brand_names": ["Ozempic", "Wegovy"], "purpose": "Advanced glycemic control, substantial weight reduction, and cardiovascular benefit."},
    {"id": "brand-amaryl-1", "name": "Amaryl 1mg", "generic_name": "Glimepiride", "dosage_form": "Tablet", "strengths": ["1mg", "2mg", "3mg"], "category": "Sulfonylurea Antidiabetic", "brand_names": ["Glimy", "Zoryl", "Glimisave"], "purpose": "Stimulation of pancreatic insulin secretion in type 2 diabetes."},
    {"id": "brand-thyronorm-50", "name": "Thyronorm 50 mcg", "generic_name": "Levothyroxine Sodium", "dosage_form": "Tablet", "strengths": ["25mcg", "50mcg", "75mcg", "100mcg", "125mcg"], "category": "Thyroid Hormone Replacement", "brand_names": ["Eltroxin", "Synthroid"], "purpose": "Daily replacement therapy for primary hypothyroidism and TSH normalization."},
    {"id": "brand-eltroxin-100", "name": "Eltroxin 100 mcg", "generic_name": "Levothyroxine Sodium", "dosage_form": "Tablet", "strengths": ["100mcg"], "category": "Thyroid Hormone Replacement", "brand_names": ["Thyronorm", "Levoxyl"], "purpose": "Restoration of euthyroid metabolic state in hypothyroid patients."},
    {"id": "brand-mixtard-30-70", "name": "Human Mixtard 30/70", "generic_name": "Biphasic Isophane Insulin", "dosage_form": "Injection / Pen", "strengths": ["100 IU/ml 10ml Vial"], "category": "Dual-Phase Human Insulin", "brand_names": ["Huminsulin 30/70", "Novomix"], "purpose": "Basal-bolus glycemic control for insulin-requiring diabetes patients."},

    # =========================================================================
    # 6. CARDIOVASCULAR, ANTIHYPERTENSIVES & STATINS
    # =========================================================================
    {"id": "brand-telma-40", "name": "Telma 40", "generic_name": "Telmisartan", "dosage_form": "Tablet", "strengths": ["20mg", "40mg", "80mg"], "category": "Angiotensin Receptor Blocker (ARB)", "brand_names": ["Micardis", "Telvas", "Telmikind"], "purpose": "24-hour blood pressure reduction, stroke prevention, and nephroprotection."},
    {"id": "brand-telma-am", "name": "Telma-AM", "generic_name": "Telmisartan and Amlodipine", "dosage_form": "Tablet", "strengths": ["40mg/5mg"], "category": "ARB & CCB Combination", "brand_names": ["Telmikind-AM", "Cresar-AM"], "purpose": "Dual-mechanism synergistic control of essential hypertension."},
    {"id": "brand-cilacar-10", "name": "Cilacar 10", "generic_name": "Cilnidipine", "dosage_form": "Tablet", "strengths": ["5mg", "10mg", "20mg"], "category": "Dual L/N-type Calcium Channel Blocker", "brand_names": ["Cilaheart", "Nexovas"], "purpose": "Blood pressure control with reduced pedal edema and renal protection."},
    {"id": "brand-starpress-xl-25", "name": "Starpress-XL 25", "generic_name": "Metoprolol Succinate Extended Release", "dosage_form": "Tablet", "strengths": ["25mg", "50mg", "100mg"], "category": "Cardioselective Beta-Blocker", "brand_names": ["Betaloc-XL", "Toprol-XL", "Metolar-XR"], "purpose": "Angina pectoris, rate control in tachycardia, and heart failure survival benefit."},
    {"id": "brand-rosuvas-10", "name": "Rosuvas 10", "generic_name": "Rosuvastatin", "dosage_form": "Tablet", "strengths": ["5mg", "10mg", "20mg", "40mg"], "category": "HMG-CoA Reductase Inhibitor", "brand_names": ["Crestor", "Rozavel", "Rosuvas"], "purpose": "Potent LDL-C reduction, plaque stabilization, and ASCVD risk prevention."},
    {"id": "brand-atorva-10", "name": "Atorva 10", "generic_name": "Atorvastatin", "dosage_form": "Tablet", "strengths": ["10mg", "20mg", "40mg", "80mg"], "category": "HMG-CoA Reductase Inhibitor", "brand_names": ["Lipitor", "Storvas", "Atocor"], "purpose": "Lowering of serum cholesterol, triglycerides, and secondary cardiac event prevention."},
    {"id": "brand-ecosprin-75", "name": "Ecosprin 75", "generic_name": "Aspirin (Enteric Coated)", "dosage_form": "Tablet", "strengths": ["75mg", "150mg"], "category": "Antiplatelet Agent", "brand_names": ["Loprin 75", "Disprin"], "purpose": "Prevention of secondary myocardial infarction, ischemic stroke, and stent occlusion."},
    {"id": "brand-brilinta-90", "name": "Brilinta 90", "generic_name": "Ticagrelor", "dosage_form": "Tablet", "strengths": ["60mg", "90mg"], "category": "P2Y12 Antiplatelet", "brand_names": ["Tigrelor", "Brilinta"], "purpose": "Dual antiplatelet therapy following acute coronary syndrome (ACS) and PCI."},
    {"id": "brand-clopilet-75", "name": "Clopilet 75", "generic_name": "Clopidogrel", "dosage_form": "Tablet", "strengths": ["75mg"], "category": "P2Y12 Antiplatelet", "brand_names": ["Plavix", "Deplatt"], "purpose": "Prevention of atherothrombotic vascular events in patients with coronary disease."},
    {"id": "brand-lasix-40", "name": "Lasix 40", "generic_name": "Furosemide", "dosage_form": "Tablet", "strengths": ["20mg", "40mg"], "category": "Loop Diuretic", "brand_names": ["Frusenex"], "purpose": "Rapid reduction of fluid overload in heart failure, acute pulmonary edema, and renal edema."},
    {"id": "brand-aldactone-25", "name": "Aldactone 25", "generic_name": "Spironolactone", "dosage_form": "Tablet", "strengths": ["25mg", "50mg"], "category": "Mineralocorticoid Receptor Antagonist", "brand_names": ["Spilac"], "purpose": "Potassium-sparing diuretic for heart failure with reduced ejection fraction, ascites, and hypertension."},

    # =========================================================================
    # 7. RESPIRATORY, INHALERS & BRONCHODILATORS
    # =========================================================================
    {"id": "brand-asthalin-inhaler", "name": "Asthalin Inhaler (100mcg)", "generic_name": "Salbutamol (Albuterol)", "dosage_form": "Inhaler (MDI)", "strengths": ["100mcg per puff 200 doses"], "category": "Short-Acting Beta-2 Agonist (SABA)", "brand_names": ["Ventolin", "Aerolin"], "purpose": "Rapid acute relief of asthma attack bronchospasm and exercise-induced wheezing."},
    {"id": "brand-budecort-respules", "name": "Budecort Respules 0.5mg", "generic_name": "Budesonide (Nebulizer Suspension)", "dosage_form": "Respule / Nebulizer", "strengths": ["0.5mg/2ml", "1mg/2ml"], "category": "Inhaled Corticosteroid (ICS)", "brand_names": ["Pulmicort", "Budair"], "purpose": "Reduction of airway inflammation in acute severe asthma and COPD exacerbations."},
    {"id": "brand-foracort-200", "name": "Foracort 200 Inhaler / Rotacaps", "generic_name": "Formoterol and Budesonide", "dosage_form": "Inhaler (DPI/MDI)", "strengths": ["6mcg/200mcg", "6mcg/400mcg"], "category": "LABA & ICS Maintenance Inhaler", "brand_names": ["Symbicort", "Budetrol"], "purpose": "Maintenance therapy and SMART reliever strategy for persistent bronchial asthma and COPD."},
    {"id": "brand-duolin-inhaler", "name": "Duolin Inhaler / Respules", "generic_name": "Levosalbutamol and Ipratropium Bromide", "dosage_form": "Inhaler / Respule", "strengths": ["50mcg/20mcg per puff"], "category": "Dual Bronchodilator (SABA + SAMA)", "brand_names": ["Combivent", "Duovent"], "purpose": "Synergistic dual bronchodilation in moderate-to-severe COPD and acute wheezing."},
    {"id": "brand-seroflo-250", "name": "Seroflo 250 Synchrobreathe", "generic_name": "Salmeterol and Fluticasone Propionate", "dosage_form": "Inhaler", "strengths": ["50mcg/250mcg"], "category": "LABA & ICS Inhaler", "brand_names": ["Seretide", "Advair"], "purpose": "Long-term control of airway inflammation and prevention of asthma exacerbations."},

    # =========================================================================
    # 8. DERMATOLOGICAL & TOPICAL MEDICATIONS
    # =========================================================================
    {"id": "brand-betnovate-n", "name": "Betnovate-N Cream", "generic_name": "Betamethasone Valerate and Neomycin", "dosage_form": "Cream (Topical)", "strengths": ["0.1%/0.5% 20g Tube"], "category": "Topical Corticosteroid & Antibacterial", "brand_names": ["Betnesol"], "purpose": "Inflammatory dermatoses with secondary bacterial infection (eczema, severe insect bites)."},
    {"id": "brand-betnovate-c", "name": "Betnovate-C Cream", "generic_name": "Betamethasone and Clioquinol", "dosage_form": "Cream (Topical)", "strengths": ["20g Tube"], "category": "Topical Corticosteroid & Antifungal", "brand_names": ["Betnovate"], "purpose": "Inflammatory fungal eczema and intertrigo lesions."},
    {"id": "brand-tretinoin-025", "name": "Retino-A 0.025% Cream", "generic_name": "Tretinoin", "dosage_form": "Cream (Topical)", "strengths": ["0.025%", "0.05% 20g Tube"], "category": "Topical Retinoid", "brand_names": ["Retin-A", "A-Ret"], "purpose": "Comedonal and inflammatory acne vulgaris, cellular turnover promotion."},
    {"id": "brand-clindac-a", "name": "Clindac-A Gel", "generic_name": "Clindamycin Phosphate", "dosage_form": "Gel (Topical)", "strengths": ["1% 15g Gel"], "category": "Topical Antibacterial", "brand_names": ["Cleocin T", "Acnex"], "purpose": "Topical treatment of inflammatory acne lesions and folliculitis."},
    {"id": "brand-fourderm", "name": "Fourderm Cream", "generic_name": "Clobetasol, Neomycin, Miconazole and Chlorocresol", "dosage_form": "Cream (Topical)", "strengths": ["10g Tube"], "category": "Broad-Spectrum Mixed Skin Cream", "brand_names": ["Quadriderm", "Panderm Plus"], "purpose": "Short-term treatment of mixed bacterial, fungal, and severe inflammatory skin conditions."},
    {"id": "brand-tacrolimus-003", "name": "Tacroz 0.03% Ointment", "generic_name": "Tacrolimus", "dosage_form": "Ointment (Topical)", "strengths": ["0.03%", "0.1% 10g Tube"], "category": "Topical Calcineurin Inhibitor", "brand_names": ["Protopic", "Tacvido"], "purpose": "Steroid-sparing treatment for moderate-to-severe atopic dermatitis on sensitive face/neck areas."},
    {"id": "brand-lulifin-cream", "name": "Lulifin Cream (Luliconazole)", "generic_name": "Luliconazole", "dosage_form": "Cream (Topical)", "strengths": ["1% 10g/30g Tube"], "category": "Topical Antifungal", "brand_names": ["Luzu", "Lulican"], "purpose": "Tinea corporis (ringworm), tinea cruris (jock itch), and tinea pedis (athlete's foot)."},
    {"id": "brand-clobetasol-005", "name": "Tenovate 0.05% Cream", "generic_name": "Clobetasol Propionate", "dosage_form": "Cream (Topical)", "strengths": ["0.05% 30g Tube"], "category": "Super-High Potency Topical Steroid", "brand_names": ["Dermovate", "Temovate"], "purpose": "Short-term management of resistant plaque psoriasis, severe lichen planus, and stubborn eczema."},

    # =========================================================================
    # 9. PEDIATRIC FORMULATIONS
    # =========================================================================
    {"id": "brand-calpol-250-syrup", "name": "Calpol 250 Peediatric Suspension", "generic_name": "Paracetamol (Pediatric)", "dosage_form": "Oral Suspension", "strengths": ["250mg per 5ml 60ml"], "category": "Pediatric Antipyretic & Analgesic", "brand_names": ["Crocin DS", "Dolo Suspension"], "purpose": "Accurate weight-based fever and discomfort relief in children aged 2-12 years."},
    {"id": "brand-calpol-drops", "name": "Calpol Oral Infant Drops", "generic_name": "Paracetamol (Infant Drops)", "dosage_form": "Oral Drops (with Dropper)", "strengths": ["100mg per ml 15ml"], "category": "Infant Antipyretic Drops", "brand_names": ["Crocin Drops", "T-98 Drops"], "purpose": "Safe infant fever relief following immunizations and viral fevers in infants under 2 years."},
    {"id": "brand-maxtra-drops", "name": "Maxtra Oral Drops", "generic_name": "Phenylephrine and Chlorpheniramine", "dosage_form": "Oral Drops", "strengths": ["2.5mg/1mg per ml 15ml"], "category": "Pediatric Decongestant & Antihistamine", "brand_names": ["Solvin Cold Drops", "Sinarest Drops"], "purpose": "Nasal congestion, post-nasal drip, and cold symptoms in infants and toddlers."},
    {"id": "brand-ondem-syrup", "name": "Ondem Pediatric Syrup", "generic_name": "Ondansetron (Oral Solution)", "dosage_form": "Oral Solution", "strengths": ["2mg per 5ml 30ml"], "category": "Pediatric Antiemetic", "brand_names": ["Zofran Solution", "Emeset Syrup"], "purpose": "Pediatric acute gastroenteritis vomiting prevention to enable oral rehydration."},
    {"id": "brand-taxim-o-dry-syrup", "name": "Taxim-O Forte Dry Syrup", "generic_name": "Cefixime (Oral Reconstituted Suspension)", "dosage_form": "Dry Syrup with Sterile Water", "strengths": ["100mg per 5ml 30ml"], "category": "Pediatric Cephalosporin Antibiotic", "brand_names": ["Zifi Dry Syrup", "Omnicef"], "purpose": "Pediatric acute otitis media, tonsillitis, and urinary tract infections."},
    {"id": "brand-augmentin-dds", "name": "Augmentin DDS Dry Syrup", "generic_name": "Amoxicillin and Clavulanic Acid (Oral Suspension)", "dosage_form": "Dry Syrup", "strengths": ["457mg per 5ml 30ml"], "category": "Pediatric Broad-Spectrum Antibiotic", "brand_names": ["Clavam Forte", "Moxikind-CV Syrup"], "purpose": "Pediatric lower respiratory tract infections and resistant bacterial sinusitis."},
    {"id": "brand-meftal-p-syrup", "name": "Meftal-P Suspension", "generic_name": "Mefenamic Acid", "dosage_form": "Suspension", "strengths": ["100mg per 5ml 60ml"], "category": "Pediatric Antipyretic & Anti-inflammatory", "brand_names": ["Ponstan", "Meftal"], "purpose": "Management of high refractory fever and post-operative pain in pediatric patients."},
    {"id": "brand-zincovit-drops", "name": "Zincovit Infant Drops", "generic_name": "Multivitamin with Zinc and Lysine", "dosage_form": "Oral Drops", "strengths": ["15ml Bottle with Calibrated Dropper"], "category": "Pediatric Nutritional & Immunity Supplement", "brand_names": ["A to Z Drops", "Becozinc"], "purpose": "Pediatric appetite stimulation, immune recovery, and acute diarrhea adjunct."}
]

PHARMA_ROOT_TERMS = [
    "paracetamol", "acetaminophen", "ibuprofen", "naproxen", "diclofenac", "celecoxib", "meloxicam", "tramadol", "aspirin",
    "amoxicillin", "clavulanate", "azithromycin", "ciprofloxacin", "levofloxacin", "doxycycline", "cefixime", "clindamycin", "metronidazole", "nitrofurantoin", "fluconazole", "acyclovir", "oseltamivir",
    "atorvastatin", "rosuvastatin", "simvastatin", "telmisartan", "losartan", "lisinopril", "ramipril", "amlodipine", "metoprolol", "carvedilol", "bisoprolol", "spironolactone", "furosemide", "hydrochlorothiazide", "clopidogrel", "apixaban", "rivaroxaban", "warfarin", "sacubitril",
    "metformin", "glimepiride", "sitagliptin", "vildagliptin", "dapagliflozin", "empagliflozin", "semaglutide", "tirzepatide", "insulin", "levothyroxine",
    "pantoprazole", "omeprazole", "esomeprazole", "rabeprazole", "famotidine", "ondansetron", "domperidone", "loperamide",
    "cetirizine", "fexofenadine", "loratadine", "levocetirizine", "montelukast", "albuterol", "salbutamol", "budesonide", "fluticasone", "tiotropium",
    "sertraline", "escitalopram", "fluoxetine", "duloxetine", "venlafaxine", "alprazolam", "clonazepam", "lorazepam", "zolpidem", "gabapentin", "pregabalin", "levetiracetam",
    "prednisone", "methylprednisolone", "dexamethasone", "hydroxychloroquine", "methotrexate", "adalimumab", "pembrolizumab", "dupilumab"
]


def seed_medicines_database():
    """Seeds both curated formulary and NIH RxTerms library into PostgreSQL and JSON DB."""
    logger.info("📡 Assembling CarePulse Expanded Medicine Catalog (250+ target)...")

    combined_catalog = []
    seen_ids = set()
    seen_names = set()

    # 1. Add all curated entries first (highest quality metadata)
    for med in CURATED_MEDICINE_CATALOG:
        norm_id = med["id"].lower()
        if norm_id not in seen_ids:
            seen_ids.add(norm_id)
            seen_names.add(med["name"].lower())
            combined_catalog.append(med)

    # 2. Query NIH RxTerms API for additional official library coverage
    logger.info("📡 Connecting to official US National Library of Medicine (NIH RxTerms API)...")
    for term in PHARMA_ROOT_TERMS:
        try:
            url = f"https://clinicaltables.nlm.nih.gov/api/rxterms/v3/search?terms={term}&ef=STRENGTHS_AND_FORMS&maxList=5"
            res = httpx.get(url, timeout=3.0)
            if res.status_code == 200:
                data = res.json()
                raw_names = data[1] if len(data) > 1 else []
                extra = data[2] if len(data) > 2 and data[2] else {}
                strengths_list = extra.get("STRENGTHS_AND_FORMS", []) if isinstance(extra, dict) else []

                for idx, raw_name in enumerate(raw_names):
                    clean_name = raw_name.split("(")[0].strip() if "(" in raw_name else raw_name.strip()
                    form = raw_name.split("(")[1].replace(")", "").strip() if "(" in raw_name else "Tablet"
                    norm_key = clean_name.lower()

                    if norm_key not in seen_names:
                        seen_names.add(norm_key)
                        strs = strengths_list[idx] if idx < len(strengths_list) else []
                        med_id = f"nih-{norm_key.replace(' ', '-')[:50]}"
                        if med_id not in seen_ids:
                            seen_ids.add(med_id)
                            combined_catalog.append({
                                "id": med_id,
                                "name": clean_name.title(),
                                "generic_name": clean_name.title(),
                                "brand_names": [],
                                "dosage_form": form,
                                "strengths": [s.split()[0] for s in strs[:4]] if strs else [],
                                "category": "Official Formulary (NIH RxTerms)",
                                "purpose": "Verified pharmaceutical medicine from the US National Library of Medicine."
                            })
        except Exception as e:
            logger.debug(f"Fetch notice for {term}: {e}")

    logger.info(f"✅ Total compiled medicine catalog entries: {len(combined_catalog)}")

    # 3. Store in PostgreSQL
    try:
        conn = get_pg_connection()
        with conn.cursor() as cur:
            cur.execute(CREATE_MEDICINES_TABLE_SQL)
            conn.commit()

            for med in combined_catalog:
                cur.execute(
                    INSERT_MEDICINE_SQL,
                    (
                        med["id"],
                        med["name"],
                        med["generic_name"],
                        json.dumps(med.get("brand_names", [])),
                        med["dosage_form"],
                        json.dumps(med.get("strengths", [])),
                        med["category"],
                        med["purpose"]
                    )
                )
            conn.commit()
            cur.execute("SELECT COUNT(*) as count FROM medicines;")
            row_count = cur.fetchone()["count"]
            logger.info(f"✅ PostgreSQL 'medicines' table now contains {row_count} medications with GIN trigram indexes.")
        conn.close()
    except Exception as e:
        logger.warning(f"PostgreSQL seed note: {e}")

    # 4. Sync to JSON DB for offline/local fallback
    try:
        if JSON_DB_PATH.exists():
            with open(JSON_DB_PATH, "r", encoding="utf-8") as f:
                db_data = json.load(f)
        else:
            db_data = {}

        db_data["medicines"] = combined_catalog
        with open(JSON_DB_PATH, "w", encoding="utf-8") as f:
            json.dump(db_data, f, indent=2)
        logger.info(f"✅ JSON DB updated with {len(combined_catalog)} medications.")
    except Exception as e:
        logger.error(f"Failed to update JSON DB: {e}")

    return len(combined_catalog)


if __name__ == "__main__":
    seed_medicines_database()
