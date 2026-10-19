from typing import Optional
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.pipeline import run_pipeline, get_latest_run, get_latest_cards, get_raw_data, COMPONENTS
from app.config import ALLOWED_ORIGIN, ALLOW_GENERATE
from app.db import supabase
from app.bank_draft import draft_components, DRAFTABLE_COMPONENTS, load_source
from app.bank_rules import run_auto_checks
import uuid
import secrets

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


class BankPatch(BaseModel):
    status: Optional[str] = None        # "approved" | "rejected"
    question: Optional[str] = None
    options: Optional[list[str]] = None
    correct_index: Optional[int] = None
    answer: Optional[str] = None
    key_points: Optional[list[str]] = None
    difficulty: Optional[str] = None

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/insights/generate", response_model=GenerateResponse)
def generate_insights(only: Optional[str] = Query(None, description="Comma separated component ids to (re)generate, e.g. video-nada,learner-organiser")):
    if not ALLOW_GENERATE:
        raise HTTPException(status_code=403, detail="Generate is turned off on the hosted version. Run it on the laptop.")
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


# ---------------------------------------------------------------------------
# Question bank (Phase B1)
# ---------------------------------------------------------------------------

@app.post("/bank/draft")
def draft_bank(
    component_ids: Optional[str] = Query(
        None,
        description="Comma-separated component ids to draft. Defaults to all draftable.",
    )
):
    """
    Draft question bank items using AI.
    Source files in app/sources/{component_id}.md must be filled in first.
    Do not call this until the source files contain real OceanX text.
    """
    if not ALLOW_GENERATE:
        raise HTTPException(
            status_code=403,
            detail="Generate is disabled on the hosted version. Run on the laptop.",
        )
    id_list = (
        [x.strip() for x in component_ids.split(",") if x.strip()]
        if component_ids
        else None
    )
    try:
        result = draft_components(id_list, supabase)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/bank/approved")
def get_approved_bank(
    component_id: Optional[str] = Query(None, description="Filter by component id"),
):
    """
    Return approved question bank items.
    Anon-readable — prototype only; move scoring server-side before production.
    """
    query = (
        supabase.table("question_bank")
        .select("*")
        .eq("status", "approved")
    )
    if component_id:
        query = query.eq("component_id", component_id)
    result = query.order("component_id").order("created_at").execute()
    return result.data or []


@app.get("/bank")
def get_bank(
    component_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="draft | approved | rejected"),
):
    """Return question bank items (all statuses by default). Team use only."""
    query = supabase.table("question_bank").select("*")
    if component_id:
        query = query.eq("component_id", component_id)
    if status:
        query = query.eq("status", status)
    result = query.order("component_id").order("created_at").execute()
    return result.data or []


@app.patch("/bank/{item_id}")
def patch_bank_item(item_id: str, body: BankPatch):
        """
        Update status and/or question fields.
        Re-runs all auto-checks whenever question content is edited.
        """
        current_result = (
            supabase.table("question_bank")
            .select("*")
            .eq("id", item_id)
            .execute()
        )
        if not current_result.data:
            raise HTTPException(status_code=404, detail="Item not found")
        current = current_result.data[0]

        update: dict = {}

        is_status = body.status is not None
        is_edit = any(
            getattr(body, f) is not None
            for f in ("question", "options", "correct_index", "answer", "key_points", "difficulty")
        )

        if is_status:
            if body.status not in ("approved", "rejected"):
                raise HTTPException(
                    status_code=422, detail="status must be 'approved' or 'rejected'"
                )
            update["status"] = body.status
            update["reviewed_at"] = datetime.now(timezone.utc).isoformat()

        if is_edit:
            if body.question is not None:
                update["question"] = body.question
            if body.options is not None:
                update["options"] = body.options
            if body.correct_index is not None:
                update["correct_index"] = body.correct_index
            if body.answer is not None:
                update["answer"] = body.answer
            if body.key_points is not None:
                update["key_points"] = body.key_points
            if body.difficulty is not None:
                update["difficulty"] = body.difficulty

            # Re-run auto checks against the merged item state
            merged = {**current, **update}
            try:
                src = load_source(merged["component_id"])
            except (FileNotFoundError, ValueError):
                src = None  # source not available; skip verbatim check gracefully

            siblings = (
                supabase.table("question_bank")
                .select("question")
                .eq("component_id", merged["component_id"])
                .neq("id", item_id)
                .execute()
            )
            sibling_questions = [r["question"] for r in (siblings.data or [])]
            passed, notes = run_auto_checks(merged, src, sibling_questions)
            update["auto_check_passed"] = passed
            update["auto_check_notes"] = notes

        if not update:
            return {"ok": True, "item": current}

        updated = (
            supabase.table("question_bank")
            .update(update)
            .eq("id", item_id)
            .execute()
        )
        return {"ok": True, "item": updated.data[0] if updated.data else None}


