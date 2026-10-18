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

export type SubmitResult = { ok: true; submission_id?: string; count?: number } | { ok: false; error: string };

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

export type LearnerPackageFeedbackInsert = {
  session_id: string;
  satisfaction?: number;
  would_recommend?: boolean;
  confidence_post?: number;
  helped_most?: string;
  least_useful?: string;
  comment?: string;
  did_pre_reading?: boolean;
  is_sample: false;
};

export async function submitLearnerPackageFeedback(
  slug: string,
  row: LearnerPackageFeedbackInsert
): Promise<SubmitResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'Feedback saving is not set up yet.' };
  }

  try {
    const { error } = await supabase
      .from('learner_package_feedback')
      .insert({ ...row, package_id: slug }); // Note: slug will be resolved to package_id by the API
    if (error) {
      console.error('Supabase insert error:', error);
      return { ok: false, error: 'We could not save your response. Please try again.' };
    }
    return { ok: true };
  } catch (err) {
    console.error('Network error submitting learner package feedback:', err);
    return { ok: false, error: 'We could not save your response. Please try again.' };
  }
}

export type EducatorPackageFeedbackRowInsert = {
  component_id: string;
  usage: 'kept' | 'changed' | 'skipped';
  rating?: number;
  engagement?: number;
  time_fit?: 'right' | 'too_long' | 'too_short';
  curriculum_fit?: number;
  adaptation_helped?: number;
  note?: string;
  is_sample: false;
  package_id?: string; // optional - added by API
};

export async function submitEducatorPackageFeedback(
  slug: string,
  rows: Omit<EducatorPackageFeedbackRowInsert, 'package_id'>[]
): Promise<SubmitResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'Feedback saving is not set up yet.' };
  }

  if (rows.length === 0) {
    return { ok: true };
  }

  try {
    // The API will add package_id, but we need to include it here for direct calls
    const { data: pkg } = await supabase
      .from('quiz_packages')
      .select('id')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (!pkg) {
      return { ok: false, error: 'Package not found' };
    }

    const submission_id = crypto.randomUUID();
    const rowsWithPkg = rows.map((r) => ({
      ...r,
      submission_id,
      story_id: 'seagrass-stories',
      audience: 'university',
      version_id: 'v-university',
      package_id: pkg.id,
      is_sample: false as const,
    }));

    const { error } = await supabase.from('educator_responses').insert(rowsWithPkg);
    if (error) {
      console.error('Supabase insert error:', error);
      return { ok: false, error: 'We could not save your response. Please try again.' };
    }
    return { ok: true, submission_id };
  } catch (err) {
    console.error('Network error submitting educator package feedback:', err);
    return { ok: false, error: 'We could not save your response. Please try again.' };
  }
}

export type LearnerPackageResponseInsert = {
  session_id: string;
  question_index: number;
  item_id?: string;
  component_id?: string;
  answer_index?: number;
  answer_text?: string;
  is_correct?: boolean;
  is_precheck: boolean;
  time_spent_ms?: number;
  is_sample: false;
};

export async function submitLearnerPackageResponses(
  slug: string,
  rows: LearnerPackageResponseInsert[]
): Promise<SubmitResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'Feedback saving is not set up yet.' };
  }

  if (rows.length === 0) {
    return { ok: true };
  }

  try {
    const { data: pkg } = await supabase
      .from('quiz_packages')
      .select('id')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (!pkg) {
      return { ok: false, error: 'Package not found' };
    }

    const rowsWithPkg = rows.map((r) => ({
      ...r,
      package_id: pkg.id,
      is_sample: false as const,
    }));

    const { error } = await supabase.from('learner_package_responses').insert(rowsWithPkg);
    if (error) {
      console.error('Supabase insert error:', error);
      return { ok: false, error: 'We could not save your responses. Please try again.' };
    }
    return { ok: true, count: rowsWithPkg.length };
  } catch (err) {
    console.error('Network error submitting learner package responses:', err);
    return { ok: false, error: 'We could not save your responses. Please try again.' };
  }
}

export type IssueReportInsert = {
  page_url: string;
  user_agent?: string;
  message: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  is_sample: false;
};

export async function submitIssueReport(
  slug: string,
  row: IssueReportInsert
): Promise<SubmitResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'Feedback saving is not set up yet.' };
  }

  try {
    const { data: pkg } = await supabase
      .from('quiz_packages')
      .select('id')
      .eq('slug', slug)
      .eq('status', 'active')
      .single();

    if (!pkg) {
      return { ok: false, error: 'Package not found' };
    }

    const { error } = await supabase.from('issue_reports').insert({
      ...row,
      package_id: pkg.id,
      is_sample: false as const,
    });
    if (error) {
      console.error('Supabase insert error:', error);
      return { ok: false, error: 'We could not save your issue report. Please try again.' };
    }
    return { ok: true };
  } catch (err) {
    console.error('Network error submitting issue report:', err);
    return { ok: false, error: 'We could not save your issue report. Please try again.' };
  }
}