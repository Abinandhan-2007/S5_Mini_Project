# 🔌 CarePulse — Complete Backend API Reference: Every Endpoint Specification

> **Document Version:** 1.0.0  
> **Classification:** Comprehensive API Reference Specification  
> **Last Updated:** 2026-09-10  
> **Scope:** Full RESTful API Catalogue across all 9 Router Modules (113 Total Endpoints)

---

## 5.1 Authentication & Security Conventions

All CarePulse API endpoints enforce standard HTTP status codes and structured JSON response envelopes:
- **Patient Authentication:** Handled via HTTP Bearer token in the `Authorization` header (`Authorization: Bearer <patient_jwt>`) or verified Google ID tokens.
- **Staff Authentication:** Handled via HTTP Bearer token (`Authorization: Bearer <staff_jwt>`) containing claims: `{"sub": staff_id, "role": role, "hospital_id": hospital_id}`.
- **Fail-Fast Error Format:** All validation failures and exceptions return:
  ```json
  {
    "detail": "Descriptive human-readable error explanation or validation message"
  }
  ```

---

## 5.2 Patient Core & Identity Endpoints (`main.py`)

### 1. Register New Patient
- **Method / Path:** `POST /api/auth/register`
- **Purpose:** Registers a new patient account with email, password, and personal details.
- **Auth Required:** Public
- **Request Body:**
  ```json
  {
    "email": "sarah.j@example.com",
    "password": "SecurePassword123!",
    "full_name": "Sarah Jenkins",
    "phone": "+91 98765 43210",
    "gender": "Female",
    "dob": "1995-07-24",
    "blood_group": "O+"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "token": "eyJhbGciOiJIUzI1Ni...",
    "user": {
      "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "patient_code": "P000001",
      "full_name": "Sarah Jenkins",
      "email": "sarah.j@example.com",
      "phone": "+91 98765 43210",
      "blood_group": "O+"
    }
  }
  ```

