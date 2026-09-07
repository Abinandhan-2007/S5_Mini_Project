# backend/core/permissions.py
from typing import List, Callable, Optional, Dict, Any
from fastapi import Header, HTTPException, status
from core.security import verify_jwt


def require_role(allowed_roles: List[str]) -> Callable:
    """
    FastAPI dependency factory for enforcing role-based access control (RBAC).
    Extracts Bearer JWT from Authorization header, validates signature, and verifies role.
    """
    def role_checker(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
        if not authorization:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication credentials were not provided."
            )
        
        token = authorization
        if token.startswith("Bearer "):
            token = token[7:].strip()
            
        payload = verify_jwt(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid, expired, or malformed authentication token."
            )
            
        user_role = payload.get("role")
        if not user_role or user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Role '{user_role}' is not authorized to access this resource."
            )
            
        return payload

    return role_checker


require_superadmin = require_role(["superadmin"])
require_admin_or_superadmin = require_role(["superadmin", "admin"])
require_nurse = require_role(["nurse", "admin", "superadmin"])
require_nurse_only = require_role(["nurse"])
require_doctor = require_role(["doctor", "admin", "superadmin"])
require_receptionist = require_role(["receptionist", "admin", "superadmin"])
require_clinical_staff = require_role(["nurse", "doctor", "admin", "superadmin"])
