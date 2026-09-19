# 🖥️ CarePulse — Role-Based Portal Architecture & Screen-by-Screen Reference

> **Document Version:** 1.0.0  
> **Classification:** Frontend UX & Portal Functional Specification  
> **Last Updated:** 2026-09-10  
> **Scope:** Detailed Screen Breakdown across All 6 Stakeholder Portals (Patient App, Doctor, Receptionist, Nurse, Admin, SuperAdmin)

---

## 6.1 Portal Navigation & Subdomain Routing Overview

CarePulse utilizes dynamic environment and viewport detection in `frontend/src/app/routes.tsx` to automatically direct users to the appropriate interface:
- **Native Android / Mobile Web:** Always defaults to the **Patient App** (`/login` or `/home`).
- **Desktop Web:** If no active patient session exists, automatically diverts to the **Staff Unified Login Gateway** (`/staff/login`).
- **Subdomain Routing:** Dedicated subdomains (`admin.carepulse.com`, `doctor.carepulse.com`, `staff.carepulse.com`) automatically scope users to their respective staff workspaces.

---

## 6.2 Patient Mobile Application (`frontend/src/features/`)

Designed specifically for smartphones and tablets with touch gestures, pull-to-refresh, hardware back button navigation, and biometrics.

### Screen 1: Login Screen (`/login`)
- **What it does:** Central authentication gateway for registered patients.
- **Data Displayed:** CarePulse branding, email and password input fields, password visibility toggle, "Forgot Password?" link, Google One-Tap Sign-In button, and "Create New Account" link.
- **User Actions:** Enter credentials to log in, trigger Google OAuth one-tap authentication, navigate to registration, or initiate password reset.

### Screen 2: Registration Screen (`/register`)
- **What it does:** New patient account creation.
- **Data Displayed:** Full Name, Email, Password, and Confirm Password fields with real-time password strength indicators.
- **User Actions:** Submit registration; automatically receives a unique patient code (`P000001`) and redirects to Profile Completion.

### Screen 3: Complete Profile Screen (`/complete-profile`)
- **What it does:** Post-registration medical onboarding wizard.
- **Data Displayed:** Date of birth, gender selection pills, blood group picker (A+, A-, B+, B-, O+, O-, AB+, AB-), allergies text input, pre-existing conditions, and emergency contact details.
- **User Actions:** Enter baseline medical parameters to personalize clinical triage and enable DrugGuard allergy cross-checking.

### Screen 4: Home Dashboard (`/home`)
- **What it does:** Main command center for the patient.
- **Data Displayed:**
  - Patient greeting with digital patient code badge (`P000001`).
  - Active/Upcoming appointment card (Ticket `#CP-4821`, doctor name, time, cabin location, and live queue status).
  - Quick-action shortcuts: "AI Symptom Checker", "Find Hospital", "Scan Medicine", "My Prescriptions".
  - Daily medication schedule cards with dosage, food timing pills, and check-off boxes.
- **User Actions:** View appointment details, start AI triage chat, access digital prescriptions, or mark medication doses as taken.

### Screen 5: Health AI Chat Screen (`/health-ai`)
- **What it does:** Conversational medical triage assistant.
- **Data Displayed:** Chat bubble dialogue history, quick-reply suggestion chips, triage risk badge (`GREEN`, `YELLOW`, `RED`), and voice playback controls.
- **User Actions:** Describe symptoms in plain language, receive instant triage assessments, trigger audio voice narration, and review recommended doctor specialties.

### Screen 6: Escalation Notice Screen (`/escalation`)
- **What it does:** High-priority safety warning triggered when the triage engine detects red-flag clinical conditions.
- **Data Displayed:** Prominent red emergency banner, list of critical symptoms detected (e.g. chest pain, severe dyspnea), and direct emergency hotline buttons.
- **User Actions:** Tap "Call Emergency Services (108/112)", locate nearest 24/7 trauma centers, or dismiss warning to continue at own risk.

### Screen 7: Find Hospitals Screen (`/hospitals`)
- **What it does:** Outpatient facility discovery and filtering.
- **Data Displayed:** Search bar, specialty filter chips (Cardiology, Pediatrics, General, Orthopedics), hospital cards with distance in miles, star rating, review counts, and 24/7 emergency availability badges.
- **User Actions:** Filter hospitals by specialty, search by facility name, and select a hospital to view its complete profile.

