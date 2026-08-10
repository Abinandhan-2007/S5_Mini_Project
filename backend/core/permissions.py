# backend/core/permissions.py
from typing import List, Callable

def require_role(allowed_roles: List[str]) -> Callable:
    """TODO: FastAPI dependency for enforcing role-based access control (RBAC)."""
    def role_checker():
        pass
    return role_checker
