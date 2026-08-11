import sys
from pathlib import Path

# Ensure backend directory is in python module search path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import logging
import uuid
import re
from contextlib import asynccontextmanager
from typing import List, Optional
import json

def normalize_phone_number(p: str) -> str:
    """Normalize phone numbers by keeping digits and extracting the last 10 digits."""
    digits = re.sub(r"\D", "", p or "")
    return digits[-10:] if len(digits) >= 10 else digits

from fastapi import FastAPI, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

import config
import database
from database import init_db, get_pg_connection, read_json_db, write_json_db, cosine_similarity
from schemas import (
    GoogleAuthRequest,
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    PatientResponse,
    AppointmentCreate,
    AppointmentResponse,
    ConsultationCreate,
    ConsultationResponse,
    SearchRequest,
    SearchResultItem,
)
from auth import verify_google_token, process_google_login, generate_patient_jwt, decode_patient_jwt

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("carepulse.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB connection and schema on startup
    init_db()
    yield

app = FastAPI(
    title="CarePulse Backend API",
    description="FastAPI + PostgreSQL backend with pgvector AI semantic search and Google Auth",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "CarePulse FastAPI Backend",
        "database": "PostgreSQL (pgvector)" if database.use_pg else "JSON File Fallback"
    }

# ==========================================
# 1. AUTHENTICATION ENDPOINTS
# ==========================================

@app.post("/api/auth/google", response_model=AuthResponse)
def google_auth(request: GoogleAuthRequest):
    """Authenticate user with Google OAuth Credential ID Token."""
    google_user = None

    if request.credential:
        google_user = verify_google_token(request.credential)

    # Support direct profile payload if sandbox/demo simulation is provided
    if not google_user and request.profile and request.profile.email:
        google_user = {
            "google_id": request.profile.googleId or f"google-{uuid.uuid4().hex[:10]}",
            "email": request.profile.email,
            "name": request.profile.name or request.profile.email.split("@")[0],
            "picture": request.profile.picture or "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80",
            "email_verified": True
        }

    if not google_user or not google_user.get("email"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Google authentication credential or token."
        )

    return process_google_login(google_user)


@app.post("/api/auth/register", response_model=AuthResponse)
def register_patient(request: RegisterRequest):
    """Register a new patient into PostgreSQL or JSON database."""
    email = request.email.strip() if request.email else ""
    phone = request.phone.strip() if request.phone else ""
    name = request.fullName.strip()
    password = request.password or ""
    avatar = request.avatarUrl or "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80"
    dob = request.dob or "1995-07-24"
    gender = request.gender or "Female"
    blood_group = request.bloodGroup or "O+"

    if not email and not phone:
        raise HTTPException(status_code=400, detail="Phone number or email is required for registration.")

    norm_phone_digits = normalize_phone_number(phone)
    lower_email = email.lower()
    lower_name = name.lower()

    # Check that main phone and emergency phone are not the same
    emergency_info = request.emergencyContact or {}
    emergency_phone_raw = emergency_info.get("phone", "") if isinstance(emergency_info, dict) else ""
    if norm_phone_digits and emergency_phone_raw:
        norm_emerg_digits = normalize_phone_number(emergency_phone_raw)
        if norm_phone_digits == norm_emerg_digits:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Emergency contact phone number must be different from your primary phone number."
            )

    if database.use_pg:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                # 1. Check if name already exists (case-insensitive)
                if lower_name:
                    cur.execute("SELECT id, full_name FROM patients WHERE LOWER(TRIM(full_name)) = %s LIMIT 1", (lower_name,))
                    if cur.fetchone():
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail=f"An account with the name '{name}' already exists. Please log in or use a different name."
                        )

                # 2. Check if email already exists (case-insensitive)
                if lower_email:
                    cur.execute("SELECT id, email FROM patients WHERE LOWER(TRIM(email)) = %s LIMIT 1", (lower_email,))
                    if cur.fetchone():
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail=f"An account with email '{email}' already exists. Please log in instead."
                        )

                # 3. Check if phone number already exists
                if norm_phone_digits:
                    cur.execute(
                        "SELECT id, phone FROM patients WHERE phone != '' AND RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = %s LIMIT 1",
                        (norm_phone_digits,)
                    )
                    if cur.fetchone():
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail=f"An account with phone number '{phone}' already exists. Please log in instead."
                        )

                cur.execute(
                    """
                    INSERT INTO patients (full_name, email, phone, dob, gender, blood_group, avatar_url, password_hash, auth_provider)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'local')
                    RETURNING *
                    """,
                    (name, email, phone, dob, gender, blood_group, avatar, password)
                )
                row = cur.fetchone()
                conn.commit()

                return AuthResponse(
                    success=True,
                    user=PatientResponse(
                        id=str(row["id"]),
                        fullName=row["full_name"],
                        email=row["email"],
                        phone=row.get("phone") or "",
                        dob=str(row.get("dob") or ""),
                        gender=row.get("gender") or "Not specified",
                        bloodGroup=row.get("blood_group") or "O+",
                        avatarUrl=row.get("avatar_url") or avatar,
                        authProvider="local"
                    ),
                    token=generate_patient_jwt(str(row["id"]), row["email"])
                )
    else:
        db = read_json_db()
        patients = db.get("patients", [])
        for p in patients:
            p_name = (p.get("full_name") or "").strip().lower()
            p_phone_digits = normalize_phone_number(p.get("phone", ""))
            p_email = (p.get("email") or "").strip().lower()

            if lower_name and p_name and lower_name == p_name:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"An account with the name '{name}' already exists. Please log in or use a different name."
                )

            if lower_email and p_email and lower_email == p_email:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"An account with email '{email}' already exists. Please log in instead."
                )

            if norm_phone_digits and p_phone_digits and norm_phone_digits == p_phone_digits:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"An account with phone number '{phone}' already exists. Please log in instead."
                )

        new_id = str(uuid.uuid4())
        new_patient = {
            "id": new_id,
            "full_name": name,
            "email": email,
            "phone": phone,
            "dob": dob,
            "gender": gender,
            "blood_group": blood_group,
            "avatar_url": avatar,
            "password_hash": password,
            "auth_provider": "local"
        }
        patients.append(new_patient)
        db["patients"] = patients
        write_json_db(db)

        return AuthResponse(
            success=True,
            user=PatientResponse(
                id=new_id,
                fullName=name,
                email=email,
                phone=phone,
                dob=dob,
                gender=gender,
                bloodGroup=blood_group,
                avatarUrl=avatar,
                authProvider="local"
            ),
            token=generate_patient_jwt(new_id, email)
        )


