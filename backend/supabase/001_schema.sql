-- Step 3 schema. Safe to re-run on an empty project.
drop table if exists public.feedback_responses;
drop table if exists public.learner_responses;
drop table if exists public.educator_responses;

create table public.learner_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  story_id text not null default 'seagrass-stories',
  audience text not null default 'university' check (audience in ('schools','university','museum')),
  version_id text not null default 'v-university',
  time_spent_seconds integer,
  completed boolean not null default false,
  pre_q1 boolean, pre_q2 boolean, pre_q3 boolean, pre_q4 boolean, pre_q5 boolean,
  post_q1 boolean, post_q2 boolean, post_q3 boolean, post_q4 boolean, post_q5 boolean,
  pre_score smallint check (pre_score between 0 and 5),
  post_score smallint check (post_score between 0 and 5),
  short_answer text check (char_length(short_answer) <= 1000),
  satisfaction smallint check (satisfaction between 1 and 5),
  would_recommend boolean,
  helped_most text,
  comment text check (char_length(comment) <= 1000),
  is_sample boolean not null default false
);

create table public.educator_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  submission_id uuid not null,
  story_id text not null default 'seagrass-stories',
  audience text not null default 'university' check (audience in ('schools','university','museum')),
  version_id text not null default 'v-university',
  component_id text not null,
  usage text not null check (usage in ('kept','changed','skipped')),
  rating smallint check (rating between 1 and 5),
  note text check (char_length(note) <= 1000),
  is_sample boolean not null default false
);

alter table public.learner_responses enable row level security;
alter table public.educator_responses enable row level security;

grant insert on public.learner_responses to anon;
grant insert on public.educator_responses to anon;

-- Website can insert real responses only. No reads for anon.
create policy "anon insert real learner responses"
  on public.learner_responses for insert to anon
  with check (is_sample = false);

create policy "anon insert real educator responses"
  on public.educator_responses for insert to anon
  with check (is_sample = false);