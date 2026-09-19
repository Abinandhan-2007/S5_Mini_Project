# 🛠️ CarePulse — Technology Stack: Comprehensive Specification & Rationale

> **Document Version:** 1.0.0  
> **Classification:** Technical Reference / Architectural Decision Record (ADR)  
> **Last Updated:** 2026-09-10  
> **Scope:** Full-Stack Dependency Audit across Frontend, Backend, Database, Mobile, Testing, and Cloud Services

---

## 2.1 Overview Matrix

Every dependency and tool in CarePulse was selected based on strict criteria: execution speed, minimal runtime footprint on resource-constrained Android devices, native TypeScript type safety, asynchronous concurrency in Python, and fail-safe offline fault tolerance.

| Layer | Primary Technology | Exact Version in Project | Core Purpose in CarePulse |
| :--- | :--- | :--- | :--- |
| **Frontend UI Library** | React | `^19.2.8` | Declarative UI component architecture with React 19 concurrent features |
| **Language (Frontend)** | TypeScript | `~6.0.2` (dev) / `tsconfig` | End-to-end static typing across forms, API contracts, and portal states |
| **Bundler & Dev Server** | Vite | `^8.2.0` | Sub-second HMR and tree-shaken static asset compilation for web and mobile |
| **Styling & Design System** | Tailwind CSS | `^3.4.19` | Utility-first responsive design tokens, glassmorphism, and dark/light modes |
| **Global State Management** | Zustand | `^5.0.14` | Micro-store reactive state without context boilerplate; syncs with localStorage |
| **Mobile Runtime Bridge** | Capacitor | `^8.5.0` | Native Android wrapper converting web bundle into a hardware-accelerated APK |
| **Backend Framework** | FastAPI | `>=0.115.0` | High-performance asynchronous REST API framework with Pydantic validation |
| **Language (Backend)** | Python | `3.11+` | Asynchronous backend server, clinical logic, OCR, and AI agent pipeline |
| **Primary Relational Store** | PostgreSQL | `18.x` | ACID-compliant relational persistence, JSONB document querying, GIN indexing |
| **Vector Search Extension** | pgvector | `>=0.3.0` | High-dimensional embedding storage and cosine similarity search for clinical RAG |
| **PostgreSQL Driver** | psycopg (v3) | `>=3.2.0` | High-throughput asynchronous and binary protocol connection to PostgreSQL |
| **Password Cryptography** | bcrypt | `>=4.0.0` | Salted adaptive one-way cryptographic hashing for local staff & patient auth |
| **Session Security** | PyJWT | `>=2.8.0` | Stateless HS256 cryptographic JWT token issuing and verification |
| **Push Notification Engine** | Firebase Admin SDK | `>=6.5.0` | Server-side FCM token dispatch for background push, intake alarms, and updates |
| **Identity Authentication** | Google Auth Library | `>=2.34.0` | Cryptographic RS256 token verification for Google OAuth one-tap logins |
| **E2E & Integration Testing** | Playwright | `^1.62.1` | Headless multi-browser testing across patient, doctor, and admin workflows |
| **Computer Vision / OCR** | Tesseract (pytesseract) | `>=0.3.10` | Optical character recognition on scanned drug packaging and lab reports |
| **External Drug Database** | OpenFDA API | REST Endpoint | Official public FDA database for active ingredients, indications, and adverse risks |
| **Development Ingress** | Ngrok | Permanent Static Domain | Secure TLS tunneling exposing local port 5000 directly to native Android devices |

---

## 2.2 Frontend & Mobile Frameworks

### 1. React (`^19.2.8`)
- **What it is:** The modern standard component-based UI rendering engine.
- **Where specifically used:**
  - `frontend/src/App.tsx`, `frontend/src/app/routes.tsx`
  - All Patient feature modules: `frontend/src/features/home/HomeScreen.tsx`, `BookAppointmentScreen.tsx`, `ScanMedicineScreen.tsx`
  - All Hospital portals: `frontend/src/portals/doctor/`, `frontend/src/portals/receptionist/`, `frontend/src/portals/admin/`, `frontend/src/portals/nurse/`, `frontend/src/portals/superadmin/`
