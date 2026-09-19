# 🏥 CarePulse — System Overview & Architecture

> **Document Version:** 1.0.0  
> **Classification:** Comprehensive Technical Reference / System Review Report  
> **Last Updated:** 2026-09-10  
> **Scope:** Full-Stack HealthTech Platform (Web, Android APK, Micro-Services Backend, Multi-Hospital Portals)

---

## 1.1 Executive Summary & Full Project Name

**Full Project Name:**  
**CarePulse — Smart Multi-Hospital Management, Intelligent Clinical Triage & Patient Health Assistant Platform**

CarePulse is an enterprise-grade, omnichannel hospital information and patient management system designed to eliminate structural inefficiencies in outpatient healthcare delivery. Built using modern web and mobile primitives (React 19, TypeScript 5+, Vite, Tailwind CSS, Capacitor 8, FastAPI, PostgreSQL with pgvector, and mistral-based clinical AI), CarePulse unifies six discrete stakeholders into a synchronized clinical pipeline:
1. **Outpatients & Families** (via native Android APK and responsive web app)
2. **Hospital Receptionists & Front-Desk Staff** (via the Receptionist Token & Queue Portal)
3. **Primary Care Physicians & Specialists** (via the Doctor Consultation & EMR Suite)
4. **Triage Nurses & Phlebotomists** (via the Nurse Pre-Consultation Vitals & Lab Testing Station)
5. **Hospital Administrators** (via the Multi-Department Executive Admin Console)
6. **Platform SuperAdministrators** (via the Multi-Hospital Governance & Audit Control Center)

---

## 1.2 Problem Statement

In contemporary outpatient clinical practice—particularly across developing and emerging healthcare ecosystems such as India—the primary hospital encounter remains afflicted by friction points across four distinct operational layers:

```
[ Traditional Outpatient Friction Points ]
       │
       ├── 1. Fragmented Scheduling & Physical Token Bottlenecks
       │      Patients arrive without appointment visibility or wait hours in crowded reception
       │      areas with static paper tokens, creating volatile waiting-room surges.
       │
       ├── 2. Disjointed Clinical Record Continuity
       │      Paper prescriptions and handwritten vitals get lost between visits; doctors lack
       │      immediate historical timeline visibility during 3-to-5 minute consults.
       │
       ├── 3. Dangerous Medication Misunderstandings & Drug Adverse Interactions
       │      Patients struggle to read handwritten dosages, take medications at incorrect
       │      intervals (with/without food), or accidentally consume contraindicated drugs.
       │
       └── 4. Multi-Tenant Operational & Network Vulnerabilities
              Rural and semi-urban clinics suffer periodic broadband dropouts; standard cloud-only
              hospital software crashes or blocks admissions whenever connectivity blinks.
```

### CarePulse Direct Interventions:
- **Unified Hybrid Queueing Engine:** Reconciles scheduled online reservations with unexpected emergency and walk-in arrivals via dynamic priority interleaving (scheduled-priority hybrid).
- **Two-Way Real-Time Prescription Sync:** Physician-entered digital SOAP prescriptions instantaneously reflect on the patient’s Android mobile device with active dosage schedules and automated alarm notifications.
- **Computer Vision & Packaging Guard:** Patients can capture medicine strips with their phone camera to instantly run OCR + fuzzy string matching + contraindication checking against active allergies.
- **Fail-Fast Dual-Store Resilience:** The platform operates natively on PostgreSQL with pgvector, while transparently retaining offline JSON fallback buffers and an automatic re-sync daemon that protects terminal clinical records upon reconnect.

---

## 1.3 Target Users & System Roles

