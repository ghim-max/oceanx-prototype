-- 003_answer_key_check.sql (v2, with impact fields)
-- Part A: one row per tracked component, the numbers behind each answer key.
-- Includes real + sample rows. Add "and is_sample = false" in the CTEs to see real data only.

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
h as (select helped_most as component_id, count(*) as helped from public.learner_responses where completed group by helped_most),
lu as (select least_useful as component_id, count(*) as least from public.learner_responses where completed group by least_useful),
e as (
  select component_id,
    count(*) filter (where usage = 'kept') as used_as_is,
    count(*) filter (where usage = 'changed') as changed,
    count(*) filter (where usage = 'skipped') as skipped,
    round(avg(rating), 1) as learning,
    round(avg(engagement), 1) as engagement,
    count(*) filter (where time_fit = 'right') as time_right,
    count(*) filter (where time_fit in ('too_long','too_short')) as time_off,
    round(avg(curriculum_fit), 1) as curriculum_fit,
    round(avg(adaptation_helped), 1) as adaptation_helped
  from public.educator_responses group by component_id
)
select
  q.component_id, q.status, q.question,
  round(case q.question when 'q1' then l.post_q1 - l.pre_q1 when 'q2' then l.post_q2 - l.pre_q2 when 'q3' then l.post_q3 - l.pre_q3 when 'q4' then l.post_q4 - l.pre_q4 when 'q5' then l.post_q5 - l.pre_q5 end) as gain_pts,
  coalesce(h.helped, 0) as helped_most,
  coalesce(lu.least, 0) as least_useful,
  e.used_as_is, e.changed, e.skipped,
  e.learning, e.engagement, e.time_right, e.time_off, e.curriculum_fit, e.adaptation_helped
from q
cross join l
left join e on e.component_id = q.component_id
left join h on h.component_id = q.component_id
left join lu on lu.component_id = q.component_id
order by q.component_id;

-- Part B: session-level numbers (run separately if your editor shows only the last result)
select
  (select count(*) from public.learner_prechecks) as prechecks,
  (select count(*) from public.learner_responses where completed) as completed,
  (select count(*) from public.learner_prechecks p
     where not exists (select 1 from public.learner_responses r where r.session_id = p.session_id)) as dropped_off,
  (select round(avg(confidence_pre), 1) from public.learner_responses where completed) as confidence_before,
  (select round(avg(confidence_post), 1) from public.learner_responses where completed) as confidence_after,
  (select count(*) filter (where did_pre_reading) from public.learner_responses where completed) as did_pre_reading,
  (select round(avg(satisfaction), 1) from public.learner_responses where completed) as satisfaction;
