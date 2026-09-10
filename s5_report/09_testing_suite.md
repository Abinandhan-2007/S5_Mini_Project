# 🧪 CarePulse — Quality Assurance & Testing Suite Reference

> **Document Version:** 1.0.0  
> **Classification:** Test Verification & Quality Assurance Report  
> **Last Updated:** 2026-09-10  
> **Scope:** Full Inventory of Backend Python Tests, Playwright E2E Specs, and Clinical AI Benchmarks (28 Test Files)

---

## 9.1 Testing Architecture Overview

CarePulse employs a layered testing pyramid designed to validate correctness across all clinical workflows:
1. **Backend Integration & Unit Tests (Python / Pytest):** Validates database isolation, token queuing math, password cryptography, and offline-sync conflict resolution.
2. **End-to-End Browser Automation Tests (Playwright / TypeScript):** Drives real browser sessions across Chromium, Firefox, and WebKit to verify patient logins, doctor SOAP documentation, and receptionist queue interactions.
3. **Clinical AI & Triage Benchmarks:** Quantifies diagnostic triage safety, entity extraction precision, and red-flag escalation accuracy.

---

## 9.2 Backend Python Test Suite (`backend/tests/`)

### 1. `test_appointment_isolation.py` (14.2 KB)
- **Scope & Purpose:** Multi-hospital tenant isolation verification.
- **What it verifies:**
  - Asserts that an administrator from Hospital 1 cannot query, view, or modify appointments belonging to Hospital 2.
  - Verifies that cross-tenant appointment modification requests return `403 Forbidden` or `404 Not Found`.
  - Validates that receptionist booking endpoints strictly scope token queues to the receptionist's assigned facility.

### 2. `test_appointment_isolation_repro.py` (5.7 KB)
- **Scope & Purpose:** Targeted reproduction test harness for appointment scoping edge cases.
- **What it verifies:**
  - Tests URL query parameter tampering (`/api/admin/bookings?hospital_id=hosp-2`) when authenticated as an admin of `hosp-1`.
  - Confirms the backend ignores the query parameter and strictly uses the JWT claims.

### 3. `test_conflict_and_offline_security.py` (15.7 KB)
- **Scope & Purpose:** Offline synchronization security and terminal state conflict resolution.
- **What it verifies:**
  - Simulates offline appointment buffering in `database.json`.
  - Verifies **Terminal State Protection**: an appointment marked `Completed` or `Cancelled` in PostgreSQL can NEVER be overwritten by an earlier offline state (`Upcoming` or `Waiting`).
  - Confirms that primary key sequence counters (`patient_code_seq`) are safely realigned post-sync.

### 4. `test_display_codes.py` (10.9 KB)
- **Scope & Purpose:** Auto-numbering sequence and trigger verification.
- **What it verifies:**
  - Verifies patient display code generation (`P000001`, `P000002`).
  - Verifies hospital display code generation (`H001`, `H002`).
  - Verifies hierarchical staff code generation adhering strictly to formula: `<Role><HospNum><101+>` (e.g. `D001101`, `R001101`, `A001101`, `N001101`).
  - Verifies SuperAdmin code generation starting at `SA101`.

### 5. `test_doctor_availability_flow.py` (8.3 KB)
- **Scope & Purpose:** Real-time doctor clinic presence and queue responsiveness.
- **What it verifies:**
  - Verifies `PATCH /api/doctor/availability` toggling status between `Available`, `In Emergency`, and `On Break`.
  - Asserts that when a doctor marks themselves unavailable, the patient booking calendar instantly flags their slots as unavailable.
  - Verifies receptionist dashboard receives the updated presence badge immediately.

### 6. `test_doctor_credentials_flow.py` (3.9 KB)
- **Scope & Purpose:** Doctor credential lifecycle and login verification.
- **What it verifies:**
  - Tests doctor provisioning by hospital admin.
  - Verifies password hashing, first-time login credential challenge, and password updates.

