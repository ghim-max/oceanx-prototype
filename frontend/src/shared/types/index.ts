export type ResourceType =
  | 'footage'
  | 'key-finding'
  | 'narrative'
  | 'discussion-question'
  | 'quiz';

export type AudienceTag = 'Schools' | 'University' | 'Museum';

export type RecommendationLabel = 'Reuse' | 'Adapt' | 'Drop';

export interface Component {
  id: string;
  title: string;
  type: ResourceType;
  audiences: AudienceTag[];
  topic: string;
  gradeLevel: string;
  curriculumAlignment: string;
  usedInVersions: string[];
  durationMinutes?: number;
  description: string;
}

export interface Version {
  id: string;
  title: string;
  audience: AudienceTag;
  componentIds: string[];
  description: string;
}

export interface FeedbackEntry {
  id: string;
  versionId: string;
  completedContent: boolean;
  preQuizScore: number;
  postQuizScore: number;
  satisfaction: 1 | 2 | 3 | 4 | 5;
  wouldRecommend: boolean;
  comment: string;
  submittedAt: string;
}

export interface InsightCard {
  id: string;
  versionId: string;
  versionTitle: string;
  date: string;
  headline: string;
  supportingLine: string;
  recommendation: RecommendationLabel;
  requiresReview: true;
}

export interface VersionMetrics {
  versionId: string;
  completionRate: number;
  avgQuizGain: number;
  avgSatisfaction: number;
  responseCount: number;
}
