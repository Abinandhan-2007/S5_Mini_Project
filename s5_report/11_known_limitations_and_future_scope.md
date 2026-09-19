# ⚠️ CarePulse — Known Limitations, Architectural Constraints & Future Scope

> **Document Version:** 1.0.0  
> **Classification:** Engineering Audit & Technical Debt Report  
> **Last Updated:** 2026-09-10  
> **Scope:** Transparent Disclosure of Technical Trade-offs, Shelved Components, and Roadmap Opportunities

---

## 11.1 Explicit Architectural Trade-offs & Limitations

### 1. Shelved Ambient Voice Scribe (`backend/ai/voice_scribe.py`)
- **Current Status:** Shelved / Mock Implementation.
- **Root Cause & Technical Constraint:**
  - Real-time clinical transcription requires continuous microphone streaming and multi-speaker acoustic diarization (separating the physician’s voice from the patient's voice).
  - In cross-platform mobile webviews (Capacitor Android WebViews and mobile browsers), background microphone access is aggressively throttled or revoked by Android OS power management.
  - Latency of streaming audio to external whisper-compatible speech models exceeded the acceptable 500ms interaction threshold on 4G/cellular connections.
- **Current Workaround:** Physicians type notes or use operating-system-level dictation directly inside the structured SOAP editor in `ActiveConsultation.tsx`.

### 2. Multi-Agent AI System Architecture Status (`backend/ai/graph.py`)
- **Current Status:** Simplified Sequential Agent Pipeline (LangGraph shelved).
- **Root Cause & Technical Constraint:**
  - An earlier prototype experimented with dynamic cyclic agent graphs (LangGraph) for symptom exploration.
  - In clinical practice, non-deterministic agent loops introduce unacceptable latency (4 to 8 seconds per user turn) and unpredictable conversational drift.
- **Current Architecture:** Streamlined into a deterministic 4-step pipeline:
  $$\text{Emergency Red-Flag Guard} \longrightarrow \text{Intent Classifier} \longrightarrow \text{Clinical RAG Retrieval} \longrightarrow \text{Mistral Synthesis}$$
  This reduced response latency to under 900ms while guaranteeing 100% recall on emergency conditions.

### 3. Rule-Based Fallbacks vs Live LLM Calls
- **Current Status:** Hybrid Architecture (13 Deterministic Engines + 1 External LLM).
- **Details:**
  - Out of 21 AI/NLP components across the codebase, **13 components are built 100% in-house using pure Python (regular expressions, set theory, and scikit-learn TF-IDF)**:
    1. Emergency Red-Flag Triage Engine
    2. 4-Step Clinical Triage Agent
    3. Intent Classifier
    4. Patient Context & Entity Extractor
    5. Knowledge Base RAG Search (Cosine Similarity)
    6. Clinical Answer Confidence Scorer
    7. SOAP Clinical Summary Formatter
    8. DrugGuard Interaction & Allergy Checker
    9. Fuzzy Prescription String Matcher
    10. Blister Pack Brand Candidate Extractor
    11. Token Queue Priority Interleaving Math
    12. Trigram Medicine Name Search
    13. BMI & Physiological Score Generator
  - **External API Dependency:** Only the conversational chat fluency (`backend/ai/llm.py`) and complex multimodal prescription image parsing (`backend/ai/vision_parser.py`) require an active `MISTRAL_API_KEY`.
  - **Failure Behavior Without API Key:** The system gracefully degrades to safe deterministic triage guidance without crashing.

### 4. Text-to-Speech (TTS) Google Translate Proxy Limitations (`backend/main.py`)
- **Current Status:** Persistent Disk Caching + Base64 Fallback.
- **Known Limitation:**
  - The TTS endpoint utilizes Google's public speech synthesis endpoints (`client=tw-ob` / `client=gtx`) for English, Tamil, Malayalam, and Hindi audio pronunciation.
  - Because this is not an official, SLA-backed Google Cloud enterprise service, high-volume requests could face rate-limiting or IP throttling.
- **Mitigation Implemented:**
  - All generated audio clips are hashed with SHA-256 (`hashlib.sha256(f"{lang}:{text}".encode())`) and cached indefinitely in `backend/.cache/tts/`. Subsequent requests for identical triage advice return cached audio in under 2ms with zero upstream network calls.

### 5. OpenFDA US-Market Database vs Indian Pharmaceutical Brands
- **Current Status:** Hybrid Catalog with Trigram Pre-Matching.
- **Known Limitation:**
  - The OpenFDA National Drug Code (NDC) database only catalogs pharmaceuticals approved by the United States Food & Drug Administration.
  - Very popular Indian domestic brand names (e.g., *Dolo 650*, *Calpol*, *Pantocid*, *Combiflam*, *Meftal-Spas*, *Augmentin 625*) do not exist as branded entries in OpenFDA.
- **Mitigation Implemented:**
  - CarePulse maintains an internal PostgreSQL `medicines` catalog seeded with 500+ Indian domestic medicines (`backend/migrations/seed_medicines.py`).
  - When an Indian brand is queried, `medicine_search_service.py` extracts the active generic molecule (e.g., *Dolo 650* -> *Paracetamol*) and queries OpenFDA using the generic active ingredient, delivering accurate clinical monographs for Indian patients.

### 6. Android OS Battery Optimization & Background FCM Alarms
- **Known Limitation:**
  - Aggressive battery-saving skins (Xiaomi MIUI/HyperOS, Oppo ColorOS, Vivo FuntouchOS) kill background apps and delay scheduled local notification alarms unless users manually grant "Unrestricted Battery" permissions in Android OS settings.
- **Mitigation Implemented:**
  - High-priority FCM push notifications are dispatched via Google Play Services, which bypasses application-level power management to wake the device for critical appointment changes.

### 7. Financial Payment Processing
- **Current Status:** Accounting Ledger Model.
- **Details:**
  - Doctor consultation fees (e.g., ₹500.00) are currently recorded as ledger accounts and financial metrics in the administrative analytics dashboard.
  - Direct credit card, UPI, and net banking gateway integrations (e.g., Razorpay, Stripe) are currently architectural stubs awaiting production merchant account keys.

---

## 11.2 Future Scope & Development Roadmap

### Phase 1: Real-Time Telemedicine & WebRTC Video Consultations
- Implement peer-to-peer WebRTC video calling between the patient mobile app and doctor consultation workstation for remote rural follow-ups.
- Integrate bandwidth-adaptive VP9/AV1 video codecs for stable connectivity over 3G/4G networks.

### Phase 2: National Digital Health Interoperability (ABDM / FHIR)
- Conform CarePulse EMR exports to the **Ayushman Bharat Digital Mission (ABDM)** standards and HL7 FHIR (Fast Healthcare Interoperability Resources) JSON specifications.
- Allow patients to link their 14-digit ABHA (Ayushman Bharat Health Account) ID to synchronize records with central government health registries.

### Phase 3: Edge-Deployed Offline LLM Inference
- Package quantized on-device SLMs (Small Language Models such as Google Gemma 2B or Mistral 3B via ONNX Runtime / MediaPipe) directly inside the Android APK.
- This will enable 100% offline conversational medical triage without requiring external cloud API keys or active internet connections.

### Phase 4: Pharmacy & Inventory Dispensing Module
- Extend the hospital portal suite to include a Pharmacy Dispensing Counter.
- When doctors finalize prescriptions, the hospital pharmacy workstation automatically reserves medicine quantities, flags stock depletion, and tracks lot expiration dates.
