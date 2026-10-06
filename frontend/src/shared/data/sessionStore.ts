import type { FeedbackEntry } from '../types';

// In-memory store for feedback submitted via /story during this session.
// InsightsPage at /team/insights reads from initialFeedback (static seed) plus this array.
export const sessionFeedback: FeedbackEntry[] = [];
