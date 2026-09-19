# 📁 CarePulse — Complete File & Directory Structure Reference

> **Document Version:** 1.0.0  
> **Classification:** Technical Codebase Map & File Manifest  
> **Last Updated:** 2026-09-10  
> **Scope:** Full Recursive Inspection of `backend/`, `frontend/`, `database/`, `tests/`, and Root Configs

---

## 3.1 High-Level Directory Overview

```
S5_Mini_Project/
├── backend/               # FastAPI async application, AI engines, migrations & services
├── database/              # PostgreSQL schema DDL, seed data & resilient fallback JSON
├── frontend/              # React 19 + TypeScript + Capacitor Android workspace
├── tests/                 # Playwright E2E and cross-role integration tests
├── docs/                  # Comprehensive project technical documentation
├── start-carepulse.bat    # Production launcher (PostgreSQL + FastAPI + Ngrok Tunnel)
├── start-carepulse-dev.bat# Local development launcher (FastAPI + Vite dev server)
├── stop-carepulse.bat     # Clean termination script for all background services
├── create_shortcuts.ps1   # PowerShell desktop launcher shortcut generator
├── docker-compose.yml     # Container definition for PostgreSQL + pgvector
├── playwright.config.ts   # E2E browser automation test harness configuration
└── package.json           # Root npm scripts coordinator
```

---

## 3.2 Backend Layer (`backend/`)

### Root Backend Files
- `backend/main.py` — Primary ASGI application entry point; sets up middleware (CORS, no-cache), lifecycle handlers, static asset serving, TTS proxy, and mounts all subrouters.
- `backend/database.py` — Database connectivity manager; configures psycopg connection pooling, pgvector registration, fail-fast error handling, and idempotent offline-sync engine.
- `backend/auth.py` — Authentication core for patient identity; handles Google OAuth ID token verification, bcrypt hashing, and patient JWT token issuance.
- `backend/config.py` — Centralized environment settings reader; parses `.env` parameters for PostgreSQL credentials, JWT secret keys, and Mistral API keys.
- `backend/schemas.py` — Pydantic models for request/response validation across patient auth, appointments, consultations, and medicines.
- `backend/email_service.py` — Asynchronous email delivery service; dispatches 6-digit OTP verification codes via Resend / SMTP for password resets.
- `backend/firebase_config.py` — Firebase Admin SDK initializer; authenticates against Google Firebase using `serviceAccountKey.json` for FCM messaging.
- `backend/app_version.json` — App release metadata registry; records `versionName`, download URL, and release notes for in-app APK updates.
- `backend/deploy_update.py` — Automated APK build & deployment pipeline; increments Gradle version, builds React assets, compiles APK, and updates static downloads.
- `backend/broadcast_update.py` — Standalone administrative utility to broadcast an app-update FCM push notification to all active devices.
- `backend/create_friendly_views.py` — Standalone database migration utility to create pre-joined inspection views (`v_appointments`, `v_consultations`, etc.).
- `backend/Dockerfile` — Container recipe for containerized deployment of the FastAPI backend.
- `backend/Procfile` — Cloud platform process declaration for running Uvicorn workers.
- `backend/requirements.txt` — Production Python dependencies (FastAPI, psycopg, bcrypt, pyjwt, apscheduler, pytesseract, pillow).
- `backend/requirements-ai.txt` — Optional extended AI/ML dependencies (LangChain, LangGraph, scikit-learn, PyTorch).