@app.post("/api/auth/login", response_model=AuthResponse)
def standard_login(request: LoginRequest):
    """Strict login validation: check if patient exists and password matches."""
    phone = (request.phone or "").strip()
    email = (request.email or "").strip()
    password = (request.password or "").strip()

    # Normalize phone/email identifier
    identifier = phone or email
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide your registered phone number or email address."
        )

    norm_identifier_digits = normalize_phone_number(identifier)
    lower_identifier_email = identifier.lower()

    if database.use_pg:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT * FROM patients 
                    WHERE (LOWER(email) = %s AND email != '') 
                       OR (phone != '' AND RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = %s)
                    LIMIT 1
                    """,
                    (lower_identifier_email, norm_identifier_digits)
                )
                row = cur.fetchone()
                if not row:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="No account found with this phone number or email. Please sign up to create an account."
                    )

                # Validate password
                stored_pass = row.get("password_hash")
                if stored_pass and password and stored_pass != password:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Incorrect password. Please verify your password and try again."
                    )

                dob_str = str(row.get("dob") or "")
                token_str = generate_patient_jwt(str(row["id"]), row["email"])
                return AuthResponse(
                    success=True,
                    user=PatientResponse(
                        id=str(row["id"]),
                        fullName=row["full_name"],
                        email=row["email"],
                        phone=row.get("phone") or "",
                        dob=dob_str,
                        gender=row.get("gender") or "Not specified",
                        bloodGroup=row.get("blood_group") or "O+",
                        avatarUrl=row.get("avatar_url") or "",
                        authProvider=row.get("auth_provider") or "local"
                    ),
                    token=token_str
                )

    # Fallback to local JSON database
    db = read_json_db()
    patients = db.get("patients", [])
    found = None
    for p in patients:
        p_phone_digits = normalize_phone_number(p.get("phone") or "")
        p_email = (p.get("email") or "").strip().lower()

        is_phone_match = norm_identifier_digits and p_phone_digits and norm_identifier_digits == p_phone_digits
        is_email_match = lower_identifier_email and p_email and lower_identifier_email == p_email

        if is_phone_match or is_email_match:
            found = p
            break

    if not found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this phone number or email. Please sign up to create an account."
        )

    # Check password if stored
    stored_pass = found.get("password_hash") or found.get("password")
    if stored_pass and password and stored_pass != password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please verify your password and try again."
        )

    token_str = generate_patient_jwt(found["id"], found["email"])
    return AuthResponse(
        success=True,
        user=PatientResponse(
            id=found["id"],
            fullName=found["full_name"],
            email=found["email"],
            phone=found.get("phone", phone),
            dob=found.get("dob", ""),
            gender=found.get("gender", "Female"),
            bloodGroup=found.get("blood_group", "O+"),
            avatarUrl=found.get("avatar_url", ""),
            authProvider=found.get("auth_provider", "local")
        ),
        token=token_str
    )


@app.get("/api/auth/me", response_model=PatientResponse)
def get_current_authenticated_patient(authorization: Optional[str] = Header(None)):
    """Verify persistent JWT token from Authorization header and return current patient data (401 if invalid/expired)."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header."
        )

    payload = decode_patient_jwt(authorization)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token. Please log in again."
        )

    patient_id = payload.get("patient_id") or payload.get("sub")
    email = payload.get("email")

    if database.use_pg:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM patients WHERE id::text = %s OR (email = %s AND email != '') LIMIT 1",
                    (str(patient_id), str(email))
                )
                row = cur.fetchone()
                if row:
                    dob_str = str(row.get("dob") or "")
                    return PatientResponse(
                        id=str(row["id"]),
                        fullName=row["full_name"],
                        email=row["email"],
                        phone=row.get("phone") or "",
                        dob=dob_str,
                        gender=row.get("gender") or "Not specified",
                        bloodGroup=row.get("blood_group") or "O+",
                        avatarUrl=row.get("avatar_url") or "",
                        authProvider=row.get("auth_provider") or "local"
                    )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Patient account not found.")
    else:
        db = read_json_db()
        for p in db.get("patients", []):
            if p.get("id") == patient_id or (email and p.get("email") == email):
                return PatientResponse(
                    id=p["id"],
                    fullName=p["full_name"],
                    email=p["email"],
                    phone=p.get("phone", ""),
                    dob=p.get("dob", ""),
                    gender=p.get("gender", "Female"),
                    bloodGroup=p.get("blood_group", "O+"),
                    avatarUrl=p.get("avatar_url", ""),
                    authProvider=p.get("auth_provider", "local")
                )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Patient account not found.")


