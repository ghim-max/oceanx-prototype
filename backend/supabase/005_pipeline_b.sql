-- 005_pipeline_b.sql
-- Pipeline B: feedback embeddings, component metrics view, session metrics view, insight cards table.
-- Run AFTER 004_impact_fields.sql. Safe to re-run.

-- Enable pgvector for embeddings
create extension if not exists vector;

-- Part A: component_metrics view (from 003_answer_key_check.sql Part A)
create or replace view public.component_metrics as
with q as (
  select * from (values
    ('video-nada', 'q1', 'Fixed'),
    ('video-changi-point', 'q2', 'Fixed'),
    ('further-reading-unep', 'q3', 'Fixed'),
    ('game', 'q4', 'Fixed'),
    ('create-activity', 'q5', 'Adapted'),
    ('learner-organiser', null, 'Fixed')
  ) as t(component_id, question, status)
),
l as (
  select
    avg(pre_q1::int)*100 as pre_q1, avg(post_q1::int)*100 as post_q1,
    avg(pre_q2::int)*100 as pre_q2, avg(post_q2::int)*100 as post_q2,
    avg(pre_q3::int)*100 as pre_q3, avg(post_q3::int)*100 as post_q3,
    avg(pre_q4::int)*100 as pre_q4, avg(post_q4::int)*100 as post_q4,
    avg(pre_q5::int)*100 as pre_q5, avg(post_q5::int)*100 as post_q5
  from public.learner_responses where completed
),
h as (
  select helped_most as component_id, count(*) as helped
  from public.learner_responses where completed
  group by helped_most
),
lu as (
  select least_useful as component_id, count(*) as least
  from public.learner_responses where completed
  group by least_useful
),
e as (
  select component_id,
    count(*) filter (where usage = 'kept') as used_as_is,
    count(*) filter (where usage = 'changed') as changed,
    count(*) filter (where usage = 'skipped') as skipped,
    round(avg(rating)::numeric, 1) as learning,
    round(avg(engagement)::numeric, 1) as engagement,
    count(*) filter (where time_fit = 'right') as time_right,
    count(*) filter (where time_fit = 'too_long') as time_too_long,
    count(*) filter (where time_fit = 'too_short') as time_too_short,
    round(avg(curriculum_fit)::numeric, 1) as curriculum_fit,
    round(avg(adaptation_helped)::numeric, 1) as adaptation_helped,
    count(*) as educator_count
  from public.educator_responses
  group by component_id
),
learner_counts as (
  select component_id, count(*) as learner_count
  from public.learner_responses
  where completed and helped_most = component_id
  group by component_id
)
select
  q.component_id,
  q.status,
  q.question,
  round(case q.question
    when 'q1' then l.post_q1 - l.pre_q1
    when 'q2' then l.post_q2 - l.pre_q2
    when 'q3' then l.post_q3 - l.pre_q3
    when 'q4' then l.post_q4 - l.pre_q4
    when 'q5' then l.post_q5 - l.pre_q5
  end) as gain_pts,
  coalesce(l.pre_q1, l.pre_q2, l.pre_q3, l.pre_q4, l.pre_q5, 0) as pre_pct,
  coalesce(l.post_q1, l.post_q2, l.post_q3, l.post_q4, l.post_q5, 0) as post_pct,
  coalesce(h.helped, 0) as helped_most,
  coalesce(lu.least, 0) as least_useful,
  e.used_as_is,
  e.changed,
  e.skipped,
  e.learning,
  e.engagement,
  e.time_right,
  e.time_too_long,
  e.time_too_short,
  e.curriculum_fit,
  e.adaptation_helped,
  e.educator_count,
  coalesce(lc.learner_count, 0) as learner_count
from q
cross join l
left join e on e.component_id = q.component_id
left join h on h.component_id = q.component_id
left join lu on lu.component_id = q.component_id
left join learner_counts lc on lc.component_id = q.component_id
order by q.component_id;

-- Part B: session_metrics view (from 003_answer_key_check.sql Part B)
create or replace view public.session_metrics as
select
  (select count(*) from public.learner_prechecks) as prechecks,
  (select count(*) from public.learner_responses where completed) as completed,
  (select count(*) from public.learner_prechecks p
     where not exists (select 1 from public.learner_responses r where r.session_id = p.session_id)) as dropped_off,
  (select round(avg(confidence_pre)::numeric, 1) from public.learner_responses where completed) as confidence_before,
  (select round(avg(confidence_post)::numeric, 1) from public.learner_responses where completed) as confidence_after,
  (select count(*) filter (where did_pre_reading) from public.learner_responses where completed) as did_pre_reading,
  (select round(avg(satisfaction)::numeric, 1) from public.learner_responses where completed) as satisfaction,
  (select round(avg(case when would_recommend then 100.0 else 0.0 end)::numeric, 1)
   from public.learner_responses where completed) as would_recommend_pct;

-- Feedback embeddings table
create table if not exists public.feedback_embeddings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null check (source in ('learner_comment','learner_short_answer','educator_note')),
  source_id uuid not null,
  component_id text,
  content text not null,
  embedding vector(384) not null,
  is_sample boolean not null,
  unique (source, source_id)
);

-- Vector similarity search function
create or replace function public.match_feedback(
  query_embedding vector(384),
  match_count int default 6,
  min_similarity float default 0.35
) returns table(
  source text,
  source_id uuid,
  component_id text,
  content text,
  is_sample boolean,
  similarity float
) language sql stable as $$
  select
    source,
    source_id,
    component_id,
    content,
    is_sample,
    1 - (embedding <=> query_embedding) as similarity
  from public.feedback_embeddings
  where 1 - (embedding <=> query_embedding) >= min_similarity
  order by similarity desc
  limit match_count;
$$;

-- Insight cards table
create table if not exists public.insight_cards (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null,
  generated_at timestamptz not null default now(),
  component_id text not null,
  recommendation text not null check (recommendation in ('Reuse','Adapt','Drop')),
  why text not null,
  evidence jsonb not null,
  quotes jsonb not null,
  metrics jsonb not null,
  rule_recommendation text not null check (rule_recommendation in ('Reuse','Adapt','Drop')),
  ai_recommendation text not null check (ai_recommendation in ('Reuse','Adapt','Drop')),
  guardrail_ok boolean not null,
  overridden boolean not null default false,
  model text not null
);

-- Enable RLS with NO anon policies (only service role can read/write)
alter table public.feedback_embeddings enable row level security;
alter table public.insight_cards enable row level security;

-- Revoke all on views from anon and authenticated
revoke all on public.component_metrics from anon, authenticated;
revoke all on public.session_metrics from anon, authenticated;