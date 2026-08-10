import logging
import uuid
from contextlib import asynccontextmanager
from typing import List, Optional
import json

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

import config
import database
from database import init_db, get_pg_connection, read_json_db, write_json_db, cosine_similarity
from schemas import (
    GoogleAuthRequest,
    AuthResponse,
    LoginRequest,
    PatientResponse,
    ConsultationCreate,
    ConsultationResponse,
    SearchRequest,
    SearchResultItem,
)
from auth import verify_google_token, process_google_login

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


@app.post("/api/auth/login", response_model=AuthResponse)
def standard_login(request: LoginRequest):
    """Standard login via phone number or email."""
    phone = request.phone or ""
    email = request.email or ""

    if database.use_pg:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM patients WHERE (phone = %s AND phone != '') OR (email = %s AND email != '') LIMIT 1",
                    (phone, email)
                )
                row = cur.fetchone()
                if row:
                    dob_str = str(row.get("dob") or "")
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
                        token=f"cp-token-{row['id']}"
                    )

    # Fallback to local JSON database
    db = read_json_db()
    patients = db.get("patients", [])
    found = None
    for p in patients:
        if (phone and p.get("phone") == phone) or (email and p.get("email") == email):
            found = p
            break

    if not found and len(patients) > 0:
        found = patients[0]

    if found:
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
            token=f"cp-token-{found['id']}"
        )

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")


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

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=config.PORT, reload=True)
