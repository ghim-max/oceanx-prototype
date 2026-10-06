// Single source of truth for university-audience adaptation status.
// Fixed  = used as is (videos, game, third-party readings, unmodified materials).
// Adapted = tailored for university learners.

export type AdaptStatus = 'Fixed' | 'Adapted';

export interface UniversityComponentEntry {
  status: AdaptStatus;
  note?: string; // one-line italic explanation, shown on pick cards only
}

export const UNIVERSITY_STATUS: Record<string, UniversityComponentEntry> = {
  'video-changi-point': { status: 'Fixed' },
  'create-activity': {
    status: 'Adapted',
    note: 'Becomes a short research question for university learners.',
  },
  'further-reading-unep': { status: 'Fixed' },
  'further-reading-seagrass-watch': { status: 'Fixed' },
  'driving-question': { status: 'Fixed' },
  game: { status: 'Fixed' },
  'video-nada': { status: 'Fixed' },
  'investigate-prompts': {
    status: 'Adapted',
    note: 'Focuses on evidence, methodology and timescales.',
  },
  'reflect-prompts': {
    status: 'Adapted',
    note: 'Becomes a longer written reflection.',
  },
  'educator-guide': { status: 'Fixed' },
  'learning-intention': { status: 'Adapted' },
  'explore-prompts': { status: 'Adapted' },
};