| Role Name | Access Mechanism | Primary Operational Objectives |
| :--- | :--- | :--- |
| **Patient** | Android Native App / Mobile Web (`/`, `/home`) | Instant clinic discovery, slot booking, AI symptom triage, live queue tracking, digital prescriptions, medicine scanner, intake alarms. |
| **Receptionist** | Desktop Web Portal (`/receptionist`) | Desk token dispatch, walk-in patient triage, emergency slot overrides, real-time doctor availability monitor, queue calling. |
| **Doctor** | Clinic Tablet / Desktop (`/doctor`) | Live waiting room queue, pre-consultation vitals inspection, SOAP clinical documentation, structured Rx issuing, EMR history timeline. |
| **Nurse** | Ward / Triage Station (`/nurse`) | Pre-consultation vitals logging (BP, HR, SpO2, Temp, Glucose, BMI), diagnostic test order execution, lab report PDF attachments. |
| **Hospital Admin** | Hospital Admin Console (`/admin`) | Hospital department configuration, staff roster generation (Doctors, Nurses, Receptionists), capacity limits, shift audits. |
| **SuperAdmin** | Global Platform Console (`/superadmin`) | Multi-hospital onboarding, hospital lifecycle controls, administrator credential provisioning, cross-facility audit trails. |

---

## 1.4 High-Level End-to-End System Architecture

The following Mermaid architectural diagram details the network topography, container boundaries, security gateways, and communication protocols interconnecting every component of CarePulse:

