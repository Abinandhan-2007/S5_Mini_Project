"""
CarePulse Real-Time Drug-Drug Interaction & Allergy Guard Engine.
Cross-checks proposed prescriptions against patient active medications and documented allergies.
Zero-hallucination deterministic safety validation with clinical mechanism traceability.
"""

from typing import List, Dict, Any, Optional

# Clinical Contraindication & Drug Interaction Registry
# Traceability: Each entry includes clinical mechanism and pharmacologic basis.
INTERACTION_REGISTRY = [
    # 1. NSAID + ACE Inhibitor / ARB
    # Mechanism: Pharmacodynamic antagonism. NSAIDs inhibit renal vasodilatory prostaglandins (PGE2, PGI2),
    # reducing GFR and blunting ACEi/ARB antihypertensive response; combined with efferent arteriolar vasodilation,
    # dramatically elevates acute kidney injury risk ("Triple Whammy").
    # Clinical Basis: Standard clinical nephrology and cardiology practice guideline contraindication.
    {
        "drug_a_keywords": ["ibuprofen", "naproxen", "aspirin", "diclofenac", "meloxicam", "indomethacin", "piroxicam", "ketorolac", "etodolac", "mefenamic", "nsaid"],
        "drug_b_keywords": ["lisinopril", "enalapril", "losartan", "valsartan", "ramipril", "captopril", "perindopril", "telmisartan", "candesartan", "olmesartan", "ace inhibitor", "arb"],
        "risk_level": "CRITICAL_CONTRAINDICATION",
        "title": "NSAID + ACE Inhibitor / ARB Severe Interaction",
        "description": "Concurrent use attenuates antihypertensive effect and significantly elevates risk of acute kidney injury ('Triple Whammy' effect).",
        "alternative_recommendation": "Use Acetaminophen (Paracetamol) up to 3000mg/day for pain relief instead of NSAIDs."
    },

    # 2. NSAID + Anticoagulant / Antiplatelet
    # Mechanism: Synergistic hemostatic inhibition. NSAIDs cause gastric mucosal erosion and reversible platelet
    # COX-1 inhibition, compounding systemic anticoagulation/antiplatelet effects to cause major GI hemorrhage.
    # Clinical Basis: Standard hematology and gastroenterology bleeding risk guideline.
    {
        "drug_a_keywords": ["ibuprofen", "naproxen", "diclofenac", "meloxicam", "indomethacin", "ketorolac", "piroxicam", "mefenamic", "nsaid"],
        "drug_b_keywords": ["warfarin", "aspirin", "apixaban", "rivaroxaban", "clopidogrel", "heparin", "dabigatran", "edoxaban", "prasugrel", "ticagrelor"],
        "risk_level": "CRITICAL_CONTRAINDICATION",
        "title": "NSAID + Anticoagulant / Antiplatelet High Bleeding Risk",
        "description": "Synergistic inhibition of platelet aggregation and gastric mucosal erosion markedly increases risk of severe upper gastrointestinal hemorrhage.",
        "alternative_recommendation": "Avoid NSAIDs completely. Use Acetaminophen for pain control; add PPI gastroprotection if combination is strictly unavoidable."
    },

    # 3. Statin + Strong CYP3A4 Inhibitor (Azole Antifungal / Fibrate / Macrolide)
    # Mechanism: Pharmacokinetic CYP3A4 / OATP1B1 inhibition markedly elevates statin AUC and systemic exposure,
    # triggering skeletal muscle toxicity, severe myopathy, and life-threatening rhabdomyolysis.
    # Clinical Basis: FDA safety alerts & ACC/AHA cholesterol guideline recommendations.
    {
        "drug_a_keywords": ["atorvastatin", "simvastatin", "rosuvastatin", "lovastatin", "statin"],
        "drug_b_keywords": ["fluconazole", "ketoconazole", "itraconazole", "posaconazole", "voriconazole", "gemfibrozil", "fenofibrate", "clarithromycin", "erythromycin"],
        "risk_level": "MAJOR_INTERACTION",
        "title": "Statin + CYP3A4 Inhibitor / Fibrate Severe Myopathy Risk",
        "description": "Inhibition of hepatic metabolism significantly increases statin blood levels, elevating risk of severe myopathy and fatal rhabdomyolysis.",
        "alternative_recommendation": "Temporarily withhold statin during antifungal or macrolide course, or switch to Pravastatin/Rosuvastatin under close monitoring."
    },

    # 4. Metformin + Iodinated Radiocontrast
    # Mechanism: Radiocontrast-induced acute tubular necrosis impairs renal elimination of metformin,
    # causing toxic metformin accumulation and severe, high-mortality lactic acidosis.
    # Clinical Basis: American College of Radiology (ACR) & ADA consensus guidelines.
    {
        "drug_a_keywords": ["metformin", "glycomet", "glucophage"],
        "drug_b_keywords": ["contrast", "radiocontrast", "iohexol", "iopamidol", "iodixanol", "gadolinium"],
        "risk_level": "MODERATE_INTERACTION",
        "title": "Metformin + Iodinated Contrast Lactic Acidosis Warning",
        "description": "Contrast-induced acute renal impairment can lead to toxic metformin accumulation and life-threatening lactic acidosis.",
        "alternative_recommendation": "Discontinue Metformin prior to or at time of contrast study; re-evaluate renal function (eGFR/Cr) 48 hours post-procedure before restarting."
    },

    # 5. Nitrates + PDE5 Inhibitors
    # Mechanism: Synergistic cyclic GMP (cGMP) accumulation. Nitrates stimulate soluble guanylyl cyclase to produce cGMP,
    # while PDE5 inhibitors prevent cGMP degradation, causing catastrophic systemic vasodilation and fatal hypotension.
    # Clinical Basis: Absolute clinical contraindication in cardiology and emergency medicine.
    {
        "drug_a_keywords": ["nitroglycerin", "isosorbide", "mononitrate", "dinitrate", "nitroprusside", "nitrate"],
        "drug_b_keywords": ["sildenafil", "tadalafil", "vardenafil", "avanafil", "viagra", "cialis"],
        "risk_level": "CRITICAL_CONTRAINDICATION",
        "title": "Nitrate + PDE-5 Inhibitor Severe Refractory Hypotension",
        "description": "Synergistic cGMP accumulation causes profound systemic vasodilatation, severe refractory hypotension, coronary hypoperfusion, and fatal cardiovascular collapse.",
        "alternative_recommendation": "Strictly contraindicated. Maintain at least 24 hours (48 hours for Tadalafil) separation between agents."
    },

    # 6. ACE Inhibitors / ARBs + Potassium-Sparing Diuretics / Potassium Supplements
    # Mechanism: Additive suppression of renal potassium excretion. Aldosterone inhibition coupled with direct epithelial
    # sodium channel blockade produces life-threatening hyperkalemia (>6.5 mEq/L) and ventricular arrhythmias.
    # Clinical Basis: Standard KDIGO / AHA clinical cardiology guideline alert.
    {
        "drug_a_keywords": ["lisinopril", "enalapril", "ramipril", "losartan", "valsartan", "telmisartan", "candesartan", "sacubitril"],
        "drug_b_keywords": ["spironolactone", "eplerenone", "triamterene", "amiloride", "potassium chloride", "klor-con", "potassium supplement"],
        "risk_level": "MAJOR_INTERACTION",
        "title": "RAAS Blocker + Potassium-Sparing Diuretic Hyperkalemia Risk",
        "description": "Dual suppression of aldosterone pathways markedly increases risk of severe hyperkalemia, cardiac conduction defects, and fatal arrhythmias.",
        "alternative_recommendation": "Monitor serum potassium and creatinine within 1-2 weeks of initiation; adjust or limit potassium supplementation."
    },

    # 7. MAO Inhibitors + SSRIs / SNRIs / TCAs / Dextromethorphan
    # Mechanism: Excessive central and peripheral intrasynaptic 5-HT (serotonin) accumulation through combined inhibition
    # of monoamine reuptake and catabolism, causing life-threatening Serotonin Syndrome.
    # Clinical Basis: Black-box warning in neuropsychiatric and psychopharmacologic references.
    {
        "drug_a_keywords": ["selegiline", "rasagiline", "phenelzine", "tranylcypromine", "isocarboxazid", "linezolid", "methylene blue", "maoi"],
        "drug_b_keywords": ["fluoxetine", "sertraline", "escitalopram", "citalopram", "paroxetine", "venlafaxine", "duloxetine", "amitriptyline", "dextromethorphan", "tramadol"],
        "risk_level": "CRITICAL_CONTRAINDICATION",
        "title": "MAO Inhibitor + Serotonergic Agent Fatal Serotonin Syndrome",
        "description": "Combined reuptake inhibition and enzymatic catabolism blockade causes rapid serotonin toxicity: hyperthermia, neuromuscular clonus, autonomic instability, and death.",
        "alternative_recommendation": "Strictly contraindicated. Enforce a minimum 14-day washout period (5 weeks for Fluoxetine) between MAOI and serotonergic drugs."
    },

    # 8. Methotrexate + NSAIDs / Trimethoprim
    # Mechanism: NSAIDs reduce renal clearance of MTX via inhibition of organic anion transporters (OAT1/OAT3) and reduced GFR;
    # Trimethoprim competitively blocks dihydrofolate reductase and tubular secretion, resulting in severe pancytopenia.
    # Clinical Basis: Standard rheumatology & oncology drug safety black-box warning.
    {
        "drug_a_keywords": ["methotrexate", "trexall"],
        "drug_b_keywords": ["ibuprofen", "naproxen", "diclofenac", "indomethacin", "ketorolac", "bactrim", "septra", "trimethoprim", "sulfamethoxazole"],
        "risk_level": "CRITICAL_CONTRAINDICATION",
        "title": "Methotrexate + NSAID / Trimethoprim Severe Toxicity",
        "description": "Impaired renal elimination of methotrexate produces life-threatening bone marrow suppression, severe pancytopenia, stomatitis, and nephrotoxicity.",
        "alternative_recommendation": "Avoid concurrent high-dose NSAIDs or Trimethoprim. Use Paracetamol for analgesia and alternate non-antifolate antibiotics for infections."
    },

    # 9. Digoxin + Amiodarone / Verapamil / Clarithromycin
    # Mechanism: P-glycoprotein (P-gp / MDR1) efflux pump inhibition reduces renal and non-renal clearance of digoxin,
    # doubling systemic digoxin concentrations and triggering AV block and lethal ventricular arrhythmias.
    # Clinical Basis: Standard cardiology electrophysiology and clinical pharmacology reference.
    {
        "drug_a_keywords": ["digoxin", "lanoxin"],
        "drug_b_keywords": ["amiodarone", "verapamil", "diltiazem", "clarithromycin", "erythromycin", "itraconazole", "quinidine"],
        "risk_level": "MAJOR_INTERACTION",
        "title": "Digoxin + P-gp Inhibitor Severe Digoxin Toxicity",
        "description": "Potent P-glycoprotein inhibition reduces digoxin clearance by 50%, causing visual disturbances, severe bradycardia, AV block, and fatal dysrhythmias.",
        "alternative_recommendation": "Empirically reduce Digoxin dose by 50% upon starting amiodarone/verapamil and closely monitor serum digoxin trough levels and ECG."
    },

    # 10. Lithium + NSAIDs / ACE Inhibitors / Thiazides
    # Mechanism: Prostaglandin inhibition (NSAIDs) or volume contraction with compensatory proximal tubular reabsorption
    # (Thiazides/ACEis) reduces renal lithium clearance, causing toxic lithium accumulation (>1.5 mEq/L).
    # Clinical Basis: Standard psychiatric pharmacotherapy guideline contraindication.
    {
        "drug_a_keywords": ["lithium", "eskalith", "lithobid"],
        "drug_b_keywords": ["ibuprofen", "naproxen", "diclofenac", "indomethacin", "lisinopril", "enalapril", "losartan", "hydrochlorothiazide", "chlorthalidone"],
        "risk_level": "MAJOR_INTERACTION",
        "title": "Lithium + NSAID / RAAS Blocker / Thiazide Toxicity",
        "description": "Reduced renal excretion leads to dangerous lithium toxicity: coarse tremors, ataxia, confusion, seizures, and irreversible renal damage.",
        "alternative_recommendation": "Avoid NSAIDs (use Paracetamol). If diuretics or ACEis are initiated, reduce lithium dose by 25-50% and monitor serum lithium levels weekly."
    },

    # 11. Opioids + Benzodiazepines / Central Depressants
    # Mechanism: Synergistic CNS and brainstem respiratory drive depression mediated through concurrent GABA-A
    # enhancement and mu-opioid receptor activation.
    # Clinical Basis: FDA Black-Box Boxed Warning on concurrent opioid and benzodiazepine prescribing.
    {
        "drug_a_keywords": ["morphine", "tramadol", "codeine", "oxycodone", "fentanyl", "hydrocodone", "buprenorphine", "methadone", "hydromorphone"],
        "drug_b_keywords": ["alprazolam", "clonazepam", "lorazepam", "diazepam", "midazolam", "zolpidem", "eszopiclone", "temazepam"],
        "risk_level": "CRITICAL_CONTRAINDICATION",
        "title": "Opioid + Benzodiazepine Fatal Respiratory Depression",
        "description": "Combined central nervous system and respiratory center depression produces profound sedation, respiratory arrest, coma, and death.",
        "alternative_recommendation": "Avoid combination. If co-prescribing is clinically mandatory, prescribe lowest effective doses and co-prescribe Naloxone."
    },

    # 12. SSRIs / SNRIs + Tramadol / Linezolid / Triptans
    # Mechanism: Additive serotonergic neurotransmission. Tramadol inhibits 5-HT reuptake; Triptans act as 5-HT1B/1D agonists;
    # Linezolid is a reversible MAO-A inhibitor.
    # Clinical Basis: Well-established psychopharmacology and pain medicine clinical guideline.
    {
        "drug_a_keywords": ["sertraline", "escitalopram", "fluoxetine", "paroxetine", "citalopram", "venlafaxine", "duloxetine"],
        "drug_b_keywords": ["tramadol", "ultracet", "sumatriptan", "zolmitriptan", "rizatriptan", "linezolid"],
        "risk_level": "MAJOR_INTERACTION",
        "title": "SSRI / SNRI + Tramadol / Triptan Serotonin Toxicity Risk",
        "description": "Additive serotonergic enhancement elevates risk of Serotonin Syndrome (agitation, hyperreflexia, hyperthermia, diaphoresis) and lowered seizure threshold.",
        "alternative_recommendation": "Use non-serotonergic analgesics (Paracetamol, topical agents) or monitor closely for autonomic and neuromuscular signs."
    },

    # 13. Clopidogrel + Omeprazole / Esomeprazole
    # Mechanism: Omeprazole is a potent competitive inhibitor of hepatic CYP2C19, the primary enzyme required
    # to bioactivate the prodrug Clopidogrel into its active thiol antiplatelet metabolite.
    # Clinical Basis: FDA Safety Communication & American College of Cardiology consensus document.
    {
        "drug_a_keywords": ["clopidogrel", "plavix"],
        "drug_b_keywords": ["omeprazole", "esomeprazole", "omez", "nexium", "prilosec"],
        "risk_level": "MAJOR_INTERACTION",
        "title": "Clopidogrel + Omeprazole Attenuation of Antiplatelet Efficacy",
        "description": "CYP2C19 inhibition reduces clopidogrel active metabolite formation by up to 45%, increasing risk of recurrent myocardial infarction and stent thrombosis.",
        "alternative_recommendation": "Switch to Pantoprazole (minimal CYP2C19 inhibition) or Famotidine (H2RA) for gastroprotection in patients on Clopidogrel."
    },

    # 14. Fluoroquinolones + Polyvalent Cation Antacids / Minerals
    # Mechanism: Physicochemical chelation. Multivalent metal cations (Al3+, Mg2+, Ca2+, Fe2+, Zn2+) form insoluble
    # coordination complexes with the fluoroquinolone 4-keto and 3-carboxyl groups, preventing gastrointestinal absorption.
    # Clinical Basis: Standard clinical microbiology and infectious disease pharmacology reference.
    {
        "drug_a_keywords": ["ciprofloxacin", "levofloxacin", "moxifloxacin", "ofloxacin", "norfloxacin", "cifran"],
        "drug_b_keywords": ["antacid", "gelusil", "digene", "sucralfate", "calcium carbonate", "ferrous sulfate", "iron supplement", "magnesium hydroxide", "zinc sulfate"],
        "risk_level": "MODERATE_INTERACTION",
        "title": "Fluoroquinolone + Antacid / Cation Chelation & Treatment Failure",
        "description": "Cation chelation binds fluoroquinolones in the GI tract, reducing oral bioavailability by up to 90% and causing antimicrobial treatment failure.",
        "alternative_recommendation": "Administer fluoroquinolone at least 2 hours before or 6 hours after polyvalent cation antacids or iron/calcium supplements."
    },

    # 15. Theophylline + Ciprofloxacin / Fluvoxamine
    # Mechanism: Potent inhibition of hepatic CYP1A2 blocks the primary metabolic clearance pathway of theophylline,
    # causing rapid narrow-therapeutic-index toxicity.
    # Clinical Basis: Standard clinical toxicology & pulmonology pharmacotherapy guideline.
    {
        "drug_a_keywords": ["theophylline", "aminophylline", "deriphyllin"],
        "drug_b_keywords": ["ciprofloxacin", "fluvoxamine", "cimetidine", "enoxacin"],
        "risk_level": "MAJOR_INTERACTION",
        "title": "Theophylline + CYP1A2 Inhibitor Toxic Plasma Elevation",
        "description": "Potent CYP1A2 inhibition decreases theophylline clearance by up to 50%, precipitating severe nausea, cardiac arrhythmias, status epilepticus, and death.",
        "alternative_recommendation": "Avoid Ciprofloxacin; use alternative antibiotics (e.g. Azithromycin) or reduce theophylline dose by 50% with serum level monitoring."
    },

    # 16. Warfarin + Azole Antifungals / Metronidazole / Co-trimoxazole / Amiodarone
    # Mechanism: Potent inhibition of CYP2C9 (the stereoselective enzyme metabolizing the 5x more potent S-warfarin isomer),
    # dramatically increasing international normalized ratio (INR) and hemorrhagic risk.
    # Clinical Basis: Chest guideline & ACCP antithrombotic therapy standard of care.
    {
        "drug_a_keywords": ["warfarin", "coumadin"],
        "drug_b_keywords": ["fluconazole", "ketoconazole", "itraconazole", "voriconazole", "metronidazole", "flagyl", "bactrim", "septra", "amiodarone"],
        "risk_level": "CRITICAL_CONTRAINDICATION",
        "title": "Warfarin + CYP2C9 Inhibitor Major Hemorrhagic Threat",
        "description": "CYP2C9 inhibition impairs S-warfarin clearance, causing rapid supratherapeutic INR escalation (>5.0) and severe internal or intracranial hemorrhage.",
        "alternative_recommendation": "Empirically reduce Warfarin dose by 30-50% upon starting interacting antimicrobial, with serial INR testing every 48-72 hours."
    },

    # 17. Beta-Blockers + Non-Dihydropyridine Calcium Channel Blockers
    # Mechanism: Additive negative inotropic, chronotropic, and dromotropic effects on the sinoatrial (SA) and atrioventricular (AV) nodes.
    # Clinical Basis: Standard cardiology guideline for management of chronic coronary disease & arrhythmias.
    {
        "drug_a_keywords": ["metoprolol", "atenolol", "carvedilol", "bisoprolol", "propranolol", "labetalol", "nebivolol"],
        "drug_b_keywords": ["verapamil", "diltiazem", "calan", "cardizem"],
        "risk_level": "MAJOR_INTERACTION",
        "title": "Beta-Blocker + Non-DHP Calcium Channel Blocker AV Block Risk",
        "description": "Dual suppression of cardiac conduction causes severe symptomatic bradycardia, complete heart block, and acute cardiogenic decompensation.",
        "alternative_recommendation": "Avoid concurrent non-DHP CCB with beta-blockers; if combination antihypertensive is needed, use Dihydropyridine CCBs (Amlodipine)."
    },

    # 18. Allopurinol + Azathioprine / 6-Mercaptopurine
    # Mechanism: Allopurinol inhibits xanthine oxidase, the primary catabolic enzyme of 6-mercaptopurine (the active metabolite of azathioprine),
    # causing accumulation of active thiopurine nucleotides.
    # Clinical Basis: Absolute rheumatology and gastroenterology black-box contraindication.
    {
        "drug_a_keywords": ["allopurinol", "zyloprim", "febuxostat"],
        "drug_b_keywords": ["azathioprine", "imuran", "mercaptopurine", "purinethol"],
        "risk_level": "CRITICAL_CONTRAINDICATION",
        "title": "Allopurinol + Azathioprine / 6-MP Severe Myelosuppression",
        "description": "Xanthine oxidase inhibition increases cytotoxic thiopurine levels up to 4-fold, inducing life-threatening bone marrow aplasia and severe pancytopenia.",
        "alternative_recommendation": "Reduce Azathioprine/6-MP dose to 25-33% of standard dose with frequent weekly CBC monitoring, or switch gout agent to Febuxostat with caution."
    },

    # 19. Oral Contraceptives + Hepatic Enzyme Inducers (Rifampin / Antiepileptics)
    # Mechanism: Potent induction of hepatic CYP3A4 and UDP-glucuronosyltransferase enzymes accelerates metabolic clearance
    # of synthetic estrogens (ethinyl estradiol) and progestins.
    # Clinical Basis: CDC & WHO medical eligibility criteria for contraceptive use.
    {
        "drug_a_keywords": ["ethinyl estradiol", "levonorgestrel", "desogestrel", "drospirenone", "oral contraceptive", "birth control"],
        "drug_b_keywords": ["rifampin", "rifampicin", "carbamazepine", "tegretol", "phenytoin", "dilantin", "phenobarbital", "st john's wort"],
        "risk_level": "MAJOR_INTERACTION",
        "title": "Oral Contraceptive + Enzyme Inducer Contraceptive Failure",
        "description": "Hepatic enzyme induction accelerates estrogen/progestin clearance, leading to breakthrough ovulation, contraceptive failure, and unplanned pregnancy.",
        "alternative_recommendation": "Advise additional non-hormonal barrier contraception during and for 28 days following completion of enzyme inducer therapy course."
    },

    # 20. SGLT2 Inhibitors + Loop Diuretics
    # Mechanism: Additive osmotic diuresis and natriuresis produces synergistic intravascular volume depletion and hemoconcentration.
    # Clinical Basis: Standard ADA and ESC heart failure & diabetes consensus guideline.
    {
        "drug_a_keywords": ["empagliflozin", "dapagliflozin", "canagliflozin", "jardiance", "forxiga"],
        "drug_b_keywords": ["furosemide", "lasix", "torsemide", "bumetanide"],
        "risk_level": "MODERATE_INTERACTION",
        "title": "SGLT2 Inhibitor + Loop Diuretic Volume Depletion Warning",
        "description": "Combined osmotic and loop diuresis exacerbates risk of orthostatic hypotension, intravascular volume contraction, and pre-renal azotemia.",
        "alternative_recommendation": "Monitor blood pressure and volume status; consider preemptive 25% reduction in loop diuretic dose upon initiating SGLT2i in elderly patients."
    }
]

