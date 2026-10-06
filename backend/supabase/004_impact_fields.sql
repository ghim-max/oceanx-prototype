-- 004_impact_fields.sql
-- Adds impact tracking. Run AFTER 001_schema.sql. Safe to re-run.

-- Learner: confidence before/after, pre-reading, least useful, link to pre-check
alter table public.learner_responses
  add column if not exists session_id uuid,
  add column if not exists confidence_pre smallint check (confidence_pre between 1 and 5),
  add column if not exists confidence_post smallint check (confidence_post between 1 and 5),
  add column if not exists did_pre_reading boolean,
  add column if not exists least_useful text;

-- Educator: rating now means LEARNING impact (1 to 5). New impact fields below.
comment on column public.educator_responses.rating is 'Learning impact: how much it helped learners understand (1 to 5). Null if skipped.';
alter table public.educator_responses
  add column if not exists engagement smallint check (engagement between 1 and 5),
  add column if not exists time_fit text check (time_fit in ('right','too_long','too_short')),
  add column if not exists curriculum_fit smallint check (curriculum_fit between 1 and 5),
  add column if not exists adaptation_helped smallint check (adaptation_helped between 1 and 5);

-- Pre-check saved at the start of class, so drop-off can be measured
-- (pre-checks with no matching after-class response, joined on session_id).
create table if not exists public.learner_prechecks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id uuid not null,
  story_id text not null default 'seagrass-stories',
  audience text not null default 'university' check (audience in ('schools','university','museum')),
  version_id text not null default 'v-university',
  pre_q1 boolean, pre_q2 boolean, pre_q3 boolean, pre_q4 boolean, pre_q5 boolean,
  pre_score smallint check (pre_score between 0 and 5),
  confidence_pre smallint check (confidence_pre between 1 and 5),
  is_sample boolean not null default false
);

alter table public.learner_prechecks enable row level security;
grant insert on public.learner_prechecks to anon;

drop policy if exists "anon insert real prechecks" on public.learner_prechecks;
create policy "anon insert real prechecks"
  on public.learner_prechecks for insert to anon
  with check (is_sample = false);
