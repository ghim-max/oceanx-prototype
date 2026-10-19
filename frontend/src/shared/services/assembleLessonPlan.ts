import { LESSON_BLOCKS, LESSON_META, type LessonBlock, type LessonPrompt } from '../data/lessonPlanData';

export type LessonLevel = 'introductory' | 'intermediate' | 'advanced';

export interface LessonPlanOptions {
  length: 30 | 60 | 90 | 120;
  level: LessonLevel;
}

export interface LessonTimelineRow {
  label: string;
  minutes: number;
  stage: string;
  howToRun?: string;
  prompts?: LessonPrompt[];
  evidenceOfLearning?: string;
  isOpening?: boolean;
  isClose?: boolean;
  isSample?: boolean;
}

export interface LessonPlan {
  learningIntention: string;
  drivingQuestion: string;
  length: number;
  level: LessonLevel;
  materials: string[];
  timeline: LessonTimelineRow[];
  levelNote: string;
  hasSampleContent: boolean;
}

const LEVEL_NOTES: Record<LessonLevel, string> = {
  introductory:
    'This session is designed for learners who are new to seagrass and ocean ecology. Use accessible language and allow more time for discussion.',
  intermediate:
    'This session is designed for learners with some prior knowledge of ecosystems. Encourage learners to connect ideas to what they already know.',
  advanced:
    'This session is designed for learners in a university or research context. Extend discussion prompts with evidence-based questions and peer critique.',
};

const OPENING_MIN = 5;
const CLOSE_MIN = 5;

const STAGE_ORDER: Record<string, number> = { Explore: 0, Investigate: 1, Reflect: 2, Create: 3 };

const AUTO_REFLECT: LessonBlock = {
  id: 'reflect-auto',
  title: 'Guided reflection',
  stage: 'Reflect',
  minutes: { default: 10, min: 5 },
  howToRun:
    'Learners reflect individually, then share and compare thinking with others. They may return to earlier notes.',
  prompts: [
    { text: 'What changed how you think about ocean restoration?' },
    { text: 'What are you still wondering?' },
  ],
  evidenceOfLearning:
    'Learners articulate a shift, connection or new understanding, and identify remaining questions.',
};

export function assembleLessonPlan(
  componentIds: string[],
  options: LessonPlanOptions,
  quizSummary?: { type: string; count: number },
): LessonPlan | { error: string } {
  const blocks: LessonBlock[] = componentIds
    .map((id) => LESSON_BLOCKS[id])
    .filter((b): b is LessonBlock => b !== undefined);

  // Fix 1: Order blocks by stage; preserve pick order as tie-break (stable sort)
  blocks.sort((a, b) => (STAGE_ORDER[a.stage] ?? 99) - (STAGE_ORDER[b.stage] ?? 99));

  // Fix 2: Always include a Reflect block; use educator-picked one if present
  if (!blocks.some((b) => b.stage === 'Reflect')) {
    blocks.push(AUTO_REFLECT);
    blocks.sort((a, b) => (STAGE_ORDER[a.stage] ?? 99) - (STAGE_ORDER[b.stage] ?? 99));
  }

  const totalMinTime =
    OPENING_MIN + blocks.reduce((s, b) => s + b.minutes.min, 0) + CLOSE_MIN;

  // Fix 3: Educator-friendly error message
  if (totalMinTime > options.length) {
    return {
      error: `These materials need about ${totalMinTime} min. Choose a longer session or remove one.`,
    };
  }

  const componentBudget = options.length - OPENING_MIN - CLOSE_MIN;
  const totalDefault = blocks.reduce((s, b) => s + b.minutes.default, 0);

  let scaledBlocks: Array<{ block: LessonBlock; planned: number }>;

  if (totalDefault <= componentBudget) {
    // Use defaults; distribute leftover time to the shortest block(s)
    const planned = blocks.map((b) => b.minutes.default);
    let extra = componentBudget - totalDefault;
    while (extra > 0) {
      let minIdx = 0;
      for (let i = 1; i < planned.length; i++) {
        if (planned[i] < planned[minIdx]) minIdx = i;
      }
      planned[minIdx]++;
      extra--;
    }
    scaledBlocks = blocks.map((b, i) => ({ block: b, planned: planned[i] }));
  } else {
    // Scale down proportionally, respecting minimum times
    const scale = componentBudget / totalDefault;
    scaledBlocks = blocks.map((b) => ({
      block: b,
      planned: Math.max(b.minutes.min, Math.round(b.minutes.default * scale)),
    }));
    // Correct rounding drift: add/subtract from the block with the most slack
    const scaledTotal = scaledBlocks.reduce((s, { planned }) => s + planned, 0);
    const drift = componentBudget - scaledTotal;
    if (drift !== 0) {
      const target =
        drift > 0
          ? scaledBlocks.reduce((max, cur) => (cur.planned > max.planned ? cur : max))
          : scaledBlocks.reduce((min, cur) =>
              cur.planned - cur.block.minutes.min > min.planned - min.block.minutes.min
                ? cur
                : min,
            );
      target.planned += drift;
    }
  }

  const openingHowToRun = quizSummary
    ? `Welcome learners. Introduce the session topic and the driving question. ` +
      `Distribute the Learner Graphic Organiser. Ask learners to complete the ` +
      `${quizSummary.count}-question pre-check ` +
      `(${quizSummary.type === 'mcq' ? 'multiple choice' : quizSummary.type === 'short' ? 'short answer' : 'mixed'}) ` +
      `before starting.`
    : 'Welcome learners. Introduce the session topic and the driving question. Distribute the Learner Graphic Organiser.';

  const closeHowToRun = quizSummary
    ? `Invite 2 to 3 learners to share one thing they will take away. ` +
      `Ask learners to complete the ${quizSummary.count}-question after-class knowledge check and provide the link.`
    : 'Invite 2 to 3 learners to share one thing they will take away.';

  const timeline: LessonTimelineRow[] = [
    {
      label: 'Opening',
      minutes: OPENING_MIN,
      stage: 'Start',
      howToRun: openingHowToRun,
      isOpening: true,
    },
    ...scaledBlocks.map(({ block, planned }) => ({
      label: block.title,
      minutes: planned,
      stage: block.stage,
      howToRun: block.howToRun,
      prompts: block.prompts,
      evidenceOfLearning: block.evidenceOfLearning,
      isSample: block.sample,
    })),
    {
      label: 'Close',
      minutes: CLOSE_MIN,
      stage: 'Close',
      howToRun: closeHowToRun,
      isClose: true,
    },
  ];

  const hasSampleContent =
    blocks.some((b) => b.sample) ||
    blocks.some((b) => b.prompts.some((p) => p.sample));

  return {
    learningIntention: LESSON_META.learningIntention,
    drivingQuestion: LESSON_META.drivingQuestion,
    length: options.length,
    level: options.level,
    materials: LESSON_META.materials,
    timeline,
    levelNote: LEVEL_NOTES[options.level],
    hasSampleContent,
  };
}
