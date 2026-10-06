import type { InsightCard } from '../types';

export const insightCards: InsightCard[] = [
  {
    id: 'ins01',
    versionId: 'v-schools',
    versionTitle: 'Schools',
    date: '2026-03-19',
    headline: 'Schools learners show the highest average quiz gain across all three versions.',
    supportingLine:
      'Average pre-to-post improvement of 25 points across 12 responses, ahead of Museum (+22) and University (+18). The structured inquiry activities before the quiz are likely contributing.',
    recommendation: 'Reuse',
    requiresReview: true,
  },
  {
    id: 'ins02',
    versionId: 'v-schools',
    versionTitle: 'Schools',
    date: '2026-03-19',
    headline: 'Three Schools respondents did not finish. All three flagged the narrative section as too long.',
    supportingLine:
      'The "Why Seagrass Disappears: Three Pressures" narrative (6 min) may exceed a single period. Splitting or trimming could improve completion.',
    recommendation: 'Adapt',
    requiresReview: true,
  },
  {
    id: 'ins03',
    versionId: 'v-museum',
    versionTitle: 'Museum',
    date: '2026-03-24',
    headline: 'Museum satisfaction is high but two non-completions point to pacing issues in the restoration activity.',
    supportingLine:
      'The "Could You Restore a Meadow?" activity (10 min) is the longest item in the Museum version. Visitors who finished it rated it 4.5 on average; those who dropped off rated the overall experience 2.5.',
    recommendation: 'Adapt',
    requiresReview: true,
  },
  {
    id: 'ins04',
    versionId: 'v-schools',
    versionTitle: 'Schools',
    date: '2026-03-24',
    headline: 'The discussion activity is the most cited positive element in Schools open comments.',
    supportingLine:
      '"How Do We Measure a Meadow?" was mentioned positively in 5 of 12 responses. No negative mentions. Retention of this component is strongly indicated.',
    recommendation: 'Reuse',
    requiresReview: true,
  },
  {
    id: 'ins05',
    versionId: 'v-university',
    versionTitle: 'University',
    date: '2026-03-25',
    headline: 'Two University respondents flagged missing context before the adaptive quiz.',
    supportingLine:
      'Quiz terminology around blue carbon policy may assume knowledge not covered in earlier components. Inserting a brief key-terms panel before the quiz is the minimal fix.',
    recommendation: 'Adapt',
    requiresReview: true,
  },
  {
    id: 'ins06',
    versionId: 'v-museum',
    versionTitle: 'Museum',
    date: '2026-03-25',
    headline: 'One Museum visitor flagged small text on panel displays as an accessibility barrier.',
    supportingLine:
      'A single response, but the concern is legitimate: minimum body text size for public display should be reviewed against venue viewing distance. Flagged for design audit.',
    recommendation: 'Adapt',
    requiresReview: true,
  },
];
