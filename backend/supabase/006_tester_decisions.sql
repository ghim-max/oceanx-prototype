create table if not exists public.tester_decisions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tester_code text not null,
  component_id text not null,
  view text not null check (view in ('ai','raw')),
  card_recommendation text check (card_recommendation in ('Reuse','Adapt','Drop')),
  decision text not null check (decision in ('Reuse','Adapt','Drop')),
  confidence smallint not null check (confidence between 1 and 5),
  reason text check (char_length(reason) <= 500),
  seconds_to_decide integer,
  position smallint
);
alter table public.tester_decisions enable row level security;
grant insert on public.tester_decisions to anon;
drop policy if exists "anon insert tester decisions" on public.tester_decisions;
create policy "anon insert tester decisions"
  on public.tester_decisions for insert to anon with check (true);