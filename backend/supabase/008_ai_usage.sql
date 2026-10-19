-- 008_ai_usage.sql
-- Add per-card AI usage columns to insight_cards.
-- Run in the Supabase SQL editor before the next pipeline generate call.

alter table public.insight_cards
  add column if not exists input_tokens  bigint,
  add column if not exists output_tokens bigint,
  add column if not exists latency_ms    int,
  add column if not exists cost_usd      numeric(10, 6);