- **Why chosen:** React 19 provides state transition primitives, non-blocking rendering, and high reconciliation efficiency when updating rapidly changing queues (e.g., token calling in the Receptionist portal) without freezing lower-end mobile devices.

### 2. TypeScript (`~6.0.2`)
- **What it is:** Strongly-typed superset of JavaScript providing compile-time type verification.
- **Where specifically used:**
  - `frontend/src/types/index.ts` (defining Patient, Doctor, Appointment, SOAP, Vitals, and Token interfaces)
  - `frontend/src/lib/store.ts` (Zustand state signatures)
  - `frontend/src/api/client.ts` (Typed API response wrappers)
  - Throughout every `.tsx` and `.ts` file across frontend and tests.
- **Why chosen:** Outpatient medical software cannot tolerate runtime undefined property errors (e.g., mismatched prescription dosage formats or null patient codes). TypeScript guarantees end-to-end contract alignment between backend Pydantic models and frontend components.

### 3. Vite (`^8.2.0`)
- **What it is:** Next-generation frontend build tooling powered by Rollup and ES modules.
- **Where specifically used:**
  - `frontend/vite.config.ts`, `frontend/package.json`
  - Dev server invocation (`npm run dev`) and production bundling (`npm run build`).
- **Why chosen:** Generates builds in under 3 seconds and provides instantaneous Hot Module Replacement (HMR). Crucially, Vite creates an ultra-lean static distribution folder (`frontend/dist`) that Capacitor directly synchronizes into the Android app asset container.

### 4. Tailwind CSS (`^3.4.19`)
- **What it is:** Utility-first CSS framework with JIT (Just-In-Time) compiler.
- **Where specifically used:**
  - `frontend/tailwind.config.js`, `frontend/src/index.css`
  - Applied across all screens for modern aesthetics: glassmorphism cards (`backdrop-blur-md`), health-tech emerald/cyan gradients, dark mode tokens, and responsive multi-device layouts.
- **Why chosen:** Eliminates bloated CSS files, guarantees consistency across team members, compiles down to minimal static CSS (under 40KB gzipped), and enables rapid prototyping of accessible UI components.

### 5. Zustand (`^5.0.14`)
- **What it is:** A lightweight, hook-based state management store using immutable closures.
- **Where specifically used:**
  - `frontend/src/lib/store.ts` (main application store managing `user`, `appointments`, `prescriptions`, `hospitals`, `notifications`, and `activeToken`)
- **Why chosen:** Unlike Redux, Zustand requires zero boilerplate, actions, or dispatchers. It allows surgical selector subscriptions (`useCarePulseStore(s => s.user)`), preventing unwanted re-renders of heavy consultation forms when unrelated background notifications arrive. It seamlessly integrates with `localStorage` for offline session caching.

### 6. Capacitor Ecosystem (`^8.5.0`)
- **What it is:** An open-source native runtime from Ionic that allows web applications to run natively on iOS and Android with direct access to operating system hardware APIs.
- **Where specifically used:**
  - `frontend/capacitor.config.ts`, `frontend/android/`
  - `@capacitor/camera` (`^8.2.4`): Used in `ScanMedicineScreen.tsx` to photograph medicine strips.
  - `@capacitor/push-notifications` (`^8.1.2`): Used in `frontend/src/lib/pushNotifications.ts` for native FCM token capture and push alert handling.
  - `@capacitor/local-notifications` (`^8.3.1`): Used in `frontend/src/services/medicationNotificationService.ts` for scheduling offline medication alarms (breakfast, lunch, dinner).
  - `@capgo/capacitor-native-biometric` (`^8.6.4`): Used in `frontend/src/components/ui/ProtectedPatientLayout.tsx` for Android Fingerprint / Face Unlock authentication.
  - `@capacitor/app` (`^8.1.1`): Used in `SystemNavigationHandler.tsx` for handling Android hardware back button actions.
  - `@capacitor-community/file-opener` (`^8.0.1`): Used for opening downloaded APK updates directly in Android Package Installer.
  - `@codetrix-studio/capacitor-google-auth` (`^3.4.0-rc.4`): Used in `frontend/src/features/auth/LoginScreen.tsx` for native Android One-Tap Google Sign-In.
