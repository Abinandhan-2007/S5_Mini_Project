# backend/core/security.py
import datetime
import logging
from typing import Optional, Dict, Any
import bcrypt
import jwt
try:
    from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_DAYS
except ImportError:
    from backend.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_DAYS

logger = logging.getLogger("carepulse.security")

# bcrypt standard recommendation: 12 salt rounds
BCRYPT_ROUNDS = 12

# bcrypt has a fundamental hard limit of 72 bytes for the plaintext password.
# Any characters beyond 72 bytes are ignored by the Blowfish cipher.
MAX_PASSWORD_BYTES = 72


def hash_password(password: Optional[str]) -> str:
    """
    Hash a plaintext password using bcrypt with 12 salt rounds.
    
    Raises:
        ValueError: If the password is None, empty, or exceeds 72 bytes in UTF-8 encoding.
    """
    if password is None or not isinstance(password, str) or not password.strip():
        raise ValueError("Password cannot be empty or null.")

    pwd_bytes = password.encode("utf-8")
    if len(pwd_bytes) > MAX_PASSWORD_BYTES:
        raise ValueError(
            f"Password cannot exceed {MAX_PASSWORD_BYTES} bytes in UTF-8 length (provided {len(pwd_bytes)} bytes)."
        )

    # Generate salt and compute bcrypt hash
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: Optional[str], hashed_password: Optional[str]) -> bool:
    """
    Verify a plaintext password against a stored hash or legacy plaintext string.
    
    Gracefully returns False if either argument is None, empty, or invalid.
    Supports backward-compatible fallback for legacy unhashed accounts.
    """
    if plain_password is None or hashed_password is None:
        return False

    if not isinstance(plain_password, str) or not isinstance(hashed_password, str):
        return False

    plain_clean = plain_password.strip()
    hashed_clean = hashed_password.strip()

    if not plain_clean or not hashed_clean:
        return False

    pwd_bytes = plain_clean.encode("utf-8")
    if len(pwd_bytes) > MAX_PASSWORD_BYTES:
        # Passwords over 72 bytes cannot match a valid bcrypt hash
        return False

    # Check if stored value is a bcrypt hash (starts with $2a$, $2b$, or $2y$)
    is_bcrypt_hash = (
        (hashed_clean.startswith("$2a$") or hashed_clean.startswith("$2b$") or hashed_clean.startswith("$2y$"))
        and len(hashed_clean) >= 59
    )

    if is_bcrypt_hash:
        try:
            return bcrypt.checkpw(pwd_bytes, hashed_clean.encode("utf-8"))
        except Exception as e:
            logger.warning(f"Error during bcrypt password verification: {e}")
            return False

    # Fallback: Support legacy plaintext passwords from earlier test/seed records
    return plain_clean == hashed_clean


def needs_rehash(hashed_password: Optional[str]) -> bool:
    """
    Check if a stored password string is in legacy format and needs to be
    upgraded to a modern bcrypt hash upon successful login.
    """
    if not hashed_password or not isinstance(hashed_password, str):
        return False

    hashed_clean = hashed_password.strip()
    if not hashed_clean:
        return False

    is_bcrypt_hash = (
        (hashed_clean.startswith("$2a$") or hashed_clean.startswith("$2b$") or hashed_clean.startswith("$2y$"))
        and len(hashed_clean) >= 59
    )
    return not is_bcrypt_hash


def create_jwt(payload: Dict[str, Any], expires_delta: Optional[datetime.timedelta] = None) -> str:
    """Generate signed JWT token for authenticated user or staff session."""
    now = datetime.datetime.now(datetime.timezone.utc)
    expire = now + (expires_delta if expires_delta else datetime.timedelta(days=JWT_EXPIRE_DAYS))
    
    jwt_claims = {
        **payload,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp())
    }
    return jwt.encode(jwt_claims, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_jwt(token: str) -> Optional[Dict[str, Any]]:
    """Verify and decode JWT token."""
    try:
        if token.startswith("Bearer "):
            token = token[7:].strip()
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except Exception as e:
        logger.warning(f"JWT verification error: {e}")
        return None
