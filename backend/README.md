# OceanX Education - Pipeline B Backend

FastAPI service that turns Supabase feedback into 6 AI decision cards (Reuse / Adapt / Drop) per tracked component.

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your keys (see below)
```

## Environment Variables (`.env`)

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only) |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `OPENROUTER_MODEL` | Primary model ID **must end with `:free`** (e.g. `meta-llama/llama-3.1-8b-instruct:free`) |
| `OPENROUTER_FALLBACK_MODELS` | Comma-separated fallback model IDs, each **must end with `:free`** |
| `TEST_OVERRIDES` | Optional, e.g. `create-activity:Reuse,video-changi-point:Reuse` |
| `ALLOWED_ORIGIN` | Frontend origin for CORS (default `http://localhost:5173`) |

**Only free OpenRouter models are allowed.** Model IDs must end with `:free`. Find current free models at: https://openrouter.ai/models (filter by "Free"). Set your OpenRouter credit limit to $0 to avoid accidental paid usage.

## Database

Run `backend/supabase/005_pipeline_b.sql` in the Supabase SQL editor (after 001, 003, 004).

## Run

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --port 8000 --reload
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/insights/generate` | Run full pipeline, returns `{run_id, cards, session}` |
| GET | `/insights` | Latest run (cards + session, no admin fields) |
| GET | `/insights/admin` | Latest run with `rule_recommendation`, `ai_recommendation`, `guardrail_ok`, `overridden` |
| GET | `/insights/raw` | Raw data: `component_metrics`, all learner comments, educator notes by component |

## Expected Output (with sample data, no overrides)

| Component | Expected | Rule |
|-----------|----------|------|
| game | Reuse | gain≥30, learning≥4, mostly_used, time_ok |
| video-nada | Reuse | gain≥30, learning≥4, mostly_used, time_ok |
| create-activity | Adapt | Adapted, engagement≥4, gain<15 or learning<3 |
| video-changi-point | Adapt | engagement≥4, gain<15 or learning<3 |
| further-reading-unep | Drop | gain<15, mostly_skipped |
| learner-organiser | Drop | no question (gain=None), mostly_skipped |

All `guardrail_ok` should be `true`.

## Testing Overrides

Set `TEST_OVERRIDES=create-activity:Reuse,video-changi-point:Reuse` in `.env`, restart, and call `/insights/generate`. The overridden cards will have `overridden=true`, `ai_recommendation` = original AI answer, and a new `why` arguing for the override using only true facts.

## Notes

- Embeddings use `BAAI/bge-small-en-v1.5` (384 dims) via `fastembed` (local, no API key).
- LLM calls use OpenRouter with fallback models via `extra_body={"models": [...]}`.
- Rate limit (429): waits 5s, retries up to 3 times.
- 3s pause between card calls (free tier ~20 req/min).
- RLS enabled on `feedback_embeddings` and `insight_cards` with NO anon policies — only service role accesses them.