- **Why chosen:** Allows maintaining a single unified codebase for web, tablet, and Android mobile without writing parallel Kotlin/Java applications.

### 7. Form Management & Validation
- **React Hook Form (`^7.84.0`) & Zod (`^3.25.76`):**
  - **Where used:** `frontend/src/features/auth/`, `frontend/src/portals/doctor/ConsultationForm.tsx`, `frontend/src/portals/nurse/VitalsEntryModal.tsx`
  - **Why chosen:** High-performance uncontrolled form rendering that validates complex clinical schemas (systolic/diastolic blood pressure bounds, dosage frequencies) before submitting to the backend.

### 8. Auxiliary Frontend Libraries
- **Framer Motion (`^12.43.0`):** Used in `frontend/src/components/ui/PageTransition.tsx` for hardware-accelerated screen slide transitions.
- **html5-qrcode (`^2.3.8`):** Used in `frontend/src/portals/receptionist/PatientCheckIn.tsx` for scanning patient QR passes directly through desktop webcams.
- **Lucide React (`^1.28.0`):** Consistent vector icons for medical and hospital operations.
- **TanStack React Query (`^5.101.4`):** Async cache synchronization and background query invalidation for live doctor availability.

---

## 2.3 Backend & Asynchronous Architecture

### 1. Python (`3.11+`)
- **What it is:** High-level interpreted language known for rapid development, native string processing, and rich mathematical/scientific libraries.
- **Where used:** The entire backend execution layer (`backend/`).
- **Why chosen:** Python enables unified development across standard REST microservices, asynchronous background schedulers, and clinical NLP/OCR pipelines without cross-language serialization friction.

### 2. FastAPI (`>=0.115.0`) & Uvicorn (`>=0.30.0`)
- **What it is:** High-performance modern web framework built on Starlette and Pydantic, running on ASGI (Asynchronous Server Gateway Interface) via Uvicorn.
- **Where used:**
  - `backend/main.py`, `backend/routes/*.py`
- **Why chosen:** FastAPI automatically generates interactive OpenAPI/Swagger documentation (`/docs`), enforces strict schema validation via Pydantic v2, and provides native async/await coroutines capable of handling hundreds of concurrent receptionist polling requests per second.

### 3. Pydantic (`>=2.8.0`)
- **What it is:** Data validation and parsing library utilizing Python type annotations.
- **Where used:** `backend/schemas.py`, `backend/ai/schemas.py`.
- **Why chosen:** Rejects malformed JSON bodies before reaching business logic, generating descriptive HTTP 422 Unprocessable Entity responses automatically.

### 4. APScheduler (`>=3.10.4`)
- **What it is:** Advanced Python Scheduler for background periodic cron jobs.
- **Where used:** `backend/notifications/scheduler.py`, started inside `main.py` lifespan context.
- **Why chosen:** Runs non-blocking background workers that scan PostgreSQL every 60 seconds to detect appointments scheduled for the next 24 hours or upcoming medication doses, automatically dispatching FCM push notifications without freezing HTTP workers.

---

## 2.4 Database & Persistence Layer

### 1. PostgreSQL (`18.x`)
- **What it is:** The world’s leading open-source relational database management system.
- **Where used:** `database/init.sql`, `backend/database.py`.
- **Why chosen:** Outpatient medical platforms require absolute relational integrity: foreign key cascade deletions, transactional concurrency control (`BEGIN / COMMIT / ROLLBACK`), JSONB document columns for dynamic SOAP notes, and stored PL/pgSQL functions for auto-generating display codes.

### 2. pgvector (`>=0.3.0`)
- **What it is:** Open-source vector similarity search extension for PostgreSQL.
- **Where used:** Initialized in `backend/database.py`, used by `backend/ai/rag.py`.
- **Why chosen:** Allows storing high-dimensional vector embeddings directly alongside clinical records, eliminating the need to run an expensive standalone vector database (such as Pinecone or Milvus).