```mermaid
flowchart TB
    subgraph ClientLayer ["Client Devices & Role Portals"]
        direction TB
        subgraph MobileApp ["Mobile App Layer (Android / Capacitor 8)"]
            P_APP["📱 Patient Mobile App<br/>(React 19 + Capacitor 8 + Tailwind CSS)"]
        end
        subgraph WebPortals ["Hospital Staff Web Portals (Desktop & Tablet)"]
            R_PORTAL["🖥️ Receptionist Portal<br/>(/receptionist)"]
            D_PORTAL["🩺 Doctor EMR Portal<br/>(/doctor)"]
            N_PORTAL["💉 Nurse Vitals Station<br/>(/nurse)"]
            A_PORTAL["🏢 Hospital Admin Console<br/>(/admin)"]
            SA_PORTAL["🌐 SuperAdmin Platform<br/>(/superadmin)"]
        end
    end

    subgraph NetworkLayer ["Ingress, Tunnel & CDN Infrastructure"]
        NGROK["🔀 Ngrok TLS Tunnel<br/>(Permanent Domain: straggler-boss-unselect.ngrok-free.dev)"]
        NETLIFY["⚡ Netlify / Vercel Edge CDN<br/>(Web SPA Hosting & Static Assets)"]
    end

    subgraph BackendLayer ["Application Core (FastAPI Service Layer :5000)"]
        direction TB
        GATEWAY["🛡️ Security & Routing Gateway<br/>(CORS, Role RBAC, JWT Interceptor)"]
        
        subgraph Routers ["API Router Modules"]
            R_PATIENT["Patient & App Core Router<br/>(main.py)"]
            R_RECEPT["Receptionist Router<br/>(receptionist_routes.py)"]
            R_DOCTOR["Doctor Router<br/>(doctor_routes.py)"]
            R_NURSE["Nurse Router<br/>(nurse_routes.py)"]
            R_ADMIN["Admin Router<br/>(admin_routes.py)"]
            R_SUPER["SuperAdmin Router<br/>(superadmin_routes.py)"]
            R_AUTH["Staff Auth Router<br/>(staff_auth.py)"]
            R_AI["AI Clinical Suite Router<br/>(ai_routes.py)"]
        end

        subgraph CoreServices ["Core Engines & Daemons"]
            SCHEDULER["⏰ APScheduler Daemon<br/>(Reminders & Auto-Expiry)"]
            OCR_ENGINE["🔍 OCR & Vision Parser<br/>(Tesseract + Mistral Vision)"]
            DRUG_GUARD["🛡️ DrugGuard Engine<br/>(Interaction & Allergy Checking)"]
            RAG_ENGINE["📚 Clinical RAG Engine<br/>(pgvector / TF-IDF Search)"]
            SYNC_ENGINE["🔄 Dual-Store Auto-Sync<br/>(PostgreSQL ⇄ JSON Buffer)"]
        end
    end

    subgraph ExternalServices ["External Cloud Services & APIs"]
        FCM["🔥 Firebase Cloud Messaging (FCM)<br/>(Push Notifications & Background Pings)"]
        GOOGLE_AUTH["🔑 Google Identity Services<br/>(OAuth 2.0 Token Verification)"]
        OPEN_FDA["💊 OpenFDA National API<br/>(Drug Label, Adverse Events & Warnings)"]
        EMAIL_SVC["📧 Resend / SMTP Gateway<br/>(OTP Verification & System Alerts)"]
    end

    subgraph StorageLayer ["Persistence & Database Layer"]
        direction TB
        subgraph PrimaryDB ["Primary Relational Store"]
            PG[("🐘 PostgreSQL 18 Relational DB<br/>+ pgvector Extension<br/>(Port 5432)")]
            PG_TABLES["16 Core Relational Tables<br/>5 Pre-Joined Views<br/>Role Triggers & GIN Indexes"]
        end
        subgraph LocalStore ["Resilience Store"]
            JSON_DB[("📁 Resilient Local Store<br/>(database.json)<br/>[Offline Emergency Fallback]")]
        end
        subgraph StaticStorage ["Static Asset Storage"]
            FS_DOWNLOADS["📂 backend/static_downloads/<br/>(CarePulse_App.apk, Lab Reports PDF)"]
            TTS_CACHE["🔊 backend/.cache/tts/<br/>(SHA-256 Cached Audio Files)"]
        end
    end

    %% Client Layer to Ingress
    P_APP -->|CapacitorHttp / HTTPS| NGROK
    P_APP -.->|Production APK Download| NGROK
    WebPortals -->|Direct LAN / HTTPS| NETLIFY
    WebPortals -->|API Requests| NGROK

    %% Network Layer to Backend
    NGROK -->|Reverse Proxy Port 5000| GATEWAY
    NETLIFY -->|REST API Calls| NGROK
    GATEWAY --> Routers

    %% Routers to Services
    Routers --> CoreServices
    R_AI --> OCR_ENGINE
    R_AI --> DRUG_GUARD
    R_AI --> RAG_ENGINE

    %% Services to External APIs
    CoreServices -->|Push Dispatch| FCM
    CoreServices -->|Drug Ingredient Fallback| OPEN_FDA
    R_AUTH -->|Credential & Token Verification| GOOGLE_AUTH
    R_PATIENT -->|OTP Transmission| EMAIL_SVC
    FCM -->|Push Alert Stream| P_APP

    %% Services to Storage
    Routers -->|psycopg Connection Pool| PG
    SYNC_ENGINE -->|Read/Write Fallback| JSON_DB
    SYNC_ENGINE -->|Idempotent Re-Sync| PG
    OCR_ENGINE --> FS_DOWNLOADS
    R_PATIENT --> TTS_CACHE
    PG --- PG_TABLES

    classDef client fill:#e0f2fe,stroke:#0284c7,stroke-width:2px;
    classDef backend fill:#f0fdf4,stroke:#16a34a,stroke-width:2px;
    classDef storage fill:#fef3c7,stroke:#d97706,stroke-width:2px;
    classDef external fill:#f3e8ff,stroke:#9333ea,stroke-width:2px;
    
    class P_APP,R_PORTAL,D_PORTAL,N_PORTAL,A_PORTAL,SA_PORTAL client;
    class GATEWAY,Routers,CoreServices,SCHEDULER,OCR_ENGINE,DRUG_GUARD,RAG_ENGINE,SYNC_ENGINE backend;
    class PG,JSON_DB,FS_DOWNLOADS,TTS_CACHE,PG_TABLES storage;
    class FCM,GOOGLE_AUTH,OPEN_FDA,EMAIL_SVC external;
```
