with key(component_id, answer) as (values
  ('game','Reuse'),('video-nada','Reuse'),
  ('create-activity','Adapt'),('video-changi-point','Adapt'),
  ('further-reading-unep','Drop'),('learner-organiser','Drop')
),
d as (
  select t.*, k.answer,
    (t.decision = k.answer) as correct,
    (t.decision = k.answer and t.confidence >= 4) as correct_and_confident
  from public.tester_decisions t join key k using (component_id)
)
select view,
  count(*) as decisions,
  sum(correct::int) as correct,
  sum(correct_and_confident::int) as correct_and_confident,
  round(100.0 * sum(correct_and_confident::int) / count(*), 0) as pct_pass,
  round(avg(confidence), 1) as avg_confidence,
  round(avg(seconds_to_decide)) as avg_seconds
from d group by view order by view;

-- Wrong-card catch rate (AI view only, planted cards)
select tester_code, component_id, card_recommendation, decision,
  (decision <> card_recommendation) as caught
from public.tester_decisions
where view = 'ai' and component_id in ('create-activity','video-changi-point')
order by tester_code;