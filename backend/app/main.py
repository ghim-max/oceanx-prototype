from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.pipeline import run_pipeline, get_latest_run, get_latest_cards, get_raw_data, COMPONENTS
from app.config import ALLOWED_ORIGIN

app = FastAPI(title="OceanX Pipeline B", version="1.0.0")

# CORS for frontend only
app.add_middleware(
    CORSMiddleware,
    # ALLOWED_ORIGIN can hold several origins, comma separated
    # (e.g. http://localhost:5173,https://oceanx-prototype.vercel.app)
    allow_origins=[o.strip().rstrip("/") for o in ALLOWED_ORIGIN.split(",") if o.strip()],
    # Also allow Vercel preview deployments of this project
    allow_origin_regex=r"https://oceanx-prototype(-[a-z0-9-]+)?\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lets the live (https) Vercel site call this backend on the user's own
# laptop (http://localhost:8000). Chrome's Private Network Access needs this
# header on the preflight response.
@app.middleware("http")
async def allow_private_network(request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response


class GenerateResponse(BaseModel):
    run_id: str
    cards: list[dict]
    session: dict
    errors: list[dict] = []

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/insights/generate", response_model=GenerateResponse)
def generate_insights(only: Optional[str] = Query(None, description="Comma separated component ids to (re)generate, e.g. video-nada,learner-organiser")):
    only_list = [x.strip() for x in only.split(",") if x.strip()] if only else None
    try:
        result = run_pipeline(only=only_list)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/insights")
def get_insights():
    run_id = get_latest_run()
    if not run_id:
        raise HTTPException(status_code=404, detail="No insights generated yet")
    cards = get_latest_cards(admin=False)
    session_metrics = run_pipeline.__globals__["supabase"].table("session_metrics").select("*").execute().data
    session = session_metrics[0] if session_metrics else {}
    return {"run_id": run_id, "cards": cards, "session": session}

@app.get("/insights/admin")
def get_insights_admin():
    run_id = get_latest_run()
    if not run_id:
        raise HTTPException(status_code=404, detail="No insights generated yet")
    cards = get_latest_cards(admin=True)
    session_metrics = run_pipeline.__globals__["supabase"].table("session_metrics").select("*").execute().data
    session = session_metrics[0] if session_metrics else {}
    return {"run_id": run_id, "cards": cards, "session": session}

@app.get("/insights/raw")
def get_insights_raw():
    return get_raw_data()


@app.get("/insights/missing")
def get_missing():
    """Component ids that have no card yet (use with POST /insights/generate?only=...)."""
    have = {c["component_id"] for c in get_latest_cards(admin=True)}
    return {"missing": [c["id"] for c in COMPONENTS if c["id"] not in have]}