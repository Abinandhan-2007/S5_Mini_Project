# 🔄 CarePulse — Complete Feature Workflows & Mermaid Sequence Diagrams

> **Document Version:** 1.0.0  
> **Classification:** System Process Flows & Behavioral Engineering Specification  
> **Last Updated:** 2026-09-10  
> **Scope:** Exhaustive Step-by-Step Architectural Diagrams for All 11 Major Workflows

---

## 7.1 Patient Registration & Authentication (Google OAuth + Email/Password)

```mermaid
sequenceDiagram
    autonumber
    actor Patient as 📱 Patient (Mobile App)
    participant Client as Frontend (Auth Module)
    participant Google as 🔑 Google OAuth Server
    participant Backend as ⚡ FastAPI Backend
    participant DB as 🐘 PostgreSQL Database

    alt Scenario A: Email & Password Registration
        Patient->>Client: Enters Name, Email, Password, Phone
        Client->>Backend: POST /api/auth/register
        Backend->>Backend: Hash password with bcrypt (salt rounds=12)
        Backend->>DB: INSERT INTO patients (id, full_name, email, password_hash, auth_provider)
        DB->>DB: Trigger generate_patient_code() assigns P000001
        DB-->>Backend: Return patient record + P000001
        Backend->>Backend: Generate signed Patient JWT (HS256)
        Backend-->>Client: 200 OK (JWT Token + Patient Profile)
        Client->>Client: Save session in localStorage & Zustand store
        Client-->>Patient: Redirect to /complete-profile
    else Scenario B: Google One-Tap OAuth Sign-In
        Patient->>Client: Tap "Sign In with Google"
        Client->>Google: Authenticate & request OpenID ID token
        Google-->>Client: Return Google id_token (RS256 signed)
        Client->>Backend: POST /api/auth/google { idToken, email, name }
        Backend->>Google: Verify cryptographic signature of id_token
        Google-->>Backend: Token Valid (sub, email, email_verified=true)
        Backend->>DB: SELECT * FROM patients WHERE google_id = sub OR email = email
        alt Patient Exists
            Backend->>DB: UPDATE patients SET last_login_at = NOW()
        else New Patient
            Backend->>DB: INSERT INTO patients (full_name, email, google_id, auth_provider)
            DB->>DB: Trigger generate_patient_code() assigns P000042
        end
        Backend->>Backend: Generate signed Patient JWT
        Backend-->>Client: 200 OK (JWT Token + Patient Profile)
        Client->>Client: Save session in localStorage & Zustand store
        Client-->>Patient: Redirect to /home
    end
```

---

## 7.2 Appointment Booking Flow

```mermaid
sequenceDiagram
    autonumber
    actor Patient as 📱 Patient
    participant App as Patient Mobile App
    participant API as FastAPI Backend
    participant DB as PostgreSQL DB

    Patient->>App: Opens Hospital / Doctor Profile
    App->>API: GET /api/doctors/{doctor_id}/slots?date=2026-09-15
    API->>DB: Query doctor slot capacities & existing bookings
    DB-->>API: Total max seats, booked seats, online vs offline quotas
    API-->>App: Return available slots (e.g. 10:00 AM: 3 online seats left)
    Patient->>App: Selects time slot & confirms booking
    App->>API: POST /api/appointments { patient_id, doctor_id, date, time_slot }
    API->>API: Verify online quota availability for chosen slot
    API->>API: Generate ticket number #CP-8492
    API->>DB: INSERT INTO appointments (patient_id, doctor_id, ticket_number, status='Upcoming')
    DB-->>API: Return appointment record
    API-->>App: 200 OK (AppointmentResponse + Ticket Pass)
    App->>App: Update Zustand appointments store & cache
    App-->>Patient: Display Booking Confirmation Card with QR Pass
```

---

## 7.3 Patient Arrival, Check-In & Unified Queue Ordering

CarePulse uses a **scheduled-priority hybrid queue algorithm**. Arrived scheduled patients take precedence, interleaved with walk-ins to maintain fair throughput:

