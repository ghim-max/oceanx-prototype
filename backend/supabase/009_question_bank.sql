-- 009_question_bank.sql
-- Question bank for AI-drafted items reviewed by the OceanX team.
-- Architecture rule: AI drafts only. Quizzes for learners are assembled
-- deterministically from APPROVED items — no live AI at quiz time.

create table if not exists public.question_bank (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  component_id    text not null,  -- matches components.json id
  qtype           text not null check (qtype in ('mcq', 'short')),
  difficulty      text not null check (difficulty in ('easy', 'medium', 'hard')),
  question        text not null,
  -- MCQ only
  options         jsonb,          -- string[4]; null for short questions
  correct_index   int,            -- 0-3; null for short questions
  -- short only
  answer          text,           -- model answer, 1-3 sentences
  key_points      jsonb,          -- string[2-3]; null for MCQ
  -- shared
  source_excerpt  text not null,  -- verbatim phrase from the source file
  explanation     text,
  -- review workflow
  status          text not null default 'draft'
                    check (status in ('draft', 'approved', 'rejected')),
  reviewed_at     timestamptz,    -- set on approve or reject
  -- auto-checks
  auto_check_passed boolean,
  auto_check_notes  text,
  -- AI usage
  model           text,
  input_tokens    bigint,
  output_tokens   bigint,
  cost_usd        numeric(10, 6)
);

-- MCQ constraint: options and correct_index are required when qtype = mcq
alter table public.question_bank
  add constraint qbank_mcq_options_required
    check (qtype <> 'mcq' or (options is not null and correct_index is not null));

-- Short constraint: answer is required when qtype = short
alter table public.question_bank
  add constraint qbank_short_answer_required
    check (qtype <> 'short' or answer is not null);

-- RLS
alter table public.question_bank enable row level security;

-- Team (service role) has full access implicitly via service role key.

-- Anon: read approved items only.
-- Prototype only — anon can read correct_index for approved MCQ items.
-- Move scoring server-side before any production deployment.
create policy "anon can read approved items"
  on public.question_bank
  for select
  to anon
  using (status = 'approved');

-- Index for common lookups
create index if not exists qbank_component_status_idx
  on public.question_bank (component_id, status);
