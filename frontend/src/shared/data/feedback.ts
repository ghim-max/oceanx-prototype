import type { FeedbackEntry } from '../types';

export const initialFeedback: FeedbackEntry[] = [
  // Schools (12 responses)
  {
    id: 'fb01', versionId: 'v-schools', completedContent: true,
    preQuizScore: 40, postQuizScore: 72, satisfaction: 4,
    wouldRecommend: true, submittedAt: '2026-03-04',
    comment: 'The timelapse was really engaging. Quiz felt a bit fast.',
  },
  {
    id: 'fb02', versionId: 'v-schools', completedContent: true,
    preQuizScore: 55, postQuizScore: 80, satisfaction: 5,
    wouldRecommend: true, submittedAt: '2026-03-04',
    comment: 'Loved the discussion activity. We went well over time in a good way.',
  },
  {
    id: 'fb03', versionId: 'v-schools', completedContent: false,
    preQuizScore: 30, postQuizScore: 45, satisfaction: 3,
    wouldRecommend: false, submittedAt: '2026-03-05',
    comment: 'The narrative section was too long. Lost attention partway through.',
  },
  {
    id: 'fb04', versionId: 'v-schools', completedContent: true,
    preQuizScore: 60, postQuizScore: 85, satisfaction: 5,
    wouldRecommend: true, submittedAt: '2026-03-05',
    comment: 'Best resource we have used this term.',
  },
  {
    id: 'fb05', versionId: 'v-schools', completedContent: true,
    preQuizScore: 35, postQuizScore: 65, satisfaction: 4,
    wouldRecommend: true, submittedAt: '2026-03-06',
    comment: 'The footage component needs better quality subtitles.',
  },
  {
    id: 'fb06', versionId: 'v-schools', completedContent: true,
    preQuizScore: 50, postQuizScore: 75, satisfaction: 4,
    wouldRecommend: true, submittedAt: '2026-03-06',
    comment: 'Students were asking questions well after the session ended.',
  },
  {
    id: 'fb07', versionId: 'v-schools', completedContent: false,
    preQuizScore: 20, postQuizScore: 38, satisfaction: 2,
    wouldRecommend: false, submittedAt: '2026-03-07',
    comment: 'Too much content for one period. Needs splitting across two sessions.',
  },
  {
    id: 'fb08', versionId: 'v-schools', completedContent: true,
    preQuizScore: 45, postQuizScore: 78, satisfaction: 5,
    wouldRecommend: true, submittedAt: '2026-03-07',
    comment: 'The discussion question on measurement was the highlight.',
  },
  {
    id: 'fb09', versionId: 'v-schools', completedContent: true,
    preQuizScore: 58, postQuizScore: 82, satisfaction: 4,
    wouldRecommend: true, submittedAt: '2026-03-10',
    comment: 'Curriculum alignment note was helpful for reporting.',
  },
  {
    id: 'fb10', versionId: 'v-schools', completedContent: true,
    preQuizScore: 42, postQuizScore: 69, satisfaction: 3,
    wouldRecommend: true, submittedAt: '2026-03-10',
    comment: 'Good content, presentation could be more visually varied.',
  },
  {
    id: 'fb11', versionId: 'v-schools', completedContent: false,
    preQuizScore: 25, postQuizScore: 40, satisfaction: 2,
    wouldRecommend: false, submittedAt: '2026-03-11',
    comment: 'The quiz appeared before students had enough context.',
  },
  {
    id: 'fb12', versionId: 'v-schools', completedContent: true,
    preQuizScore: 62, postQuizScore: 88, satisfaction: 5,
    wouldRecommend: true, submittedAt: '2026-03-11',
    comment: 'Outstanding. Will use again next year.',
  },
  // University (10 responses)
  {
    id: 'fb13', versionId: 'v-university', completedContent: true,
    preQuizScore: 68, postQuizScore: 90, satisfaction: 5,
    wouldRecommend: true, submittedAt: '2026-03-12',
    comment: 'The adaptive quiz is well calibrated. Data section is thorough.',
  },
  {
    id: 'fb14', versionId: 'v-university', completedContent: true,
    preQuizScore: 72, postQuizScore: 88, satisfaction: 4,
    wouldRecommend: true, submittedAt: '2026-03-12',
    comment: 'Port Phillip case study could include more recent data.',
  },
  {
    id: 'fb15', versionId: 'v-university', completedContent: true,
    preQuizScore: 55, postQuizScore: 82, satisfaction: 5,
    wouldRecommend: true, submittedAt: '2026-03-13',
    comment: 'One of the better online modules I have done this semester.',
  },
  {
    id: 'fb16', versionId: 'v-university', completedContent: false,
    preQuizScore: 60, postQuizScore: 70, satisfaction: 3,
    wouldRecommend: false, submittedAt: '2026-03-13',
    comment: 'Restoration methods section is dense. Could use a summary table.',
  },
  {
    id: 'fb17', versionId: 'v-university', completedContent: true,
    preQuizScore: 75, postQuizScore: 92, satisfaction: 5,
    wouldRecommend: true, submittedAt: '2026-03-14',
    comment: 'The loss rate data visualisation is clear and well sourced.',
  },
  {
    id: 'fb18', versionId: 'v-university', completedContent: true,
    preQuizScore: 65, postQuizScore: 84, satisfaction: 4,
    wouldRecommend: true, submittedAt: '2026-03-14',
    comment: 'Appreciated the IUCN citations. Makes it credible.',
  },
  {
    id: 'fb19', versionId: 'v-university', completedContent: true,
    preQuizScore: 70, postQuizScore: 91, satisfaction: 5,
    wouldRecommend: true, submittedAt: '2026-03-17',
    comment: '',
  },
  {
    id: 'fb20', versionId: 'v-university', completedContent: false,
    preQuizScore: 50, postQuizScore: 62, satisfaction: 3,
    wouldRecommend: true, submittedAt: '2026-03-17',
    comment: 'The quiz terminology assumes prior knowledge not covered earlier.',
  },
  {
    id: 'fb21', versionId: 'v-university', completedContent: true,
    preQuizScore: 78, postQuizScore: 95, satisfaction: 5,
    wouldRecommend: true, submittedAt: '2026-03-18',
    comment: 'Excellent module. Forwarded the link to two colleagues.',
  },
  {
    id: 'fb22', versionId: 'v-university', completedContent: true,
    preQuizScore: 64, postQuizScore: 85, satisfaction: 4,
    wouldRecommend: true, submittedAt: '2026-03-18',
    comment: 'Footage quality is the standout. Very high production value.',
  },
  // Museum (8 responses)
  {
    id: 'fb23', versionId: 'v-museum', completedContent: true,
    preQuizScore: 30, postQuizScore: 55, satisfaction: 5,
    wouldRecommend: true, submittedAt: '2026-03-20',
    comment: 'The nursery fish film was beautiful. My children loved it.',
  },
  {
    id: 'fb24', versionId: 'v-museum', completedContent: true,
    preQuizScore: 25, postQuizScore: 50, satisfaction: 4,
    wouldRecommend: true, submittedAt: '2026-03-20',
    comment: 'Carbon comparisons made the numbers real. Very effective.',
  },
  {
    id: 'fb25', versionId: 'v-museum', completedContent: false,
    preQuizScore: 20, postQuizScore: 30, satisfaction: 3,
    wouldRecommend: false, submittedAt: '2026-03-21',
    comment: 'The restoration activity was too long for a museum setting.',
  },
  {
    id: 'fb26', versionId: 'v-museum', completedContent: true,
    preQuizScore: 35, postQuizScore: 60, satisfaction: 5,
    wouldRecommend: true, submittedAt: '2026-03-21',
    comment: 'Would come back to see an updated version.',
  },
  {
    id: 'fb27', versionId: 'v-museum', completedContent: true,
    preQuizScore: 28, postQuizScore: 52, satisfaction: 4,
    wouldRecommend: true, submittedAt: '2026-03-22',
    comment: 'Accessible for non-scientists. Nice pacing.',
  },
  {
    id: 'fb28', versionId: 'v-museum', completedContent: true,
    preQuizScore: 32, postQuizScore: 58, satisfaction: 5,
    wouldRecommend: true, submittedAt: '2026-03-22',
    comment: 'The decision tree activity sparked a great family conversation.',
  },
  {
    id: 'fb29', versionId: 'v-museum', completedContent: false,
    preQuizScore: 22, postQuizScore: 35, satisfaction: 2,
    wouldRecommend: false, submittedAt: '2026-03-23',
    comment: 'Text was too small on the panel displays. Accessibility issue.',
  },
  {
    id: 'fb30', versionId: 'v-museum', completedContent: true,
    preQuizScore: 38, postQuizScore: 62, satisfaction: 4,
    wouldRecommend: true, submittedAt: '2026-03-23',
    comment: 'Timelapse footage is genuinely mesmerising. Keep it.',
  },
];
