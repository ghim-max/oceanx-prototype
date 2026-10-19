-- 010_quiz_packages.sql (corrected)

create table if not exists public.quiz_packages (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  slug              text not null unique,
  audience          text not null default 'university'
                      check (audience in ('schools','university','museum')),
  picks             jsonb not null default '[]'::jsonb,
  recommendations   jsonb not null default '[]'::jsonb,
  component_ids     jsonb not null default '[]'::jsonb,  -- picked component ids
  options           jsonb not null default '{}'::jsonb,  -- quiz type, difficulty, count
  item_ids          jsonb not null default '[]'::jsonb,  -- snapshot of question_bank ids
  quiz_title        text,
  lesson_plan_title text,
  lesson_plan_url   text,
  status            text not null default 'active'
                      check (status in ('active','archived'))
  -- TODO: component_metrics only reads legacy tables. Add a combined view
  -- so the dashboard sees package responses.
);
alter table public.quiz_packages add column if not exists component_ids jsonb not null default '[]'::jsonb;
alter table public.quiz_packages add column if not exists options       jsonb not null default '{}'::jsonb;
alter table public.quiz_packages add column if not exists item_ids      jsonb not null default '[]'::jsonb;

-- Educator picks: one row per picked component (service role only)
create table if not exists public.educator_picks (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  package_id           uuid not null references public.quiz_packages(id) on delete cascade,
  educator_email       text not null,
  component_id         text,
  quiz_included        boolean not null default false,
  lesson_plan_included boolean not null default false
);
alter table public.educator_picks add column if not exists component_id text;
alter table public.educator_picks add column if not exists quiz_included boolean not null default false;
alter table public.educator_picks add column if not exists lesson_plan_included boolean not null default false;
create unique index if not exists educator_picks_pkg_component_uq
  on public.educator_picks (package_id, component_id);
alter table public.educator_picks enable row level security;

-- Learner answers per question (for learning gain per component)
create table if not exists public.learner_package_responses (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  package_id    uuid not null references public.quiz_packages(id) on delete cascade,
  session_id    uuid not null,
  item_id       uuid not null,
  component_id  text not null,
  qtype         text not null check (qtype in ('mcq','short')),
  is_precheck   boolean not null,
  chosen_index  int,
  correct       boolean,
  short_answer  text check (char_length(short_answer) <= 2000),
  is_sample     boolean not null default false
);
alter table public.learner_package_responses enable row level security;
grant insert on public.learner_package_responses to anon;
drop policy if exists "anon insert real package responses" on public.learner_package_responses;
create policy "anon insert real package responses"
  on public.learner_package_responses for insert to anon
  with check (is_sample = false);

-- Learner feedback per package
create table if not exists public.learner_package_feedback (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  package_id       uuid not null references public.quiz_packages(id) on delete cascade,
  session_id       uuid not null,
  satisfaction     smallint check (satisfaction between 1 and 5),
  would_recommend  boolean,
  confidence_post  smallint check (confidence_post between 1 and 5),
  helped_most      text,
  least_useful     text,
  comment          text check (char_length(comment) <= 1000),
  is_sample        boolean not null default false
);
alter table public.learner_package_feedback enable row level security;
grant insert on public.learner_package_feedback to anon;
drop policy if exists "anon insert real learner package feedback" on public.learner_package_feedback;
create policy "anon insert real learner package feedback"
  on public.learner_package_feedback for insert to anon
  with check (is_sample = false);

-- Report an issue
create table if not exists public.issue_reports (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  package_id  uuid references public.quiz_packages(id) on delete set null,
  item_id     uuid,
  message     text not null check (char_length(message) between 1 and 2000)
);
alter table public.issue_reports enable row level security;
grant insert on public.issue_reports to anon;
drop policy if exists "anon insert issue reports" on public.issue_reports;
create policy "anon insert issue reports"
  on public.issue_reports for insert to anon with check (true);

-- Anon can read active packages (no email stored here)
alter table public.quiz_packages enable row level security;
drop policy if exists "anon can read active packages by slug" on public.quiz_packages;
create policy "anon can read active packages by slug"
  on public.quiz_packages for select to anon using (status = 'active');

-- Link educator feedback to a package
alter table public.educator_responses
  add column if not exists package_id uuid references public.quiz_packages(id) on delete set null;

-- Indexes
create index if not exists quiz_packages_slug_idx                on public.quiz_packages (slug);
create index if not exists educator_picks_package_idx            on public.educator_picks (package_id);
create index if not exists learner_pkg_resp_package_idx          on public.learner_package_responses (package_id);
create index if not exists learner_pkg_resp_component_idx        on public.learner_package_responses (component_id);
create index if not exists learner_package_feedback_package_idx  on public.learner_package_feedback (package_id);
create index if not exists educator_responses_package_idx        on public.educator_responses (package_id);

NOTIFY pgrst, 'reload schema';