### 3. psycopg (`>=3.2.0`) & psycopg2-binary
- **What it is:** The modern, pure-Python and C-accelerated PostgreSQL adapter for Python.
- **Where used:** `backend/database.py` connection pooling and query execution.
- **Why chosen:** Psycopg v3 supports native binary format transfer, dictionary row factories (`dict_row`), connection timeouts for fail-fast recovery, and seamless vector type registration.

### 4. Resilient Local JSON Store (`backend/database.json`)
- **What it is:** Local flat-file transactional buffer managed by `backend/database.py`.
- **Where used:** Offline fallback mode when PostgreSQL service is halted.
- **Why chosen:** Ensures the hospital never stops admitting patients or taking walk-ins during unexpected database outages. Automatically auto-syncs to PostgreSQL upon reconnection.

---

## 2.5 Security, Authentication & Cryptography

### 1. bcrypt (`>=4.0.0`)
- **What it is:** Key derivation function based on the Blowfish cipher with cryptographic salting and work factor configuration.
- **Where used:** `backend/core/security.py`, `backend/auth.py`, `backend/routes/staff_auth.py`.
- **Why chosen:** Protects staff and patient credentials against rainbow table attacks and GPU-accelerated brute forcing. Automatically flags legacy hash formats via `needs_rehash()`.

### 2. PyJWT (`>=2.8.0`)
- **What it is:** Python JSON Web Token implementation conforming to RFC 7519.
- **Where used:** `backend/auth.py` (`generate_patient_jwt`), `backend/routes/staff_auth.py` (`create_staff_access_token`).
- **Why chosen:** Provides stateless, digitally signed Bearer tokens containing user ID, role, and hospital ID claims, enabling sub-millisecond RBAC permission verification without querying the database on every micro-request.

### 3. Google Auth (`>=2.34.0`)
- **What it is:** Official Google client library for verifying OpenID Connect Google ID tokens.
- **Where used:** `backend/auth.py` (`verify_google_token`).
- **Why chosen:** Verifies the cryptographic signature of Google OAuth tokens issued to Android devices, guaranteeing that incoming Google profile emails and user IDs are authentic.

---

## 2.6 Computer Vision & Clinical AI Integrations

### 1. Tesseract OCR & pytesseract (`>=0.3.10`) + Pillow (`>=10.0.0`)
- **What it is:** Industrial open-source optical character recognition engine.
- **Where used:** `backend/core/ocr_matcher.py` (`extract_text_from_image`).
- **Why chosen:** Operates 100% locally on the backend server without external cloud API fees or latency; extracts text from drug blister packaging photographs uploaded from Android phones.

### 2. OpenFDA API
- **What it is:** Public REST API maintained by the U.S. Food and Drug Administration.
- **Where used:** `backend/services/drug_info_service.py` (`get_drug_info`).
- **Why chosen:** Provides authoritative clinical data (active ingredients, drug warnings, dosage forms, adverse reactions) to educate patients about prescribed medications.

### 3. Mistral AI & Custom Local Fallbacks
- **What it is:** Large Language Model and Vision APIs with deterministic rule-based local fallbacks.
- **Where used:** `backend/ai/vision_parser.py`, `backend/ai/llm.py`, `backend/ai/drug_guard.py`.
- **Why chosen:** Enables intelligent image analysis and conversational triage, while 13 local deterministic Python engines ensure zero downtime even when internet or external API quotas are exhausted.

---

## 2.7 Deployment, Mobile Ingress & Testing

### 1. Ngrok
- **What it is:** Secure, reverse-proxy tunneling tool exposing local TCP/HTTP ports to the public internet via encrypted TLS tunnels.
- **Where used:** `start-carepulse.bat`, configured with static domain `straggler-boss-unselect.ngrok-free.dev`.
- **Why chosen:** Connects physical Android smartphones (on 4G/5G mobile data) directly to the local development FastAPI backend without port forwarding or router firewall reconfiguration.

### 2. Playwright (`^1.62.1`)
- **What it is:** End-to-end browser automation framework from Microsoft.
- **Where used:** `playwright.config.ts`, `tests/patient/*.spec.ts`, `tests/staff/*.spec.ts`.
- **Why chosen:** Executes deterministic, multi-role integration tests across Chromium, Firefox, and WebKit to verify patient logins, doctor SOAP notes, and hospital multi-tenant isolation.