### Screen 8: Hospital Detail Screen (`/hospitals/:id`)
- **What it does:** Comprehensive hospital profile and doctor directory.
- **Data Displayed:** Hospital exterior photo, full address, phone number, list of available clinical departments, and roster of affiliated doctors.
- **User Actions:** Select a physician to view their schedule and proceed directly into appointment booking.

### Screen 9: Book Appointment Screen (`/appointments/book/:doctorId`)
- **What it does:** Slot reservation and appointment scheduling.
- **Data Displayed:** Doctor profile, consultation fee, weekly working days, interactive calendar date selector, and time slot buttons displaying remaining online seats.
- **User Actions:** Select consultation date, choose available time slot, select visit type (In-Person/Follow-Up), and confirm booking to generate digital ticket.

### Screen 10: Appointment Detail Screen (`/appointment-detail/:id`)
- **What it does:** Digital ticket pass and live arrival tracker.
- **Data Displayed:** Ticket number (`#CP-4821`), QR pass code, assigned doctor cabin location, date/time, and live queue status (`Upcoming`, `Checked In`, `In Consultation`, `Completed`).
- **User Actions:** Check-in upon arrival at hospital, cancel appointment, or present QR code at front desk.

### Screen 11: Prescriptions Cabinet (`/prescriptions`)
- **What it does:** Digital pharmacy and active medicine cabinet.
- **Data Displayed:** List of all prescribed medications grouped by Active and Past, dosage strength, intake frequency, food timing (`Before Food`, `After Food`), prescriber name, and pill icon.
- **User Actions:** View drug details, lookup clinical information, or launch the medicine packaging scanner.

### Screen 12: Scan Medicine Packaging Screen (`/prescriptions/scan`)
- **What it does:** Hardware camera scanner for pharmaceutical blister strips.
- **Data Displayed:** Live camera viewfinder overlay, capture button, image upload fallback, and scan result card showing extracted text, matched prescription, and allergy warnings.
- **User Actions:** Snap a photo of a medicine strip, view instant OCR matching against active prescriptions, and verify whether the drug is safe to consume.

### Screen 13: Medicine Encyclopedia Lookup (`/medicine/info-lookup`)
- **What it does:** Searchable pharmaceutical reference guide.
- **Data Displayed:** High-speed autocomplete search bar, brand-to-generic mappings, OpenFDA indications, clinical contraindications, common side effects, and clinical AI summary.
- **User Actions:** Search any Indian or international drug name and read verified clinical safety information.

### Screen 14: Daily Medication Reminders Screen (`/reminders`)
- **What it does:** Daily intake alarm schedule manager.
- **Data Displayed:** Morning, Afternoon, Evening, and Night dosage slots with assigned medicines, food timing requirements, and adherence checkmarks.
- **User Actions:** Toggle reminder alarms, mark pills as taken, and customize notification chime times.

### Screen 15: Medical History & Consultations Timeline (`/history`)
- **What it does:** Consolidated longitudinal medical record.
- **Data Displayed:** Chronological visit timeline, attending doctor names, hospital locations, recorded vitals, diagnostic lab results, and physician SOAP notes.
- **User Actions:** Expand past visit cards to review treatment plans and download lab report PDFs.

### Screen 16: Profile & QR Pass Screen (`/profile`)
- **What it does:** Personal health profile and digital patient pass.
- **Data Displayed:** Patient avatar, full name, permanent display code (`P000001`), scannable QR pass, contact number, blood group, recorded allergies, and emergency contact.
- **User Actions:** Edit demographic details, update allergies, manage emergency contacts, or navigate to advanced security settings.

### Screen 17: Advanced Settings Screen (`/profile/advanced-settings`)
- **What it does:** Security and device configuration.
- **Data Displayed:** Biometric Unlock toggle (Fingerprint / Face ID), app PIN setup, language selection (English, Tamil, Malayalam, Hindi), app version indicator, and cache clearing.
- **User Actions:** Enable biometric authentication lock, switch language, check for APK updates, or log out.

---

## 6.3 Doctor Clinical Workstation Portal (`frontend/src/portals/doctor/`)

Designed for tablets and widescreen desktop displays; prioritizes rapid chart review and distraction-free SOAP documentation during active consultations.

### Screen 1: Doctor Dashboard (`/doctor`)
- **What it does:** Executive clinical start page for the physician.
- **Data Displayed:**
  - Attending physician profile, cabin room badge, and live clinic presence toggle (`Available`, `In Emergency`, `On Break`).
  - Metric counters: "Patients Waiting", "Completed Today", "Total Scheduled".
  - Quick-action buttons: "Open Live Queue", "EMR History Search", "Profile Settings".
