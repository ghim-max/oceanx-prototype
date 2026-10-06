import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

required_keys = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENROUTER_API_KEY",
    "OPENROUTER_MODEL",
    "ALLOWED_ORIGIN",
]

missing = [k for k in required_keys if not os.getenv(k)]
if missing:
    raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")

# Validate that all model IDs end with :free
main_model = os.getenv("OPENROUTER_MODEL", "")
fallback_models_str = os.getenv("OPENROUTER_FALLBACK_MODELS", "")

if not main_model.endswith(":free"):
    raise RuntimeError(
        "Only free OpenRouter models are allowed. Model ids must end with :free"
    )

fallback_models = [m.strip() for m in fallback_models_str.split(",") if m.strip()]
for model in fallback_models:
    if not model.endswith(":free"):
        raise RuntimeError(
            f"Only free OpenRouter models are allowed. Model '{model}' must end with :free"
        )

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = main_model
OPENROUTER_FALLBACK_MODELS = fallback_models
TEST_OVERRIDES = os.getenv("TEST_OVERRIDES", "")
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN")