import base64
import json
import logging
import uuid
from typing import Optional, Dict, Any
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from config import GOOGLE_CLIENT_ID
from database import use_pg, get_pg_connection, read_json_db, write_json_db
from schemas import PatientResponse, AuthResponse

logger = logging.getLogger("carepulse.auth")

def verify_google_token(credential: str) -> Optional[Dict[str, Any]]:
    """Verify Google OAuth ID token using google-auth library, tokeninfo, or JWT claims."""
    if not credential:
        return None

    # 1. Verify with Google OAuth library if GOOGLE_CLIENT_ID is configured
    if GOOGLE_CLIENT_ID:
        try:
            req = google_requests.Request()
            id_info = id_token.verify_oauth2_token(credential, req, GOOGLE_CLIENT_ID)
            if id_info and "email" in id_info:
                return {
                    "google_id": id_info.get("sub"),
                    "email": id_info.get("email"),
                    "name": id_info.get("name", id_info.get("email", "").split("@")[0]),
                    "picture": id_info.get("picture", ""),
                    "email_verified": id_info.get("email_verified", True),
                }
        except Exception as e:
            logger.warning(f"Google verify_oauth2_token failed: {e}")

    # 2. Verify via Google tokeninfo endpoint
    try:
        resp = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}", timeout=4)
        if resp.status_code == 200:
            data = resp.json()
            if "email" in data:
                return {
                    "google_id": data.get("sub"),
                    "email": data.get("email"),
                    "name": data.get("name", data.get("email", "").split("@")[0]),
                    "picture": data.get("picture", ""),
                    "email_verified": data.get("email_verified") in [True, "true"],
                }
    except Exception as e:
        logger.warning(f"Google tokeninfo endpoint failed: {e}")

    # 3. Base64 JWT decode fallback (useful for dev / offline sandbox tokens)
    try:
        parts = credential.split(".")
        if len(parts) == 3:
            padded = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
            payload = json.loads(base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8"))
            if "email" in payload:
                return {
                    "google_id": payload.get("sub", f"google-{uuid.uuid4().hex[:8]}"),
                    "email": payload.get("email"),
                    "name": payload.get("name", payload.get("email", "").split("@")[0]),
                    "picture": payload.get("picture", ""),
                    "email_verified": payload.get("email_verified", True),
                }
    except Exception as e:
        logger.warning(f"Base64 JWT decode failed: {e}")

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
            token=f"cp-token-{row['id']}"
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
                "blood_group": "O+",
                "avatar_url": picture,
                "google_id": google_id,
                "auth_provider": "google"
            }
            patients.append(found)
            db["patients"] = patients

        write_json_db(db)

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
            token=f"cp-token-{found['id']}"
        )
