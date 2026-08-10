# backend/core/security.py
from typing import Optional, Dict, Any

def hash_password(password: str) -> str:
    """TODO: Hash password using bcrypt or argon2."""
    pass

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """TODO: Verify plain password against hashed password."""
    pass

def create_jwt(payload: Dict[str, Any], expires_delta: Optional[int] = None) -> str:
    """TODO: Generate JWT token for authenticated staff session."""
    pass

def verify_jwt(token: str) -> Optional[Dict[str, Any]]:
    """TODO: Verify and decode staff JWT token."""
    pass
