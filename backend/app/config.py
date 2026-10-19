import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

# ALLOW_GENERATE=true on hosted backend: generate runs live.
# AI endpoints (POST /insights/generate, POST /bank/draft) require
# ADMIN_TOKEN header (checked in main.py). Frontend sends it only in
# ?admin=1 mode from VITE_ADMIN_TOKEN.
required_keys = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ALLOWED_ORIGIN", "ANTHROPIC_API_KEY", "ADMIN_TOKEN"]

missing = [k for k in required_keys if not os.getenv(k)]
if missing:
    raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
AI_MODEL = os.getenv("AI_MODEL", "claude-haiku-5-5")
TEST_OVERRIDES = os.getenv("TEST_OVERRIDES", "")
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN")
