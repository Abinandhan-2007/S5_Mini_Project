import base64
import json
import logging
import uuid
from typing import Optional, Dict, Any
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

import datetime
import jwt
from config import GOOGLE_CLIENT_ID, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_DAYS
from database import use_pg, get_pg_connection, read_json_db, write_json_db
from schemas import PatientResponse, AuthResponse

logger = logging.getLogger("carepulse.auth")

def generate_patient_jwt(patient_id: str, email: str) -> str:
    """Generate signed JWT token for persistent patient session (~30 days)."""
    now = datetime.datetime.now(datetime.timezone.utc)
    expire = now + datetime.timedelta(days=JWT_EXPIRE_DAYS)
    payload = {
        "sub": str(patient_id),
        "patient_id": str(patient_id),
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "patient"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_patient_jwt(token: str) -> Optional[Dict[str, Any]]:
    """Decode and verify patient JWT token."""
    try:
        if token.startswith("Bearer "):
            token = token[7:].strip()
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except Exception as e:
        logger.warning(f"Patient JWT decode error: {e}")
        return None

# Persistent cached session for Google public certificates and HTTPS connection pooling
_google_session = requests.Session()
_google_request = google_requests.Request(session=_google_session)


def verify_google_token(credential: str) -> Optional[Dict[str, Any]]:
    """
    Cryptographically verify Google OAuth ID token signature using Google's public certificates.
    Uses google-auth's id_token.verify_oauth2_token which validates the cryptographic signature
    and checks expiration & audience against internally cached Google certificates.
    """
    if not credential or not isinstance(credential, str):
        return None

    clean_client_id = GOOGLE_CLIENT_ID.strip() if GOOGLE_CLIENT_ID else None

    # Cryptographic RSA/ECDSA signature verification against Google's public certs
    try:
        id_info = id_token.verify_oauth2_token(
            credential,
            _google_request,
            audience=clean_client_id if clean_client_id else None
        )
        if id_info and "email" in id_info:
            return {
                "google_id": id_info.get("sub"),
                "email": id_info.get("email"),
                "name": id_info.get("name", id_info.get("email", "").split("@")[0]),
                "picture": id_info.get("picture", ""),
                "email_verified": id_info.get("email_verified", True),
            }
    except Exception as e:
        logger.warning(f"Google ID token cryptographic verification note: {e}")

    return None

def process_google_login(google_user: Dict[str, Any]) -> AuthResponse:
    """Find or create patient in PostgreSQL or JSON database fallback."""
    import database
    
    email = google_user["email"]
    google_id = google_user.get("google_id")
    name = google_user.get("name", email.split("@")[0])
    picture = google_user.get("picture", "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=80")

    if database.use_pg:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                # Find existing user
                cur.execute(
                    "SELECT * FROM patients WHERE google_id = %s OR email = %s LIMIT 1",
                    (google_id, email)
                )
                row = cur.fetchone()

                if row:
                    # Update google_id and avatar if missing
                    cur.execute(
                        """
                        UPDATE patients 
                        SET google_id = COALESCE(google_id, %s),
                            avatar_url = COALESCE(NULLIF(avatar_url, ''), %s),
                            auth_provider = 'google'
                        WHERE id = %s
                        RETURNING *
                        """,
                        (google_id, picture, row["id"])
                    )
                    row = cur.fetchone()
                else:
                    # Insert new user
                    cur.execute(
                        """
                        INSERT INTO patients (full_name, email, google_id, avatar_url, auth_provider, phone, dob, gender, blood_group)
                        VALUES (%s, %s, %s, %s, 'google', '', CURRENT_DATE, 'Not specified', 'O+')
                        RETURNING *
                        """,
                        (name, email, google_id, picture)
                    )
                    row = cur.fetchone()
                conn.commit()

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
                avatarUrl=row.get("avatar_url") or picture,
                authProvider="google"
            ),
            token=token_str
        )
    else:
        # JSON Database fallback
        db = read_json_db()
        patients = db.get("patients", [])
        found = None
        for p in patients:
            if p.get("google_id") == google_id or p.get("email") == email:
                found = p
                break

        if found:
            if not found.get("google_id"):
                found["google_id"] = google_id
            if picture and not found.get("avatar_url"):
                found["avatar_url"] = picture
            found["auth_provider"] = "google"
        else:
            found = {
                "id": str(uuid.uuid4()),
                "full_name": name,
                "email": email,
                "phone": "",
                "dob": "1995-07-24",
                "gender": "Not specified",
                "bloodGroup": "O+",
                "avatar_url": picture,
                "google_id": google_id,
                "auth_provider": "google"
            }
            patients.append(found)
            db["patients"] = patients

        write_json_db(db)

        token_str = generate_patient_jwt(str(found["id"]), found["email"])
        return AuthResponse(
            success=True,
            user=PatientResponse(
                id=found["id"],
                fullName=found["full_name"],
                email=found["email"],
                phone=found.get("phone", ""),
                dob=found.get("dob", ""),
                gender=found.get("gender", "Not specified"),
                bloodGroup=found.get("blood_group", "O+"),
                avatarUrl=found.get("avatar_url", picture),
                authProvider="google"
            ),
            token=token_str
        )