### 2. Standard Email/Password Login
- **Method / Path:** `POST /api/auth/login`
- **Purpose:** Authenticates registered patient via email and bcrypt password check.
- **Auth Required:** Public
- **Request Body:**
  ```json
  {
    "email": "sarah.j@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response:** `200 OK` (AuthResponse containing JWT token and complete user profile)

### 3. Google OAuth One-Tap Sign-In
- **Method / Path:** `POST /api/auth/google`
- **Purpose:** Verifies Google ID token from web or native Android and creates or logs in patient.
- **Auth Required:** Public
- **Request Body:**
  ```json
  {
    "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
    "email": "sarah.j@gmail.com",
    "name": "Sarah Jenkins",
    "photoUrl": "https://lh3.googleusercontent.com/..."
  }
  ```
- **Response:** `200 OK` (AuthResponse containing CarePulse JWT token and patient data)

### 4. Fetch Current Authenticated Patient
- **Method / Path:** `GET /api/auth/me`
- **Purpose:** Restores active session and returns fresh patient profile from database.
- **Auth Required:** Patient JWT Bearer Token
- **Request Body:** None
- **Response:** `200 OK` (PatientResponse)

### 5. Forgot Password — Request OTP
- **Method / Path:** `POST /api/auth/forgot-password/request-otp`
- **Purpose:** Generates a secure 6-digit OTP code and dispatches it to patient’s registered email.
- **Auth Required:** Public
- **Request Body:** `{"email": "patient@example.com"}`
- **Response:** `200 OK`
  ```json
  {
    "success": true,
    "message": "OTP verification code sent to patient@example.com"
  }
  ```

### 6. Forgot Password — Verify OTP
- **Method / Path:** `POST /api/auth/forgot-password/verify-otp`
- **Purpose:** Validates 6-digit OTP against expiration and attempt rate limits.
- **Auth Required:** Public
- **Request Body:** `{"email": "patient@example.com", "otp": "481920"}`
- **Response:** `200 OK` `{"success": true, "message": "OTP verified successfully"}`

### 7. Forgot Password — Reset Password
- **Method / Path:** `POST /api/auth/forgot-password/reset`
- **Purpose:** Updates patient password with newly salted bcrypt hash after OTP verification.
- **Auth Required:** Public
- **Request Body:** `{"email": "patient@example.com", "otp": "481920", "newPassword": "NewStrongPassword123!"}`
- **Response:** `200 OK` `{"success": true, "message": "Password reset successful"}`

### 8. Update Patient Profile
- **Method / Path:** `PUT /api/patients/{patient_id}` (also `POST /api/patients/{patient_id}/update`)
- **Purpose:** Modifies patient personal info, blood group, allergies, and emergency contact.
- **Auth Required:** Patient JWT Bearer Token (matching patient ID)
- **Request Body:**
  ```json
  {
    "full_name": "Sarah Jenkins",
    "phone": "+91 98765 43210",
    "dob": "1995-07-24",
    "gender": "Female",
    "blood_group": "O+",
    "allergies": "Penicillin, Sulfa",
    "pre_existing_conditions": "Asthma",
    "emergency_contact": {
      "name": "Mark Jenkins",
      "phone": "+91 98765 99999",
      "relationship": "Brother"
    }
  }
  ```
- **Response:** `200 OK` (Updated PatientResponse)

---

## 5.3 Appointments & Consultations Endpoints (`main.py`)

### 9. Book New Appointment
- **Method / Path:** `POST /api/appointments`
- **Purpose:** Reserves an outpatient consultation slot for a patient with a selected doctor.
- **Auth Required:** Patient JWT Bearer Token
- **Request Body:**
  ```json
  {
    "patient_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "doctor_id": "doc-1",
    "doctor_name": "Dr. Olivia Wilson",
    "doctor_specialty": "Cardiology",
    "doctor_photo": "/doctor_default.jpg",
    "hospital_id": "hosp-1",
    "hospital_name": "St. Jude Heart & Medical Center",
    "date": "2026-09-15",
    "time_slot": "10:00 AM - 11:00 AM",
    "type": "In-Person"
  }
  ```
- **Response:** `200 OK` (AppointmentResponse with auto-generated `ticket_number`: `"#CP-8492"`)

### 10. Fetch Patient Appointments
- **Method / Path:** `GET /api/appointments/patient/{patient_id}`
- **Purpose:** Retrieves all upcoming, active, and past appointments booked by a patient.
- **Auth Required:** Patient JWT Bearer Token
- **Request Body:** None
- **Response:** `200 OK` (Array of AppointmentResponse objects)

### 11. Cancel Appointment
- **Method / Path:** `POST /api/appointments/{appointment_id}/cancel` (also `PUT`)
- **Purpose:** Cancels an upcoming appointment and triggers cancellation notification.
- **Auth Required:** Patient or Staff JWT Bearer Token
- **Request Body:** `{"reason": "Scheduling conflict"}`
- **Response:** `200 OK` `{"success": true, "message": "Appointment cancelled successfully"}`

### 12. Direct Patient Self Check-In
- **Method / Path:** `POST /api/appointments/{appointment_id}/check-in`
- **Purpose:** Marks patient as arrived and queues ticket for front-desk and nurse triage.
- **Auth Required:** Patient JWT Bearer Token
- **Request Body:** None
- **Response:** `200 OK` (Updated AppointmentResponse with `is_checked_in: true`)

### 13. Fetch Patient Consultations (Medical History)
- **Method / Path:** `GET /api/consultations/patient/{patient_id}`
- **Purpose:** Retrieves full chronological consultation timeline with SOAP notes and doctor details.
- **Auth Required:** Patient JWT Bearer Token or Doctor Staff Token
- **Request Body:** None
- **Response:** `200 OK` (Array of ConsultationResponse objects containing `soap_data`)

### 14. Semantic Search Consultations
- **Method / Path:** `POST /api/consultations/search`
- **Purpose:** Searches past consultation SOAP notes using semantic vector similarity or keyword queries.
- **Auth Required:** Patient or Doctor JWT Bearer Token
- **Request Body:** `{"query": "allergic rhinitis sneezing", "patient_id": "uuid"}`
- **Response:** `200 OK` (Array of SearchResultItem objects)

---

## 5.4 Prescriptions, Medicines & OCR Scanner Endpoints (`main.py`)

### 15. Fetch Patient Prescriptions
- **Method / Path:** `GET /api/prescriptions/patient/{patient_id}`
- **Purpose:** Retrieves all active and historical medication prescriptions issued to the patient.
- **Auth Required:** Patient JWT Bearer Token
- **Request Body:** None
- **Response:** `200 OK` (Array of prescription objects with `drug_name`, `dosage`, `frequency`, `meal_timing`, and `status`)

### 16. Scan & Match Medicine Packaging
- **Method / Path:** `POST /api/prescriptions/scan-match`
- **Purpose:** Processes camera-captured drug blister strip image, runs OCR, fuzzy matches against active prescriptions, and checks for allergy contraindications.
- **Auth Required:** Patient JWT Bearer Token
- **Request Body:**
  ```json
  {
    "patient_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "image_data": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
  }
  ```
- **Response:** `200 OK` (ScanMatchResponse with `matched_drug`, `match_confidence`, `allergy_warning`, and `dosage_instructions`)

### 17. Search Medicine Catalog (Autocomplete)
- **Method / Path:** `GET /api/medicines/search`
- **Purpose:** High-speed autocomplete across 500+ Indian brand and generic medicines using PostgreSQL trigram indexing (`pg_trgm`).
- **Auth Required:** Public
- **Query Parameters:** `q` (string, search query), `category` (optional filter), `limit` (default: 20)
- **Response:** `200 OK` (MedicineSearchResponse with matching drug items)

### 18. OpenFDA & Clinical Medicine Info Lookup
- **Method / Path:** `POST /api/medicine/lookup-info`
- **Purpose:** Fetches comprehensive clinical data for a medicine from OpenFDA and local clinical cache.
- **Auth Required:** Public
- **Request Body:** `{"medicine_name": "Amoxicillin", "patient_context": {}}`
- **Response:** `200 OK` (MedicineInfoLookupResponse with indications, warnings, side effects, and synthesized clinical AI summary)

### 19. Text-to-Speech (TTS) Proxy
- **Method / Path:** `GET /api/tts`
- **Purpose:** Generates natural audio pronunciation for symptom triage responses in English, Tamil, Malayalam, or Hindi with persistent disk caching.
- **Auth Required:** Public
- **Query Parameters:** `text` (max 500 chars), `lang` (en, ta, ml, hi), `format` (audio or base64)
- **Response:** `200 OK` (`audio/mpeg` stream or JSON base64 payload)

---

## 5.5 Hospital & Doctor Directory Endpoints (`main.py`)

### 20. List All Hospitals
- **Method / Path:** `GET /api/hospitals`
- **Purpose:** Retrieves all active hospitals with specialties, emergency status, and ratings.
- **Auth Required:** Public
- **Response:** `200 OK` (Array of HospitalResponse objects)

### 21. Get Hospital by ID
- **Method / Path:** `GET /api/hospitals/{hospital_id}`
- **Purpose:** Returns detailed profile, address, phone, and specialties for a specific hospital.
- **Auth Required:** Public
- **Response:** `200 OK` (HospitalResponse)

### 22. List All Doctors
- **Method / Path:** `GET /api/doctors`
- **Purpose:** Retrieves all doctors with specialty, hospital affiliation, and consultation fee.
- **Auth Required:** Public
- **Query Parameters:** `hospital_id` (optional filter), `specialty` (optional filter)
- **Response:** `200 OK` (Array of DoctorResponse objects)

### 23. Get Doctor Time Slots by Date
- **Method / Path:** `GET /api/doctors/{doctor_id}/slots`
- **Purpose:** Calculates real-time remaining seat capacity for a doctor on a specific date (splitting online vs walk-in quota).
- **Auth Required:** Public
- **Query Parameters:** `date` (YYYY-MM-DD)
- **Response:** `200 OK` (Array of time slots with `availableSeats`, `onlineAvailableSeats`, `isAvailable`)

---

## 5.6 Receptionist Portal Endpoints (`routes/receptionist_routes.py`)

Prefix: `/api/receptionist`

### 24. Fetch Live Token Queue
- **Method / Path:** `GET /api/receptionist/tokens`
- **Purpose:** Returns live desk queue containing checked-in, waiting, and in-consultation patients ordered by unified priority.
- **Auth Required:** Staff JWT (Receptionist or Admin role)
- **Response:** `200 OK` (Array of token items with queue sequence and patient details)

### 25. Call Next Token
- **Method / Path:** `POST /api/receptionist/tokens/call-next`
- **Purpose:** Advances the queue, calling the next patient to the desk and updating token status.
- **Auth Required:** Staff JWT (Receptionist)
- **Request Body:** None
- **Response:** `200 OK` `{"token": {"id": "uuid", "ticketNumber": "#CP-4821", "status": "Calling"}}`

### 26. Update Token Status
- **Method / Path:** `PATCH /api/receptionist/tokens/{token_id}/status`
- **Purpose:** Updates patient token state (`Waiting`, `Calling`, `With Doctor`, `Skipped`, `Completed`).
- **Auth Required:** Staff JWT (Receptionist)
- **Request Body:** `{"status": "With Doctor"}`
- **Response:** `200 OK` `{"success": true}`

### 27. Create Walk-In Appointment
- **Method / Path:** `POST /api/receptionist/appointments`
- **Purpose:** Instantly registers a walk-in patient, reserves an offline slot, generates a token, and marks them checked-in.
- **Auth Required:** Staff JWT (Receptionist)
- **Request Body:**
  ```json
  {
    "patient_name": "Ramesh Kumar",
    "patient_phone": "+91 98765 12345",
    "doctor_id": "doc-1",
    "time_slot": "10:30 AM",
    "date": "2026-09-10",
    "type": "Walk-In"
  }
  ```
- **Response:** `200 OK` (Created walk-in appointment and assigned token)

### 28. Desk Patient Check-In
- **Method / Path:** `POST /api/receptionist/appointments/{appointment_id}/check-in`
- **Purpose:** Front-desk check-in for pre-booked online patients arriving at the hospital.
- **Auth Required:** Staff JWT (Receptionist)
- **Response:** `200 OK` (Appointment marked checked-in and assigned live queue sequence)

### 29. Manage Doctor Time Slot Capacities
- **Method / Path:** `PUT /api/receptionist/doctors/{doctor_id}/slots`
- **Purpose:** Customizes maximum online vs offline seats for a doctor's consultation slot.
- **Auth Required:** Staff JWT (Receptionist or Admin)
- **Request Body:**
  ```json
  {
    "slot_id": "slot-10am",
    "max_seats": 10,
    "online_max_seats": 5,
    "offline_max_seats": 5
  }
  ```
- **Response:** `200 OK`

### 30. Toggle Doctor Clinic Availability
- **Method / Path:** `PATCH /api/receptionist/doctors/{doctor_id}/availability`
- **Purpose:** Toggles whether a doctor is actively seeing patients or temporarily unavailable.
- **Auth Required:** Staff JWT (Receptionist or Admin)
- **Request Body:** `{"is_available": false, "reason": "In Emergency Surgery"}`
- **Response:** `200 OK`

---

## 5.7 Doctor Portal Endpoints (`routes/doctor_routes.py`)

Prefix: `/api/doctor`

### 31. Fetch Doctor Live Queue
- **Method / Path:** `GET /api/doctor/queue`
- **Purpose:** Returns the active patient queue for the logged-in doctor, filtered by checked-in status and ordered by priority.
- **Auth Required:** Staff JWT (Doctor role)
- **Response:** `200 OK` (List of queue items with patient codes, vitals status, and wait times)

### 32. Consultation Preparation Data
- **Method / Path:** `GET /api/doctor/consultation-prep/{appointment_id}`
- **Purpose:** Bundles patient historical medical records, nurse-recorded vitals, and lab test results for immediate display in the consultation workstation.
- **Auth Required:** Staff JWT (Doctor role)
- **Response:** `200 OK` (Patient profile, previous SOAP consultations, active prescriptions, latest vitals, and lab tests)

### 33. Create Consultation & Prescribe Medications
- **Method / Path:** `POST /api/doctor/consultations`
- **Purpose:** Finalizes patient encounter; commits structured SOAP note, logs individual drug prescriptions, updates appointment to `'Completed'`, and triggers patient sync.
- **Auth Required:** Staff JWT (Doctor role)
- **Request Body:**
  ```json
  {
    "appointment_id": "uuid",
    "patient_id": "uuid",
    "soap_data": {
      "subjective": "Patient reports severe migraine with photophobia for 2 days.",
      "objective": "BP 130/85, neurological exam intact, normal pupillary light reflex.",
      "assessment": "Acute Migraine without aura.",
      "plan": "Prescribed Sumatriptan 50mg PRN. Advised dark room rest and adequate hydration.",
      "vitals": { "bp": "130/85", "heart_rate": 78 }
    },
    "prescriptions": [
      {
        "drug_name": "Sumatriptan",
        "dosage": "50mg",
        "frequency": "As needed for acute attack",
        "meal_timing": "With Food",
        "icon_type": "pill"
      }
    ]
  }
  ```
- **Response:** `200 OK` `{"success": true, "consultation_id": "uuid"}`

### 34. Toggle Self Availability
- **Method / Path:** `PATCH /api/doctor/availability`
- **Purpose:** Allows the logged-in doctor to toggle their own presence status directly from the workstation.
- **Auth Required:** Staff JWT (Doctor role)
- **Request Body:** `{"is_available": true, "reason": "Consultations Active"}`
- **Response:** `200 OK`

---

## 5.8 Nurse Triage Endpoints (`routes/nurse_routes.py`)

Prefix: `/api/nurse`

### 35. Fetch Nurse Triage Queue
- **Method / Path:** `GET /api/nurse/queue`
- **Purpose:** Retrieves all checked-in patients awaiting pre-consultation vitals assessment and diagnostic testing.
- **Auth Required:** Staff JWT (Nurse or Admin role)
- **Response:** `200 OK` (List of patients with check-in timestamps and triage status)

### 36. Record Patient Vitals
- **Method / Path:** `POST /api/nurse/vitals`
- **Purpose:** Commits physical and physiological measurements (BP, Pulse, SpO2, Temperature, Blood Glucose) with automated BMI computation.
- **Auth Required:** Staff JWT (Nurse role)
- **Request Body:**
  ```json
  {
    "appointment_id": "uuid",
    "patient_id": "uuid",
    "height_cm": 175.0,
    "weight_kg": 70.0,
    "bp_systolic": 120,
    "bp_diastolic": 80,
    "heart_rate": 72,
    "temperature": 98.6,
    "temperature_unit": "F",
    "respiratory_rate": 16,
    "spo2": 99,
    "blood_glucose": 95.0,
    "glucose_context": "fasting",
    "notes": "Patient calm, no acute distress."
  }
  ```
- **Response:** `200 OK` (Recorded vitals record with computed `bmi: 22.9`)

### 37. Record Diagnostic Lab Test
- **Method / Path:** `POST /api/nurse/tests`
- **Purpose:** Records executed diagnostic lab tests and structured findings.
- **Auth Required:** Staff JWT (Nurse role)
- **Request Body:**
  ```json
  {
    "appointment_id": "uuid",
    "patient_id": "uuid",
    "test_type": "Complete Blood Count (CBC)",
    "structured_results": { "WBC": "7,500", "Hemoglobin": "14.2 g/dL" },
    "free_text_result": "Within normal clinical limits.",
    "status": "completed"
  }
  ```
- **Response:** `200 OK`

### 38. Upload Lab Report PDF
- **Method / Path:** `POST /api/nurse/upload-report`
- **Purpose:** Accepts diagnostic report PDF files and stores them in static downloads for doctor inspection.
- **Auth Required:** Staff JWT (Nurse role)
- **Request Body:** Multipart form data (`file: UploadFile`)
- **Response:** `200 OK` `{"file_url": "/downloads/cbc_report_pat123.pdf"}`

---

## 5.9 Hospital Admin Endpoints (`routes/admin_routes.py`)

Prefix: `/api/admin`

### 39. Executive Hospital Overview & KPIs
- **Method / Path:** `GET /api/admin/overview`
- **Purpose:** Returns high-level executive metrics: patient admissions, occupancy, active doctors, and waiting times.
- **Auth Required:** Staff JWT (Admin or SuperAdmin role)
- **Response:** `200 OK` (Aggregated hospital KPIs)

### 40. Staff Management — Create Doctor
- **Method / Path:** `POST /api/admin/doctors`
- **Purpose:** Onboards a new doctor, provisions their staff credentials, and auto-generates hierarchical staff code (`D001101`).
- **Auth Required:** Staff JWT (Admin role)
- **Request Body:**
  ```json
  {
    "name": "Dr. Sarah Paul",
    "email": "sarah.p@carepulse.com",
    "specialty": "Neurology",
    "department": "Neurosciences",
    "room_number": "Cabin 304",
    "consultation_fee": 900.0,
    "experience_years": 8,
    "phone": "+91 98765 44332",
    "password": "TemporaryPassword123!"
  }
  ```
- **Response:** `200 OK` (Created Doctor record with linked staff account)

### 41. Staff Management — Create Nurse
- **Method / Path:** `POST /api/admin/nurses`
- **Purpose:** Creates nurse account with staff code (`N001101`) and triage station access.
- **Auth Required:** Staff JWT (Admin role)
- **Request Body:** `{"name": "Sister Mary", "email": "mary@carepulse.com", "department": "Triage & Vitals"}`
- **Response:** `200 OK`

### 42. Staff Management — Create Receptionist
- **Method / Path:** `POST /api/admin/receptionists`
- **Purpose:** Provisions front-desk receptionist account with desk assignment and staff code (`R001101`).
- **Auth Required:** Staff JWT (Admin role)
- **Request Body:** `{"name": "Alex Desk", "email": "alex.d@carepulse.com", "deskNumber": "Desk A-1"}`
- **Response:** `200 OK`

### 43. Hospital Settings Configuration
- **Method / Path:** `PUT /api/admin/settings`
- **Purpose:** Updates hospital operational rules (slot durations, online vs walk-in quota ratios, auto-cancellation flags).
- **Auth Required:** Staff JWT (Admin role)
- **Request Body:** HospitalSettingsUpdate schema
- **Response:** `200 OK`

---

## 5.10 SuperAdmin Governance Endpoints (`routes/superadmin_routes.py`)

Prefix: `/api/superadmin`

### 44. Global Platform Statistics
- **Method / Path:** `GET /api/superadmin/stats`
- **Purpose:** Platform-wide metrics: total affiliated hospitals, aggregate patient count, active physicians, and system load.
- **Auth Required:** Staff JWT (SuperAdmin role)
- **Response:** `200 OK`

### 45. Hospital Tenant Management — Create Hospital
- **Method / Path:** `POST /api/superadmin/hospitals`
- **Purpose:** Provisions a new hospital organization on the CarePulse platform with auto-generated code (`H001`).
- **Auth Required:** Staff JWT (SuperAdmin role)
- **Request Body:**
  ```json
  {
    "id": "hosp-5",
    "name": "Apex Specialty Hospital",
    "address": "100 Outer Ring Road, Bangalore",
    "phone": "+91 80 4433 2211",
    "specialties": ["Cardiology", "Neurology", "Trauma"]
  }
  ```
- **Response:** `200 OK`

### 46. Admin Provisioning (One-Admin-Per-Hospital Rule)
- **Method / Path:** `POST /api/superadmin/admins`
- **Purpose:** Creates executive hospital administrator account; strictly enforces the single-active-admin-per-hospital constraint.
- **Auth Required:** Staff JWT (SuperAdmin role)
- **Request Body:** `{"full_name": "Admin John", "email": "admin.apex@carepulse.com", "hospital_id": "hosp-5"}`
- **Response:** `200 OK` (Admin record with staff code `A005101`)

### 47. Hospital Lifecycle Toggle
- **Method / Path:** `POST /api/superadmin/hospitals/{hospital_id}/lifecycle`
- **Purpose:** Activates, suspends, or archives a hospital tenant, immediately revoking staff access if deactivated.
- **Auth Required:** Staff JWT (SuperAdmin role)
- **Request Body:** `{"is_active": false, "reason": "Annual compliance audit pending"}`
- **Response:** `200 OK`

### 48. Immutable Platform Audit Logs
- **Method / Path:** `GET /api/superadmin/audit-logs`
- **Purpose:** Retrieves chronologically ordered operations log records across all hospitals.
- **Auth Required:** Staff JWT (SuperAdmin role)
- **Response:** `200 OK` (Array of operations_log records with staff attribution)

---

## 5.11 Unified Staff Auth & QR Lookup Endpoints (`routes/staff_auth.py`, `routes/patient_qr_routes.py`)

### 49. Unified Staff Login Gateway
- **Method / Path:** `POST /api/staff/login`
- **Purpose:** Single login gateway for all five staff roles; supports authentication via email OR hierarchical staff code (`D001101`, `R001101`).
- **Auth Required:** Public
- **Request Body:**
  ```json
  {
    "identifier": "D001101",
    "password": "DoctorSecurePassword123!"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "token": "eyJhbGciOiJIUzI1Ni...",
    "role": "doctor",
    "staff_id": "uuid",
    "staff_code": "D001101",
    "hospital_id": "hosp-1",
    "full_name": "Dr. Olivia Wilson"
  }
  ```

### 50. Staff Patient QR Pass Lookup
- **Method / Path:** `GET /api/staff/patient-qr-lookup`
- **Purpose:** Allows front-desk and triage nurses to look up complete patient profiles and today’s appointment by scanning the patient’s mobile QR pass.
- **Auth Required:** Staff JWT (Any hospital staff role)
- **Query Parameters:** `patient_code` or `patient_id`
- **Response:** `200 OK` (Patient identity, emergency contacts, active prescriptions, and today's appointments)

---

## 5.12 Clinical AI Suite Endpoints (`routes/ai_routes.py`)

Prefix: `/api/ai`

### 51. Conversational Health Assistant Chat
- **Method / Path:** `POST /api/ai/health-assistant/chat` (also `/api/health-assistant/chat`)
- **Purpose:** Multi-turn conversational symptom assessment; executes triage guard, intent detection, RAG retrieval, and clinical answer generation.
- **Auth Required:** Public
- **Request Body:**
  ```json
  {
    "message": "I have had a high fever and productive cough for three days.",
    "patient_context": { "age": 28, "gender": "Female", "allergies": "None" },
    "conversation_history": []
  }
  ```
- **Response:** `200 OK` (AIChatResponse with answer, red_flag warning, confidence score, and suggested actions)

### 52. 4-Step Clinical Triage Check
- **Method / Path:** `POST /api/ai/triage`
- **Purpose:** Deterministic clinical red-flag evaluator assessing whether symptoms require immediate emergency department escalation.
- **Auth Required:** Public
- **Request Body:** `{"symptoms": ["crushing chest pain", "shortness of breath"]}`
- **Response:** `200 OK` `{"is_emergency": true, "triage_level": "RED", "recommendation": "Call emergency services immediately"}`

### 53. DrugGuard Contraindication & Allergy Check
- **Method / Path:** `POST /api/ai/drug-guard`
- **Purpose:** Cross-checks candidate medications against patient active allergies and concurrent medications to prevent adverse drug events.
- **Auth Required:** Public
- **Request Body:**
  ```json
  {
    "drug_name": "Amoxicillin",
    "patient_allergies": ["Penicillin"],
    "current_medications": []
  }
  ```
- **Response:** `200 OK` `{"safe": false, "severity": "HIGH", "warning": "Patient has documented Penicillin allergy; Amoxicillin is contraindicated."}`

### 54. Clinical SOAP Summary Generator
- **Method / Path:** `POST /api/ai/soap-summary`
- **Purpose:** Automatically structures informal patient complaints and doctor notes into standard SOAP format.
- **Auth Required:** Staff JWT (Doctor role)
- **Request Body:** `{"notes": "Patient came with knee pain after running. Tenderness on lateral meniscus. Prescribed Ibuprofen."}`
- **Response:** `200 OK` (Structured SOAP object with subjective, objective, assessment, and plan fields)
