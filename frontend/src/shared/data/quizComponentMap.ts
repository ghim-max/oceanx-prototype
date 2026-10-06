import { SEAGRASS_STORIES } from './seagrass-stories';
import { UNIVERSITY_STATUS } from './university-version';

export const TRACKED_COMPONENTS = [
  { id: 'game', title: 'Seagrass Stories game' },
  { id: 'create-activity', title: 'Map the chain: choice, consequence, change' },
  { id: 'further-reading-unep', title: 'UNEP: Seagrass meadows' },
  { id: 'video-changi-point', title: 'Changi Point: a meadow in trouble' },
  { id: 'video-nada', title: 'Meet Nada: a seagrass scientist' },
  { id: 'learner-organiser', title: 'Learner organiser' },
] as const;

// Verify all tracked component IDs exist in seagrass-stories.ts
const existingIds = new Set(SEAGRASS_STORIES.components.map((c: { id: string }) => c.id));
for (const comp of TRACKED_COMPONENTS) {
  if (!existingIds.has(comp.id)) {
    console.warn(`Tracked component ID "${comp.id}" does not exist in seagrass-stories.ts`);
  }
}

export const QUESTION_COMPONENT: Record<'q1' | 'q2' | 'q3' | 'q4' | 'q5', string> = {
  q1: 'video-nada',
  q2: 'video-changi-point',
  q3: 'further-reading-unep',
  q4: 'game',
  q5: 'create-activity',
};

export const SCORED_QUESTION_IDS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;

export const CONFIDENCE_QUESTION = 'How confident are you explaining how seagrass helps fight climate change?';

export function getUniversityStatus(componentId: string): 'Fixed' | 'Adapted' {
  const entry = UNIVERSITY_STATUS[componentId];
  if (entry) {
    return entry.status;
  }
  return 'Fixed';
}

export function scoreAnswers(answers: Record<string, number | undefined>): {
  correct: Record<'q1' | 'q2' | 'q3' | 'q4' | 'q5', boolean>;
  score: number;
} {
  const correctMap: Record<'q1' | 'q2' | 'q3' | 'q4' | 'q5', number> = {
    q1: 0,
    q2: 1,
    q3: 1,
    q4: 3,
    q5: 1,
  };

  const correct: Record<'q1' | 'q2' | 'q3' | 'q4' | 'q5', boolean> = {
    q1: answers.q1 === correctMap.q1,
    q2: answers.q2 === correctMap.q2,
    q3: answers.q3 === correctMap.q3,
    q4: answers.q4 === correctMap.q4,
    q5: answers.q5 === correctMap.q5,
  };

  const score = (Object.values(correct) as boolean[]).filter(Boolean).length;

  return { correct, score };
}