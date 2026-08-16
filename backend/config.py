import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from workspace root or backend dir
backend_dir = Path(__file__).resolve().parent
root_dir = backend_dir.parent

env_path = root_dir / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

DB_USER = os.getenv("DB_USER", "carepulse_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "carepulse_secure_password")
DB_DATABASE = os.getenv("DB_DATABASE", "carepulse_db")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
PORT = int(os.getenv("PORT", "5000"))

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", " ")
JWT_SECRET = os.getenv("JWT_SECRET", "carepulse_super_secret_jwt_key_2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 30

# SMTP Real Email Dispatch Configuration (supports Gmail, Outlook, Brevo, SendGrid, etc.)
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "CarePulse Security")

INIT_SQL_PATH = root_dir / "database" / "init.sql"
JSON_DB_PATH = root_dir / "database" / "database.json"