```mermaid
flowchart TD
    A["Patient Arrives at Hospital"] --> B{"Arrival Mechanism"}
    
    B -->|"Mobile App Self Check-In"| C["Patient taps 'Check In' on Digital Ticket"]
    B -->|"Front-Desk QR Scan"| D["Receptionist scans Patient QR via Webcam"]
    B -->|"Front-Desk Ticket Search"| E["Receptionist enters Ticket #CP-4821"]

    C --> F["Backend POST /api/appointments/{id}/check-in"]
    D --> F
    E --> F

    F --> G["Set is_checked_in = TRUE, checked_in_at = NOW()"]
    G --> H["Compute Unified Priority Rank:
           1. Emergency Overrides (Priority 0)
           2. Scheduled Appointments Arrived on Time (Priority 1)
           3. Walk-In Consultations in Booking Order (Priority 2)
           4. Late Scheduled Arrivals (Priority 3)"]

    H --> I["Update live_queue index in PostgreSQL"]
    I --> J["Broadcast queue state update to Receptionist & Doctor Portals"]
    J --> K["Nurse Station Queue alerts patient ready for Vitals Assessment"]
```

---

## 7.4 Nurse Triage & Pre-Consultation Vitals Assessment

```mermaid
sequenceDiagram
    autonumber
    actor Nurse as 💉 Triage Nurse
    participant NPortal as Nurse Station (/nurse)
    participant Backend as FastAPI Backend
    participant DB as PostgreSQL DB
    actor Doctor as 🩺 Doctor

    Nurse->>NPortal: Views checked-in patient in triage queue
    Nurse->>NPortal: Clicks "Record Vitals" for Patient P000001
    Nurse->>NPortal: Enters Height (175cm), Weight (70kg), BP (120/80), SpO2 (99%)
    NPortal->>NPortal: Live UI preview computes BMI = 22.9
    Nurse->>NPortal: Submits Vitals Form
    NPortal->>Backend: POST /api/nurse/vitals
    Backend->>DB: INSERT INTO vitals (appointment_id, patient_id, height_cm, weight_kg, bp_systolic, bp_diastolic, ...)
    DB->>DB: PostgreSQL computes generated column: bmi = 22.9
    DB-->>Backend: Vitals record saved successfully
    Backend-->>NPortal: 200 OK
    Backend-->>Doctor: Real-time update: Vitals badge changes to "Recorded"
```

---

## 7.5 Doctor Consultation & Structured Prescription Creation

```mermaid
sequenceDiagram
    autonumber
    actor Doctor as 🩺 Doctor
    participant DPortal as Doctor Workstation (/doctor)
    participant Backend as FastAPI Backend
    participant DrugGuard as 🛡️ DrugGuard Engine
    participant DB as PostgreSQL DB

    Doctor->>DPortal: Clicks "Start Consultation" for Patient P000001
    DPortal->>Backend: GET /api/doctor/consultation-prep/{appointment_id}
    Backend->>DB: Fetch patient medical history, allergies, previous SOAP, and nurse vitals
    DB-->>Backend: Return consolidated chart
    Backend-->>DPortal: Display patient history and vitals in left sidebar
    
    Doctor->>DPortal: Fills Subjective, Objective, Assessment, Plan (SOAP)
    Doctor->>DPortal: Adds medication: Amoxicillin 500mg, Twice Daily, After Food
    DPortal->>Backend: POST /api/ai/drug-guard { drug_name, patient_allergies }
    Backend->>DrugGuard: Cross-reference Amoxicillin against patient allergy list
    alt Allergy Contraindication Detected
        DrugGuard-->>Backend: Warning: Patient allergic to Penicillin!
        Backend-->>DPortal: Red alert banner: Contradiction Warning
        Doctor->>DPortal: Modifies drug to Azithromycin 500mg
    else Drug Safe
        DrugGuard-->>Backend: Safety check passed
    end

    Doctor->>DPortal: Clicks "Complete Consultation"
    DPortal->>Backend: POST /api/doctor/consultations { appointment_id, soap_data, prescriptions }
    Backend->>DB: INSERT INTO consultations (soap_data JSONB)
    Backend->>DB: INSERT INTO prescriptions (drug_name, dosage, frequency, meal_timing)
    Backend->>DB: UPDATE appointments SET status = 'Completed'
    DB-->>Backend: Transaction Committed
    Backend-->>DPortal: 200 OK (Consultation Finalized)
```

---

## 7.6 Real-Time Prescription Sync Back to Patient Mobile App

