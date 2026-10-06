import { supabase, isSupabaseConfigured } from '../services/supabase';

export type LearnerResponseInsert = {
  story_id: string;
  audience: string;
  version_id: string;
  time_spent_seconds?: number;
  completed: boolean;
  pre_q1?: boolean;
  pre_q2?: boolean;
  pre_q3?: boolean;
  pre_q4?: boolean;
  pre_q5?: boolean;
  post_q1?: boolean;
  post_q2?: boolean;
  post_q3?: boolean;
  post_q4?: boolean;
  post_q5?: boolean;
  pre_score?: number;
  post_score?: number;
  short_answer?: string;
  satisfaction?: number;
  would_recommend?: boolean;
  helped_most?: string;
  comment?: string;
  session_id?: string;
  confidence_pre?: number;
  confidence_post?: number;
  did_pre_reading?: boolean;
  least_useful?: string;
  is_sample: false;
};

export type EducatorRowInsert = {
  submission_id: string;
  story_id: string;
  audience: string;
  version_id: string;
  component_id: string;
  usage: 'kept' | 'changed' | 'skipped';
  rating?: number;
  engagement?: number;
  time_fit?: 'right' | 'too_long' | 'too_short';
  curriculum_fit?: number;
  adaptation_helped?: number;
  note?: string;
  is_sample: false;
};

export type SubmitResult = { ok: true } | { ok: false; error: string };

export async function submitLearnerResponse(row: LearnerResponseInsert): Promise<SubmitResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'Feedback saving is not set up yet.' };
  }

  try {
    const { error } = await supabase.from('learner_responses').insert(row);
    if (error) {
      console.error('Supabase insert error:', error);
      return { ok: false, error: 'We could not save your response. Please try again.' };
    }
    return { ok: true };
  } catch (err) {
    console.error('Network error submitting learner response:', err);
    return { ok: false, error: 'We could not save your response. Please try again.' };
  }
}

export async function submitEducatorResponse(
  rows: Omit<EducatorRowInsert, 'submission_id'>[]
): Promise<SubmitResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'Feedback saving is not set up yet.' };
  }

  if (rows.length === 0) {
    return { ok: true };
  }

  const submission_id = crypto.randomUUID();
  const rowsWithSubmission = rows.map((r) => ({ ...r, submission_id, is_sample: false as const }));

  try {
    const { error } = await supabase.from('educator_responses').insert(rowsWithSubmission);
    if (error) {
      console.error('Supabase insert error:', error);
      return { ok: false, error: 'We could not save your response. Please try again.' };
    }
    return { ok: true };
  } catch (err) {
    console.error('Network error submitting educator response:', err);
    return { ok: false, error: 'We could not save your response. Please try again.' };
  }
}

export type PrecheckInsert = {
  session_id: string;
  pre_q1?: boolean;
  pre_q2?: boolean;
  pre_q3?: boolean;
  pre_q4?: boolean;
  pre_q5?: boolean;
  pre_score?: number;
  confidence_pre?: number;
  story_id: string;
  audience: string;
  version_id: string;
  is_sample: false;
};

export async function submitPrecheck(row: PrecheckInsert): Promise<SubmitResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'Feedback saving is not set up yet.' };
  }

  try {
    const { error } = await supabase.from('learner_prechecks').insert(row);
    if (error) {
      console.error('Supabase insert error:', error);
      return { ok: false, error: 'We could not save your response. Please try again.' };
    }
    return { ok: true };
  } catch (err) {
    console.error('Network error submitting precheck:', err);
    return { ok: false, error: 'We could not save your response. Please try again.' };
  }
}

export type TesterDecisionInsert = {
  tester_code: string;
  component_id: string;
  view: 'ai' | 'raw';
  card_recommendation?: 'Reuse' | 'Adapt' | 'Drop';
  decision: 'Reuse' | 'Adapt' | 'Drop';
  confidence: number;
  reason?: string;
  seconds_to_decide?: number;
  position: number;
};

export async function submitTesterDecision(row: TesterDecisionInsert): Promise<SubmitResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'Feedback saving is not set up yet.' };
  }

  try {
    const { error } = await supabase.from('tester_decisions').insert(row);
    if (error) {
      console.error('Supabase insert error:', error);
      return { ok: false, error: 'Could not save decision. Please try again.' };
    }
    return { ok: true };
  } catch (err) {
    console.error('Network error submitting tester decision:', err);
    return { ok: false, error: 'Could not save decision. Please try again.' };
  }
}