# ---------------------------------------------------------------------------
# Quiz packages (Phase B2)
# ---------------------------------------------------------------------------

class PackageCreate(BaseModel):
    audience: str
    picks: list[dict]
    recommendations: list[dict]
    quiz_title: Optional[str] = None
    lesson_plan_title: Optional[str] = None
    lesson_plan_url: Optional[str] = None
    educator_email: Optional[str] = None  # stored in educator_picks only
    component_ids: Optional[list[str]] = None  # from assembleQuiz
    options: Optional[dict] = None             # quiz options/config
    item_ids: Optional[list[str]] = None       # question_bank item ids


class PackageResponse(BaseModel):
    id: str
    slug: str
    audience: str
    picks: list[dict]
    recommendations: list[dict]
    quiz_title: Optional[str] = None
    lesson_plan_title: Optional[str] = None
    lesson_plan_url: Optional[str] = None
    component_ids: list[str] = []
    options: Optional[dict] = None
    item_ids: list[str] = []
    created_at: str


class LearnerPackageFeedback(BaseModel):
    session_id: str
    satisfaction: Optional[int] = None
    would_recommend: Optional[bool] = None
    confidence_post: Optional[int] = None
    helped_most: Optional[str] = None
    least_useful: Optional[str] = None
    comment: Optional[str] = None
    is_sample: bool = False


class EducatorPackageFeedbackRow(BaseModel):
    component_id: str
    usage: str  # kept | changed | skipped
    rating: Optional[int] = None
    engagement: Optional[int] = None
    time_fit: Optional[str] = None
    curriculum_fit: Optional[int] = None
    adaptation_helped: Optional[int] = None
    note: Optional[str] = None
    is_sample: bool = False


class EducatorPackageFeedback(BaseModel):
    rows: list[EducatorPackageFeedbackRow]
    is_sample: bool = False


def generate_slug() -> str:
    """Generate a short, url-safe slug."""
    # 8 chars: ~2.8 trillion combinations, very low collision chance
    return secrets.token_urlsafe(6)[:8]


