# OceanX Education Prototype (Group 4)

A working prototype that helps the **OceanX Education** team reuse and improve its learning content. Educators adapt the Seagrass Stories resources for their class and receive them by email. Learners take a short quiz before and after class. The OceanX team reviews feedback, AI suggestions and educator contributions in one place.

Built by Group 4 for **IS615 Digital Transformation Strategy** (SMU, Master of IT in Business), with OceanX as project sponsor.

- Live demo: https://oceanx-prototype.vercel.app
- Backend health check: `https://<your-render-service>.onrender.com/health`

---

## Contents

1. [What it does](#what-it-does)
2. [What is real and what is mocked](#what-is-real-and-what-is-mocked)
3. [Tech stack and architecture](#tech-stack-and-architecture)
4. [Repository structure](#repository-structure)
5. [Run it locally](#run-it-locally)
6. [Deploy your own copy](#deploy-your-own-copy)
7. [Demo walkthrough](#demo-walkthrough)
8. [Reuse it for another story or organisation](#reuse-it-for-another-story-or-organisation)
9. [Design rules worth keeping](#design-rules-worth-keeping)
10. [Known limitations](#known-limitations)
11. [Credits and licence](#credits-and-licence)

---

## What it does

The prototype covers two interventions.

**Intervention 1: Content insights loop (for the OceanX team)**
- **Overview** (`/team/overview`): library health, team time and reach, using OceanX's October figures.
- **Insights** (`/team/insights`): AI decision cards that recommend **Reuse, Adapt or Drop** for each component, based on learner and educator feedback. The team confirms or overrides each one, with a reason.
- **Question bank** (`/team/bank`): AI-drafted quiz questions grounded in approved source files. The team approves, edits or drops each one.
- **Review** (`/team/review`): one queue of tickets for flagged packages, share backs (including new material from educators) and issue reports.
- **Decision log** (`/team/log`): every decision, override and reason, with filters and CSV export.

**Intervention 2: Educator adaptation and sharing (for educators and learners)**
- **Library** (`/partner/library`): browse Seagrass Stories components by stage, type and audience.
- **Adapt** (`/partner/adapt`): build a package. Optionally add a quiz (assembled from the approved question bank) and a lesson plan, and ask AI to rewrite "Adapted" components for the class level.
- **Send** (`/partner/adapt/review`): the package is created and emailed to the educator straight away. The email links to the learner quiz, the lesson plan, the feedback form and the share page.
- **Learner quiz** (`/quiz/p/:slug`): a pre-class and post-class knowledge check with a confidence rating. No names or emails are collected.
- **Lesson plan** (`/lesson/p/:slug`): a printable plan with "Report an issue" on each section.
- **Educator feedback** (`/educator/p/:slug`): how each component worked, plus "Share your changed version".
- **Share your materials** (`/educator/share`): educators share their own seminar material as a link. It appears in the library under its stage with a **Co-created** tag and their name.

---

## What is real and what is mocked

Be clear about this before reusing the work.

| Area | Status |
|---|---|
| Library, packages, quiz, lesson plan, feedback forms | **Real.** Stored in Supabase through the FastAPI backend |
| Package email | **Real.** Sent from the browser with EmailJS |
| Insight AI (decision cards) and question bank drafts | **Real.** Claude Haiku via the Anthropic API, grounded in approved sources |
| Feedback comment search | **Real.** pgvector embeddings in Supabase (`feedback_embeddings`) |
| Review queue, decision log, library state, co-created items | **Mocked.** Stored in the browser (`localStorage`). Each browser has its own copy |
| Package screening ("AI flagged") | **Mocked.** Simple rules that catch absolute claims and unsupported numbers |
| AI rewrite on the Adapt page | **Mocked** text in the current build (canned rewrite). A real endpoint is planned (approved sources plus a number guardrail) |
| Overview numbers | **Real OceanX October 2026 figures**, hard coded in `frontend/src/team/data/oceanxMetrics.ts`. "Hours saved" uses an assumed reduction, shown on hover |
| Lesson plan PDF in the email | A **static sample** in `frontend/public/files/` |

All mock data goes through two files, so moving to a real database later only touches these:
- `frontend/src/team/data/governanceService.ts`
- `frontend/src/team/data/packageReviewService.ts`

---

## Tech stack and architecture

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, CSS Modules, lucide-react icons |
| Backend | FastAPI (Python 3.11) |
| Database | Supabase (Postgres + pgvector) |
| AI | Claude Haiku (`claude-haiku-5-5`) via the Anthropic SDK; fastembed for embeddings |
| Email | EmailJS (sent from the browser) |
| Hosting | Vercel (frontend), Render (backend), GitHub Actions keep-alive |

```
 Educator / Learner / OceanX team (browser)
              |
     React app on Vercel ------------------> EmailJS (package email)
              |        \
              |         \--> localStorage (mock review queue, decision log)
              v
     FastAPI on Render  --> Anthropic API (Claude Haiku)
              |
              v
     Supabase Postgres + pgvector
```

**Grounding rule:** the AI may only use the approved source files in `backend/app/sources/*.md`. They are passed whole to the model. There is no web access.

---

## Repository structure

```
.
├── frontend/                  React app (Vite)
│   ├── public/                Static files served at the site root
│   │   ├── email/             Email header image
│   │   ├── files/             Sample PDFs (lesson plan, shared seminar activity)
│   │   └── images/            Co-created cover image
│   ├── src/
│   │   ├── pages/             Entry page (role picker)
│   │   ├── partner/           Educator flow: library, adapt, review, email preview
│   │   ├── educator/          Educator feedback and share material pages
│   │   ├── learner/           Quiz and lesson plan pages
│   │   ├── team/              OceanX team pages and mock data services
│   │   ├── shared/            Shared UI, email builder, services, story data
│   │   └── index.css          Design tokens (the ONLY place CSS variables are defined)
│   └── .env.example
├── backend/
│   ├── app/                   FastAPI app (main.py, llm.py, pipeline, bank, retrieval)
│   │   └── sources/           Approved source files the AI may use
│   ├── supabase/              SQL migrations 001 to 011 (run in order)
│   ├── requirements.txt
│   └── .env.example
├── Images/                    Photos imported by the frontend (e.g. entry page cards). Keep this folder
├── .github/workflows/         keepalive.yml (pings the Render backend)
├── render.yaml                Render service definition
├── DESIGN.md, PRODUCT.md      Design system and product context
└── package.json               Root scripts (dev, build, preview)
```

---

## Run it locally

### 1. What you need

- Node.js 20.19 or newer, and npm
- Python 3.11
- A free **Supabase** project
- An **Anthropic API key** (for the AI features)
- A free **EmailJS** account (for sending the package email)

### 2. Clone

```bash
git clone https://github.com/ghim-max/oceanx-prototype-group4.git
cd oceanx-prototype-group4
```

### 3. Database (Supabase)

1. Create a Supabase project. Under **Database > Extensions**, enable `vector`.
2. Open the **SQL editor** and run every file in `backend/supabase/` **in number order**, from `001_schema.sql` to `011_lesson_plan.sql`.
   - `002_seed_sample_data.sql` loads clearly labelled sample data (`is_sample = true`). It is safe to re-run.
3. Copy these from **Project Settings > API**: the project URL, the `anon` key and the `service_role` key.

### 4. Backend

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Fill in `backend/.env`:

| Variable | What it is |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key. **Backend only, never in the frontend** |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `AI_MODEL` | `claude-haiku-5-5` |
| `ALLOWED_ORIGIN` | Frontend URL for CORS, e.g. `http://localhost:5173` |
| `ADMIN_TOKEN` | Any long random string. Protects the AI endpoints (sent as `X-Admin-Token`) |
| `TEST_OVERRIDES` | Optional. Leave empty |

Run it:

```bash
.venv/bin/uvicorn app.main:app --port 8000 --reload
```

Check http://localhost:8000/health returns OK.

### 5. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
```

Fill in `frontend/.env.local`:

| Variable | What it is |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase `anon` key (public, safe for the browser) |
| `VITE_INSIGHTS_API_URL` | Backend URL, e.g. `http://localhost:8000` |
| `VITE_EMAILJS_SERVICE_ID` | EmailJS service ID |
| `VITE_EMAILJS_TEMPLATE_ID` | EmailJS template ID |
| `VITE_EMAILJS_PUBLIC_KEY` | EmailJS public key |
| `VITE_PUBLIC_BASE_URL` | Full site URL used in email links, no trailing slash. Leave empty locally (falls back to the current origin) |
| `VITE_EMAIL_ASSET_BASE_URL` | Optional. Where email images and PDFs are served from. Defaults to the live demo |
| `VITE_DEMO_EMAIL` | Optional. Pre-fills the email field |
| `VITE_ADMIN_TOKEN` | Optional. Only for `?admin=1` mode that triggers AI runs from the UI |

From the repo root:

```bash
npm run dev
```

Open http://localhost:5173.

### 6. EmailJS template

Create one template in EmailJS with:
- **To email:** `{{to_email}}`
- **Subject:** `{{subject}}`
- **Content:** `{{{email_html}}}` (three braces, so the HTML is not escaped)

The email HTML itself is built in `frontend/src/shared/email/packageEmail.ts`.

---

## Deploy your own copy

**Frontend on Vercel**
1. Import the repo. Set **Root Directory** to `frontend`.
2. Add the frontend environment variables above.
   - Set `VITE_PUBLIC_BASE_URL` for **Production only** (your live URL). Leave it unset for Preview, so branch previews link to themselves.
   - Add the EmailJS, Supabase and API variables to **both Production and Preview**.
3. `frontend/vercel.json` already rewrites all routes to `index.html`.
4. Vite reads these variables at build time, so **redeploy after any change**.

**Backend on Render**
1. Create a new Blueprint from `render.yaml`, or a Python web service with root `backend`.
2. Add the backend environment variables. Set `ALLOWED_ORIGIN` to your Vercel URL.

**Keep-alive (optional)**
Render's free tier sleeps when idle. `.github/workflows/keepalive.yml` pings `/health` every 10 minutes. Add a repository secret `RENDER_HEALTH_URL` with your backend health URL. GitHub's scheduler is not always reliable; a free uptime monitor (e.g. UptimeRobot or cron-job.org) is a sturdier option.

---

## Demo walkthrough

### Step 1: Pick your role on the entry page (`/`)

There is no login. The entry page at `/` asks who you are. Pick one of two cards:

| Card on the entry page | Who it is for | Where it takes you |
|---|---|---|
| **I'm a partner** | An **educator** (teacher, lecturer, facilitator) who wants to use OceanX content with their learners | `/partner`, where you choose an audience: **Schools**, **University** or **Museum**. Pick **University** for the full demo (AI rewrite, quiz and lesson plan are set up for University) |
| **OceanX Education team** | **OceanX staff** who manage the content library | `/team/overview`, the team dashboard |

**Learners do not pick a role.** They never see the entry page. They only reach the quiz through the link in the educator's email (see Step 3).

You can come back to `/` at any time to switch role. Note that opening `/` also resets the shared-material demo (see Step 4).

### Step 2: Educator builds and sends a package

1. On the entry page, pick **I'm a partner**, then **University**.
2. `/partner/library`: pick the components you want.
3. `/partner/adapt`: turn on the quiz and the lesson plan. Optionally ask AI to rewrite an "Adapted" component.
4. `/partner/adapt/review`: enter **your own email address** and send.

The package is created and the email is sent straight away. Check your inbox (and spam).

### Step 3: The email is the only way into the after-class pages

There are no accounts, so pages that belong to one package are reached **only through the links in that package's email**. Each link carries the package code (the "slug", e.g. `/quiz/p/4km3hQbt`), which tells the page which package it belongs to.

| Link in the email | Who uses it | What it opens |
|---|---|---|
| **Open learner quiz** (or copy the link) | **Learners.** The educator shares this link with the class | `/quiz/p/<slug>`: "Start of class" before the session, "After class" after it. Answers are saved on the learner's device. Add `?reset=1` to start again |
| **Share your feedback** | **The educator**, after the session | `/educator/p/<slug>`: how each component worked. Components marked "Changed it" also offer **Share your changed version** |
| **Share your materials** | **The educator**, after the session | `/educator/share?pkg=<slug>`: share their own seminar material with OceanX (see Step 4) |

The email also has a **Download lesson plan (PDF)** button and an **Open your resources** button that goes back to the library.

If you lose the email, you cannot open these pages from the app's menus. Send a new package to get a fresh email.

### Step 4: How share back works (a prototype workaround)

A real version would need educator accounts and file storage. This prototype has neither, so share back is simulated in a way that still shows the full loop: **educator shares, the library grows, OceanX reviews**.

There are **two kinds of share back**:

| Kind | Where | What happens |
|---|---|---|
| **Changed version** of an existing OceanX component | Feedback page (`/educator/p/<slug>`), on components marked "Changed it" | Creates a ticket in **Team > Review > Share backs**, shown next to the original text |
| **New material** made by the educator | **Share your materials** link in the email (`/educator/share`) | Creates a ticket **and** adds a card to the library straight away |

**How "Share your materials" works, step by step:**

1. Click **Share your materials** in the email.
2. The form is **pre-filled with demo data** (Dr. A. Rahman, Example University, a seminar debate for the **Reflect** stage). The material is shared as a **link**, not an upload. The default link points to the sample PDF in this repo: `/files/seagrass-tradeoffs-seminar-activity.pdf`.
3. Click **Send to OceanX**.
4. Click **Back to library**. A new card appears in the **Reflect** stage, tagged **Co-created · In review**, with the educator's name and a cover image.
5. Optional, as the OceanX team: go to **Team > Review > Share backs**, open the **New material** ticket, click **Open material**, tick **"I opened the link and checked the content"**, then **Approve to library**. The tag changes to **Co-created**. **Reject** removes the card.

**The limits of this workaround:**

- **Same browser only.** Tickets and co-created cards are stored in the browser (`localStorage`). Submit, review and view the library **in the same browser** on the same device. Another person or device will not see them.
- **Link only, no upload.** Educators paste a link (Google Drive, OneDrive, Canva, Padlet). Nothing is stored by OceanX.
- **Cards appear before review.** To keep the demo short, new material shows in the library at once, clearly marked **In review**. In a real system it would stay hidden until approved.
- **Resets on `/`.** Opening the entry page clears shared-material cards and their tickets, so every demo starts clean.

### Step 5: OceanX team

1. On the entry page, pick **OceanX Education team**.
2. **Overview**: library health, team time and reach.
3. **Insights**: AI recommends Reuse, Adapt or Drop per component. Confirm or override with a reason.
4. **Question bank**: approve, edit or drop AI-drafted quiz questions.
5. **Review**: tickets for flagged packages, share backs and issue reports. The first ticket opens automatically.
6. **Decision log**: every decision and override, with filters and CSV export.

### Resetting demo data

| To reset | Do this |
|---|---|
| Shared-material cards and their tickets | Open `/` |
| Review queue and decision log (mock) | Open `/team/review?reset=1` |
| A learner's quiz answers on one device | Add `?reset=1` to the quiz link |

---

## Reuse it for another story or organisation

1. **Content:** edit `frontend/src/shared/data/seagrass-stories.ts` (story, stages, components, original texts) and `frontend/src/shared/data/university-version.ts` (which components are Fixed or Adapted).
2. **Approved sources:** replace the Markdown files in `backend/app/sources/`. The AI only uses these.
3. **Original texts for review:** update `COMPONENT_ORIGINAL_TEXTS` in `frontend/src/team/data/governanceService.ts`.
4. **Question bank:** generate drafts from `/team/bank`, then approve them. Learner quizzes only use approved items.
5. **Branding:** colours, type and spacing live in `frontend/src/index.css`. See `DESIGN.md`.
6. **Overview numbers:** replace `frontend/src/team/data/oceanxMetrics.ts` and `timeBaseline.ts` with the new organisation's figures.
7. **Email:** edit `frontend/src/shared/email/packageEmail.ts` and the header image in `frontend/public/email/`.
8. **Make the mocks real:** replace the localStorage logic in `governanceService.ts` and `packageReviewService.ts` with backend endpoints and Supabase tables (review queue, decision log, library item state, adaptation tasks). The function names can stay the same, so the pages do not need to change.

---

## Design rules worth keeping

- **Human in the loop.** AI recommends; a person on the OceanX team decides, and every decision is logged.
- **Grounded AI.** Only approved source files. No temperature setting. The quiz and lesson plan are assembled with plain code, not AI.
- **Secrets stay server side.** The Supabase service role key and Anthropic key live only in the backend.
- **One way to build links.** Every app link in an email uses `appLink()` from `frontend/src/shared/appUrl.ts`.
- **One set of design tokens.** Only use CSS variables defined in `frontend/src/index.css`, and shared components from `frontend/src/shared/ui/`.
- **Database changes** go in a new numbered migration file. Never edit old ones.

---

## Known limitations

- Review, decision log and co-created items are mocked in `localStorage`, so they are per browser and not shared between users.
- Package screening is rule based, not a live AI check.
- No login. Team pages are open in this prototype. `VITE_ADMIN_TOKEN` is visible in the browser, so do not reuse a real secret there.
- Shared material is a link only; there is no file upload or storage.
- The lesson plan PDF in the email is a static sample.
- `backend/README.md` describes an earlier OpenRouter setup. The current backend uses the Anthropic API as set out above.

---

## Credits and licence

- **Group 4**, IS615 Digital Transformation Strategy, Singapore Management University.
- **Sponsor:** OceanX Education. Seagrass Stories content, videos and the game belong to OceanX and their creators. Ask OceanX before reusing any of that content.
- **Sample data:** names, emails and institutions in demo data (for example `example.edu`) are fictional.
- **Licence:** no open-source licence has been chosen yet. Please contact the team before reusing the code outside this course.
