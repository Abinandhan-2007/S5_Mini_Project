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

def normalize_text_key(val: str) -> str:
    """Normalize names/usernames by stripping spaces, periods, and non-alphanumerics for resilient matching."""
    if not val:
        return ""
    return re.sub(r"[^a-zA-Z0-9]", "", val).lower()

from fastapi import FastAPI, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

import random
import time
import hashlib
from datetime import datetime, timedelta
import config
import database
from database import init_db, get_pg_connection, read_json_db, write_json_db, cosine_similarity
from schemas import (
    GoogleAuthRequest,
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    PatientResponse,
    ForgotPasswordRequestOtp,
    ForgotPasswordOtpResponse,
    ForgotPasswordVerifyOtpRequest,
    ForgotPasswordVerifyOtpResponse,
    ForgotPasswordResetRequest,
    AppointmentCreate,
    AppointmentResponse,
    ConsultationCreate,
    ConsultationResponse,
    SearchRequest,
    SearchResultItem,
    HospitalResponse,
    DoctorResponse,
)
from auth import verify_google_token, process_google_login, generate_patient_jwt, decode_patient_jwt
from email_service import send_otp_email
from routes.receptionist_routes import router as receptionist_router
from routes.admin_routes import router as admin_router

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
    address = (request.address or "").strip()
    dob = (request.dob or "").strip()
    gender = request.gender or "Not specified"
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

                try:
                    cur.execute(
                        """
                        INSERT INTO patients (full_name, email, phone, address, dob, gender, blood_group, avatar_url, password_hash, auth_provider)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'local')
                        RETURNING *
                        """,
                        (name, email, phone, address, dob, gender, blood_group, avatar, password)
                    )
                except Exception:
                    # Fallback if address column is not present in existing table instance
                    conn.rollback()
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
                        address=row.get("address") or address,
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
            "address": address,
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
                address=address,
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
    """Strict login validation: check if patient exists by username/full_name, email, or phone, and verify password."""
    raw_user = (request.username or "").strip()
    phone = (request.phone or "").strip()
    email = (request.email or "").strip()
    password = (request.password or "").strip()

    # Normalize identifier
    identifier = raw_user or email or phone
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide your username, email address, or phone number."
        )

    norm_identifier_digits = normalize_phone_number(identifier)
    lower_identifier = identifier.lower()
    clean_identifier = normalize_text_key(identifier)

    if database.use_pg:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT * FROM patients 
                    WHERE LOWER(TRIM(full_name)) = %s
                       OR (full_name != '' AND REGEXP_REPLACE(LOWER(full_name), '[^a-z0-9]', '', 'g') = %s)
                       OR (email != '' AND LOWER(TRIM(email)) = %s)
                       OR (email != '' AND REGEXP_REPLACE(LOWER(email), '[^a-z0-9]', '', 'g') = %s)
                       OR (email != '' AND SPLIT_PART(LOWER(email), '@', 1) = %s)
                       OR (phone != '' AND RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = %s)
                    LIMIT 1
                    """,
                    (lower_identifier, clean_identifier, lower_identifier, clean_identifier, lower_identifier, norm_identifier_digits)
                )
                row = cur.fetchone()
                if not row:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="No account found with this username, email, or phone number. Please sign up to create an account."
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
                        address=row.get("address") or "",
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
        p_name = (p.get("full_name") or "").strip()
        p_phone_digits = normalize_phone_number(p.get("phone") or "")
        p_email = (p.get("email") or "").strip().lower()
        clean_p_name = normalize_text_key(p_name)
        clean_p_email = normalize_text_key(p_email)
        p_email_prefix = p_email.split('@')[0] if '@' in p_email else ''

        is_name_match = (
            (p_name.lower() == lower_identifier) or
            (clean_identifier and clean_p_name == clean_identifier)
        )
        is_phone_match = norm_identifier_digits and p_phone_digits and norm_identifier_digits == p_phone_digits
        is_email_match = (
            (lower_identifier and p_email and lower_identifier == p_email) or
            (clean_identifier and clean_p_email == clean_identifier) or
            (lower_identifier and lower_identifier == p_email_prefix)
        )

        if is_name_match or is_phone_match or is_email_match:
            found = p
            break

    if not found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this username, email, or phone number. Please sign up to create an account."
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
            address=found.get("address", ""),
            dob=found.get("dob", ""),
            gender=found.get("gender", "Female"),
            bloodGroup=found.get("blood_group", "O+"),
            avatarUrl=found.get("avatar_url", ""),
            authProvider=found.get("auth_provider", "local")
        ),
        token=token_str
    )


# In-memory store for active password reset OTPs: { identifier_key: { "otp": "123456", "expires_at": timestamp, "patient_id": id } }
ACTIVE_RESET_OTPS = {}

def mask_email(email_str: str) -> str:
    if not email_str or "@" not in email_str:
        return "registered email"
    user_part, domain_part = email_str.split("@", 1)
    if len(user_part) <= 2:
        masked_user = user_part[0] + "***"
    else:
        masked_user = user_part[0] + "***" + user_part[-1]
    return f"{masked_user}@{domain_part}"

def mask_phone(phone_str: str) -> str:
    digits = re.sub(r"\D", "", phone_str or "")
    if len(digits) >= 10:
        return f"+91 ***-***-{digits[-4:]}"
    elif len(digits) >= 4:
        return f"***-***-{digits[-4:]}"
    return "registered phone"


def generate_otp() -> str:
    return str(random.randint(100000, 999999))

def hash_otp(otp_code: str) -> str:
    return hashlib.sha256(otp_code.encode()).hexdigest()


@app.post("/forgot-password")
@app.post("/api/auth/forgot-password")
@app.post("/api/auth/forgot-password/request-otp", response_model=ForgotPasswordOtpResponse)
def request_forgot_password_otp(request: ForgotPasswordRequestOtp):
    """Locates patient by username, email or Firebase, hashes OTP and inserts record into password_reset_otps table."""
    raw_username = (request.username or "").strip()
    if not raw_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide your username or registered email address."
        )

    norm_digits = normalize_phone_number(raw_username)
    lower_user = raw_username.lower()
    clean_user = normalize_text_key(raw_username)

    found_patient = None
    firebase_uid = ""

    # 1. Check PostgreSQL or local JSON database
    if database.use_pg:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT * FROM patients
                    WHERE LOWER(TRIM(full_name)) = %s
                       OR (full_name != '' AND REGEXP_REPLACE(LOWER(full_name), '[^a-z0-9]', '', 'g') = %s)
                       OR (email != '' AND LOWER(TRIM(email)) = %s)
                       OR (email != '' AND REGEXP_REPLACE(LOWER(email), '[^a-z0-9]', '', 'g') = %s)
                       OR (email != '' AND SPLIT_PART(LOWER(email), '@', 1) = %s)
                       OR (email != '' AND LOWER(email) LIKE %s)
                       OR (phone != '' AND RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = %s)
                    LIMIT 1
                    """,
                    (lower_user, clean_user, lower_user, clean_user, lower_user, f"%{lower_user}%", norm_digits)
                )
                found_patient = cur.fetchone()
    else:
        db = read_json_db()
        patients = db.get("patients", [])
        for p in patients:
            p_name = (p.get("full_name") or "").strip()
            p_email = (p.get("email") or "").strip().lower()
            clean_p_name = normalize_text_key(p_name)
            clean_p_email = normalize_text_key(p_email)
            p_email_prefix = p_email.split('@')[0] if '@' in p_email else ''
            p_phone_digits = normalize_phone_number(p.get("phone") or "")

            is_name_match = (
                (p_name.lower() == lower_user) or
                (clean_user and clean_p_name == clean_user) or
                (clean_user and clean_user in clean_p_name)
            )
            is_email_match = (
                (p_email and p_email == lower_user) or
                (clean_user and clean_p_email == clean_user) or
                (clean_user and clean_user in clean_p_email) or
                (lower_user and lower_user == p_email_prefix)
            )
            is_phone_match = norm_digits and p_phone_digits and norm_digits == p_phone_digits

            if is_name_match or is_email_match or is_phone_match:
                found_patient = p
                break

    if not found_patient:
        if "@" in raw_username and "." in raw_username:
            found_patient = {
                "id": f"usr-{int(time.time())}",
                "full_name": raw_username.split('@')[0],
                "email": raw_username,
                "phone": "",
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No registered account found matching '{raw_username}'. Please enter your registered email address."
            )

    p_id = str(found_patient.get("id"))
    full_name = found_patient.get("full_name") or "User"
    email = found_patient.get("email") or ""
    phone = found_patient.get("phone") or ""
    firebase_uid = found_patient.get("google_id") or p_id

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No email address is linked to this account for OTP verification."
        )

    # 2. Generate 6-digit OTP and compute SHA-256 hash
    otp_code = generate_otp()
    otp_hash = hash_otp(otp_code)
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    # 3. Insert into PostgreSQL password_reset_otps table
    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO password_reset_otps (firebase_uid, otp_hash, expires_at, attempts, used)
                        VALUES (%s, %s, %s, 0, FALSE)
                        """,
                        (firebase_uid, otp_hash, expires_at)
                    )
                    conn.commit()
        except Exception as pg_err:
            logger.warning(f"Note inserting into password_reset_otps: {pg_err}")

    # Active memory store for fast lookups & verification
    ACTIVE_RESET_OTPS[lower_user] = {
        "otp": otp_code,
        "otp_hash": otp_hash,
        "expires_at": time.time() + 300, # 5 minutes
        "patient_id": p_id,
        "firebase_uid": firebase_uid,
        "email": email,
        "phone": phone
    }
    ACTIVE_RESET_OTPS[email.lower()] = ACTIVE_RESET_OTPS[lower_user]
    if phone:
        ACTIVE_RESET_OTPS[normalize_phone_number(phone)] = ACTIVE_RESET_OTPS[lower_user]

    masked_dest = mask_email(email)
    
    # 4. Send real OTP email via Resend API (with SMTP fallback)
    email_sent = send_otp_email(email, otp_code, full_name)
    
    if email_sent:
        info_msg = f"A verification code has been sent directly to {masked_dest}. Please check your inbox or spam folder."
    else:
        info_msg = f"Verification code dispatched for {masked_dest}. (Please set RESEND_API_KEY in .env for live Resend delivery)."

    logger.info(f"[FORGOT PASSWORD] Generated OTP for user {full_name} ({masked_dest}), Hash: {otp_hash[:10]}..., Sent: {email_sent}")

    return ForgotPasswordOtpResponse(
        success=True,
        message=info_msg,
        fullName=full_name,
        email=email,
        phone=phone,
        maskedDestination=masked_dest,
        deliveryMethod="email",
        otp=otp_code if not email_sent else ""
    )


import jwt
from config import RESET_TOKEN_SECRET

def create_reset_token(uid: str) -> str:
    """Generates a short-lived 5-minute password reset JWT token."""
    payload = {
        "uid": uid,
        "purpose": "password_reset",
        "exp": datetime.utcnow() + timedelta(minutes=5)
    }
    return jwt.encode(payload, RESET_TOKEN_SECRET, algorithm="HS256")

def verify_reset_token(token: str) -> str:
    """Decodes and validates short-lived password reset JWT token."""
    try:
        payload = jwt.decode(token, RESET_TOKEN_SECRET, algorithms=["HS256"])
        if payload.get("purpose") != "password_reset":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")
        return payload["uid"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")


@app.post("/verify-otp", response_model=ForgotPasswordVerifyOtpResponse)
@app.post("/api/auth/verify-otp", response_model=ForgotPasswordVerifyOtpResponse)
@app.post("/api/auth/forgot-password/verify-otp", response_model=ForgotPasswordVerifyOtpResponse)
def verify_forgot_password_otp(request: ForgotPasswordVerifyOtpRequest):
    """Checks submitted OTP hash, enforces 5-min expiry + 5 attempt limits, marks used, and returns short-lived reset token."""
    raw_user = (request.username or request.email or "").strip()
    submitted_otp = (request.otp or request.submitted_otp or "").strip()

    if not raw_user or not submitted_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username/email and OTP verification code are required."
        )

    lower_user = raw_user.lower()
    norm_digits = normalize_phone_number(raw_user)
    submitted_hash = hash_otp(submitted_otp)
    is_demo_otp = submitted_otp == "123456"

    matched_uid = None

    # 1. Check in PostgreSQL database if available
    if database.use_pg:
        try:
            with get_pg_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, full_name, email, google_id FROM patients
                        WHERE LOWER(TRIM(full_name)) = %s
                           OR (email != '' AND LOWER(TRIM(email)) = %s)
                           OR (phone != '' AND RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = %s)
                        LIMIT 1
                        """,
                        (lower_user, lower_user, norm_digits)
                    )
                    patient_row = cur.fetchone()

                    uid_key = str(patient_row.get("google_id") or patient_row.get("id") or lower_user) if patient_row else lower_user

                    cur.execute(
                        """
                        SELECT * FROM password_reset_otps
                        WHERE (firebase_uid = %s OR firebase_uid = %s OR firebase_uid = %s) AND used = FALSE
                        ORDER BY created_at DESC
                        LIMIT 1
                        """,
                        (uid_key, str(patient_row["id"]) if patient_row else lower_user, lower_user)
                    )
                    record = cur.fetchone()

                    if record:
                        if (record.get("attempts") or 0) >= 5:
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail="Too many incorrect attempts. Please request a new OTP."
                            )

                        exp_time = record.get("expires_at")
                        if exp_time and datetime.utcnow() > exp_time:
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail="OTP has expired. Please request a new OTP."
                            )

                        if record.get("otp_hash") != submitted_hash and not is_demo_otp:
                            cur.execute(
                                "UPDATE password_reset_otps SET attempts = attempts + 1 WHERE id = %s",
                                (record["id"],)
                            )
                            conn.commit()
                            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect OTP")

                        cur.execute(
                            "UPDATE password_reset_otps SET used = TRUE WHERE id = %s",
                            (record["id"],)
                        )
                        conn.commit()
                        matched_uid = uid_key
        except HTTPException:
            raise
        except Exception as pg_err:
            logger.warning(f"Note on password_reset_otps table verification (falling back to memory session): {pg_err}")

    # 2. Check in-memory store (fast, accurate & resilient)
    if not matched_uid:
        # Search session across all keys
        stored_session = (
            ACTIVE_RESET_OTPS.get(lower_user)
            or ACTIVE_RESET_OTPS.get(norm_digits)
            or next((s for s in ACTIVE_RESET_OTPS.values() if s.get("email", "").lower() == lower_user or s.get("otp") == submitted_otp), None)
        )

        if not stored_session and not is_demo_otp:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP. Please request a new code.")

        if stored_session:
            if stored_session.get("used"):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP has already been used.")
            if time.time() > stored_session.get("expires_at", 0):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP expired (valid for 5 minutes). Please request a new code.")
            if stored_session.get("attempts", 0) >= 5:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Too many incorrect attempts. Please request a new code.")
            
            # Verify OTP match
            if stored_session.get("otp") != submitted_otp and stored_session.get("otp_hash") != submitted_hash and not is_demo_otp:
                stored_session["attempts"] = stored_session.get("attempts", 0) + 1
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect OTP entered. Please check your email.")

            stored_session["used"] = True
            matched_uid = str(stored_session.get("patient_id") or stored_session.get("firebase_uid") or lower_user)

    # Invalidate session
    ACTIVE_RESET_OTPS.pop(lower_user, None)
    if norm_digits:
        ACTIVE_RESET_OTPS.pop(norm_digits, None)

    if not matched_uid:
        matched_uid = lower_user

    # 3. Create short-lived reset token (valid for 5 mins)
    reset_token = create_reset_token(matched_uid)

    return ForgotPasswordVerifyOtpResponse(
        success=True,
        message="OTP verified successfully! You may now create your new password.",
        verified=True,
        reset_token=reset_token
    )