- **User Actions:** Toggle availability status, view emergency notices, and navigate directly into the active queue.

### Screen 2: Doctor Live Queue Management (`/doctor` -> Queue View)
- **What it does:** Real-time patient waiting room manager.
- **Data Displayed:** Chronological and priority-ordered queue list displaying token tickets, patient display codes (`P000001`), patient names, wait duration, visit type (Scheduled vs Walk-In), and nurse triage status (Vitals Recorded badge).
- **User Actions:**
  - Click "Call Patient" to trigger receptionist desk and mobile app chimes.
  - Click "Start Consultation" to open the full-screen clinical workstation.
  - Mark "No-Show" or "Skip" if patient is absent.

### Screen 3: Active Consultation & SOAP Workstation (`ActiveConsultation.tsx`)
- **What it does:** Core clinical encounter workstation.
- **Data Displayed:**
  - **Left Panel (Patient Chart):** Complete historical timeline, chronic conditions, recorded allergies with high-visibility warning badges, previous SOAP notes, and attached lab test reports.
  - **Top Panel (Nurse Triage Vitals):** Pre-recorded Height, Weight, auto-computed BMI, Blood Pressure, Heart Rate, SpO2, and Blood Glucose recorded by triage nurses.
  - **Center/Right Panel (SOAP Editor):**
    - Subjective symptoms textarea with AI speech-to-text / suggestion helpers.
    - Objective findings and physical examination observations.
    - Clinical Assessment & Diagnosis input with ICD/disease suggestions.
    - Plan & Treatment input.
  - **Prescription Builder:** Interactive multi-drug builder with dosage, frequency, and meal timing (`Before Food`, `After Food`) dropdowns, with integrated DrugGuard allergy warnings.
- **User Actions:** Review patient medical history, inspect nurse vitals, record clinical observations, add prescribed drugs, and click "Complete Consultation" to commit records and automatically push prescriptions to the patient's phone.

### Screen 4: Doctor EMR Historical Search (`DoctorEMRSearch.tsx`)
- **What it does:** Patient chart archive and retrospective diagnosis search.
- **Data Displayed:** Searchable table of all past consultations across the hospital, filterable by patient code, diagnosis keyword, or date range.
- **User Actions:** Search past patient encounters, review historical treatment regimens, and verify patient adherence.

### Screen 5: Doctor Profile & Cabin Settings (`DoctorProfile.tsx`)
- **What it does:** Physician credential and room configuration.
- **Data Displayed:** Full name, medical specialization, assigned department, cabin/room number, consultation fee, weekly working days, and password settings.
- **User Actions:** Update room number, adjust consultation fees, and change account password.

---

## 6.4 Receptionist Front-Desk Portal (`frontend/src/portals/receptionist/`)

Designed for rapid front-desk throughput, walk-in ticketing, queue calling, and physician presence monitoring.

### Screen 1: Receptionist Dashboard (`/receptionist`)
- **What it does:** Front-desk command center.
- **Data Displayed:**
  - Desk assignment badge (`Desk A-1`), logged-in staff code (`R001101`), and shift indicator.
  - Real-time doctor availability grid showing all on-duty physicians, cabin rooms, and active status (`Available`, `In Emergency`, `Unavailable`).
  - Active queue summary metrics (Total Checked-In, Waiting, Completed).
  - Quick action buttons: "Book Walk-In", "Check-In Patient", "Open Token Screen".
- **User Actions:** Monitor doctor clinic presence, trigger walk-in ticketing, and access queue calling controls.

### Screen 2: Token Management & Calling Station (`TokenManagement.tsx`)
- **What it does:** Live token dispatch and calling station.
- **Data Displayed:**
  - Giant high-visibility current token display (e.g. `Now Calling: #CP-4821 -> Cabin 102`).
  - Ordered list of waiting patients with ticket numbers, arrival times, and assigned doctors.
- **User Actions:**
  - Click "Call Next" to advance the queue and trigger synthesized audio chime announcements.
  - Click "Recall" to repeat audio announcement for hard-of-hearing patients.
  - Transfer patient to another doctor if specialist reassignment is required.

### Screen 3: Patient Arrival Check-In (`PatientCheckIn.tsx`)
- **What it does:** Front-desk arrival verification.
- **Data Displayed:** Ticket search input, patient phone search, and interactive webcam QR code scanner.
- **User Actions:** Scan patient mobile QR pass via webcam or type ticket number to instantly mark patient as arrived, generating their queue sequence number.

