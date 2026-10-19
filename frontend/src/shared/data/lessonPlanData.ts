export interface LessonPrompt {
  text: string;
  sample?: boolean;
}

export interface LessonBlock {
  id: string;
  title: string;
  stage: 'Explore' | 'Investigate' | 'Reflect' | 'Create';
  minutes: { default: number; min: number };
  howToRun: string;
  prompts: LessonPrompt[];
  evidenceOfLearning: string;
  sample?: boolean;
}

export interface LessonMeta {
  learningIntention: string;
  drivingQuestion: string;
  materials: string[];
}

export const LESSON_META: LessonMeta = {
  learningIntention:
    'Explore how seagrass restoration works and use what you discover to help someone else understand it.',
  drivingQuestion: 'What does it take to bring an underwater meadow back to life?',
  materials: [
    'Internet-connected display and student devices where possible.',
    'Access to the Seagrass Stories webpage and game.',
    'One Learner Graphic Organiser per learner or group.',
    '6 to 10 Post-its per group. Pens or markers.',
  ],
};

const EXPLORE_HOW_TO_RUN =
  'Divide the three videos among groups. Learners hold two questions in mind while watching, ' +
  'then debrief the full set using See, Think, Wonder.\n\n' +
  'Learners get time to notice before explaining. Facilitators capture different interpretations ' +
  'and questions for later.\n\n' +
  '(See, Think, Wonder is adapted from Harvard Project Zero.)';

const EXPLORE_PROMPTS: LessonPrompt[] = [
  { text: 'See: What do you notice?' },
  { text: 'Think: What is happening? What relationships can you see?' },
  { text: 'Wonder: What questions does this raise? What do you want to understand more about?' },
];

const EXPLORE_EVIDENCE =
  'Learners notice details and relationships, offer interpretations, and generate questions they can investigate.';

const INVESTIGATE_HOW_TO_RUN =
  'Play Seagrass Stories as a scientist, examining change, timescale and recovery.';

const INVESTIGATE_PROMPTS: LessonPrompt[] = [
  { text: 'What changes quickly?' },
  { text: 'What might take longer in the ocean?' },
  { text: 'What evidence would tell you the meadow is recovering?' },
];

const INVESTIGATE_EVIDENCE =
  'Learners distinguish between immediate game responses and ecological change, and identify possible evidence of recovery.';

export const LESSON_BLOCKS: Record<string, LessonBlock> = {
  'video-nada': {
    id: 'video-nada',
    title: 'Meet Nada: a seagrass scientist',
    stage: 'Explore',
    minutes: { default: 8, min: 5 },
    howToRun: EXPLORE_HOW_TO_RUN,
    prompts: EXPLORE_PROMPTS,
    evidenceOfLearning: EXPLORE_EVIDENCE,
  },
  'video-changi-point': {
    id: 'video-changi-point',
    title: 'Changi Point: a meadow in trouble',
    stage: 'Explore',
    minutes: { default: 7, min: 4 },
    howToRun: EXPLORE_HOW_TO_RUN,
    prompts: EXPLORE_PROMPTS,
    evidenceOfLearning: EXPLORE_EVIDENCE,
    sample: true,
  },
  'video-ecology-in-action': {
    id: 'video-ecology-in-action',
    title: 'Ecology in action',
    stage: 'Explore',
    minutes: { default: 10, min: 7 },
    howToRun: EXPLORE_HOW_TO_RUN,
    prompts: EXPLORE_PROMPTS,
    evidenceOfLearning: EXPLORE_EVIDENCE,
    sample: true,
  },
  'explore-prompts': {
    id: 'explore-prompts',
    title: 'What do you notice, what do you wonder?',
    stage: 'Explore',
    minutes: { default: 10, min: 5 },
    howToRun: EXPLORE_HOW_TO_RUN,
    prompts: EXPLORE_PROMPTS,
    evidenceOfLearning: EXPLORE_EVIDENCE,
  },
  game: {
    id: 'game',
    title: 'Seagrass Stories game',
    stage: 'Investigate',
    minutes: { default: 15, min: 10 },
    howToRun: INVESTIGATE_HOW_TO_RUN,
    prompts: INVESTIGATE_PROMPTS,
    evidenceOfLearning: INVESTIGATE_EVIDENCE,
  },
  'investigate-prompts': {
    id: 'investigate-prompts',
    title: 'Investigate prompts',
    stage: 'Investigate',
    minutes: { default: 10, min: 5 },
    howToRun: INVESTIGATE_HOW_TO_RUN,
    prompts: INVESTIGATE_PROMPTS,
    evidenceOfLearning: INVESTIGATE_EVIDENCE,
  },
  'reflect-prompts': {
    id: 'reflect-prompts',
    title: 'Guided reflection',
    stage: 'Reflect',
    minutes: { default: 15, min: 10 },
    howToRun:
      'Learners reflect individually, then share and compare thinking with others. They may return to earlier notes.',
    prompts: [
      { text: 'What changed how you think about ocean restoration?' },
      { text: 'What are you still wondering?' },
      { text: 'Who decides what gets restored?', sample: true },
    ],
    evidenceOfLearning:
      'Learners articulate a shift, connection or new understanding, and identify remaining questions.',
  },
  'create-activity': {
    id: 'create-activity',
    title: 'Map the chain: choice, consequence, change',
    stage: 'Create',
    minutes: { default: 15, min: 10 },
    howToRun:
      'Groups of 2 to 3 learners design an experience that helps someone else understand an idea about ocean restoration. Each group uses 6 to 10 Post-its to build a causal chain: Choice or Action, then Consequence, then Habitat Response, then Change Over Time. Groups connect their Post-its with arrows to show how one change leads to the next.',
    prompts: [
      { text: 'What choice or action happens?' },
      { text: 'What happens because of it?' },
      { text: 'How does the habitat respond?' },
      { text: 'How do things change over time?' },
    ],
    evidenceOfLearning:
      'Learners communicate their understanding through a causal chain that links a choice to its consequence, the habitat response and change over time.',
  },
};
