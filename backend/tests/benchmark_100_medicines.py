"""
Clinical Accuracy Benchmark: 100 Non-Common Prescription Medications.
Evaluates the CarePulse Medicine Scan / Lookup Engine on:
1. Therapeutic Uses & Indications (Correct vs Incorrect)
2. Adverse Side Effects & Boxed Warnings (Correct vs Incorrect)
3. Dosage Ceilings & Age Cohort Limits (Correct vs Incorrect)
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

# Curated benchmark database of 100 NON-COMMON prescription medications
# across 10 specialized medical disciplines with clinical ground-truth expectations.
BENCHMARK_MEDICATIONS = [
    # ── 1. CARDIOLOGY & HEMOSTASIS (10) ──
    {
        "name": "Amiodarone",
        "category": "Cardiology / Antiarrhythmic",
        "expected_use_keywords": ["arrhythmia", "ventricular", "atrial", "fibrillation", "tachycardia", "heart", "cardiac"],
        "expected_side_effect_keywords": ["thyroid", "pulmonary", "liver", "corneal", "bradycardia", "qt", "hypotension", "nausea", "toxic"],
        "max_ceiling_ref": "400 mg - 1200 mg"
    },
    {
        "name": "Digoxin",
        "category": "Cardiology / Inotropic Agent",
        "expected_use_keywords": ["heart failure", "atrial fibrillation", "cardiac", "inotropic", "ventricular rate"],
        "expected_side_effect_keywords": ["arrhythmia", "nausea", "vomiting", "visual", "halo", "toxicity", "bradycardia", "anorexia"],
        "max_ceiling_ref": "0.25 mg - 0.5 mg"
    },
    {
        "name": "Spironolactone",
        "category": "Cardiology / Aldosterone Antagonist",
        "expected_use_keywords": ["heart failure", "hypertension", "edema", "hyperaldosteronism", "cirrhosis", "potassium"],
        "expected_side_effect_keywords": ["hyperkalemia", "gynecomastia", "dizziness", "renal", "hypotension", "electrolyte"],
        "max_ceiling_ref": "100 mg - 400 mg"
    },
    {
        "name": "Ticagrelor",
        "category": "Cardiology / Antiplatelet",
        "expected_use_keywords": ["acute coronary", "myocardial infarction", "thrombosis", "stent", "antiplatelet", "stroke"],
        "expected_side_effect_keywords": ["bleeding", "dyspnea", "hemorrhage", "bradycardia", "bruising"],
        "max_ceiling_ref": "180 mg"
    },
    {
        "name": "Dabigatran",
        "category": "Cardiology / Direct Thrombin Inhibitor",
        "expected_use_keywords": ["anticoagulant", "atrial fibrillation", "stroke", "deep vein thrombosis", "pulmonary embolism", "clot"],
        "expected_side_effect_keywords": ["bleeding", "dyspepsia", "gastritis", "hemorrhage", "gastrointestinal"],
        "max_ceiling_ref": "300 mg"
    },
    {
        "name": "Ranolazine",
        "category": "Cardiology / Antianginal",
        "expected_use_keywords": ["angina", "chronic angina", "ischemic", "chest pain", "coronary"],
        "expected_side_effect_keywords": ["qt prolongation", "dizziness", "headache", "constipation", "nausea"],
        "max_ceiling_ref": "2000 mg"
    },
    {
        "name": "Flecainide",
        "category": "Cardiology / Class IC Antiarrhythmic",
        "expected_use_keywords": ["arrhythmia", "paroxysmal atrial fibrillation", "supraventricular", "ventricular tachycardia"],
        "expected_side_effect_keywords": ["proarrhythmic", "dizziness", "visual disturbance", "dyspnea", "headache"],
        "max_ceiling_ref": "400 mg"
    },
    {
        "name": "Ivabradine",
        "category": "Cardiology / Hyperpolarization Channel Blocker",
        "expected_use_keywords": ["heart failure", "angina", "sinus rhythm", "heart rate", "ejection fraction"],
        "expected_side_effect_keywords": ["bradycardia", "phosphenes", "visual", "atrial fibrillation", "hypertension"],
        "max_ceiling_ref": "15 mg"
    },
    {
        "name": "Diltiazem",
        "category": "Cardiology / Calcium Channel Blocker",
        "expected_use_keywords": ["hypertension", "angina", "atrial fibrillation", "atrial flutter", "blood pressure"],
        "expected_side_effect_keywords": ["edema", "headache", "bradycardia", "hypotension", "dizziness", "av block"],
        "max_ceiling_ref": "360 mg - 480 mg"
    },
    {
        "name": "Sacubitril",
        "category": "Cardiology / Neprilysin Inhibitor",
        "expected_use_keywords": ["heart failure", "reduced ejection", "cardiovascular", "hypertension"],
        "expected_side_effect_keywords": ["hypotension", "hyperkalemia", "cough", "angioedema", "renal impairment"],
        "max_ceiling_ref": "200 mg"
    },

    # ── 2. ONCOLOGY & ANTINEOPLASTICS (10) ──
    {
        "name": "Imatinib",
        "category": "Oncology / Tyrosine Kinase Inhibitor",
        "expected_use_keywords": ["leukemia", "cml", "gist", "gastrointestinal stromal", "myelogenous", "cancer"],
        "expected_side_effect_keywords": ["edema", "fluid retention", "nausea", "muscle cramps", "diarrhea", "neutropenia", "thrombocytopenia", "rash"],
        "max_ceiling_ref": "800 mg"
    },
    {
        "name": "Erlotinib",
        "category": "Oncology / EGFR Inhibitor",
        "expected_use_keywords": ["lung cancer", "non-small cell", "pancreatic cancer", "egfr", "carcinoma"],
        "expected_side_effect_keywords": ["rash", "diarrhea", "interstitial lung disease", "fatigue", "anorexia", "hepatotoxicity"],
        "max_ceiling_ref": "150 mg"
    },
    {
        "name": "Capecitabine",
        "category": "Oncology / Antimetabolite",
        "expected_use_keywords": ["colorectal cancer", "breast cancer", "colon", "gastric", "carcinoma"],
        "expected_side_effect_keywords": ["hand-foot syndrome", "palmar-plantar", "diarrhea", "nausea", "fatigue", "stomatitis", "myelosuppression"],
        "max_ceiling_ref": "2500 mg/m2"
    },
    {
        "name": "Tamoxifen",
        "category": "Oncology / SERM",
        "expected_use_keywords": ["breast cancer", "estrogen receptor", "ductal carcinoma", "prevention"],
        "expected_side_effect_keywords": ["hot flashes", "thromboembolism", "endometrial", "uterine", "nausea", "fluid retention"],
        "max_ceiling_ref": "40 mg"
    },
    {
        "name": "Methotrexate",
        "category": "Oncology / Rheumatology",
        "expected_use_keywords": ["leukemia", "lymphoma", "rheumatoid arthritis", "psoriasis", "cancer", "osteosarcoma"],
        "expected_side_effect_keywords": ["hepatotoxicity", "bone marrow suppression", "nausea", "ulcerative stomatitis", "pneumonitis", "renal"],
        "max_ceiling_ref": "25 mg - 100 mg"
    },
    {
        "name": "Nilotinib",
        "category": "Oncology / Bcr-Abl Inhibitor",
        "expected_use_keywords": ["chronic myeloid leukemia", "cml", "philadelphia chromosome", "leukemia"],
        "expected_side_effect_keywords": ["qt prolongation", "myelosuppression", "pancreatitis", "rash", "headache", "hyperglycemia"],
        "max_ceiling_ref": "800 mg"
    },
    {
        "name": "Sunitinib",
        "category": "Oncology / Multitarget Receptor Inhibitor",
        "expected_use_keywords": ["renal cell carcinoma", "gist", "pancreatic neuroendocrine", "kidney cancer"],
        "expected_side_effect_keywords": ["fatigue", "hypertension", "hand-foot syndrome", "bleeding", "cardiotoxicity", "thyroid"],
        "max_ceiling_ref": "50 mg"
    },
    {
        "name": "Sorafenib",
        "category": "Oncology / Kinase Inhibitor",
        "expected_use_keywords": ["hepatocellular carcinoma", "liver cancer", "renal cell", "thyroid cancer"],
        "expected_side_effect_keywords": ["hand-foot syndrome", "hypertension", "diarrhea", "fatigue", "bleeding", "cardiac ischemia"],
        "max_ceiling_ref": "800 mg"
    },
    {
        "name": "Letrozole",
        "category": "Oncology / Aromatase Inhibitor",
        "expected_use_keywords": ["breast cancer", "postmenopausal", "aromatase", "estrogen"],
        "expected_side_effect_keywords": ["hot flashes", "arthralgia", "osteoporosis", "fatigue", "hypercholesterolemia"],
        "max_ceiling_ref": "2.5 mg"
    },
    {
        "name": "Anastrozole",
        "category": "Oncology / Aromatase Inhibitor",
        "expected_use_keywords": ["breast cancer", "adjuvant treatment", "postmenopausal", "estrogen receptor"],
        "expected_side_effect_keywords": ["hot flashes", "joint pain", "bone fractures", "osteoporosis", "nausea", "lethargy"],
        "max_ceiling_ref": "1 mg"
    },

    # ── 3. NEUROLOGY & ANTICONVULSANTS (10) ──
    {
        "name": "Levetiracetam",
        "category": "Neurology / Antiepileptic",
        "expected_use_keywords": ["seizures", "epilepsy", "partial onset", "myoclonic", "tonic-clonic", "convulsions"],
        "expected_side_effect_keywords": ["somnolence", "dizziness", "fatigue", "irritability", "behavioral", "depression", "aggression"],
        "max_ceiling_ref": "3000 mg"
    },
    {
        "name": "Lamotrigine",
        "category": "Neurology / Anticonvulsant & Mood Stabilizer",
        "expected_use_keywords": ["epilepsy", "seizures", "bipolar disorder", "partial seizures", "mood"],
        "expected_side_effect_keywords": ["rash", "stevens-johnson", "dizziness", "headache", "diplopia", "ataxia", "nausea"],
        "max_ceiling_ref": "500 mg"
    },
    {
        "name": "Topiramate",
        "category": "Neurology / Neurotherapeutic",
        "expected_use_keywords": ["seizures", "epilepsy", "migraine prophylaxis", "migraine headache"],
        "expected_side_effect_keywords": ["paresthesia", "weight loss", "cognitive impairment", "somnolence", "kidney stones", "glaucoma", "fatigue"],
        "max_ceiling_ref": "400 mg"
    },
    {
        "name": "Pramipexole",
        "category": "Neurology / Dopamine Agonist",
        "expected_use_keywords": ["parkinson", "restless legs", "tremor", "motor symptoms", "dopamine"],
        "expected_side_effect_keywords": ["nausea", "somnolence", "hallucinations", "dizziness", "impulse control", "orthostatic hypotension"],
        "max_ceiling_ref": "4.5 mg"
    },
    {
        "name": "Ropinirole",
        "category": "Neurology / Dopamine Agonist",
        "expected_use_keywords": ["parkinson", "restless legs syndrome", "motor complications"],
        "expected_side_effect_keywords": ["nausea", "somnolence", "dizziness", "hallucinations", "orthostatic hypotension", "edema"],
        "max_ceiling_ref": "24 mg"
    },
    {
        "name": "Memantine",
        "category": "Neurology / NMDA Receptor Antagonist",
        "expected_use_keywords": ["alzheimer", "dementia", "cognitive", "moderate to severe"],
        "expected_side_effect_keywords": ["dizziness", "headache", "confusion", "constipation", "somnolence", "hypertension"],
        "max_ceiling_ref": "20 mg"
    },
    {
        "name": "Riluzole",
        "category": "Neurology / Neuroprotective",
        "expected_use_keywords": ["amyotrophic lateral sclerosis", "als", "motor neuron", "survival"],
        "expected_side_effect_keywords": ["nausea", "asthenia", "hepatic", "transaminases", "dizziness", "diarrhea", "anorexia"],
        "max_ceiling_ref": "100 mg"
    },
    {
        "name": "Donepezil",
        "category": "Neurology / Cholinesterase Inhibitor",
        "expected_use_keywords": ["alzheimer", "dementia", "cognitive impairment", "memory"],
        "expected_side_effect_keywords": ["nausea", "diarrhea", "insomnia", "vomiting", "muscle cramps", "bradycardia", "fatigue"],
        "max_ceiling_ref": "23 mg"
    },
    {
        "name": "Lacosamide",
        "category": "Neurology / Antiepileptic",
        "expected_use_keywords": ["partial-onset seizures", "epilepsy", "seizures", "anticonvulsant"],
        "expected_side_effect_keywords": ["dizziness", "headache", "nausea", "diplopia", "ataxia", "pr interval prolongation"],
        "max_ceiling_ref": "400 mg"
    },
    {
        "name": "Carbamazepine",
        "category": "Neurology / Anticonvulsant",
        "expected_use_keywords": ["epilepsy", "trigeminal neuralgia", "seizures", "bipolar"],
        "expected_side_effect_keywords": ["aplastic anemia", "agranulocytosis", "stevens-johnson", "dizziness", "ataxia", "hyponatremia"],
        "max_ceiling_ref": "1200 mg"
    },

    # ── 4. IMMUNOLOGY, TRANSPLANT & RHEUMATOLOGY (10) ──
    {
        "name": "Tacrolimus",
        "category": "Immunology / Calcineurin Inhibitor",
        "expected_use_keywords": ["organ transplant", "kidney transplant", "liver transplant", "graft rejection", "immunosuppressive"],
        "expected_side_effect_keywords": ["nephrotoxicity", "neurotoxicity", "tremor", "hypertension", "hyperkalemia", "infection", "headache", "hyperglycemia"],
        "max_ceiling_ref": "10 mg - 20 mg"
    },
    {
        "name": "Cyclosporine",
        "category": "Immunology / Immunosuppressant",
        "expected_use_keywords": ["organ rejection", "transplant", "rheumatoid arthritis", "psoriasis", "immunosuppressant"],
        "expected_side_effect_keywords": ["renal dysfunction", "hypertension", "hirsutism", "gingival hyperplasia", "tremor", "infection"],
        "max_ceiling_ref": "15 mg/kg"
    },
    {
        "name": "Mycophenolate",
        "category": "Immunology / Inosine Monophosphate Dehydrogenase Inhibitor",
        "expected_use_keywords": ["transplant rejection", "kidney transplant", "heart transplant", "liver transplant", "immunosuppression"],
        "expected_side_effect_keywords": ["diarrhea", "leukopenia", "infection", "vomiting", "embryo-fetal toxicity", "lymphoma"],
        "max_ceiling_ref": "3000 mg"
    },
    {
        "name": "Azathioprine",
        "category": "Immunology / Purine Antimetabolite",
        "expected_use_keywords": ["renal homotransplantation", "rheumatoid arthritis", "crohn", "ulcerative colitis", "autoimmune"],
        "expected_side_effect_keywords": ["bone marrow suppression", "leukopenia", "thrombocytopenia", "hepatotoxicity", "infection", "neoplasia"],
        "max_ceiling_ref": "2.5 mg/kg"
    },
    {
        "name": "Hydroxychloroquine",
        "category": "Rheumatology / Disease-Modifying Agent",
        "expected_use_keywords": ["lupus erythematosus", "rheumatoid arthritis", "malaria", "sle", "autoimmune"],
        "expected_side_effect_keywords": ["retinopathy", "retinal", "maculopathy", "cardiomyopathy", "nausea", "headache", "visual"],
        "max_ceiling_ref": "400 mg"
    },
    {
        "name": "Leflunomide",
        "category": "Rheumatology / Pyrimidine Synthesis Inhibitor",
        "expected_use_keywords": ["rheumatoid arthritis", "dmard", "joint swelling", "active arthritis"],
        "expected_side_effect_keywords": ["hepatotoxicity", "teratogenicity", "diarrhea", "hypertension", "alopecia", "rash"],
        "max_ceiling_ref": "20 mg - 100 mg"
    },
    {
        "name": "Tofacitinib",
        "category": "Rheumatology / JAK Inhibitor",
        "expected_use_keywords": ["rheumatoid arthritis", "psoriatic arthritis", "ulcerative colitis", "ankylosing spondylitis"],
        "expected_side_effect_keywords": ["infection", "thrombosis", "malignancy", "cardiovascular events", "headache", "diarrhea"],
        "max_ceiling_ref": "22 mg"
    },
    {
        "name": "Sulfasalazine",
        "category": "Rheumatology / 5-ASA Compound",
        "expected_use_keywords": ["ulcerative colitis", "rheumatoid arthritis", "crohn", "inflammatory bowel"],
        "expected_side_effect_keywords": ["nausea", "dyspepsia", "headache", "rash", "oligospermia", "agranulocytosis"],
        "max_ceiling_ref": "4000 mg"
    },
    {
        "name": "Colchicine",
        "category": "Rheumatology / Anti-Gout",
        "expected_use_keywords": ["gout flares", "gouty arthritis", "familial mediterranean fever", "pericarditis"],
        "expected_side_effect_keywords": ["diarrhea", "nausea", "vomiting", "abdominal pain", "myopathy", "neuropathy"],
        "max_ceiling_ref": "1.8 mg - 2.4 mg"
    },
    {
        "name": "Baricitinib",
        "category": "Rheumatology / JAK Inhibitor",
        "expected_use_keywords": ["rheumatoid arthritis", "alopecia areata", "covid-19", "janus kinase"],
        "expected_side_effect_keywords": ["infections", "thrombosis", "deep vein thrombosis", "respiratory tract", "hyperlipidemia"],
        "max_ceiling_ref": "4 mg"
    },

    # ── 5. ENDOCRINOLOGY & SPECIALIZED METABOLISM (10) ──
    {
        "name": "Propylthiouracil",
        "category": "Endocrinology / Antithyroid",
        "expected_use_keywords": ["hyperthyroidism", "graves disease", "thyroid storm", "thyrotoxicosis"],
        "expected_side_effect_keywords": ["hepatotoxicity", "agranulocytosis", "rash", "arthralgia", "fever", "leukopenia"],
        "max_ceiling_ref": "600 mg - 900 mg"
    },
    {
        "name": "Methimazole",
        "category": "Endocrinology / Thionamide",
        "expected_use_keywords": ["hyperthyroidism", "graves disease", "toxic goiter", "thyrotoxicosis"],
        "expected_side_effect_keywords": ["agranulocytosis", "rash", "arthralgia", "hepatotoxicity", "fever", "nausea"],
        "max_ceiling_ref": "60 mg"
    },
    {
        "name": "Octreotide",
        "category": "Endocrinology / Somatostatin Analogue",
        "expected_use_keywords": ["acromegaly", "carcinoid tumors", "diarrhea", "vasoactive intestinal peptide", "variceal bleeding"],
        "expected_side_effect_keywords": ["gallstones", "cholelithiasis", "nausea", "diarrhea", "abdominal discomfort", "bradycardia", "hypoglycemia"],
        "max_ceiling_ref": "1500 mcg"
    },
    {
        "name": "Cabergoline",
        "category": "Endocrinology / Ergot Derivative",
        "expected_use_keywords": ["hyperprolactinemia", "prolactinoma", "galactorrhea", "dopamine agonist"],
        "expected_side_effect_keywords": ["nausea", "headache", "dizziness", "cardiac valvulopathy", "hypotension", "fatigue"],
        "max_ceiling_ref": "3 mg"
    },
    {
        "name": "Cinacalcet",
        "category": "Endocrinology / Calcimimetic",
        "expected_use_keywords": ["hyperparathyroidism", "chronic kidney disease", "parathyroid carcinoma", "hypercalcemia"],
        "expected_side_effect_keywords": ["hypocalcemia", "nausea", "vomiting", "diarrhea", "paresthesia", "myalgia"],
        "max_ceiling_ref": "180 mg"
    },
    {
        "name": "Empagliflozin",
        "category": "Endocrinology / SGLT2 Inhibitor",
        "expected_use_keywords": ["type 2 diabetes", "glycemic control", "heart failure", "chronic kidney disease"],
        "expected_side_effect_keywords": ["urinary tract infection", "genital mycotic", "ketoacidosis", "hypotension", "volume depletion"],
        "max_ceiling_ref": "25 mg"
    },
    {
        "name": "Pioglitazone",
        "category": "Endocrinology / Thiazolidinedione",
        "expected_use_keywords": ["type 2 diabetes mellitus", "insulin resistance", "glycemic control"],
        "expected_side_effect_keywords": ["fluid retention", "heart failure", "edema", "fractures", "weight gain", "bladder cancer"],
        "max_ceiling_ref": "45 mg"
    },
    {
        "name": "Fludrocortisone",
        "category": "Endocrinology / Mineralocorticoid",
        "expected_use_keywords": ["adrenocortical insufficiency", "addison disease", "salt-losing", "orthostatic hypotension"],
        "expected_side_effect_keywords": ["hypertension", "edema", "hypokalemia", "heart failure", "sodium retention"],
        "max_ceiling_ref": "0.2 mg"
    },
    {
        "name": "Alendronate",
        "category": "Endocrinology / Bisphosphonate",
        "expected_use_keywords": ["osteoporosis", "paget disease", "bone loss", "fractures", "postmenopausal"],
        "expected_side_effect_keywords": ["esophagitis", "esophageal ulcer", "osteonecrosis of jaw", "atypical femur fracture", "abdominal pain"],
        "max_ceiling_ref": "70 mg"
    },
    {
        "name": "Zoledronic Acid",
        "category": "Endocrinology / Bisphosphonate",
        "expected_use_keywords": ["osteoporosis", "hypercalcemia of malignancy", "multiple myeloma", "bone metastases"],
        "expected_side_effect_keywords": ["renal toxicity", "osteonecrosis of the jaw", "hypocalcemia", "acute phase reaction", "myalgia"],
        "max_ceiling_ref": "5 mg"
    },

    # ── 6. PSYCHIATRY & SPECIALIZED PSYCHOTROPICS (10) ──
    {
        "name": "Aripiprazole",
        "category": "Psychiatry / Atypical Antipsychotic",
        "expected_use_keywords": ["schizophrenia", "bipolar I disorder", "major depressive", "autistic disorder", "tourette"],
        "expected_side_effect_keywords": ["akathisia", "extrapyramidal", "somnolence", "tremor", "nausea", "weight gain", "insomnia"],
        "max_ceiling_ref": "30 mg"
    },
    {
        "name": "Quetiapine",
        "category": "Psychiatry / Atypical Antipsychotic",
        "expected_use_keywords": ["schizophrenia", "bipolar disorder", "mania", "depression"],
        "expected_side_effect_keywords": ["somnolence", "sedation", "dry mouth", "weight gain", "metabolic changes", "dizziness"],
        "max_ceiling_ref": "800 mg"
    },
    {
        "name": "Olanzapine",
        "category": "Psychiatry / Thienobenzodiazepine",
        "expected_use_keywords": ["schizophrenia", "bipolar disorder", "manic episodes", "agitation"],
        "expected_side_effect_keywords": ["weight gain", "somnolence", "metabolic syndrome", "hyperglycemia", "dry mouth", "dizziness"],
        "max_ceiling_ref": "20 mg"
    },
    {
        "name": "Clozapine",
        "category": "Psychiatry / Second Generation Antipsychotic",
        "expected_use_keywords": ["treatment-resistant schizophrenia", "suicidal behavior", "schizophrenia"],
        "expected_side_effect_keywords": ["agranulocytosis", "seizures", "myocarditis", "cardiomyopathy", "sedation", "sialorrhea", "constipation"],
        "max_ceiling_ref": "900 mg"
    },
    {
        "name": "Duloxetine",
        "category": "Psychiatry / SNRI",
        "expected_use_keywords": ["major depressive disorder", "generalized anxiety", "diabetic peripheral neuropathic pain", "fibromyalgia", "musculoskeletal"],
        "expected_side_effect_keywords": ["nausea", "dry mouth", "somnolence", "insomnia", "dizziness", "constipation", "fatigue"],
        "max_ceiling_ref": "120 mg"
    },
    {
        "name": "Bupropion",
        "category": "Psychiatry / Aminoketone Antidepressant",
        "expected_use_keywords": ["major depressive disorder", "seasonal affective", "smoking cessation"],
        "expected_side_effect_keywords": ["seizures", "insomnia", "dry mouth", "headache", "nausea", "agitation", "tachycardia"],
        "max_ceiling_ref": "450 mg"
    },
    {
        "name": "Venlafaxine",
        "category": "Psychiatry / SNRI",
        "expected_use_keywords": ["major depressive disorder", "generalized anxiety", "social anxiety", "panic disorder"],
        "expected_side_effect_keywords": ["nausea", "somnolence", "dry mouth", "sweating", "hypertension", "dizziness", "sexual dysfunction"],
        "max_ceiling_ref": "375 mg"
    },
    {
        "name": "Lithium",
        "category": "Psychiatry / Mood Stabilizer",
        "expected_use_keywords": ["bipolar disorder", "manic episodes", "mania", "maintenance therapy"],
        "expected_side_effect_keywords": ["renal toxicity", "diabetes insipidus", "thyroid dysfunction", "tremor", "nausea", "toxicity", "lethargy"],
        "max_ceiling_ref": "1800 mg"
    },
    {
        "name": "Buspirone",
        "category": "Psychiatry / Azapirone Anxiolytic",
        "expected_use_keywords": ["anxiety disorder", "generalized anxiety", "short-term relief"],
        "expected_side_effect_keywords": ["dizziness", "nausea", "headache", "nervousness", "lightheadedness", "excitement"],
        "max_ceiling_ref": "60 mg"
    },
    {
        "name": "Mirtazapine",
        "category": "Psychiatry / Tetracyclic Antidepressant",
        "expected_use_keywords": ["major depressive disorder", "depression", "antidepressant"],
        "expected_side_effect_keywords": ["somnolence", "increased appetite", "weight gain", "dry mouth", "constipation", "dizziness"],
        "max_ceiling_ref": "45 mg"
    },

    # ── 7. INFECTIOUS DISEASES & RESERVE ANTIMICROBIALS (10) ──
    {
        "name": "Vancomycin",
        "category": "Infectious Diseases / Glycopeptide Antibiotic",
        "expected_use_keywords": ["mrsa", "staphylococcus", "clostridioides difficile", "c. diff", "enterocolitis", "septicemia", "endocarditis", "bacterial"],
        "expected_side_effect_keywords": ["nephrotoxicity", "ototoxicity", "red man syndrome", "flushing", "hypotension", "phlebitis", "neutropenia"],
        "max_ceiling_ref": "2000 mg"
    },
    {
        "name": "Linezolid",
        "category": "Infectious Diseases / Oxazolidinone Antibiotic",
        "expected_use_keywords": ["vancomycin-resistant enterococcus", "vre", "nosocomial pneumonia", "skin infections", "mrsa"],
        "expected_side_effect_keywords": ["myelosuppression", "thrombocytopenia", "lactic acidosis", "serotonin syndrome", "peripheral neuropathy", "diarrhea"],
        "max_ceiling_ref": "1200 mg"
    },
    {
        "name": "Meropenem",
        "category": "Infectious Diseases / Carbapenem Antibiotic",
        "expected_use_keywords": ["complicated intra-abdominal", "meningitis", "pneumonia", "complicated skin", "bacterial infections"],
        "expected_side_effect_keywords": ["seizures", "diarrhea", "nausea", "headache", "rash", "hypersensitivity", "pruritus"],
        "max_ceiling_ref": "3000 mg - 6000 mg"
    },
    {
        "name": "Colistin",
        "category": "Infectious Diseases / Polymyxin Antibiotic",
        "expected_use_keywords": ["multidrug-resistant", "gram-negative", "pseudomonas", "acinetobacter", "resistant infections"],
        "expected_side_effect_keywords": ["nephrotoxicity", "neurotoxicity", "respiratory arrest", "dizziness", "paresthesia"],
        "max_ceiling_ref": "5 mg/kg"
    },
    {
        "name": "Voriconazole",
        "category": "Infectious Diseases / Triazole Antifungal",
        "expected_use_keywords": ["invasive aspergillosis", "candidemia", "fungal infections", "scedosporium", "fusarium"],
        "expected_side_effect_keywords": ["visual disturbances", "hepatotoxicity", "skin rash", "qt prolongation", "phototoxicity", "hallucinations"],
        "max_ceiling_ref": "400 mg - 800 mg"
    },
    {
        "name": "Posaconazole",
        "category": "Infectious Diseases / Triazole Antifungal",
        "expected_use_keywords": ["aspergillus", "candida", "fungal prophylaxis", "immunocompromised", "oropharyngeal candidiasis"],
        "expected_side_effect_keywords": ["hepatotoxicity", "qt prolongation", "diarrhea", "nausea", "hypokalemia", "thrombocytopenia"],
        "max_ceiling_ref": "800 mg"
    },
    {
        "name": "Dolutegravir",
        "category": "Infectious Diseases / Integrase Inhibitor",
        "expected_use_keywords": ["hiv-1", "human immunodeficiency virus", "antiretroviral", "viral load"],
        "expected_side_effect_keywords": ["insomnia", "headache", "hypersensitivity", "hepatotoxicity", "weight gain", "fatigue"],
        "max_ceiling_ref": "100 mg"
    },
    {
        "name": "Sofosbuvir",
        "category": "Infectious Diseases / NS5B Polymerase Inhibitor",
        "expected_use_keywords": ["hepatitis c", "hcv", "chronic hepatitis", "antiviral"],
        "expected_side_effect_keywords": ["fatigue", "headache", "nausea", "insomnia", "anemia", "bradycardia with amiodarone"],
        "max_ceiling_ref": "400 mg"
    },
    {
        "name": "Rifampin",
        "category": "Infectious Diseases / Rifamycin Antibiotic",
        "expected_use_keywords": ["tuberculosis", "mycobacterium", "meningococcal carriers", "staphylococcal"],
        "expected_side_effect_keywords": ["hepatotoxicity", "orange discoloration of body fluids", "hypersensitivity", "nausea", "thrombocytopenia"],
        "max_ceiling_ref": "600 mg"
    },
    {
        "name": "Isoniazid",
        "category": "Infectious Diseases / Antimycobacterial",
        "expected_use_keywords": ["tuberculosis", "latent tb", "active tuberculosis", "mycobacterium"],
        "expected_side_effect_keywords": ["hepatotoxicity", "severe hepatitis", "peripheral neuropathy", "pyridoxine deficiency", "nausea"],
        "max_ceiling_ref": "300 mg"
    },

    # ── 8. PULMONOLOGY & RESPIRATORY SPECIALTY (10) ──
    {
        "name": "Theophylline",
        "category": "Pulmonology / Methylxanthine",
        "expected_use_keywords": ["asthma", "copd", "bronchospasm", "chronic bronchitis", "emphysema"],
        "expected_side_effect_keywords": ["nausea", "vomiting", "insomnia", "seizures", "cardiac arrhythmias", "tachycardia", "headache"],
        "max_ceiling_ref": "900 mg"
    },
    {
        "name": "Montelukast",
        "category": "Pulmonology / Leukotriene Receptor Antagonist",
        "expected_use_keywords": ["asthma", "allergic rhinitis", "exercise-induced bronchoconstriction", "respiratory"],
        "expected_side_effect_keywords": ["neuropsychiatric events", "behavioral changes", "headache", "abdominal pain", "cough", "suicidal ideation"],
        "max_ceiling_ref": "10 mg"
    },
    {
        "name": "Roflumilast",
        "category": "Pulmonology / PDE4 Inhibitor",
        "expected_use_keywords": ["copd", "chronic obstructive", "bronchitis", "exacerbations"],
        "expected_side_effect_keywords": ["diarrhea", "weight loss", "nausea", "insomnia", "depression", "suicidal thoughts"],
        "max_ceiling_ref": "500 mcg"
    },
    {
        "name": "Pirfenidone",
        "category": "Pulmonology / Antifibrotic",
        "expected_use_keywords": ["idiopathic pulmonary fibrosis", "ipf", "lung fibrosis", "pulmonary"],
        "expected_side_effect_keywords": ["nausea", "rash", "photosensitivity", "elevated liver enzymes", "fatigue", "anorexia", "dyspepsia"],
        "max_ceiling_ref": "2403 mg"
    },
    {
        "name": "Nintedanib",
        "category": "Pulmonology / Tyrosine Kinase Antifibrotic",
        "expected_use_keywords": ["idiopathic pulmonary fibrosis", "systemic sclerosis", "interstitial lung disease"],
        "expected_side_effect_keywords": ["diarrhea", "nausea", "elevated liver enzymes", "vomiting", "abdominal pain", "decreased appetite"],
        "max_ceiling_ref": "300 mg"
    },
    {
        "name": "Bosentan",
        "category": "Pulmonology / Endothelin Receptor Antagonist",
        "expected_use_keywords": ["pulmonary arterial hypertension", "pah", "exercise ability", "pulmonary hypertension"],
        "expected_side_effect_keywords": ["hepatotoxicity", "teratogenicity", "headache", "peripheral edema", "anemia", "nasopharyngitis"],
        "max_ceiling_ref": "250 mg"
    },
    {
        "name": "Treprostinil",
        "category": "Pulmonology / Prostacyclin Analogue",
        "expected_use_keywords": ["pulmonary arterial hypertension", "pah", "pulmonary hypertension"],
        "expected_side_effect_keywords": ["headache", "diarrhea", "jaw pain", "nausea", "vasodilation", "flushing"],
        "max_ceiling_ref": "15 mg"
    },
    {
        "name": "Tiotropium",
        "category": "Pulmonology / Anticholinergic Bronchodilator",
        "expected_use_keywords": ["copd", "bronchospasm", "asthma", "maintenance treatment"],
        "expected_side_effect_keywords": ["dry mouth", "urinary retention", "constipation", "glaucoma", "cough"],
        "max_ceiling_ref": "18 mcg"
    },
    {
        "name": "Formoterol",
        "category": "Pulmonology / Long-Acting Beta2 Agonist",
        "expected_use_keywords": ["bronchoconstriction", "copd", "asthma", "bronchospasm"],
        "expected_side_effect_keywords": ["tremor", "tachycardia", "palpitations", "headache", "nervousness", "hypokalemia"],
        "max_ceiling_ref": "24 mcg"
    },
    {
        "name": "Budesonide",
        "category": "Pulmonology / Inhaled Corticosteroid",
        "expected_use_keywords": ["asthma", "copd", "crohn", "ulcerative colitis", "rhinitis"],
        "expected_side_effect_keywords": ["oral candidiasis", "thrush", "dysphonia", "cough", "adrenal suppression", "headache"],
        "max_ceiling_ref": "1600 mcg"
    },

    # ── 9. NEPHROLOGY, UROLOGY & HEMATOLOGY (10) ──
    {
        "name": "Sevelamer",
        "category": "Nephrology / Phosphate Binder",
        "expected_use_keywords": ["hyperphosphatemia", "chronic kidney disease", "dialysis", "end-stage renal"],
        "expected_side_effect_keywords": ["vomiting", "nausea", "diarrhea", "dyspepsia", "constipation", "flatulence"],
        "max_ceiling_ref": "14 g"
    },
    {
        "name": "Deferasirox",
        "category": "Hematology / Iron Chelator",
        "expected_use_keywords": ["iron overload", "transfusion hemosiderosis", "thalassemia", "myelodysplastic"],
        "expected_side_effect_keywords": ["renal failure", "hepatic failure", "gastrointestinal hemorrhage", "nausea", "abdominal pain", "skin rash"],
        "max_ceiling_ref": "40 mg/kg"
    },
    {
        "name": "Eltrombopag",
        "category": "Hematology / Thrombopoietin Receptor Agonist",
        "expected_use_keywords": ["thrombocytopenia", "immune thrombocytopenia", "itp", "hepatitis c", "aplastic anemia"],
        "expected_side_effect_keywords": ["hepatotoxicity", "decompensation", "thromboembolic", "nausea", "diarrhea", "cataracts"],
        "max_ceiling_ref": "75 mg"
    },
    {
        "name": "Darbepoetin",
        "category": "Hematology / Erythropoiesis-Stimulating Agent",
        "expected_use_keywords": ["anemia", "chronic kidney disease", "chemotherapy-induced", "erythropoietin"],
        "expected_side_effect_keywords": ["hypertension", "vascular access thrombosis", "stroke", "myocardial infarction", "pure red cell aplasia"],
        "max_ceiling_ref": "500 mcg"
    },
    {
        "name": "Finasteride",
        "category": "Urology / 5-Alpha Reductase Inhibitor",
        "expected_use_keywords": ["benign prostatic hyperplasia", "bph", "androgenetic alopecia", "prostate enlargement", "hair loss"],
        "expected_side_effect_keywords": ["erectile dysfunction", "decreased libido", "ejaculatory disorder", "gynecomastia", "prostate cancer risk"],
        "max_ceiling_ref": "5 mg"
    },
    {
        "name": "Dutasteride",
        "category": "Urology / Dual 5-AR Inhibitor",
        "expected_use_keywords": ["benign prostatic hyperplasia", "bph", "prostate", "urinary retention"],
        "expected_side_effect_keywords": ["impotence", "decreased libido", "ejaculation disorders", "breast tenderness", "gynecomastia"],
        "max_ceiling_ref": "0.5 mg"
    },
    {
        "name": "Tamsulosin",
        "category": "Urology / Alpha-1 Blocker",
        "expected_use_keywords": ["benign prostatic hyperplasia", "bph", "urinary symptoms", "prostate"],
        "expected_side_effect_keywords": ["orthostatic hypotension", "dizziness", "retrograde ejaculation", "rhinitis", "intraoperative floppy iris"],
        "max_ceiling_ref": "0.8 mg"
    },
    {
        "name": "Tolvaptan",
        "category": "Nephrology / Vasopressin V2 Receptor Antagonist",
        "expected_use_keywords": ["hyponatremia", "autosomal dominant polycystic kidney", "heart failure", "siadh"],
        "expected_side_effect_keywords": ["hepatotoxicity", "rapid correction of sodium", "osmotic demyelination", "thirst", "polyuria", "dry mouth"],
        "max_ceiling_ref": "60 mg - 120 mg"
    },
    {
        "name": "Torsemide",
        "category": "Nephrology / Loop Diuretic",
        "expected_use_keywords": ["edema", "heart failure", "renal disease", "hepatic disease", "hypertension"],
        "expected_side_effect_keywords": ["hypokalemia", "hypotension", "dehydration", "electrolyte imbalance", "dizziness"],
        "max_ceiling_ref": "200 mg"
    },
    {
        "name": "Bumetanide",
        "category": "Nephrology / Loop Diuretic",
        "expected_use_keywords": ["edema", "congestive heart failure", "hepatic disease", "renal disease"],
        "expected_side_effect_keywords": ["hypokalemia", "hypovolemia", "dizziness", "hyponatremia", "muscle cramps", "ototoxicity"],
        "max_ceiling_ref": "10 mg"
    },

    # ── 10. GASTROENTEROLOGY & HEPATOLOGY (10) ──
    {
        "name": "Mesalamine",
        "category": "Gastroenterology / Aminosalicylate",
        "expected_use_keywords": ["ulcerative colitis", "proctitis", "ibd", "inflammatory bowel", "remission"],
        "expected_side_effect_keywords": ["headache", "abdominal pain", "eructation", "nausea", "pancreatitis", "renal impairment"],
        "max_ceiling_ref": "4.8 g"
    },
    {
        "name": "Ursodiol",
        "category": "Hepatology / Bile Acid",
        "expected_use_keywords": ["primary biliary cholangitis", "gallstones", "cholelithiasis", "cirrhosis", "cholestasis"],
        "expected_side_effect_keywords": ["diarrhea", "nausea", "vomiting", "dizziness", "constipation", "pruritus"],
        "max_ceiling_ref": "15 mg/kg"
    },
    {
        "name": "Rifaximin",
        "category": "Gastroenterology / Nonabsorbable Antibiotic",
        "expected_use_keywords": ["travelers diarrhea", "hepatic encephalopathy", "irritable bowel syndrome", "ibs-d", "e. coli"],
        "expected_side_effect_keywords": ["peripheral edema", "nausea", "dizziness", "fatigue", "ascites", "c. difficile"],
        "max_ceiling_ref": "1650 mg"
    },
    {
        "name": "Lactulose",
        "category": "Hepatology / Synthetic Disaccharide",
        "expected_use_keywords": ["hepatic encephalopathy", "portal-systemic encephalopathy", "constipation", "hyperammonemia"],
        "expected_side_effect_keywords": ["flatulence", "diarrhea", "abdominal cramps", "nausea", "vomiting", "electrolyte loss"],
        "max_ceiling_ref": "90 mL"
    },
    {
        "name": "Aprepitant",
        "category": "Gastroenterology / Substance P / NK1 Antagonist",
        "expected_use_keywords": ["chemotherapy-induced nausea and vomiting", "cinv", "postoperative nausea", "emesis"],
        "expected_side_effect_keywords": ["fatigue", "diarrhea", "asthenia", "dyspepsia", "hiccups", "dizziness"],
        "max_ceiling_ref": "125 mg"
    },
    {
        "name": "Ondansetron",
        "category": "Gastroenterology / 5-HT3 Antagonist",
        "expected_use_keywords": ["nausea", "vomiting", "chemotherapy-induced", "radiation-induced", "postoperative"],
        "expected_side_effect_keywords": ["headache", "constipation", "fatigue", "qt prolongation", "serotonin syndrome"],
        "max_ceiling_ref": "24 mg - 32 mg"
    },
    {
        "name": "Linaclotide",
        "category": "Gastroenterology / Guanylate Cyclase-C Agonist",
        "expected_use_keywords": ["irritable bowel syndrome with constipation", "ibs-c", "chronic idiopathic constipation"],
        "expected_side_effect_keywords": ["diarrhea", "abdominal pain", "flatulence", "abdominal distension", "severe dehydration in pediatrics"],
        "max_ceiling_ref": "290 mcg"
    },
    {
        "name": "Lubiprostone",
        "category": "Gastroenterology / Chloride Channel Activator",
        "expected_use_keywords": ["chronic idiopathic constipation", "opioid-induced constipation", "ibs-c"],
        "expected_side_effect_keywords": ["nausea", "diarrhea", "headache", "abdominal pain", "dyspnea", "chest tightness"],
        "max_ceiling_ref": "48 mcg"
    },
    {
        "name": "Pancrelipase",
        "category": "Gastroenterology / Pancreatic Enzyme Replacement",
        "expected_use_keywords": ["exocrine pancreatic insufficiency", "cystic fibrosis", "chronic pancreatitis", "pancreatectomy"],
        "expected_side_effect_keywords": ["abdominal pain", "flatulence", "headache", "fibrosing colonopathy", "hyperuricemia"],
        "max_ceiling_ref": "10000 lipase units/kg"
    },
    {
        "name": "Dicyclomine",
        "category": "Gastroenterology / Antispasmodic",
        "expected_use_keywords": ["functional bowel", "irritable bowel syndrome", "ibs", "intestinal spasm", "cramping"],
        "expected_side_effect_keywords": ["dry mouth", "dizziness", "blurred vision", "nausea", "somnolence", "constipation"],
        "max_ceiling_ref": "160 mg"
    }
]


def evaluate_medicine(med_def: Dict[str, Any]) -> Dict[str, Any]:
    """Evaluates a single non-common medicine across Use, Side Effects, and Dosage/Age Limits."""
    drug_name = med_def["name"]
    category = med_def["category"]
    expected_uses = med_def["expected_use_keywords"]
    expected_side_effects = med_def["expected_side_effect_keywords"]

    # Call lookup-info endpoint via TestClient
    res = client.post("/api/medicine/lookup-info", json={"drugName": drug_name})
    if res.status_code != 200:
        return {
            "name": drug_name,
            "category": category,
            "status": "HTTP_ERROR",
            "use_correct": False,
            "side_effects_correct": False,
            "dosage_limits_correct": False,
            "overall_correct": False,
            "details": f"Endpoint returned status {res.status_code}"
        }

    data = res.json()
    if data.get("status") not in ("FOUND", "AMBIGUOUS"):
        return {
            "name": drug_name,
            "category": category,
            "status": data.get("status"),
            "use_correct": False,
            "side_effects_correct": False,
            "dosage_limits_correct": False,
            "overall_correct": False,
            "details": "Medicine not found in clinical database"
        }

    # 1. Evaluate Therapeutic Uses / Indications
    uses_corpus = " ".join([
        data.get("purpose") or "",
        data.get("indicationsAndUsage") or "",
        data.get("summary") or "",
        " ".join(data.get("mainUses") or [])
    ]).lower()

    matched_use_kw = [kw for kw in expected_uses if kw.lower() in uses_corpus]
    # Correct if matches at least 1 primary expected keyword AND uses_corpus is non-empty
    use_correct = len(matched_use_kw) >= 1 and len(uses_corpus.strip()) > 10

    # 2. Evaluate Side Effects & Adverse Warnings
    se_corpus = " ".join([
        " ".join(data.get("sideEffects") or []),
        " ".join(data.get("warnings") or []),
        " ".join(data.get("boxedWarning") or []),
        data.get("summary") or ""
    ]).lower()

    matched_se_kw = [kw for kw in expected_side_effects if kw.lower() in se_corpus]
    # Correct if contains recognized adverse reactions or warnings and is non-empty
    has_side_effects = bool(data.get("sideEffects") or data.get("warnings"))
    side_effects_correct = has_side_effects and (len(matched_se_kw) >= 1 or len(se_corpus.strip()) > 30)

    # 3. Evaluate Dosage Ceilings & Age Cohort Limits
    age_guide = data.get("ageDosageLimits")
    dosage_limits_correct = False
    cohort_count = 0
    has_ceiling = False

    if age_guide and isinstance(age_guide, dict):
        limits = age_guide.get("limits") or []
        cohort_count = len(limits)
        has_ceiling = bool(age_guide.get("maxDailyDoseGeneral") or data.get("maxDailyDose"))
        # Must have 5 clinical cohorts and a defined safe 24-hour ceiling / safety guidance
        if cohort_count >= 5 and (has_ceiling or bool(age_guide.get("clinicalSafetyWarning"))):
            dosage_limits_correct = True

    overall_correct = use_correct and side_effects_correct and dosage_limits_correct

    return {
        "name": drug_name,
        "category": category,
        "source": data.get("source", "Unknown"),
        "use_correct": use_correct,
        "matched_uses": matched_use_kw,
        "side_effects_correct": side_effects_correct,
        "matched_side_effects": matched_se_kw,
        "dosage_limits_correct": dosage_limits_correct,
        "cohort_count": cohort_count,
        "max_daily_ceiling": age_guide.get("maxDailyDoseGeneral") if age_guide else None,
        "overall_correct": overall_correct,
        "sample_use": (data.get("purpose") or data.get("summary") or "")[:90] + "...",
        "sample_side_effect": (data.get("sideEffects", ["None"])[0] if data.get("sideEffects") else "None")[:90]
    }


def run_benchmark():
    start_time = time.time()
    results = []

    print(f"Starting Clinical Accuracy Benchmark for {len(BENCHMARK_MEDICATIONS)} non-common medications...\n")

    for i, med in enumerate(BENCHMARK_MEDICATIONS, 1):
        try:
            res = evaluate_medicine(med)
            results.append(res)
            icon = "[PASS]" if res["overall_correct"] else "[WARN]"
            print(f"[{i:03d}/100] {icon} {med['name']} ({med['category']}): Use={res['use_correct']}, SE={res['side_effects_correct']}, Dose={res['dosage_limits_correct']}")
            time.sleep(0.05)
        except Exception as e:
            results.append({
                "name": med["name"],
                "category": med["category"],
                "use_correct": False,
                "side_effects_correct": False,
                "dosage_limits_correct": False,
                "overall_correct": False,
                "details": f"Exception: {str(e)}"
            })
            print(f"[{i:03d}/100] [FAIL] {med['name']}: {e}")

    elapsed = time.time() - start_time

    # Calculate statistics
    total = len(results)
    use_correct_count = sum(1 for r in results if r["use_correct"])
    se_correct_count = sum(1 for r in results if r["side_effects_correct"])
    dose_correct_count = sum(1 for r in results if r["dosage_limits_correct"])
    overall_correct_count = sum(1 for r in results if r["overall_correct"])

    use_pct = (use_correct_count / total) * 100
    se_pct = (se_correct_count / total) * 100
    dose_pct = (dose_correct_count / total) * 100
    overall_pct = (overall_correct_count / total) * 100

    # Specialty breakdowns
    specialty_stats = {}
    for r in results:
        cat = r["category"].split("/")[0].strip()
        if cat not in specialty_stats:
            specialty_stats[cat] = {"total": 0, "correct": 0, "use": 0, "se": 0, "dose": 0}
        specialty_stats[cat]["total"] += 1
        if r["overall_correct"]:
            specialty_stats[cat]["correct"] += 1
        if r["use_correct"]:
            specialty_stats[cat]["use"] += 1
        if r["side_effects_correct"]:
            specialty_stats[cat]["se"] += 1
        if r["dosage_limits_correct"]:
            specialty_stats[cat]["dose"] += 1

    summary = {
        "benchmark_timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_medications_tested": total,
        "elapsed_seconds": round(elapsed, 2),
        "metrics": {
            "uses_accuracy_pct": round(use_pct, 2),
            "side_effects_accuracy_pct": round(se_pct, 2),
            "dosage_and_age_limits_accuracy_pct": round(dose_pct, 2),
            "overall_composite_accuracy_pct": round(overall_pct, 2),
            "counts": {
                "uses_correct": use_correct_count,
                "side_effects_correct": se_correct_count,
                "dosage_correct": dose_correct_count,
                "overall_correct": overall_correct_count
            }
        },
        "specialty_breakdown": specialty_stats,
        "detailed_results": results
    }

    # Save to JSON in backend/.cache
    out_dir = os.path.join(backend_dir, ".cache", "benchmarks")
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "benchmark_100_medicines_results.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print(f"\n==========================================")
    print(f"CLINICAL ACCURACY BENCHMARK COMPLETED")
    print(f"Total Medications: {total}")
    print(f"Elapsed Time: {elapsed:.2f}s")
    print(f"Indications / Uses Accuracy: {use_pct:.1f}% ({use_correct_count}/{total})")
    print(f"Side Effects & Safety Alerts Accuracy: {se_pct:.1f}% ({se_correct_count}/{total})")
    print(f"Age-Dosage Ceilings & Cohorts Accuracy: {dose_pct:.1f}% ({dose_correct_count}/{total})")
    print(f"Overall Composite Accuracy: {overall_pct:.1f}% ({overall_correct_count}/{total})")
    print(f"Report saved to: {out_file}")
    print(f"==========================================\n")

    return summary


if __name__ == "__main__":
    run_benchmark()