### Backend Router Modules (`backend/routes/`)
- `backend/routes/__init__.py` — Package marker exposing router submodules.
- `backend/routes/admin_routes.py` — Hospital Admin endpoints; manages doctor/nurse/receptionist accounts, hospital settings, executive analytics, and staff lookup.
- `backend/routes/doctor_routes.py` — Doctor clinical endpoints; provides live patient queue, consultation history, consultation prep data, and SOAP note creation.
- `backend/routes/receptionist_routes.py` — Receptionist operations endpoints; manages walk-in appointments, token queue ordering, desk check-ins, and slot availability.
- `backend/routes/nurse_routes.py` — Nurse triage endpoints; handles pre-consultation vitals logging, diagnostic lab test orders, and report file uploads.
- `backend/routes/superadmin_routes.py` — Platform SuperAdmin endpoints; handles hospital tenant onboarding, hospital lifecycle toggling, admin provisioning, and global audit logs.
- `backend/routes/staff_auth.py` — Unified staff authentication endpoints; validates multi-role logins (admin/doc/nurse/receptionist), dual-login constraints, and issues staff JWTs.
- `backend/routes/ai_routes.py` — Clinical AI suite endpoints; exposes symptom triage, entity extraction, DrugGuard safety checking, RAG search, and vision parsing.
- `backend/routes/patient_qr_routes.py` — QR code scanning endpoints; enables hospital staff to look up patient history and appointments by scanning mobile QR passes.
- `backend/routes/appointment_routes.py` — Legacy appointment routing helper.

### Core Utilities (`backend/core/`)
- `backend/core/__init__.py` — Package marker for core security and processing utilities.
- `backend/core/security.py` — Password hashing and token security; implements bcrypt password salting, hash verification, and legacy hash re-hashing checks.
- `backend/core/permissions.py` — Role-based access control (RBAC) dependencies; defines security guards (`require_role`, `require_hospital_scope`).
- `backend/core/ocr_matcher.py` — Computer vision and text extraction; executes Tesseract OCR on drug packaging, normalizes text, and performs fuzzy matching against prescriptions.

### Clinical Services (`backend/services/`)
- `backend/services/__init__.py` — Package marker for external data and search services.
- `backend/services/drug_info_service.py` — OpenFDA client integration; queries national drug labels for active ingredients, indications, and adverse reactions, with clinical AI synthesis.
- `backend/services/medicine_search_service.py` — Fast medicine autocomplete service; searches local Indian drug catalog and PostgreSQL trigram indexes (`pg_trgm`).

### Notification & Background Scheduler (`backend/notifications/`)
- `backend/notifications/fcm_service.py` — Firebase Cloud Messaging engine; manages device token registrations, single-device pushes, topic broadcasts, and notification logging.
- `backend/notifications/scheduler.py` — APScheduler daemon; runs background jobs every 60 seconds to detect upcoming appointments and trigger push notifications.

### Clinical AI & NLP Engines (`backend/ai/`)
- `backend/ai/__init__.py` — AI subsystem initializer exporting clinical inference pipelines.
- `backend/ai/triage.py` — 4-step emergency triage engine; detects red-flag clinical conditions (chest pain, stroke symptoms) using deterministic clinical rules.
- `backend/ai/drug_guard.py` — Drug interaction & allergy safety engine; cross-references patient allergies and existing medications against newly prescribed drugs.
- `backend/ai/rag.py` — Clinical Retrieval-Augmented Generation engine; performs semantic vector search over medical knowledge using pgvector or local TF-IDF cosine similarity.
- `backend/ai/inference.py` — Central clinical AI coordinator; routes incoming patient symptoms through triage, intent classification, RAG retrieval, and LLM synthesis.
- `backend/ai/confidence.py` — Heuristic scoring module; evaluates clinical answer confidence and triggers automated human physician escalation if score is below threshold.
- `backend/ai/intent.py` — Intent classifier; categorizes incoming queries into symptom inquiry, medication question, emergency, or hospital logistics.
- `backend/ai/patient_context.py` — Context extractor; parses age, biological sex, pre-existing conditions, and active medications into a structured clinical profile.
- `backend/ai/llm.py` — Multi-model LLM adapter; interfaces with Mistral API endpoints with automatic fallback across small, medium, and large models.
- `backend/ai/vision_parser.py` — Multimodal vision parser; analyzes prescription sheets and lab reports using OCR and vision LLM parsing.
- `backend/ai/voice_scribe.py` — Ambient voice scribe placeholder; provides architecture for ambient clinical conversation transcription (currently shelved).
- `backend/ai/schemas.py` — Pydantic models for AI chat requests, triage responses, SOAP summaries, and entity extraction payloads.
- `backend/ai/config.py` — Configuration constants for AI temperature, token limits, and fallback model priorities.
- `backend/ai/followup_agent.py` — Clarification question generator for incomplete symptom descriptions.
- `backend/ai/graph.py` — Sequential state graph representing the multi-step clinical reasoning chain.
- `backend/ai/evaluate_accuracy.py` — Evaluation benchmark script for measuring triage accuracy against synthetic clinical test cases.
- `backend/ai/test_ai_endpoints.py` — Automated verification script testing all `/api/ai/*` endpoints.