### Screen 4: Walk-In Appointment Creation (`NewAppointmentModal.tsx`)
- **What it does:** Instant front-desk ticketing for patients without prior online bookings.
- **Data Displayed:** Patient name, mobile number, doctor selector, available offline slot list, and visit type.
- **User Actions:** Submit walk-in booking; reserves offline quota seat, creates patient record if new, and immediately issues token ticket.

### Screen 5: Patient Bookings Roster (`PatientBookings.tsx`)
- **What it does:** Master table of all scheduled visits for the day.
- **Data Displayed:** Searchable, filterable list of all appointments by doctor, status (`Upcoming`, `Checked In`, `Completed`, `Cancelled`), and patient contact.
- **User Actions:** Filter bookings, manually update attendance, or cancel no-shows.

### Screen 6: Doctor Schedule & Slot Capacity Manager (`DoctorManagement.tsx`)
- **What it does:** Front-desk view of physician schedules and seat allocations.
- **Data Displayed:** Roster of doctors, cabin assignments, weekly working days, and slot seat breakdown (Online Max, Offline Max, Booked).
- **User Actions:** Toggle doctor availability in emergencies or adjust offline walk-in seat allocations.

---

## 6.5 Nurse Pre-Consultation Station (`frontend/src/portals/nurse/`)

Streamlined triage interface for ward nurses and phlebotomists to log physiological parameters and lab results before patients enter the doctor's cabin.

### Screen 1: Nurse Queue Dashboard (`/nurse`)
- **What it does:** Triage queue monitor.
- **Data Displayed:**
  - Active nurse credentials (`N001101`), triage station badge, and patient counter.
  - List of checked-in patients awaiting vitals assessment, displaying ticket numbers, patient codes, arrival timestamps, and vitals status badge (`Pending` vs `Recorded`).
- **User Actions:** Select a patient to launch the Vitals Entry Modal or Test Entry Modal.

### Screen 2: Vitals Recording Modal (`VitalsEntryModal.tsx`)
- **What it does:** Clinical physiological parameter entry form.
- **Data Displayed:**
  - Height (cm) and Weight (kg) fields with live, auto-computed Body Mass Index (BMI) indicator.
  - Systolic and Diastolic Blood Pressure inputs (with clinical normal range guidelines).
  - Heart Rate (bpm), Respiratory Rate, and SpO2 (%) fields.
  - Body Temperature (with °C / °F toggle).
  - Blood Glucose (mg/dL) with context dropdown (`Fasting`, `Random`, `Post-Meal`).
  - Clinical nurse notes textarea.
- **User Actions:** Enter measured values and click "Save Vitals"; data immediately reflects on the doctor's consultation workstation.

### Screen 3: Diagnostic Lab Test Entry Modal (`TestEntryModal.tsx`)
- **What it does:** Diagnostic lab test recorder.
- **Data Displayed:** Test type dropdown (CBC, Lipid Panel, Blood Sugar, Urinalysis), structured finding key-value inputs, free-text clinical interpretation, and PDF report file uploader.
- **User Actions:** Attach lab test results and upload report documents for physician review.

---

## 6.6 Hospital Administrator Console (`frontend/src/portals/admin/`)

Executive management portal for configuring hospital operations, managing medical staff rosters, and analyzing operational bottlenecks.

### Screen 1: Executive Dashboard (`/admin`)
- **What it does:** High-level hospital operational summary.
- **Data Displayed:** Key performance indicators (Total Patients Today, Active On-Duty Doctors, Occupancy Rate, Average Patient Wait Time), hourly visit volume chart, and department load breakdown.
- **User Actions:** Review facility metrics, identify waiting room bottlenecks, and export daily operational summaries.

### Screen 2: Doctor Management (`AdminDoctorManagement.tsx`)
- **What it does:** Complete physician roster and credential management.
- **Data Displayed:** Table of all doctors with hierarchical staff codes (`D001101`), email, specialty, assigned cabin room, consultation fee, and active account status.
- **User Actions:** Add new doctor, edit cabin allocations, reset physician credentials, or deactivate accounts.

### Screen 3: Nurse Management (`AdminNurseManagement.tsx`)
- **What it does:** Triage nurse staffing and account provisioning.
- **Data Displayed:** List of registered nurses with staff codes (`N001101`), contact numbers, assigned department, and duty status.
- **User Actions:** Onboard new nurses, update contact info, or toggle active status.

