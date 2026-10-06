export interface ComponentMetrics {
  component_id: string;
  status: 'Fixed' | 'Adapted';
  question: string | null;
  gain_pts: number | null;
  pre_pct: number | null;
  post_pct: number | null;
  helped_most: number;
  least_useful: number;
  used_as_is: number;
  changed: number;
  skipped: number;
  learning: number | null;
  engagement: number | null;
  time_right: number;
  time_too_long: number;
  time_too_short: number;
  curriculum_fit: number | null;
  adaptation_helped: number | null;
  educator_count: number;
  learner_count: number;
}

export interface SessionMetrics {
  prechecks: number;
  completed: number;
  dropped_off: number;
  confidence_before: number | null;
  confidence_after: number | null;
  did_pre_reading: number;
  satisfaction: number | null;
  would_recommend_pct: number | null;
}

export interface Quote {
  text: string;
  who: 'Learner' | 'Educator';
}

export interface InsightCard {
  component_id: string;
  title: string;
  status: 'Fixed' | 'Adapted';
  recommendation: 'Reuse' | 'Adapt' | 'Drop';
  why: string;
  evidence: string[];
  quotes: Quote[];
  suggested_action: string;
  metrics: ComponentMetrics;
  generated_at: string;
}

export interface InsightsResponse {
  run_id: string;
  cards: InsightCard[];
  session: SessionMetrics;
}

export interface RawInsightsResponse {
  component_metrics: ComponentMetrics[];
  learner_comments: Array<{
    id: string;
    comment: string | null;
    short_answer: string | null;
    helped_most: string | null;
    is_sample: boolean;
  }>;
  educator_notes_by_component: Record<string, Array<{
    id: string;
    note: string;
    usage: 'kept' | 'changed' | 'skipped';
    is_sample: boolean;
  }>>;
}

export interface GenerateInsightsResponse {
  run_id: string;
  cards: InsightCard[];
  session: SessionMetrics;
  errors?: string[];
}