### Data Models & Migrations (`backend/models/`, `backend/migrations/`)
- `backend/models/patient.py` — Patient domain entity and helper validation methods.
- `backend/models/staff.py` — Staff domain entity defining role hierarchies and hospital relationships.
- `backend/models/appointment.py` — Appointment domain model.
- `backend/migrations/apply_nurse_and_vitals_schema.py` — Standalone script applying `vitals` and `lab_tests` table definitions.
- `backend/migrations/apply_superadmin_db_changes.py` — Standalone script applying SuperAdmin audit log and hospital code migrations.
- `backend/migrations/seed_medicines.py` — Seeding script populating the `medicines` catalog with 500+ Indian pharmaceutical drugs.

### Backend Test Suite (`backend/tests/`)
- `backend/tests/test_appointment_isolation.py` — Multi-hospital isolation verification; ensures Admin A cannot view or modify Hospital B's appointments.
- `backend/tests/test_appointment_isolation_repro.py` — Targeted reproduction test for appointment scoping edge cases.
- `backend/tests/test_conflict_and_offline_security.py` — Tests terminal state conflict resolution during offline JSON to PostgreSQL synchronization.
- `backend/tests/test_display_codes.py` — Validates auto-generation sequences for patient codes (`P000001`) and hierarchical staff codes (`D001101`, `R001101`).
- `backend/tests/test_doctor_availability_flow.py` — Tests live toggling of doctor availability and immediate queue reflection.
- `backend/tests/test_doctor_credentials_flow.py` — Validates doctor credential generation, password updates, and login verification.
- `backend/tests/test_medicine_autocomplete.py` — Verifies trigram fuzzy search and category filtering on the medicine catalog.
- `backend/tests/test_nurse_workflow.py` — Verifies nurse pre-consultation vitals recording, BMI calculation, and lab test entry.
- `backend/tests/test_offline_online_sync.py` — Validates offline booking buffering in `database.json` and automatic syncing upon reconnect.
- `backend/tests/test_prescription_sync_flow.py` — Validates that physician-created SOAP prescriptions immediately sync to the patient's active prescription list.
- `backend/tests/test_push_notifications.py` — Verifies FCM device token registration and push alert payload construction.
- `backend/tests/test_queue_ordering.py` — Exhaustively verifies the unified queue algorithm (scheduled-priority hybrid ordering).
- `backend/tests/test_receptionist_password.py` — Verifies secure receptionist password updates and authentication.
- `backend/tests/test_scan_medicine.py` — Tests OCR text extraction, fuzzy matching against active prescriptions, and allergy warning triggers.
- `backend/tests/test_slots_flow.py` — Verifies time slot capacity enforcement (online vs offline seat allocation).
- `backend/tests/test_staff_dual_login.py` — Verifies dual-login resolution (authenticating by staff code vs email).
- `backend/tests/test_walkin_flow.py` — Tests instant front-desk walk-in appointment and token dispatch.
- `backend/tests/verify_bit_receptionist.py` — Quick sanity test verifying receptionist desk assignments and permissions.

---

## 3.3 Database Layer (`database/`)

- `database/init.sql` — Master DDL schema definition file; creates 16 tables, 5 pre-joined views, 5 auto-numbering sequences, PL/pgSQL trigger functions, and GIN trigram indexes.
- `database/seed_data.sql` — Development database seeding script; populates initial hospitals, doctors, mock patients, and standard sample appointments.
- `database/database.json` — Resilient offline storage buffer; stores patient registrations, appointments, and consultations during PostgreSQL service outages.