@app.post("/packages", response_model=PackageResponse)
def create_package(body: PackageCreate):
    """
    Create a quiz package from an educator's review.
    Returns the package with its public slug.
    """
    slug = generate_slug()
    # Ensure slug is unique (retry on collision)
    for _ in range(3):
        exists = supabase.table("quiz_packages").select("id").eq("slug", slug).execute()
        if not exists.data:
            break
        slug = generate_slug()
    else:
        raise HTTPException(status_code=500, detail="Could not generate unique slug")

    pkg_data = {
        "slug": slug,
        "audience": body.audience,
        "picks": body.picks,
        "recommendations": body.recommendations,
        "quiz_title": body.quiz_title,
        "lesson_plan_title": body.lesson_plan_title,
        "lesson_plan_url": body.lesson_plan_url,
        "component_ids": body.component_ids or [],
        "options": body.options or [],
        "item_ids": body.item_ids or [],
        "status": "active",
    }
    result = supabase.table("quiz_packages").insert(pkg_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create package")
    pkg = result.data[0]

    # Store educator picks: one row per component
    # Determine which components are in quiz/lesson_plan from item_ids
    quiz_component_ids = set()
    if body.item_ids:
        # Fetch question_bank items to get their component_ids
        item_result = supabase.table("question_bank").select("id, component_id").in_("id", body.item_ids).execute()
        for item in item_result.data or []:
            quiz_component_ids.add(item["component_id"])

    for pick in body.picks:
        comp_id = pick["id"]
        supabase.table("educator_picks").upsert({
            "package_id": pkg["id"],
            "component_id": comp_id,
            "educator_email": body.educator_email or "",
            "quiz_included": comp_id in quiz_component_ids,
            "lesson_plan_included": False,  # lesson plan not built yet
        }, on_conflict="package_id,component_id").execute()

    return pkg


@app.get("/packages/{slug}", response_model=PackageResponse)
def get_package(slug: str):
    """
    Get a package by slug. Anon-readable for active packages.
    Used by /quiz/p/:slug and /educator/p/:slug frontend pages.
    """
    result = supabase.table("quiz_packages").select("*").eq("slug", slug).eq("status", "active").execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Package not found")
    return result.data[0]


@app.post("/packages/{slug}/learner-feedback")
def submit_learner_package_feedback(slug: str, body: LearnerPackageFeedback):
    """
    Submit learner feedback for a specific package.
    Anon can insert (for learners taking the quiz).
    """
    # Verify package exists and is active
    pkg_result = supabase.table("quiz_packages").select("id").eq("slug", slug).eq("status", "active").execute()
    if not pkg_result.data:
        raise HTTPException(status_code=404, detail="Package not found")
    package_id = pkg_result.data[0]["id"]

    feedback_data = {
        "package_id": package_id,
        "session_id": body.session_id,
        "satisfaction": body.satisfaction,
        "would_recommend": body.would_recommend,
        "confidence_post": body.confidence_post,
        "helped_most": body.helped_most,
        "least_useful": body.least_useful,
        "comment": body.comment,
        "is_sample": body.is_sample,
    }
    result = supabase.table("learner_package_feedback").insert(feedback_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save feedback")
    return {"ok": True, "id": result.data[0]["id"]}


@app.post("/packages/{slug}/educator-feedback")
def submit_educator_package_feedback(slug: str, body: EducatorPackageFeedback):
    """
    Submit educator feedback for a specific package.
    Links each row to the package via package_id.
    """
    pkg_result = supabase.table("quiz_packages").select("id").eq("slug", slug).eq("status", "active").execute()
    if not pkg_result.data:
        raise HTTPException(status_code=404, detail="Package not found")
    package_id = pkg_result.data[0]["id"]

    if not body.rows:
        return {"ok": True}

    submission_id = str(uuid.uuid4())
    rows_with_pkg = [
        {
            "submission_id": submission_id,
            "story_id": "seagrass-stories",
            "audience": "university",
            "version_id": "v-university",
            "component_id": r.component_id,
            "usage": r.usage,
            "rating": r.rating,
            "engagement": r.engagement,
            "time_fit": r.time_fit,
            "curriculum_fit": r.curriculum_fit,
            "adaptation_helped": r.adaptation_helped,
            "note": r.note,
            "package_id": package_id,
            "is_sample": r.is_sample,
        }
        for r in body.rows
    ]
    result = supabase.table("educator_responses").insert(rows_with_pkg).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save feedback")
    return {"ok": True, "submission_id": submission_id, "count": len(result.data)}


class LearnerPackageResponse(BaseModel):
    session_id: str
    question_index: int
    item_id: Optional[str] = None
    component_id: Optional[str] = None
    answer_index: Optional[int] = None
    answer_text: Optional[str] = None
    is_correct: Optional[bool] = None
    time_spent_ms: Optional[int] = None
    is_sample: bool = False


@app.post("/packages/{slug}/learner-responses")
def submit_learner_package_responses(slug: str, body: list[LearnerPackageResponse]):
    """
    Submit learner answers for a specific package quiz.
    One row per question answered.
    """
    pkg_result = supabase.table("quiz_packages").select("id").eq("slug", slug).eq("status", "active").execute()
    if not pkg_result.data:
        raise HTTPException(status_code=404, detail="Package not found")
    package_id = pkg_result.data[0]["id"]

    if not body:
        return {"ok": True}

    rows_with_pkg = [
        {
            "package_id": package_id,
            "session_id": r.session_id,
            "question_index": r.question_index,
            "item_id": r.item_id,
            "component_id": r.component_id,
            "answer_index": r.answer_index,
            "answer_text": r.answer_text,
            "is_correct": r.is_correct,
            "time_spent_ms": r.time_spent_ms,
            "is_sample": r.is_sample,
        }
        for r in body
    ]
    result = supabase.table("learner_package_responses").insert(rows_with_pkg).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save responses")
    return {"ok": True, "count": len(result.data)}


class IssueReport(BaseModel):
    page_url: str
    user_agent: Optional[str] = None
    message: str
    severity: str = "medium"
    is_sample: bool = False


@app.post("/packages/{slug}/report-issue")
def submit_issue_report(slug: str, body: IssueReport):
    """
    Submit an issue report for a specific package/page.
    """
    # Verify package exists (optional, but good practice)
    pkg_result = supabase.table("quiz_packages").select("id").eq("slug", slug).eq("status", "active").execute()
    if not pkg_result.data:
        raise HTTPException(status_code=404, detail="Package not found")

    report_data = {
        "page_url": body.page_url,
        "user_agent": body.user_agent,
        "message": body.message,
        "severity": body.severity,
        "is_sample": body.is_sample,
    }
    result = supabase.table("issue_reports").insert(report_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save issue report")
    return {"ok": True, "id": result.data[0]["id"]}