### 7. `test_medicine_autocomplete.py` (12.0 KB)
- **Scope & Purpose:** Pharmaceutical search speed and fuzzy trigram matching.
- **What it verifies:**
  - Verifies PostgreSQL GIN trigram index (`idx_medicines_name_trgm`) performance.
  - Tests partial word queries (e.g. `"dolo"`, `"amox"`, `"parac"`) returning exact and fuzzy brand matches within 20 milliseconds.
  - Verifies category filtering (e.g. Antibiotics, Analgesics).

### 8. `test_nurse_workflow.py` (6.7 KB)
- **Scope & Purpose:** Nurse pre-consultation vitals recording and diagnostic test logging.
- **What it verifies:**
  - Verifies `POST /api/nurse/vitals` saves BP, Pulse, SpO2, and Blood Glucose.
  - Validates PostgreSQL stored generated column: `bmi = ROUND(weight / (height/100)^2, 1)`.
  - Verifies diagnostic lab test attachments and status updates.

### 9. `test_offline_online_sync.py` (8.8 KB)
- **Scope & Purpose:** Full lifecycle offline booking and auto-recovery.
- **What it verifies:**
  - Simulates active PostgreSQL disconnection.
  - Books walk-in appointments in offline mode, verifying insertion into `database.json`.
  - Re-establishes PostgreSQL connection and verifies automatic data transfer without data loss.

### 10. `test_prescription_sync_flow.py` (6.7 KB)
- **Scope & Purpose:** Real-time two-way prescription synchronization.
- **What it verifies:**
  - Doctor completes consultation and prescribes medications.
  - Verifies newly created records appear immediately on `GET /api/prescriptions/patient/{patient_id}`.
  - Asserts meal timing fields (`Before Food`, `After Food`) are correctly formatted.

### 11. `test_push_notifications.py` (10.1 KB)
- **Scope & Purpose:** FCM device token registration and notification scheduling.
- **What it verifies:**
  - Registers Android FCM device tokens.
  - Simulates appointment cancellation and verifies notification payload dispatch.
  - Tests APScheduler 24-hour reminder job and verifies deduplication in `notification_log`.

### 12. `test_queue_ordering.py` (16.8 KB)
- **Scope & Purpose:** Scheduled-priority hybrid queue algorithm verification.
- **What it verifies:**
  - Seeds scheduled on-time arrivals, early arrivals, late arrivals, and walk-in patients.
  - Verifies priority ranking: Emergency (0) > On-Time Scheduled (1) > Walk-In (2) > Late Scheduled (3).
  - Confirms receptionist queue calling reflects exact deterministic ordering.

### 13. `test_receptionist_password.py` (2.1 KB)
- **Scope & Purpose:** Receptionist credential security.
- **What it verifies:**
  - Tests receptionist password update endpoint (`POST /api/receptionist/change-password`).
  - Verifies old password verification and bcrypt hash generation for the new password.

### 14. `test_scan_medicine.py` (14.1 KB)
- **Scope & Purpose:** Computer vision OCR, prescription fuzzy matching, and allergy alerts.
- **What it verifies:**
  - Feeds synthetic drug packaging images into Tesseract OCR.
  - Verifies fuzzy string matching against patient's active prescriptions.
  - Verifies DrugGuard allergy alert triggers when scanned medicine conflicts with patient allergy history.

### 15. `test_slots_flow.py` (5.8 KB)
- **Scope & Purpose:** Time slot seat allocation and quota enforcement.
- **What it verifies:**
  - Verifies total seat splitting: 50% online booking quota, 50% front-desk walk-in reserve.
  - Asserts that online booking is blocked when online quota is exhausted, even if offline walk-in seats remain.

### 16. `test_staff_dual_login.py` (6.5 KB)
- **Scope & Purpose:** Dual-identifier authentication gateway.
- **What it verifies:**
  - Tests staff authentication using email address (`dr.olivia@carepulse.com`).
  - Tests staff authentication using hierarchical staff code (`D001101`).
  - Asserts identical JWT token payload and role permissions regardless of login identifier used.

