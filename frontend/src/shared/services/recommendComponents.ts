// Mock. Replace with the teammate's RAG service. Keep this input/output shape.

export interface RecommendRequest {
  audience: string;
  picks: string[];
}

export interface Recommendation {
  id: string;
  rationale: string;
  isAdapted?: boolean;
}

const UNIVERSITY_RECOMMENDATIONS: Recommendation[] = [
  {
    id: 'further-reading-unep',
    rationale: 'Builds the background on carbon storage that your Changi Point discussion will need.',
  },
  {
    id: 'further-reading-seagrass-watch',
    rationale: 'Gives students the big picture on why meadows matter before class.',
  },
  {
    id: 'driving-question',
    rationale: 'Frames the whole seminar around one question your research questions can answer.',
  },
  {
    id: 'game',
    rationale: 'Makes restoration decisions hands-on, so the causal chain activity has real examples to draw on.',
  },
  {
    id: 'video-nada',
    rationale: 'Shows the human side of restoration work alongside your local Changi Point case.',
  },
  {
    id: 'investigate-prompts',
    rationale: 'Pushes students to weigh evidence and timescales, which leads into their research question.',
    isAdapted: true,
  },
  {
    id: 'reflect-prompts',
    rationale: 'A written reflection on what real recovery looks like, a fit for university assessment.',
    isAdapted: true,
  },
  {
    id: 'educator-guide',
    rationale: 'Timing and facilitation notes to run the session smoothly.',
  },
];

export async function recommendComponents(req: RecommendRequest): Promise<Recommendation[]> {
  await new Promise<void>(resolve => setTimeout(resolve, 2000));
  if (req.audience.toLowerCase() === 'university') {
    return UNIVERSITY_RECOMMENDATIONS;
  }
  return [];
}