---

## 3.4 Frontend Layer (`frontend/`)

### Configuration & Build Tooling
- `frontend/package.json` — Frontend dependency manifest (React 19, Tailwind CSS, Zustand, Capacitor 8).
- `frontend/vite.config.ts` — Vite bundler configuration; sets up React plugin and build output optimizations.
- `frontend/tailwind.config.js` — Tailwind CSS configuration; defines custom brand colors, animations, and border radii.
- `frontend/postcss.config.js` — PostCSS configuration activating Tailwind and Autoprefixer.
- `frontend/capacitor.config.ts` — Native mobile configuration; defines Android package name (`com.carepulse.s52`), app title, and web asset folder.
- `frontend/tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` — TypeScript compiler strict typing configurations.
- `frontend/netlify.toml`, `frontend/vercel.json` — Edge hosting redirect rules for SPA deep-link routing.

### Application Entry & Routing (`frontend/src/`)
- `frontend/src/main.tsx` — Web application DOM mount; renders the root React tree with React.StrictMode.
- `frontend/src/App.tsx` — Top-level shell; orchestrates splash screen, update modal, FCM listeners, and global biometric locks.
- `frontend/src/app/routes.tsx` — Master route registry; maps URLs to screens, enforces authentication guards, and handles subdomain role routing.
- `frontend/src/index.css` — Global CSS stylesheet with Tailwind directives, scrollbar styling, and custom glassmorphism utilities.
- `frontend/src/App.css` — Component-level styling overrides.

### Shared Stores & APIs (`frontend/src/lib/`, `frontend/src/api/`, `frontend/src/types/`)
- `frontend/src/lib/store.ts` — Global Zustand state store; manages patient profile, appointments, prescriptions, hospitals, and auth tokens.
- `frontend/src/lib/versionChecker.ts` — In-app update checker; compares active app version against backend `/api/app/version`.
- `frontend/src/lib/pushNotifications.ts` — Native push notification wrapper for registering FCM device tokens.
- `frontend/src/api/client.ts` — Central Axios / fetch wrapper; automatically attaches Bearer tokens and handles ngrok bypass headers.
- `frontend/src/types/index.ts` — TypeScript definitions for Patient, Doctor, Appointment, Prescription, SOAPData, Vitals, and Token.
- `frontend/src/i18n/` — Internationalization provider supporting English, Tamil, Malayalam, and Hindi.

