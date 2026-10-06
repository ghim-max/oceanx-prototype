// Mock. Replace with the teammate's RAG service. Keep this input/output shape.

export interface GenerateRequest {
  audience: string;
  picks: string[];
  request: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type?: 'mcq' | 'short-answer';
  options: string[];
  correct: number;
}

export interface GeneratedQuiz {
  title: string;
  duration: string;
  questionCount: number;
  metaLabel?: string;
  questions: QuizQuestion[];
}

export interface LessonPlanSection {
  label: string;
  duration: string;
  activities: string[];
}

export interface GeneratedLessonPlan {
  title: string;
  description: string;
  totalDuration: string;
  pdfUrl: string;
  sections: LessonPlanSection[];
}

export interface GeneratedExtras {
  quiz?: GeneratedQuiz;
  lessonPlan?: GeneratedLessonPlan;
}

export const UNIVERSITY_QUIZ: GeneratedQuiz = {
  title: 'Seagrass restoration: a knowledge check',
  duration: '10 min',
  questionCount: 6,
  metaLabel: '6 questions (5 multiple choice, 1 short answer) · 10 min',
  questions: [
    {
      id: 'q1',
      question: 'What is "blue carbon"?',
      options: [
        'Carbon stored in ocean sediments by coastal ecosystems',
        'Carbon emitted by marine diesel engines',
        'The colour of CO2 when dissolved in seawater',
        'Carbon captured by phytoplankton blooms',
      ],
      correct: 0,
    },
    {
      id: 'q2',
      question: 'Why did seagrass cover at Changi Point decline?',
      options: [
        'Rising water temperatures from climate change',
        'Coastal development and increased water turbidity',
        'Overharvesting by local fishing communities',
        'Invasive species outcompeting native meadows',
      ],
      correct: 1,
    },
    {
      id: 'q3',
      question: 'Since the late 1800s, roughly what share of the world known seagrass area has been lost?',
      options: [
        'About 5%',
        'About 30%',
        'About 60%',
        'About 90%',
      ],
      correct: 1,
    },
    {
      id: 'q4',
      question: 'Seagrass meadows store carbon at roughly what rate compared to terrestrial forests?',
      options: [
        'Half the rate',
        'The same rate',
        'Twice the rate',
        'Up to 35 times the rate per unit area',
      ],
      correct: 3,
    },
    {
      id: 'q5',
      question: 'In the causal chain activity, what does one decision "ripple through"?',
      options: [
        'The funding pipeline for OceanX Education',
        'A seagrass ecosystem over time',
        'The university curriculum framework',
        'A coastal management plan',
      ],
      correct: 1,
    },
    {
      id: 'q6',
      type: 'short-answer',
      question: 'In 2-3 sentences, describe one trade-off that coastal managers face when deciding where to prioritise seagrass restoration.',
      options: [],
      correct: 0,
    },
  ],
};

const UNIVERSITY_LESSON_PLAN: GeneratedLessonPlan = {
  title: 'Seagrass Stories: university seminar plan',
  description:
    'A 90-minute seminar built around your picks: the Changi Point video, the game and a causal chain research question.',
  totalDuration: '90 min',
  pdfUrl: '/seagrass-stories-university-lesson-plan.pdf',
  sections: [
    {
      label: 'Before class',
      duration: '30 min',
      activities: ['Read UNEP seagrass overview', 'Read Seagrass-Watch introduction'],
    },
    {
      label: 'Opening',
      duration: '15 min',
      activities: ['Driving question', 'Watch Changi Point video'],
    },
    {
      label: 'Core investigation',
      duration: '40 min',
      activities: [
        'Play Seagrass Stories game (20 min)',
        'Investigate prompts (10 min)',
        'Causal chain research question (10 min)',
      ],
    },
    {
      label: 'Reflection and close',
      duration: '20 min',
      activities: [
        'Who decides what gets restored?',
        'Written reflection (university assessment)',
      ],
    },
  ],
};

function wants(request: string, keyword: string): boolean {
  const r = request.toLowerCase();
  return (
    r.includes(keyword) ||
    r.includes('both') ||
    r.includes('everything') ||
    r.includes('all')
  );
}

export async function generateExtras(req: GenerateRequest): Promise<GeneratedExtras> {
  await new Promise<void>(resolve => setTimeout(resolve, 1500));
  const wantsQuiz = wants(req.request, 'quiz');
  const wantsPlan = wants(req.request, 'lesson') || wants(req.request, 'plan');
  return {
    quiz: wantsQuiz ? UNIVERSITY_QUIZ : undefined,
    lessonPlan: wantsPlan ? UNIVERSITY_LESSON_PLAN : undefined,
  };
}
