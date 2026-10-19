-- 011_lesson_plan.sql
-- Adds lesson_plan jsonb column to quiz_packages.
-- The column stores the assembled LessonPlan object so the /lesson/p/:slug page
-- can render it without re-running assembly logic.

ALTER TABLE public.quiz_packages
  ADD COLUMN IF NOT EXISTS lesson_plan jsonb;

NOTIFY pgrst, 'reload schema';