### Patient Feature Modules (`frontend/src/features/`)
- `frontend/src/features/auth/LoginScreen.tsx` — Patient login page supporting email/password and native Google Sign-In.
- `frontend/src/features/auth/RegisterScreen.tsx` — Patient registration page with password strength and email validation.
- `frontend/src/features/auth/CompleteProfileScreen.tsx` — Post-registration onboarding screen capturing blood group, DOB, gender, and allergies.
- `frontend/src/features/home/HomeScreen.tsx` — Main patient dashboard displaying upcoming appointments, active medication reminders, quick actions, and health stats.
- `frontend/src/features/appointments/BookAppointmentScreen.tsx` — Appointment booking flow with hospital selection, doctor specialty filtering, date picker, and time slot booking.
- `frontend/src/features/appointments/AppointmentDetailScreen.tsx` — Detailed appointment view with live token status, doctor cabin location, and cancellation options.
- `frontend/src/features/appointments/AppointmentScheduleScreen.tsx` — Calendar view of all booked and past patient appointments.
- `frontend/src/features/health-ai/HealthAIChatScreen.tsx` — Conversational AI symptom checker with interactive clinical triage and voice TTS playback.
- `frontend/src/features/health-ai/EscalationNoticeScreen.tsx` — Red-flag emergency warning screen advising immediate emergency room visit when dangerous symptoms are detected.
- `frontend/src/features/health-ai/AssessmentConfirmScreen.tsx` — Clinical confirmation summary screen displaying triage assessment and recommended doctor specialty.
- `frontend/src/features/hospitals/FindHospitalsScreen.tsx` — Hospital directory with specialty filtering, emergency status badges, and search.
- `frontend/src/features/hospitals/HospitalDetailScreen.tsx` — Comprehensive hospital profile displaying available departments, doctors, and contact information.
- `frontend/src/features/prescriptions/PrescriptionsScreen.tsx` — Digital medicine cabinet listing active and past prescriptions with meal timings.
- `frontend/src/features/prescriptions/ScanMedicineScreen.tsx` — Camera scanner using OCR and vision AI to identify drug packaging and check contraindications.
- `frontend/src/features/prescriptions/MedicineInfoLookupScreen.tsx` — Fast medicine encyclopedia with autocomplete search and OpenFDA clinical info.
- `frontend/src/features/reminders/RemindersScreen.tsx` — Daily medication intake reminder manager with audio-visual alerts.
- `frontend/src/features/notifications/NotificationsScreen.tsx` — In-app notification center displaying appointment updates, cancellations, and clinical announcements.
- `frontend/src/features/profile/ProfileScreen.tsx` — Patient profile settings, personal info, emergency contact, and QR pass display.
- `frontend/src/features/profile/AdvancedSettingsScreen.tsx` — Biometric unlock toggle, language selection, and cache management.
- `frontend/src/features/history/HistoryScreen.tsx` — Consolidated medical timeline of all past hospital visits, SOAP notes, and lab reports.

