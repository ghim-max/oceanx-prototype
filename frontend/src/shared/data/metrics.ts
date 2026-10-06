import type { VersionMetrics } from '../types';
import { initialFeedback } from './feedback';

function computeMetrics(versionId: string): VersionMetrics {
  const entries = initialFeedback.filter((f) => f.versionId === versionId);
  const count = entries.length;
  const completionRate = Math.round(
    (entries.filter((f) => f.completedContent).length / count) * 100
  );
  const avgQuizGain = Math.round(
    entries.reduce((sum, f) => sum + (f.postQuizScore - f.preQuizScore), 0) / count
  );
  const avgSatisfaction =
    Math.round((entries.reduce((sum, f) => sum + f.satisfaction, 0) / count) * 10) / 10;
  return { versionId, completionRate, avgQuizGain, avgSatisfaction, responseCount: count };
}

export const versionMetrics: VersionMetrics[] = [
  computeMetrics('v-schools'),
  computeMetrics('v-university'),
  computeMetrics('v-museum'),
];