# Clinical Allergy Cross-Class Hypersensitivity Registry
# Traceability: Maps specific documented patient allergies to both exact-match triggers and immunological cross-reactive classes.
ALLERGY_MAPPINGS = [
    # 1. Penicillins & Aminopenicillins
    # Mechanism: IgE-mediated type I hypersensitivity directed against the core beta-lactam thiazolidine ring and shared R1 side chains.
    # Clinical Basis: EAACI & AAAAI drug allergy consensus guideline.
    {
        "allergy_keywords": ["penicillin", "penicillins", "amoxicillin", "ampicillin", "augmentin", "clavam"],
        "trigger_keywords": ["amoxicillin", "ampicillin", "augmentin", "clavam", "penicillin", "piperacillin", "tazobactam", "ticarcillin", "cloxacillin", "oxacillin"],
        "risk_level": "CRITICAL_CONTRAINDICATION",
        "title": "Severe Beta-Lactam Penicillin Allergy Trigger",
        "description": "Patient has documented Penicillin allergy. Administering penicillin-class beta-lactams carries high risk of severe anaphylaxis, bronchospasm, and angioedema.",
        "alternative_recommendation": "Switch to Macrolides (Azithromycin, Clarithromycin), Fluoroquinolones (Ciprofloxacin), or Doxycycline."
    },

    # 2. Cephalosporin Cross-Reactivity in Penicillin-Allergic Patients
    # Mechanism: Immunological cross-reactivity between penicillins and early/first-generation cephalosporins sharing identical C7 side-chain motifs (e.g. Cefalexin, Cefadroxil, Cefaclor).
    # Clinical Basis: AAAAI drug allergy practice parameters.
    {
        "allergy_keywords": ["penicillin", "cephalosporin", "cefixime", "ceftriaxone", "cephalexin"],
        "trigger_keywords": ["cephalexin", "cefadroxil", "cefaclor", "cefuroxime", "cefixime", "ceftriaxone", "cefotaxime", "cefepime", "monocef", "taxim"],
        "risk_level": "MAJOR_INTERACTION",
        "title": "Cephalosporin Cross-Reactivity Risk",
        "description": "Patient has documented Beta-Lactam / Cephalosporin hypersensitivity. Cross-reactivity may precipitate urticaria, bronchospasm, or anaphylaxis.",
        "alternative_recommendation": "Use non-beta-lactam antimicrobials (Azithromycin, Levofloxacin, Vancomycin) unless cephalosporin tolerability is formally confirmed by allergy specialist."
    },

    # 3. Sulfonamides & Sulfa Antibiotics
    # Mechanism: IgE-mediated or T-cell mediated (Type IV) hypersensitivity against N4-arylamine sulfonamides, carrying risk of Severe Cutaneous Adverse Reactions (SCAR).
    # Clinical Basis: Standard clinical allergy & dermatology consensus guideline.
    {
        "allergy_keywords": ["sulfa", "sulfonamide", "trimethoprim", "bactrim", "septra"],
        "trigger_keywords": ["bactrim", "septra", "sulfamethoxazole", "sulfasalazine", "sulfadiazine", "dapsone", "co-trimoxazole"],
        "risk_level": "CRITICAL_CONTRAINDICATION",
        "title": "Sulfonamide Hypersensitivity Trigger",
        "description": "Patient has documented Sulfa allergy. Risk of severe cutaneous adverse reactions including Stevens-Johnson Syndrome (SJS) and Toxic Epidermal Necrolysis (TEN).",
        "alternative_recommendation": "Use Nitrofurantoin, Ciprofloxacin, or Fosfomycin for urinary tract infections; avoid all arylamine sulfonamides."
    },

    # 4. NSAIDs & Aspirin Hypersensitivity
    # Mechanism: Non-allergic COX-1 inhibition shunts arachidonic acid metabolism to the 5-lipoxygenase pathway,
    # causing massive cysteinyl leukotriene overproduction (Aspirin-Exacerbated Respiratory Disease / AERD & cutaneous urticaria).
    # Clinical Basis: EAACI / AAAAI consensus on NSAID hypersensitivity phenotypes.
    {
        "allergy_keywords": ["nsaid", "aspirin", "ibuprofen", "diclofenac", "naproxen"],
        "trigger_keywords": ["ibuprofen", "naproxen", "aspirin", "diclofenac", "ketorolac", "meloxicam", "indomethacin", "piroxicam", "mefenamic", "voveran", "combiflam", "zerodol"],
        "risk_level": "CRITICAL_CONTRAINDICATION",
        "title": "NSAID / Aspirin Hypersensitivity Reaction",
        "description": "Patient has documented NSAID hypersensitivity. Risk of acute severe bronchospasm (AERD), generalized urticaria, angioedema, or anaphylactoid collapse.",
        "alternative_recommendation": "Use Acetaminophen (Paracetamol) or Tramadol under medical supervision; consider selective COX-2 inhibitor only after specialist evaluation."
    },

    # 5. Macrolide Antibiotics
    # Mechanism: Type I IgE-mediated or delayed hypersensitivity against macrolactone ring structures.
    # Clinical Basis: Clinical microbiology and allergy reference standards.
    {
        "allergy_keywords": ["macrolide", "azithromycin", "clarithromycin", "erythromycin"],
        "trigger_keywords": ["azithromycin", "clarithromycin", "erythromycin", "roxithromycin", "azithral", "azee"],
        "risk_level": "CRITICAL_CONTRAINDICATION",
        "title": "Macrolide Antibiotic Allergy Alert",
        "description": "Patient has documented Macrolide allergy. Administration risks acute hypersensitivity, severe gastrointestinal spasms, cholestatic jaundice, or anaphylaxis.",
        "alternative_recommendation": "Use Doxycycline, Amoxicillin-Clavulanate, or respiratory Fluoroquinolones for atypical and respiratory infections."
    },

    # 6. Fluoroquinolones
    # Mechanism: Direct MRGPRX2 receptor mast-cell degranulation and IgE-mediated anaphylaxis with high intra-class cross-reactivity.
    # Clinical Basis: AAAAI & EAACI quinolone hypersensitivity guidelines.
    {
        "allergy_keywords": ["fluoroquinolone", "quinolone", "ciprofloxacin", "levofloxacin", "moxifloxacin"],
        "trigger_keywords": ["ciprofloxacin", "levofloxacin", "moxifloxacin", "ofloxacin", "norfloxacin", "cifran"],
        "risk_level": "CRITICAL_CONTRAINDICATION",
        "title": "Fluoroquinolone Hypersensitivity Warning",
        "description": "Patient has documented Quinolone allergy. Severe class cross-reactivity causes high risk of immediate anaphylaxis, tendinitis, and neurotoxic reactions.",
        "alternative_recommendation": "Switch to Cephalosporins (if beta-lactam tolerant), Aminoglycosides, or Co-trimoxazole (if sulfa tolerant)."
    },

    # 7. Tetracyclines
    # Mechanism: Type I immediate or Type IV delayed hypersensitivity with high intra-class cross-reactivity across four-ring naphthacene derivatives.
    # Clinical Basis: Standard clinical dermatology and pharmacology reference.
    {
        "allergy_keywords": ["tetracycline", "doxycycline", "minocycline"],
        "trigger_keywords": ["doxycycline", "minocycline", "tetracycline", "tigecycline", "doxy-1"],
        "risk_level": "CRITICAL_CONTRAINDICATION",
        "title": "Tetracycline Class Hypersensitivity",
        "description": "Patient has documented Tetracycline allergy. Administration can trigger acute cutaneous drug eruptions, severe photosensitivity, or DRESS syndrome.",
        "alternative_recommendation": "Use Macrolides or Beta-lactams as appropriate for the indicated infection."
    },

    # 8. Opioid Analgesics
    # Mechanism: True IgE-mediated allergy or non-immunologic pseudo-allergic mast cell histamine release mediated via MRGPRX2 receptors.
    # Clinical Basis: American Society of Anesthesiologists (ASA) clinical practice guidelines.
    {
        "allergy_keywords": ["opioid", "codeine", "morphine", "tramadol", "fentanyl"],
        "trigger_keywords": ["codeine", "morphine", "tramadol", "oxycodone", "fentanyl", "hydrocodone", "ultracet"],
        "risk_level": "MAJOR_INTERACTION",
        "title": "Opioid Hypersensitivity Alert",
        "description": "Patient has documented Opioid sensitivity. Risk of profound histamine release, severe bronchospasm, severe pruritus, hypotension, or anaphylactoid reaction.",
        "alternative_recommendation": "Use non-opioid multimodal analgesia (Paracetamol, Gabapentinoids, regional nerve blocks, or topical Lidocaine)."
    },

    # 9. Statins (HMG-CoA Reductase Inhibitors)
    # Mechanism: Statin-associated muscle symptoms (SAMS) or immune-mediated necrotizing myopathy (anti-HMGCR antibodies).
    # Clinical Basis: National Lipid Association (NLA) statin safety consensus.
    {
        "allergy_keywords": ["statin", "atorvastatin", "rosuvastatin", "simvastatin"],
        "trigger_keywords": ["atorvastatin", "rosuvastatin", "simvastatin", "pravastatin", "lovastatin", "rosuvas", "atorva"],
        "risk_level": "MAJOR_INTERACTION",
        "title": "Statin Intolerance / Myopathy Hypersensitivity",
        "description": "Patient has documented Statin intolerance. Risk of acute myositis, severe creatine kinase elevation, and autoimmune necrotizing myopathy.",
        "alternative_recommendation": "Consider non-statin lipid lowering therapies such as Ezetimibe, Bempedoic Acid, or PCSK9 inhibitors under cardiology supervision."
    },

    # 10. ACE Inhibitor Induced Angioedema
    # Mechanism: Bradykinin degradation inhibition. ACE (kinase II) is the primary enzyme metabolizing bradykinin;
    # accumulation triggers potent non-IgE mediated vascular permeability and severe submucosal angioedema.
    # Clinical Basis: Standard cardiology and emergency medicine absolute black-box contraindication.
    {
        "allergy_keywords": ["ace inhibitor", "lisinopril", "enalapril", "ramipril", "angioedema"],
        "trigger_keywords": ["lisinopril", "enalapril", "ramipril", "captopril", "perindopril", "benazepril", "fosinopril"],
        "risk_level": "CRITICAL_CONTRAINDICATION",
        "title": "ACE Inhibitor Bradykinin Angioedema Contraindication",
        "description": "Patient has documented ACE inhibitor induced angioedema. High risk of life-threatening upper airway and laryngeal edema resulting in fatal asphyxiation.",
        "alternative_recommendation": "ACE inhibitors are strictly contraindicated for life. Switch to Calcium Channel Blockers (Amlodipine) or evaluate ARBs with extreme caution."
    },

    # 11. Local Anesthetics (Amide vs Ester)
    # Mechanism: IgE-mediated or methylparaben preservative-triggered hypersensitivity to amino-ester or amino-amide local anesthetics.
    # Clinical Basis: ASA and British Journal of Anaesthesia consensus guidelines.
    {
        "allergy_keywords": ["lidocaine", "novocaine", "bupivacaine", "local anesthetic", "lignocaine"],
        "trigger_keywords": ["lidocaine", "lignocaine", "bupivacaine", "procaine", "benzocaine", "ropivacaine", "prilocaine"],
        "risk_level": "CRITICAL_CONTRAINDICATION",
        "title": "Local Anesthetic Hypersensitivity Warning",
        "description": "Patient has documented Local Anesthetic allergy. Administration risks acute systemic toxicity, severe contact dermatitis, or anaphylaxis.",
        "alternative_recommendation": "Perform intradermal skin testing with preservative-free local anesthetic from alternate chemical class before administration."
    }
]


def check_drug_interactions(
    proposed_medications: List[str],
    active_medications: Optional[List[str]] = None,
    allergies: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Evaluates proposed medications against patient active meds and documented allergies.
    Returns detected safety alerts, overall risk tier, and clinical recommendations.
    Zero-hallucination deterministic rule-based evaluation.
    """
    active_meds = [m.lower().strip() for m in (active_medications or []) if m]
    proposed_meds = [m.lower().strip() for m in proposed_medications if m]
    patient_allergies = [a.lower().strip() for a in (allergies or []) if a]

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
                    if rule["risk_level"] == "CRITICAL_CONTRAINDICATION":
                        highest_risk = "CRITICAL_CONTRAINDICATION"
                    elif rule["risk_level"] == "MAJOR_INTERACTION" and highest_risk != "CRITICAL_CONTRAINDICATION":
                        highest_risk = "MAJOR_INTERACTION"

    # 2. Drug-Drug Interaction Checking
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