### Screen 4: Receptionist & Desk Management (`AdminReceptionistMgmt.tsx`)
- **What it does:** Front-desk staff and physical counter management.
- **Data Displayed:** List of receptionists with staff codes (`R001101`), assigned counter numbers (`Desk A-1`, `Desk B-2`), and shifts.
- **User Actions:** Provision receptionist accounts, assign physical desks, and configure shift rosters.

### Screen 5: Master Appointments Overview (`AdminAppointmentOverview.tsx`)
- **What it does:** Hospital-wide appointment tracking.
- **Data Displayed:** Global table of all visits across all departments, filterable by date, doctor, status, and patient code.
- **User Actions:** Audit hospital attendance, inspect cancellation reasons, and review historical booking trends.

### Screen 6: Slot & Capacity Allocation Manager (`AdminTokenSlotMgmt.tsx`)
- **What it does:** Capacity ratio management for hospital appointments.
- **Data Displayed:** Time slot configurations per doctor showing total capacity, online booking limits, and walk-in reserve seats.
- **User Actions:** Configure slot durations (e.g. 15 vs 30 minutes) and balance online vs front-desk quotas.

### Screen 7: Hospital Analytics & Reports (`AdminReportsAnalytics.tsx`)
- **What it does:** Deep operational analytics.
- **Data Displayed:** Historical charts of patient wait times, doctor consultation durations, peak arrival hours, and revenue generated from consultation fees.
- **User Actions:** Generate monthly compliance reports and optimize staff scheduling based on peak demand.

### Screen 8: Hospital Profile & Settings (`AdminSettingsProfile.tsx`)
- **What it does:** Hospital facility settings and administrative security.
- **Data Displayed:** Hospital name, address, emergency hotlines, official email, logo URL, and administrator password change form.
- **User Actions:** Update hospital public profile and rotate admin credentials.

---

## 6.7 SuperAdmin Multi-Hospital Governance Platform (`frontend/src/portals/superadmin/`)

Global platform oversight portal for multi-hospital onboarding, executive admin provisioning, and system-wide security auditing.

### Screen 1: Platform Overview Dashboard (`/superadmin`)
- **What it does:** Global health system monitoring.
- **Data Displayed:** Platform-wide counters (Total Registered Hospitals, Total Doctors Across All Facilities, Total Patient Population, Daily Consultation Volume), and server health status.
- **User Actions:** Monitor multi-facility adoption, review platform growth, and detect offline hospital nodes.

### Screen 2: Hospital Tenant Registry (`HospitalManagement.tsx`)
- **What it does:** Multi-tenant facility lifecycle management.
- **Data Displayed:** Table of all hospital organizations with unique codes (`H001`, `H002`), location, contact email, active doctor count, and lifecycle state (`Active`, `Suspended`, `Archived`).
- **User Actions:** Onboard new hospital organizations, edit facility details, or suspend non-compliant facilities (instantly terminating all associated staff sessions).

### Screen 3: Hospital Administrator Provisioning (`AdminManagement.tsx`)
- **What it does:** Executive administrator account management.
- **Data Displayed:** List of hospital administrators with staff codes (`A001101`, `A002101`), email, assigned hospital name, and status.
- **User Actions:** Provision new hospital administrators, strictly enforcing the architectural rule of **exactly one active administrator per hospital**.

### Screen 4: Platform Security Audit Log (`AuditLog.tsx`)
- **What it does:** Immutable compliance and security ledger.
- **Data Displayed:** Searchable, chronological log of all administrative actions (doctor deletions, hospital lifecycle toggles, admin credential changes) with staff ID, operator name, timestamp, and IP origin.
- **User Actions:** Filter audit records by facility or staff member for compliance reviews.

---

## 6.8 Unified Staff Login Gateway (`StaffPortalLogin.tsx`)

Located at `/staff/login`, `/receptionist/login`, and `/admin/login`.
- **What it does:** Single secure entry point for all five hospital staff roles.
- **Features & Logic:**
  - Accepts either official staff email (`dr.olivia@carepulse.com`) OR hierarchical staff display code (`D001101`, `R001101`, `A001101`, `N001101`, `SA101`).
  - Auto-detects user role from the authenticated token and immediately redirects:
    - `doctor` -> `/doctor`
    - `receptionist` -> `/receptionist`
    - `nurse` -> `/nurse`
    - `admin` -> `/admin`
    - `superadmin` -> `/superadmin`
  - Rejects patient accounts attempting to log into staff portals with descriptive security warnings.