@app.get("/api/patients/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: str):
    """Retrieve patient record by ID."""
    if database.use_pg:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM patients WHERE id = %s", (patient_id,))
                row = cur.fetchone()
                if row:
                    return PatientResponse(
                        id=str(row["id"]),
                        fullName=row["full_name"],
                        email=row["email"],
                        phone=row.get("phone") or "",
                        dob=str(row.get("dob") or ""),
                        gender=row.get("gender") or "Not specified",
                        bloodGroup=row.get("blood_group") or "O+",
                        avatarUrl=row.get("avatar_url") or "",
                        authProvider=row.get("auth_provider") or "local"
                    )
        raise HTTPException(status_code=404, detail="Patient not found")
    else:
        db = read_json_db()
        for p in db.get("patients", []):
            if p.get("id") == patient_id:
                return PatientResponse(
                    id=p["id"],
                    fullName=p["full_name"],
                    email=p["email"],
                    phone=p.get("phone", ""),
                    dob=p.get("dob", ""),
                    gender=p.get("gender", "Female"),
                    bloodGroup=p.get("blood_group", "O+"),
                    avatarUrl=p.get("avatar_url", ""),
                    authProvider=p.get("auth_provider", "local")
                )
        raise HTTPException(status_code=404, detail="Patient not found")

# ==========================================
# 2. CONSULTATION & SOAP DATA ENDPOINTS
# ==========================================

@app.get("/api/consultations", response_model=List[ConsultationResponse])
def get_consultations():
    """Retrieve all consultations joined with patient information."""
    if database.use_pg:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT c.id, c.doctor_id, c.doctor_name, c.date, c.soap_data, p.full_name as patient_name
                    FROM consultations c
                    LEFT JOIN patients p ON c.patient_id = p.id
                    ORDER BY c.date DESC
                """)
                rows = cur.fetchall()
                result = []
                for r in rows:
                    result.append(ConsultationResponse(
                        id=str(r["id"]),
                        doctor_id=r.get("doctor_id"),
                        doctor_name=r["doctor_name"],
                        date=str(r["date"]),
                        soap_data=r["soap_data"] if isinstance(r["soap_data"], dict) else json.loads(r["soap_data"]),
                        patient_name=r.get("patient_name") or "Unknown Patient"
                    ))
                return result
    else:
        db = read_json_db()
        consultations = db.get("consultations", [])
        patients = {p["id"]: p.get("full_name", "Unknown Patient") for p in db.get("patients", [])}
        result = []
        for c in reversed(consultations):
            p_name = patients.get(c.get("patient_id"), "Unknown Patient")
            result.append(ConsultationResponse(
                id=c["id"],
                doctor_id=c.get("doctor_id"),
                doctor_name=c["doctor_name"],
                date=c["date"],
                soap_data=c.get("soap_data", {}),
                patient_name=p_name
            ))
        return result


@app.post("/api/consultations", status_code=status.HTTP_201_CREATED)
def create_consultation(data: ConsultationCreate):
    """Create a new consultation with structured JSONB SOAP clinical logs and optional pgvector embeddings."""
    patient_id = data.patientId or "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
    date_val = data.date or "2026-07-24"

    if database.use_pg:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                if data.soapEmbedding:
                    vector_str = f"[{','.join(str(x) for x in data.soapEmbedding)}]"
                    cur.execute("""
                        INSERT INTO consultations (patient_id, doctor_id, doctor_name, date, soap_data, soap_embedding)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        RETURNING id, doctor_name, date, soap_data
                    """, (patient_id, data.doctorId, data.doctorName, date_val, json.dumps(data.soapData), vector_str))
                else:
                    cur.execute("""
                        INSERT INTO consultations (patient_id, doctor_id, doctor_name, date, soap_data)
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING id, doctor_name, date, soap_data
                    """, (patient_id, data.doctorId, data.doctorName, date_val, json.dumps(data.soapData)))

                row = cur.fetchone()
                conn.commit()
                return {
                    "id": str(row["id"]),
                    "doctor_name": row["doctor_name"],
                    "date": str(row["date"]),
                    "soap_data": row["soap_data"]
                }
    else:
        db = read_json_db()
        new_record = {
            "id": f"c-{uuid.uuid4().hex[:12]}",
            "patient_id": patient_id,
            "doctor_id": data.doctorId,
            "doctor_name": data.doctorName,
            "date": date_val,
            "soap_data": data.soapData,
            "soap_embedding": data.soapEmbedding or []
        }
        db.setdefault("consultations", []).append(new_record)
        write_json_db(db)
        return {
            "id": new_record["id"],
            "doctor_name": new_record["doctor_name"],
            "date": new_record["date"],
            "soap_data": new_record["soap_data"]
        }


# ==========================================
# 2.5 APPOINTMENTS & PRESCRIPTIONS ENDPOINTS
# ==========================================

@app.post("/api/appointments", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def book_appointment(data: AppointmentCreate):
    """Book a new doctor consultation appointment and sync to PostgreSQL / JSON database."""
    patient_id = data.patientId or "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
    ticket_no = data.ticketNumber or f"#CP-{random_ticket()}"
    specialty = data.doctorSpecialty or "General Physician"
    photo = data.doctorPhoto or "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80"
    hospital = data.hospitalName or "CarePulse Central Hospital"
    app_type = data.type or "In-Person"

    if database.use_pg:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                # Ensure patient exists or link to first patient
                cur.execute("SELECT id FROM patients WHERE id::text = %s", (patient_id,))
                row_p = cur.fetchone()
                if not row_p:
                    cur.execute("SELECT id FROM patients LIMIT 1")
                    first_p = cur.fetchone()
                    if first_p:
                        patient_id = str(first_p["id"])

                cur.execute(
                    """
                    INSERT INTO appointments (patient_id, ticket_number, doctor_id, doctor_name, doctor_specialty, doctor_photo, hospital_name, date, time_slot, type, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Upcoming')
                    RETURNING *
                    """,
                    (patient_id, ticket_no, data.doctorId, data.doctorName, specialty, photo, hospital, data.date, data.timeSlot, app_type)
                )
                row = cur.fetchone()
                conn.commit()

                return AppointmentResponse(
                    id=str(row["id"]),
                    ticketNumber=row["ticket_number"],
                    patientId=str(row["patient_id"]),
                    patientName=data.patientName or "",
                    doctorId=row["doctor_id"],
                    doctorName=row["doctor_name"],
                    doctorSpecialty=row.get("doctor_specialty") or specialty,
                    doctorPhoto=row.get("doctor_photo") or photo,
                    hospitalName=row.get("hospital_name") or hospital,
                    date=str(row["date"]),
                    timeSlot=row["time_slot"],
                    type=row.get("type") or app_type,
                    status=row.get("status") or "Upcoming",
                    daysLeftText="Tomorrow"
                )
    else:
        db = read_json_db()
        new_app = {
            "id": f"app-{uuid.uuid4().hex[:10]}",
            "patient_id": patient_id,
            "patient_name": data.patientName or "",
            "ticket_number": ticket_no,
            "doctor_id": data.doctorId,
            "doctor_name": data.doctorName,
            "doctor_specialty": specialty,
            "doctor_photo": photo,
            "hospital_name": hospital,
            "date": data.date,
            "time_slot": data.timeSlot,
            "type": app_type,
            "status": "Upcoming"
        }
        db.setdefault("appointments", []).insert(0, new_app)
        write_json_db(db)

        return AppointmentResponse(
            id=new_app["id"],
            ticketNumber=new_app["ticket_number"],
            patientId=new_app["patient_id"],
            patientName=new_app["patient_name"],
            doctorId=new_app["doctor_id"],
            doctorName=new_app["doctor_name"],
            doctorSpecialty=new_app["doctor_specialty"],
            doctorPhoto=new_app["doctor_photo"],
            hospitalName=new_app["hospital_name"],
            date=new_app["date"],
            timeSlot=new_app["time_slot"],
            type=new_app["type"],
            status=new_app["status"],
            daysLeftText="Tomorrow"
        )


@app.get("/api/appointments/patient/{patient_id}", response_model=List[AppointmentResponse])
def get_patient_appointments(patient_id: str):
    """Retrieve all booked appointments for a given patient from PostgreSQL or local store."""
    if database.use_pg:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT a.*, p.full_name as p_name 
                    FROM appointments a
                    LEFT JOIN patients p ON a.patient_id = p.id
                    WHERE a.patient_id::text = %s OR a.patient_id IS NULL
                    ORDER BY a.date DESC, a.created_at DESC
                    """,
                    (patient_id,)
                )
                rows = cur.fetchall()
                result = []
                for r in rows:
                    result.append(AppointmentResponse(
                        id=str(r["id"]),
                        ticketNumber=r.get("ticket_number") or f"#CP-{random_ticket()}",
                        patientId=str(r.get("patient_id") or patient_id),
                        patientName=r.get("p_name") or "",
                        doctorId=r["doctor_id"],
                        doctorName=r["doctor_name"],
                        doctorSpecialty=r.get("doctor_specialty") or "General Medicine",
                        doctorPhoto=r.get("doctor_photo") or "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80",
                        hospitalName=r.get("hospital_name") or "CarePulse Central Hospital",
                        date=str(r["date"]),
                        timeSlot=r["time_slot"],
                        type=r.get("type") or "In-Person",
                        status=r.get("status") or "Upcoming"
                    ))
                return result
    else:
        db = read_json_db()
        apps = db.get("appointments", [])
        return [
            AppointmentResponse(
                id=a["id"],
                ticketNumber=a.get("ticket_number", "#CP-1001"),
                patientId=a.get("patient_id", patient_id),
                patientName=a.get("patient_name", ""),
                doctorId=a["doctor_id"],
                doctorName=a["doctor_name"],
                doctorSpecialty=a.get("doctor_specialty", "General Medicine"),
                doctorPhoto=a.get("doctor_photo", ""),
                hospitalName=a.get("hospital_name", "CarePulse Central Hospital"),
                date=str(a["date"]),
                timeSlot=a["time_slot"],
                type=a.get("type", "In-Person"),
                status=a.get("status", "Upcoming")
            )
            for a in apps
        ]


def random_ticket() -> str:
    import random
    return str(random.randint(1000, 9999))


# ==========================================
# 3. AI / RAG VECTOR SIMILARITY SEARCH
# ==========================================

@app.post("/api/consultations/search", response_model=List[SearchResultItem])
def search_consultations(req: SearchRequest):
    """Vector similarity RAG search using pgvector cosine distance `<=>` operator."""
    if not req.queryEmbedding:
        raise HTTPException(status_code=400, detail="queryEmbedding must be a non-empty numeric list.")

    if database.use_pg:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                vector_str = f"[{','.join(str(x) for x in req.queryEmbedding)}]"
                cur.execute("""
                    SELECT c.id, c.doctor_name, c.date, c.soap_data,
                           (c.soap_embedding <=> %s) as distance
                    FROM consultations c
                    WHERE c.soap_embedding IS NOT NULL
                    ORDER BY c.soap_embedding <=> %s
                    LIMIT %s
                """, (vector_str, vector_str, req.limit))
                rows = cur.fetchall()
                results = []
                for r in rows:
                    soap = r["soap_data"] if isinstance(r["soap_data"], dict) else json.loads(r["soap_data"])
                    results.append(SearchResultItem(
                        id=str(r["id"]),
                        doctor_name=r["doctor_name"],
                        date=str(r["date"]),
                        soap_data=soap,
                        distance=float(r["distance"])
                    ))
                return results
    else:
        db = read_json_db()
        consultations = db.get("consultations", [])
        matched = []
        for c in consultations:
            emb = c.get("soap_embedding", [])
            if emb and len(emb) > 0:
                sim = cosine_similarity(req.queryEmbedding, emb)
                dist = 1.0 - sim
                matched.append(SearchResultItem(
                    id=c["id"],
                    doctor_name=c["doctor_name"],
                    date=c["date"],
                    soap_data=c.get("soap_data", {}),
                    distance=dist
                ))
        matched.sort(key=lambda x: x.distance)
        return matched[:req.limit]

from routes.receptionist_routes import router as receptionist_router
app.include_router(receptionist_router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=config.PORT, reload=True)

