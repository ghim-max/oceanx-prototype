import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

# ALLOW_GENERATE=false on the hosted backend: it only serves saved cards,
# so it does not need the AI model keys. Generate runs on the laptop.
ALLOW_GENERATE = os.getenv("ALLOW_GENERATE", "true").strip().lower() != "false"

required_keys = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ALLOWED_ORIGIN"]
if ALLOW_GENERATE:
    required_keys += ["ANTHROPIC_API_KEY"]

missing = [k for k in required_keys if not os.getenv(k)]
if missing:
    raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
AI_MODEL = os.getenv("AI_MODEL", "claude-haiku-4-5")
TEST_OVERRIDES = os.getenv("TEST_OVERRIDES", "")
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN")