```mermaid
sequenceDiagram
    autonumber
    participant Backend as FastAPI Backend
    participant DB as PostgreSQL DB
    participant FCM as 🔥 Firebase Cloud Messaging
    actor Patient as 📱 Patient (Mobile App)

    Backend->>DB: Commit newly created prescriptions
    Backend->>DB: SELECT fcm_token FROM device_tokens WHERE patient_id = patient_id
    DB-->>Backend: Return active device FCM token
    Backend->>FCM: Send push payload: { title: "New Prescription Added", body: "Dr. Olivia has prescribed your medications." }
    FCM-->>Patient: Dispatches native Android push notification
    
    alt App in Foreground / Opened from Push
        Patient->>Patient: Taps notification or opens app
        Patient->>Backend: GET /api/prescriptions/patient/{patient_id}
        Backend->>DB: SELECT * FROM prescriptions WHERE patient_id = patient_id AND status = 'Active'
        DB-->>Backend: Return active prescription items
        Backend-->>Patient: 200 OK
        Patient->>Patient: Update local Zustand prescriptions store
        Patient->>Patient: Auto-schedule local medication alarms (Breakfast, Lunch, Dinner)
    end
```

---

## 7.7 Push Notification Delivery Pipeline

```mermaid
sequenceDiagram
    autonumber
    participant Scheduler as ⏰ APScheduler (Backend Daemon)
    participant DB as PostgreSQL DB
    participant FCM as 🔥 Firebase Admin SDK
    participant Patient as 📱 Android Device

    loop Every 60 Seconds
        Scheduler->>DB: Query appointments scheduled in next 24 hours without 24h_reminder log
        DB-->>Scheduler: Return appointments needing reminder
        loop For Each Appointment
            Scheduler->>DB: Fetch active FCM token for patient
            DB-->>Scheduler: Return fcm_token
            Scheduler->>FCM: send_push_notification(fcm_token, "Appointment Reminder", "Your visit with Dr. Olivia is tomorrow at 10:00 AM")
            FCM-->>Patient: Delivers heads-up push alert
            Scheduler->>DB: INSERT INTO notification_log (patient_id, notification_type='24h_reminder', reference_id=app_id)
        end
    end
```

---

## 7.8 Scan Medicine Packaging Safety Verification

```mermaid
sequenceDiagram
    autonumber
    actor Patient as 📱 Patient
    participant App as Mobile App (Camera)
    participant Backend as FastAPI Backend
    participant OCR as 🔍 Tesseract OCR
    participant Matcher as Fuzzy Matcher & DrugGuard
    participant DB as PostgreSQL DB

    Patient->>App: Captures photo of medicine blister strip
    App->>Backend: POST /api/prescriptions/scan-match { patient_id, image_data }
    Backend->>OCR: extract_text_from_image(image_bytes)
    OCR-->>Backend: Extracted raw text: "PARACETAMOL TAB 650MG DOLO"
    Backend->>Matcher: extract_drug_candidate_from_ocr() -> "DOLO 650 / Paracetamol"
    Backend->>DB: SELECT * FROM prescriptions WHERE patient_id = patient_id AND status = 'Active'
    DB-->>Backend: Return patient active medications
    Backend->>Matcher: fuzzy_match_prescription("Paracetamol", active_prescriptions)
    Matcher-->>Backend: Match Found: Prescribed by Dr. Marilyn (Take after food)
    Backend->>DB: SELECT allergies FROM patients WHERE id = patient_id
    DB-->>Backend: Allergies: "None"
    Backend-->>App: 200 OK (Match confidence: 95%, Allergy Safe: TRUE, Instructions: "Take 1 tablet after food")
    App-->>Patient: Displays Green Safety Verification Card with dosage instructions
```

---

## 7.9 Medicine Information Lookup (Autocomplete + OpenFDA)

```mermaid
sequenceDiagram
    autonumber
    actor Patient as 📱 Patient
    participant App as Mobile App
    participant Backend as FastAPI Backend
    participant DB as PostgreSQL (pg_trgm)
    participant FDA as 💊 OpenFDA API

    Patient->>App: Types "amox" into Medicine Search bar
    App->>Backend: GET /api/medicines/search?q=amox
    Backend->>DB: SELECT * FROM medicines WHERE name % 'amox' ORDER BY similarity LIMIT 10
    DB-->>Backend: Returns: ["Amoxicillin 500mg", "Amoxyclav 625mg"]
    Backend-->>App: Instant autocomplete dropdown list
    
    Patient->>App: Selects "Amoxicillin 500mg"
    App->>Backend: POST /api/medicine/lookup-info { medicine_name: "Amoxicillin" }
    Backend->>FDA: Query OpenFDA /drug/label.json?search=openfda.generic_name:amoxicillin
    alt OpenFDA Returns Record
        FDA-->>Backend: Returns indications, contraindications, adverse reactions
    else Fallback to Local Catalog
        Backend->>Backend: Synthesize clinical information from local drug encyclopedia
    end
    Backend-->>App: 200 OK (Detailed clinical summary, dosage forms, side effects)
    App-->>Patient: Displays rich pharmaceutical overview
```

