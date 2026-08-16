import os
import logging
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, auth

logger = logging.getLogger("carepulse.firebase")

def get_firebase_credentials_path() -> Path:
    backend_dir = Path(__file__).resolve().parent
    root_dir = backend_dir.parent
    
    candidates = [
        backend_dir / "secrets" / "serviceAccountKey.json",
        root_dir / "secrets" / "serviceAccountKey.json",
        root_dir / "backend" / "secrets" / "serviceAccountKey.json",
    ]
    for c in candidates:
        if c.exists():
            return c
    return candidates[0]

def initialize_firebase():
    """Initializes the Firebase Admin SDK if not already initialized."""
    if not firebase_admin._apps:
        cred_path = get_firebase_credentials_path()
        if cred_path.exists():
            try:
                cred = credentials.Certificate(str(cred_path))
                firebase_admin.initialize_app(cred)
                logger.info(f"✅ Firebase Admin initialized successfully using {cred_path.name}")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Firebase Admin: {e}")
        else:
            logger.warning(f"⚠️ Firebase service account key not found at {cred_path}")
    return firebase_admin._apps.get("[DEFAULT]")

# Initialize on import
initialize_firebase()