### Hospital Portals (`frontend/src/portals/`)
- `frontend/src/portals/shared/StaffPortalLogin.tsx` — Unified staff login gateway with role auto-detection and staff-code authentication.
- `frontend/src/portals/receptionist/ReceptionistLayout.tsx` — Receptionist portal navigation wrapper with desk status header.
- `frontend/src/portals/receptionist/ReceptionistDashboard.tsx` — Front-desk dashboard showing live token queues, doctor availability toggles, and walk-in shortcuts.
- `frontend/src/portals/receptionist/TokenManagement.tsx` — Token calling station with Next/Call/Skip controls and audio chime announcements.
- `frontend/src/portals/receptionist/PatientCheckIn.tsx` — Patient arrival check-in page supporting ticket number search and webcam QR pass scanning.
- `frontend/src/portals/receptionist/PatientBookings.tsx` — Comprehensive table of all scheduled bookings with filtering, check-in, and status updates.
- `frontend/src/portals/receptionist/DoctorManagement.tsx` — Receptionist view of hospital doctor schedules, cabin numbers, and slot capacities.
- `frontend/src/portals/receptionist/CreateDoctor.tsx` — Form for front desk to onboard visiting consultants or temporary doctors.
- `frontend/src/portals/receptionist/NurseManagement.tsx` — Receptionist directory of active duty nurses.
- `frontend/src/portals/receptionist/ReceptionistProfile.tsx` — Receptionist profile and password management screen.
- `frontend/src/portals/doctor/DoctorLayout.tsx` — Doctor portal layout with sidebar navigation, active cabin badge, and emergency notification chime.
- `frontend/src/portals/doctor/DoctorDashboard.tsx` — Physician dashboard showing today’s patient queue, completed visits, and quick stats.
- `frontend/src/portals/doctor/DoctorQueue.tsx` — Live patient queue management with Call Patient, Start Consultation, and No-Show controls.
- `frontend/src/portals/doctor/ActiveConsultation.tsx` — Full-screen clinical workstation displaying patient history, nurse-recorded vitals, lab results, and real-time SOAP note editor.
- `frontend/src/portals/doctor/DoctorEMRSearch.tsx` — Searchable historical archive of all patient consultations and diagnoses.
- `frontend/src/portals/doctor/DoctorProfile.tsx` — Physician profile, room/cabin assignment, and consultation fee settings.
- `frontend/src/portals/doctor/DoctorAvailabilityModal.tsx` — Quick modal to toggle doctor availability (Available, In Emergency, On Break).
- `frontend/src/portals/nurse/NurseLayout.tsx` — Nurse triage workstation navigation shell.
- `frontend/src/portals/nurse/NurseQueueDashboard.tsx` — Triage queue showing checked-in patients waiting for vitals and lab testing before seeing the doctor.
- `frontend/src/portals/nurse/VitalsEntryModal.tsx` — Clinical form capturing Height, Weight, BP, Heart Rate, SpO2, Temp, Blood Glucose, and auto-calculating BMI.
- `frontend/src/portals/nurse/TestEntryModal.tsx` — Form for recording diagnostic test results and uploading report PDF documents.
- `frontend/src/portals/admin/AdminLayout.tsx` — Hospital Admin executive portal layout with multi-department navigation.
- `frontend/src/portals/admin/AdminDashboard.tsx` — Hospital executive dashboard showing patient admissions, doctor occupancy, and revenue metrics.
- `frontend/src/portals/admin/AdminDoctorManagement.tsx` — Administrative CRUD console for managing hospital doctor rosters, specialties, and credentials.
- `frontend/src/portals/admin/AdminNurseManagement.tsx` — Administrative console for provisioning and managing hospital nurse accounts.
- `frontend/src/portals/admin/AdminReceptionistMgmt.tsx` — Administrative console for managing front-desk receptionist staff and desk assignments.
- `frontend/src/portals/admin/AdminAppointmentOverview.tsx` — Master schedule view of all past, active, and upcoming appointments across all departments.
- `frontend/src/portals/admin/AdminDepartmentManagement.tsx` — Configuration interface for hospital clinical specialties and departments.
- `frontend/src/portals/admin/AdminTokenSlotMgmt.tsx` — Time slot allocation manager adjusting online vs walk-in seat ratios per doctor.
- `frontend/src/portals/admin/AdminReportsAnalytics.tsx` — Hospital analytics suite displaying wait-time charts, visit trends, and departmental loads.
- `frontend/src/portals/admin/AdminSettingsProfile.tsx` — Hospital profile settings, address, emergency hotline, and administrative credentials.
- `frontend/src/portals/superadmin/SuperAdminLayout.tsx` — SuperAdmin multi-tenant governance platform navigation wrapper.
- `frontend/src/portals/superadmin/SuperAdminDashboard.tsx` — Global platform overview showing total affiliated hospitals, active doctors, and platform-wide patient volume.
- `frontend/src/portals/superadmin/HospitalManagement.tsx` — Master hospital registry for creating, editing, suspending, or activating hospital organizations.
- `frontend/src/portals/superadmin/AdminManagement.tsx` — SuperAdmin console for provisioning executive Hospital Administrator accounts (enforcing exactly 1 admin per hospital).
- `frontend/src/portals/superadmin/AuditLog.tsx` — Immutable platform-wide security audit trail recording all administrative operations with staff and timestamp attribution.

---

## 3.5 End-to-End Test Suite (`tests/`)

- `tests/patient/login.spec.ts` — Playwright test verifying patient email/password authentication, validation errors, and session persistence.
- `tests/patient/signup.spec.ts` — Playwright test verifying patient registration, automatic code assignment (`P000001`), and onboarding redirect.
- `tests/patient/appointments.spec.ts` — Playwright test verifying the full appointment booking flow from doctor selection to confirmation pass.
- `tests/patient/test_new_patient_isolation.py` — Pytest script verifying that freshly registered patients have empty, isolated medical histories.
- `tests/staff/admin-login.spec.ts` — Playwright test verifying hospital administrator authentication and dashboard access.
- `tests/staff/doctor-login.spec.ts` — Playwright test verifying doctor staff-code login and queue display.
- `tests/staff/receptionist-login.spec.ts` — Playwright test verifying receptionist login and desk assignment.
- `tests/staff/test_hospital_isolation.py` — Pytest script rigorously verifying multi-hospital tenant isolation across all staff endpoints.