---

## 7.10 In-App APK Update System

```mermaid
sequenceDiagram
    autonumber
    actor Patient as 📱 Patient
    participant App as Android Mobile App
    participant Backend as FastAPI Backend
    participant Installer as 📦 Android OS Package Installer

    App->>Backend: On app resume: GET /api/app/version
    Backend-->>App: 200 OK { version: "1.3.0", apk_url: "/downloads/CarePulse_App.apk", notes: "Bug fixes & new features" }
    App->>App: Compares active version (e.g. 1.2.0) with server version (1.3.0)
    alt Update Available
        App-->>Patient: Displays non-dismissible UpdateAvailableModal
        Patient->>App: Clicks "Download & Install Update"
        App->>Backend: GET /downloads/CarePulse_App.apk
        Backend-->>App: Stream fresh APK file to local Android download storage
        App->>Installer: Invoke @capacitor-community/file-opener with APK URI
        Installer-->>Patient: Displays standard Android native "Update Application" prompt
        Patient->>Installer: Confirms install; app reloads with new version
    end
```

---

## 7.11 Offline / Online Dual-Store Sync & Conflict Resolution

```mermaid
sequenceDiagram
    autonumber
    participant App as 📱 Client / Receptionist
    participant Backend as FastAPI Backend
    participant JSON as 📁 database.json (Offline Buffer)
    participant PG as 🐘 PostgreSQL (Primary Database)

    Note over PG: PostgreSQL service goes OFFLINE
    App->>Backend: POST /api/appointments (Patient booking during DB outage)
    Backend->>Backend: Detects PostgreSQL connection lost
    Backend->>JSON: Append appointment to database.json buffer
    Backend-->>App: 200 OK (Booked successfully in resilient offline mode)

    Note over PG: PostgreSQL service comes back ONLINE
    loop Background Probe every 3 seconds
        Backend->>PG: check_pg_health_and_sync() -> SELECT 1
        PG-->>Backend: Connection Successful!
    end

    Backend->>Backend: Trigger sync_offline_json_to_pg()
    Backend->>JSON: Read buffered offline appointments
    Backend->>PG: BEGIN TRANSACTION
    loop For Each Offline Appointment
        Backend->>PG: INSERT INTO appointments ... ON CONFLICT (id) DO UPDATE SET status = CASE ...
        Note over PG: TERMINAL STATE PROTECTION: If status in PostgreSQL is 'Completed' or 'Cancelled', stale offline JSON status is NEVER permitted to overwrite it!
    end
    Backend->>PG: COMMIT TRANSACTION
    Backend->>PG: Resynchronize patient_code_seq with GREATEST(MAX(code), 1)
    Backend->>Backend: Auto-Sync Complete (Logged in system journal)
```

---

## 7.12 SuperAdmin -> Admin -> Receptionist -> Doctor/Nurse Account Creation Hierarchy

```mermaid
flowchart TD
    SA["Platform SuperAdmin (Role: superadmin, Code: SA101)"]
    
    H["Create Hospital Organization (POST /api/superadmin/hospitals)
       Assigns hospital_code: H001"]
    
    A["Provision Hospital Admin (POST /api/superadmin/admins)
       Assigns staff_code: A001101
       Rule: Strictly ONE active admin per hospital"]

    D["Admin creates Doctor Account
       (POST /api/admin/doctors)
       Assigns staff_code: D001101"]

    N["Admin creates Nurse Account
       (POST /api/admin/nurses)
       Assigns staff_code: N001101"]

    R["Admin creates Receptionist Account
       (POST /api/admin/receptionists)
       Assigns staff_code: R001101
       Binds to Desk A-1"]

    SA --> H
    H --> A
    A --> D
    A --> N
    A --> R
```