### 17. `test_walkin_flow.py` (2.4 KB)
- **Scope & Purpose:** Front-desk walk-in ticketing.
- **What it verifies:**
  - Tests `POST /api/receptionist/appointments` creating instant walk-in booking.
  - Verifies auto-generation of walk-in ticket and immediate queue insertion.

### 18. `verify_bit_receptionist.py` (2.5 KB)
- **Scope & Purpose:** Receptionist desk assignment and multi-desk isolation.
- **What it verifies:**
  - Verifies receptionist counter mapping (`receptionist_desks` table) and active duty verification.

---

## 9.3 Clinical AI & NLP Evaluation Suite (`backend/ai/`)

### 19. `test_ai_endpoints.py` (3.0 KB)
- **Scope & Purpose:** API integration verification for all AI routes.
- **What it verifies:**
  - Validates `POST /api/ai/triage`, `POST /api/ai/health-assistant/chat`, and `POST /api/ai/drug-guard`.
  - Asserts fast response times (< 200ms for deterministic rule engines).

### 20. `evaluate_accuracy.py` (11.8 KB)
- **Scope & Purpose:** Triage accuracy and diagnostic safety benchmark.
- **What it verifies:**
  - Evaluates clinical triage classification across 50+ standardized clinical test scenarios.
  - Measures Precision, Recall, and F1-score for red-flag emergency detection (target: 100% recall on life-threatening symptoms).

---

## 9.4 Playwright Browser Automation Suite (`tests/`)

### 21. `tests/patient/login.spec.ts` (4.0 KB)
- **Scope & Purpose:** Patient web login workflow.
- **What it verifies:**
  - Form validation on invalid email or empty password.
  - Successful authentication redirecting to `/home`.
  - Session restoration on page reload from `localStorage`.

### 22. `tests/patient/signup.spec.ts` (4.1 KB)
- **Scope & Purpose:** Patient registration workflow.
- **What it verifies:**
  - Form submission with password match validation.
  - Verifies redirection to `/complete-profile`.
  - Confirms patient display code badge displays in the header.

### 23. `tests/patient/appointments.spec.ts` (4.8 KB)
- **Scope & Purpose:** End-to-end appointment booking.
- **What it verifies:**
  - Navigates from Hospital Directory -> Doctor Profile -> Date Picker -> Time Slot Selection.
  - Confirms booking and verifies ticket card appears with ticket number and QR code.

### 24. `tests/patient/test_new_patient_isolation.py` (3.2 KB)
- **Scope & Purpose:** Patient medical data privacy.
- **What it verifies:**
  - Creates a new patient account and verifies that their prescription cabinet and visit history are completely blank and free of data leakage from other patients.

### 25. `tests/staff/admin-login.spec.ts` (2.6 KB)
- **Scope & Purpose:** Hospital administrator portal access.
- **What it verifies:**
  - Authenticates via `/staff/login` using admin credentials.
  - Verifies executive dashboard metrics, doctor roster table, and department management tabs load correctly.

### 26. `tests/staff/doctor-login.spec.ts` (2.2 KB)
- **Scope & Purpose:** Doctor clinical workstation access.
- **What it verifies:**
  - Authenticates using doctor staff code (`D001101`).
  - Verifies live queue table loads and consultation action buttons are enabled.

### 27. `tests/staff/receptionist-login.spec.ts` (2.2 KB)
- **Scope & Purpose:** Receptionist front-desk access.
- **What it verifies:**
  - Authenticates using receptionist staff code (`R001101`).
  - Verifies token queue screen, walk-in booking modal, and webcam QR check-in load.

### 28. `tests/staff/test_hospital_isolation.py` (11.9 KB)
- **Scope & Purpose:** Automated multi-tenant penetration testing.
- **What it verifies:**
  - Programmatically logs in as Hospital 1 Admin and attempts to delete a doctor belonging to Hospital 2.
  - Confirms action is rejected with `403 Forbidden` and logged in `operations_log`.