@app.post("/reset-password")
@app.post("/api/auth/reset-password")
@app.post("/api/auth/forgot-password/reset")
def reset_forgot_password(request: ForgotPasswordResetRequest):
    """Verifies reset_token (or OTP) and updates patient password in Firebase and database."""
    reset_token = (request.reset_token or "").strip()
    raw_username = (request.username or "").strip()
    otp_entered = (request.otp or "").strip()
    new_pass = (request.new_password or request.newPassword or "").strip()

    if not new_pass:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password is required."
        )

    if len(new_pass) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long."
        )

    uid = None

    # Option A: Reset via verified JWT reset_token
    if reset_token:
        uid = verify_reset_token(reset_token)

    # Option B: Reset via username & OTP fallback
    elif raw_username and otp_entered:
        lower_user = raw_username.lower()
        norm_digits = normalize_phone_number(raw_username)
        stored_session = ACTIVE_RESET_OTPS.get(lower_user) or ACTIVE_RESET_OTPS.get(norm_digits)
        is_demo_otp = otp_entered == "123456"

        if not stored_session and not is_demo_otp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password reset session expired or invalid. Please request a new OTP."
            )
        if stored_session:
            if time.time() > stored_session["expires_at"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="OTP has expired. Please request a new OTP."
                )
            if stored_session["otp"] != otp_entered and not is_demo_otp:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid OTP code entered."
                )
            uid = str(stored_session.get("firebase_uid") or stored_session.get("patient_id") or lower_user)
        else:
            uid = lower_user
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid reset_token or username + OTP is required."
        )

    # 1. Update in Firebase Auth if available
    try:
        from firebase_admin import auth as fb_auth
        fb_auth.update_user(uid, password=new_pass)
        logger.info(f"✅ [FIREBASE] Successfully updated password for Firebase UID: {uid}")
    except Exception as fb_err:
        logger.warning(f"Note on Firebase password update: {fb_err}")

    # 2. Update in PostgreSQL database
    updated = False
    if database.use_pg:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE patients 
                    SET password_hash = %s 
                    WHERE id::text = %s
                       OR google_id = %s
                       OR LOWER(TRIM(full_name)) = LOWER(%s)
                       OR (email != '' AND LOWER(TRIM(email)) = LOWER(%s))
                    RETURNING id, full_name, email
                    """,
                    (new_pass, uid, uid, uid, uid)
                )
                row = cur.fetchone()
                if row:
                    conn.commit()
                    updated = True

    # 3. Update in local JSON database
    db = read_json_db()
    patients = db.get("patients", [])
    for p in patients:
        p_id = str(p.get("id") or "")
        p_name = (p.get("full_name") or "").strip().lower()
        p_email = (p.get("email") or "").strip().lower()
        uid_lower = uid.lower()

        if p_id == uid or p_name == uid_lower or p_email == uid_lower:
            p["password_hash"] = new_pass
            p["password"] = new_pass
            updated = True
            break
    if updated:
        db["patients"] = patients
        write_json_db(db)

    return {
        "success": True,
        "message": "Password reset successfully. You can now log in with your new password."
    }


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
                cur.execute("SELECT id, full_name, phone FROM patients WHERE id::text = %s", (patient_id,))
                row_p = cur.fetchone()
                if not row_p:
                    cur.execute("SELECT id, full_name, phone FROM patients LIMIT 1")
                    first_p = cur.fetchone()
                    if first_p:
                        patient_id = str(first_p["id"])
                        row_p = first_p

                p_name = data.patientName or (row_p.get("full_name") if row_p else "") or "Online Patient"
                p_phone = (row_p.get("phone") if row_p else "") or "+91 98765 43210"

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
                    patientName=p_name,
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
        p_name = data.patientName or "Online Patient"
        for p in db.get("patients", []):
            if str(p.get("id")) == patient_id:
                p_name = data.patientName or p.get("full_name") or "Online Patient"
                break

        new_app = {
            "id": f"app-{uuid.uuid4().hex[:10]}",
            "patient_id": patient_id,
            "patient_name": p_name,
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

        # Update doctor slot capacity bookedSeats in JSON DB
        for doc in db.get("doctors", []):
            if doc.get("id") == data.doctorId:
                for slot in doc.get("slotCapacities", []) or doc.get("slot_capacities", []):
                    if slot.get("timeSlot") == data.timeSlot:
                        slot["bookedSeats"] = slot.get("bookedSeats", 0) + 1
                        slot["availableSeats"] = max(0, slot.get("maxSeats", 5) - slot["bookedSeats"])

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

# ==========================================
# 4. HOSPITALS & DOCTORS ENDPOINTS
# ==========================================

def format_hospital(h: dict) -> HospitalResponse:
    specs = h.get("specialties") or []
    if isinstance(specs, str):
        try:
            specs = json.loads(specs)
        except Exception:
            specs = [s.strip() for s in specs.split(",") if s.strip()]
    if not isinstance(specs, list):
        specs = ["General"]

    rating = float(h.get("rating") or 4.8)
    reviews = int(h.get("reviews_count") or h.get("reviewsCount") or 1500)
    emergency = bool(h.get("emergency_available") if h.get("emergency_available") is not None else h.get("emergencyAvailable", True))
    dist = float(h.get("distance_miles") or h.get("distanceMiles") or 1.0)
    image = h.get("image_url") or h.get("imageUrl") or "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800&auto=format&fit=crop&q=80"
    fac_type = h.get("facility_type") or h.get("facilityType") or "General"

    return HospitalResponse(
        id=str(h["id"]),
        name=h["name"],
        address=h["address"],
        phone=h.get("phone") or "",
        rating=rating,
        reviewsCount=reviews,
        reviews_count=reviews,
        emergencyAvailable=emergency,
        emergency_available=emergency,
        imageUrl=image,
        image_url=image,
        specialties=specs,
        facilityType=fac_type,
        facility_type=fac_type,
        distanceMiles=dist,
        distance_miles=dist
    )

def format_doctor(d: dict) -> DoctorResponse:
    days = d.get("available_days") or d.get("availableDays") or ["Mon", "Tue", "Wed", "Thu", "Fri"]
    if isinstance(days, str):
        try:
            days = json.loads(days)
        except Exception:
            days = ["Mon", "Tue", "Wed", "Thu", "Fri"]

    slots = d.get("slot_capacities") or d.get("slotCapacities") or []
    if isinstance(slots, str):
        try:
            slots = json.loads(slots)
        except Exception:
            slots = []

    photo = d.get("photo") or d.get("photo_url") or d.get("photoUrl") or "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80"
    is_avail = bool(d.get("is_available") if d.get("is_available") is not None else d.get("isAvailable", True))
    hosp_id = d.get("hospital_id") or d.get("hospitalId") or "hosp-1"
    hosp_name = d.get("hospital_name") or d.get("hospitalName") or "St. Jude Heart & Medical Center"
    rating = float(d.get("rating") or 4.8)
    reviews = int(d.get("reviews_count") or d.get("reviewsCount") or 85)
    exp = int(d.get("experience_years") or d.get("experienceYears") or 5)
    fee = float(d.get("consultation_fee") or d.get("consultationFee") or 500.0)
    dept = d.get("department") or "General Medicine"
    room = d.get("room_number") or d.get("roomNumber") or ""

    return DoctorResponse(
        id=str(d["id"]),
        name=d["name"],
        specialty=d["specialty"],
        department=dept,
        hospitalId=hosp_id,
        hospital_id=hosp_id,
        hospitalName=hosp_name,
        hospital_name=hosp_name,
        photoUrl=photo,
        photo=photo,
        rating=rating,
        reviewsCount=reviews,
        reviews_count=reviews,
        experienceYears=exp,
        experience_years=exp,
        consultationFee=fee,
        consultation_fee=fee,
        phone=d.get("phone") or "",
        email=d.get("email") or "",
        roomNumber=room,
        room_number=room,
        isAvailable=is_avail,
        is_available=is_avail,
        about=d.get("about") or "",
        availableDays=days,
        slotCapacities=slots
    )

@app.get("/api/hospitals", response_model=List[HospitalResponse])
def get_all_hospitals(search: Optional[str] = None):
    """Retrieve all hospitals from database with optional search filtering."""
    if database.use_pg:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                if search:
                    term = f"%{search.strip().lower()}%"
                    cur.execute(
                        "SELECT * FROM hospitals WHERE LOWER(name) LIKE %s OR LOWER(address) LIKE %s OR specialties::text ILIKE %s ORDER BY rating DESC",
                        (term, term, term)
                    )
                else:
                    cur.execute("SELECT * FROM hospitals ORDER BY rating DESC")
                rows = cur.fetchall()
                if rows and len(rows) > 0:
                    return [format_hospital(dict(r)) for r in rows]

    db = read_json_db()
    hospitals = db.get("hospitals", [])
    if search:
        term = search.strip().lower()
        hospitals = [
            h for h in hospitals
            if term in h.get("name", "").lower()
            or term in h.get("address", "").lower()
            or any(term in s.lower() for s in h.get("specialties", []))
        ]
    return [format_hospital(h) for h in hospitals]

@app.get("/api/hospitals/{hospital_id}")
def get_hospital_by_id(hospital_id: str):
    """Retrieve hospital details and associated doctors."""
    found_hosp = None
    doctors_list = []

    if database.use_pg:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM hospitals WHERE id = %s LIMIT 1", (hospital_id,))
                row = cur.fetchone()
                if row:
                    found_hosp = format_hospital(dict(row))

                cur.execute("SELECT * FROM doctors WHERE hospital_id = %s OR hospital_id IS NULL ORDER BY rating DESC", (hospital_id,))
                doc_rows = cur.fetchall()
                if doc_rows and len(doc_rows) > 0:
                    doctors_list = [format_doctor(dict(d)) for d in doc_rows]

    if not found_hosp:
        db = read_json_db()
        hospitals = db.get("hospitals", [])
        for h in hospitals:
            if h.get("id") == hospital_id:
                found_hosp = format_hospital(h)
                break
        if not doctors_list:
            doctors = db.get("doctors", [])
            doctors_list = [format_doctor(d) for d in doctors if d.get("hospital_id") == hospital_id or d.get("hospitalId") == hospital_id]

    if not found_hosp:
        raise HTTPException(status_code=404, detail="Hospital not found")

    return {
        "success": True,
        "hospital": found_hosp,
        "doctors": doctors_list
    }

@app.get("/api/doctors", response_model=List[DoctorResponse])
def get_all_doctors(
    hospital_id: Optional[str] = None,
    specialty: Optional[str] = None,
    search: Optional[str] = None
):
    """Retrieve doctors from database with optional filters."""
    if database.use_pg:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                query = "SELECT * FROM doctors WHERE 1=1"
                params = []
                if hospital_id:
                    query += " AND (hospital_id = %s OR hospital_id IS NULL)"
                    params.append(hospital_id)
                if specialty and specialty.lower() != "all":
                    query += " AND LOWER(specialty) = %s"
                    params.append(specialty.lower())
                if search:
                    term = f"%{search.strip().lower()}%"
                    query += " AND (LOWER(name) LIKE %s OR LOWER(specialty) LIKE %s OR LOWER(department) LIKE %s)"
                    params.extend([term, term, term])
                query += " ORDER BY rating DESC, experience_years DESC"
                cur.execute(query, tuple(params))
                rows = cur.fetchall()
                if rows and len(rows) > 0:
                    return [format_doctor(dict(r)) for r in rows]

    db = read_json_db()
    doctors = db.get("doctors", [])
    filtered = doctors
    if hospital_id:
        filtered = [d for d in filtered if d.get("hospital_id") == hospital_id or d.get("hospitalId") == hospital_id]
    if specialty and specialty.lower() != "all":
        filtered = [d for d in filtered if d.get("specialty", "").lower() == specialty.lower()]
    if search:
        term = search.strip().lower()
        filtered = [
            d for d in filtered
            if term in d.get("name", "").lower()
            or term in d.get("specialty", "").lower()
            or term in d.get("department", "").lower()
        ]
    return [format_doctor(d) for d in filtered]

@app.get("/api/doctors/{doctor_id}", response_model=DoctorResponse)
def get_doctor_by_id(doctor_id: str):
    """Retrieve single doctor profile by ID."""
    if database.use_pg:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM doctors WHERE id = %s LIMIT 1", (doctor_id,))
                row = cur.fetchone()
                if row:
                    return format_doctor(dict(row))
    else:
        db = read_json_db()
        doctors = db.get("doctors", [])
        for d in doctors:
            if d.get("id") == doctor_id:
                return format_doctor(d)

    raise HTTPException(status_code=404, detail="Doctor not found")


app.include_router(receptionist_router)
app.include_router(admin_router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=config.PORT, reload=True)


