import { SEAGRASS_STORIES } from '../../shared/data/seagrass-stories';
import { demoScreen } from './packageReviewService';

export const USE_MOCK = true;

const STORAGE_KEY = 'oceanx_mock_governance_v2';
export const MOCK_FLAGGED_SUBMISSION_IDS = [
  'mock-flagged-hydrothermal-vents',
  'mock-flagged-arctic-food-web',
] as const;

// ============================================
// Types
// ============================================

export type ReviewKind = 'ai_adaptation' | 'share_back' | 'issue_report';
export type ReviewStatus = 'pending' | 'approved' | 'edited' | 'rejected';
export type DecisionAction = 'approve' | 'edit' | 'reject';

export interface ReviewItem {
  id: string;
  kind: ReviewKind;
  componentId: string;
  componentTitle: string;
  packageId?: string;
  educatorEmail?: string;
  educatorNote?: string;
  originalText: string;
  proposedText: string;
  finalText?: string;
  status: ReviewStatus;
  reviewer: 'OceanX team';
  reason?: string;
  createdAt: string;
  openedAt?: string;
  decidedAt?: string;
  submittedAt?: string;
  adaptationStartedAt?: string;
  okToReuse?: boolean;
  flaggedSourceId?: string;
  screeningStatus?: 'flagged' | 'passed';
  screeningReason?: string;
  screeningMode?: 'demo';
  // Share material fields
  isNewMaterial?: boolean;
  materialLink?: string;
  stage?: string;
  creditName?: string;
  creditInstitution?: string;
  coverImageLink?: string;
}

export interface DecisionLogEntry {
  id: string;
  who: 'OceanX team';
  action:
    | 'Reuse'
    | 'Adapt'
    | 'Drop'
    | 'Restore'
    | 'Approve'
    | 'Edit'
    | 'Reject'
    | 'Task done'
    | 'Resolved'
    | 'Not an issue'
    | 'Package pending review'
    | 'Package cleared'
    | 'Approve & Send'
    | 'Edit & Send'
    | 'Reject & Send Original'
    | 'Delivery simulated'
    | 'Delivery failed'
    | 'Undo';
  targetType: string;
  targetId: string;
  why?: string;
  aiRecommendation?: string;
  aiOverride: boolean;
  createdAt: string;
}

export interface PendingCounts {
  ai_adaptation: number;
  share_back: number;
  issue_report: number;
  total: number;
}

export interface CoCreatedMaterial {
  id: string;
  title: string;
  link: string;
  stage: string;
  coverImageLink?: string;
  creditName: string;
  creditInstitution: string;
  approvedAt: string;
  sourceTicketId: string;
  reviewStatus: 'in_review' | 'approved';
}

export interface DecideResult {
  releaseEmail: boolean;
  packageId?: string;
  educatorEmail?: string;
}

export interface RewriteResult {
  rewrittenText: string;
  sourcesUsed: string[];
}

export interface SubmitPackageResult {
  status: 'pending_review' | 'sent';
}

// ============================================
// Library State Types (Part A)
// ============================================

export interface LibraryState {
  componentId: string;
  hidden: boolean;
  proven: boolean;
  coCreated: boolean;
  obsolete: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface AdaptationTask {
  id: string;
  componentId: string;
  componentTitle: string;
  reason: string;
  status: 'open' | 'done';
  decisionId: string;
  createdAt: string;
  doneAt?: string;
}

// ============================================
// Component titles (from backend/app/components.json)
// ============================================

export const COMPONENT_TITLES: Record<string, string> = {
  game: 'Seagrass Stories game',
  'video-nada': 'Meet Nada: a seagrass scientist',
  'video-changi-point': 'Changi Point: a meadow in trouble',
  'create-activity': 'Map the chain: choice, consequence, change',
  'further-reading-unep': 'UNEP: Seagrass meadows',
  'learner-organiser': 'Learner organiser',
  'investigate-prompts': 'Investigate prompts',
  'reflect-prompts': 'Reflect prompts',
  'learning-intention': 'Learning intentions',
  'explore-prompts': 'Explore prompts',
  'driving-question': 'Driving question',
  'video-ecology-in-action': 'Ecology in action',
  'further-reading-seagrass-watch': 'Seagrass-Watch: Why seagrass matters',
  'educator-guide': 'Educator guide',
};

// Original texts for AI rewriting (from seagrass-stories.ts)
export const COMPONENT_ORIGINAL_TEXTS: Record<string, string> = {
  'create-activity': "Groups of 2 to 3 learners design an experience that helps someone else understand an idea about ocean restoration. Each group uses 6 to 10 Post-its to build a causal chain: Choice or Action, then Consequence, then Habitat Response, then Change Over Time. Groups connect their Post-its with arrows to show how one change leads to the next.",
  'investigate-prompts': 'Discussion prompts to use during and after the game: what restoration decisions did you face, what trade-offs arose, and what would you change?',
  'reflect-prompts': 'A structured conversation about the human and political dimensions of conservation decisions.',
  'learning-intention': 'What learners will explore in this story and how they will share what they learn.',
  'explore-prompts': 'Pairs or tables share initial observations and questions after watching the opening footage.',
};

// Source files for each component (from backend/app/sources/)
export const COMPONENT_SOURCES: Record<string, string[]> = {
  'create-activity': ['seagrass_systems.md', 'ecosystem_cascades.md'],
  'investigate-prompts': ['game_decisions.md', 'tradeoffs.md'],
  'reflect-prompts': ['conservation_politics.md', 'human_dimensions.md'],
  'learning-intention': ['learning_goals.md', 'university_outcomes.md'],
  'explore-prompts': ['observation_skills.md', 'wonder_questions.md'],
};

export function getComponentOriginalText(componentId: string): string {
  if (COMPONENT_ORIGINAL_TEXTS[componentId]) {
    return COMPONENT_ORIGINAL_TEXTS[componentId];
  }
  const component = SEAGRASS_STORIES.components.find((c) => c.id === componentId);
  if (component) {
    return component.originalText ?? component.description ?? '';
  }
  return '';
}

// ============================================
// In-memory state
// ============================================

let reviewItems: ReviewItem[] = [];
let decisionLog: DecisionLogEntry[] = [];
let libraryState: LibraryState[] = [];
let adaptationTasks: AdaptationTask[] = [];
let dismissedFlaggedIds: string[] = [];
let coCreatedMaterials: CoCreatedMaterial[] = [];

// Exported getter for reviewItems (used by LogPage for title lookup)
export function getReviewItems(): Promise<ReviewItem[]> {
  return Promise.resolve(reviewItems);
}

export async function getCoCreatedMaterials(): Promise<CoCreatedMaterial[]> {
  await delay(300);
  seedIfEmpty();
  return [...coCreatedMaterials].sort((a, b) => new Date(b.approvedAt).getTime() - new Date(a.approvedAt).getTime());
}

// ============================================
// Storage helpers
// ============================================

function loadFromStorage(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.reviewItems && Array.isArray(parsed.reviewItems)) {
        reviewItems = parsed.reviewItems;
      }
      if (parsed.decisionLog && Array.isArray(parsed.decisionLog)) {
        decisionLog = parsed.decisionLog;
      }
      if (parsed.libraryState && Array.isArray(parsed.libraryState)) {
        libraryState = parsed.libraryState;
      }
      if (parsed.adaptationTasks && Array.isArray(parsed.adaptationTasks)) {
        adaptationTasks = parsed.adaptationTasks;
      }
      if (parsed.dismissedFlaggedIds && Array.isArray(parsed.dismissedFlaggedIds)) {
        dismissedFlaggedIds = parsed.dismissedFlaggedIds;
      }
      if (parsed.coCreatedMaterials && Array.isArray(parsed.coCreatedMaterials)) {
        coCreatedMaterials = parsed.coCreatedMaterials;
      }
      // Sort by createdAt ascending
      reviewItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
  } catch {
    // Ignore corrupted storage
  }
}

function saveToStorage(): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ reviewItems, decisionLog, libraryState, adaptationTasks, dismissedFlaggedIds, coCreatedMaterials })
    );
  } catch {
    // Ignore storage full errors
  }
}

// ============================================
// Helpers
// ============================================

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowISO(): string {
  return new Date().toISOString();
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function ensureFlaggedDemoShareBacks(): void {
  const examples: ReviewItem[] = [
    {
      id: MOCK_FLAGGED_SUBMISSION_IDS[0],
      kind: 'share_back',
      componentId: 'reflect-prompts',
      componentTitle: COMPONENT_TITLES['reflect-prompts'],
      packageId: undefined,
      educatorEmail: 's.lim@example.edu',
      originalText: getComponentOriginalText('reflect-prompts'),
      proposedText: 'Hold a debate on who decides what gets restored. Conservation decisions are never political.',
      status: 'pending',
      reviewer: 'OceanX team',
      reason: "Absolute claim ('never political') contradicts the approved source on conservation politics.",
      screeningReason: "Absolute claim ('never political') contradicts the approved source on conservation politics.",
      screeningStatus: 'flagged',
      screeningMode: 'demo',
      createdAt: '2026-10-28T09:00:00.000Z',
    },
    {
      id: MOCK_FLAGGED_SUBMISSION_IDS[1],
      kind: 'share_back',
      componentId: 'create-activity',
      componentTitle: COMPONENT_TITLES['create-activity'],
      packageId: undefined,
      educatorEmail: 'd.tan@example.edu',
      originalText: getComponentOriginalText('create-activity'),
      proposedText: 'Replace Post-its with a shared Miro board. Each group adds one real local restoration case.',
      status: 'pending',
      reviewer: 'OceanX team',
      reason: 'Valid adaptation suggestion using digital tools and local cases.',
      screeningReason: 'Valid adaptation suggestion using digital tools and local cases.',
      screeningStatus: 'passed',
      screeningMode: 'demo',
      createdAt: '2026-10-29T08:30:00.000Z',
    },
  ];

  let changed = false;
  for (const example of examples) {
    const existing = reviewItems.find((item) => item.id === example.id);
    if (existing) {
      existing.kind = 'share_back';
      existing.screeningStatus = example.screeningStatus;
      existing.reason = example.reason;
      existing.screeningReason = example.screeningReason;
      existing.screeningMode = 'demo';
      if (!existing.reason) existing.reason = example.reason;
      changed = true;
      continue;
    }
    if (dismissedFlaggedIds.includes(example.id)) continue;
    reviewItems.push(example);
    changed = true;
  }

  // Also ensure existing seeded share backs (game, video-nada) have screeningStatus 'passed' if missing
  const existingSeeded = reviewItems.filter(
    (item) => item.kind === 'share_back' && item.componentId === 'game'
  );
  for (const item of existingSeeded) {
    if (!item.screeningStatus) {
      item.screeningStatus = 'passed';
      changed = true;
    }
  }
  const existingSeeded2 = reviewItems.filter(
    (item) => item.kind === 'share_back' && item.componentId === 'video-nada'
  );
  for (const item of existingSeeded2) {
    if (!item.screeningStatus) {
      item.screeningStatus = 'passed';
      changed = true;
    }
  }

  if (changed) {
    reviewItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    saveToStorage();
  }
}

function seedIfEmpty(): void {
  if (reviewItems.length > 0) {
    ensureFlaggedDemoShareBacks();
    return;
  }

  loadFromStorage();
  if (reviewItems.length > 0) {
    ensureFlaggedDemoShareBacks();
    return;
  }

  const baseTime = Date.now();
  const hour = 3600 * 1000;
  const day = 24 * hour;

  // Package 1: two AI adaptations for same educator
  const pkg1 = 'pkg-university-2026-q3';
  const educator1 = 'dr.chen@university.edu';

  // Package 2: one AI adaptation for different educator
  const pkg2 = 'pkg-university-2026-q4';
  const educator2 = 'prof.williams@university.edu';

  // 3 AI adaptations
  reviewItems.push(
    {
      id: genId(),
      kind: 'ai_adaptation',
      componentId: 'create-activity',
      componentTitle: COMPONENT_TITLES['create-activity'],
      packageId: pkg1,
      educatorEmail: educator1,
      educatorNote: 'Students need more time to develop their research questions.',
      originalText:
        'Groups use sticky notes to trace how one decision ripples through a seagrass ecosystem over time. For university, becomes a short research question.',
      proposedText:
        'Groups use sticky notes to trace how one decision ripples through a seagrass ecosystem over time. For university, students write a 500-word research brief on the cascade effects of their chosen management action, citing at least two peer-reviewed sources.',
      status: 'pending',
      reviewer: 'OceanX team',
      createdAt: new Date(baseTime - hour).toISOString(), // 1 hour ago
    },
    {
      id: genId(),
      kind: 'ai_adaptation',
      componentId: 'video-changi-point',
      componentTitle: COMPONENT_TITLES['video-changi-point'],
      packageId: pkg1,
      educatorEmail: educator1,
      educatorNote: 'Add a guiding question before the video.',
      originalText:
        'A short film about the seagrass meadow at Changi Point, Singapore.',
      proposedText:
        'A short film about the seagrass meadow at Changi Point, Singapore. Before watching: "What pressures do you think a meadow near a busy port and airport faces?" Discuss predictions, then watch to confirm.',
      status: 'pending',
      reviewer: 'OceanX team',
      createdAt: new Date(baseTime - 5 * hour).toISOString(), // 5 hours ago
    },
    {
      id: genId(),
      kind: 'ai_adaptation',
      componentId: 'further-reading-unep',
      componentTitle: COMPONENT_TITLES['further-reading-unep'],
      packageId: pkg2,
      educatorEmail: educator2,
      educatorNote: 'Too dense for pre-reading. Needs a guided summary.',
      originalText:
        'Overview of seagrass meadow ecosystems, threats and restoration priorities from the UN Environment Programme.',
      proposedText:
        'Guided summary of the UNEP seagrass meadows report. Three key takeaways with discussion prompts: (1) Meadows store carbon 35x faster than rainforests. (2) 7% lost per year globally. (3) Restoration works when stressors are removed first. 10-minute pre-read instead of full report.',
      status: 'pending',
      reviewer: 'OceanX team',
      createdAt: new Date(baseTime - 2 * day).toISOString(), // 2 days ago
    }
  );

  // 2 Share backs
  reviewItems.push(
    {
      id: genId(),
      kind: 'share_back',
      componentId: 'game',
      componentTitle: COMPONENT_TITLES['game'],
      packageId: pkg1,
      educatorEmail: educator1,
      educatorNote: 'Extended the debrief by 10 minutes. Students connected the game to their thesis topics.',
      originalText:
        'An interactive game where students make restoration decisions and see the consequences unfold.',
      proposedText:
        'An interactive game where students make restoration decisions and see the consequences unfold. Extended debrief: each group presents one decision cascade and links it to a real-world case study from their research.',
      status: 'pending',
      reviewer: 'OceanX team',
      createdAt: new Date(baseTime - 3 * hour).toISOString(),
    },
    {
      id: genId(),
      kind: 'share_back',
      componentId: 'video-nada',
      componentTitle: COMPONENT_TITLES['video-nada'],
      packageId: pkg2,
      educatorEmail: undefined,
      educatorNote: undefined,
      originalText:
        'Nada introduces her work and explains why she chose to study seagrass restoration.',
      proposedText:
        'Nada introduces her work and explains why she chose to study seagrass restoration. (No adaptation; educator shared this works well as is for university opener.)',
      status: 'pending',
      reviewer: 'OceanX team',
      createdAt: new Date(baseTime - 6 * hour).toISOString(),
    }
  );

  // 2 Issue reports
  reviewItems.push(
    {
      id: genId(),
      kind: 'issue_report',
      componentId: 'game',
      componentTitle: COMPONENT_TITLES['game'],
      packageId: pkg1,
      educatorEmail: 'learner@university.edu',
      educatorNote: undefined,
      originalText: '',
      proposedText: 'The game shows 30% carbon loss after one bad decision, but the UNEP report says 7% per year globally. Which is right?',
      status: 'pending',
      reviewer: 'OceanX team',
      createdAt: new Date(baseTime - 2 * hour).toISOString(),
    },
    {
      id: genId(),
      kind: 'issue_report',
      componentId: 'create-activity',
      componentTitle: COMPONENT_TITLES['create-activity'],
      packageId: pkg1,
      educatorEmail: 'learner@university.edu',
      educatorNote: undefined,
      originalText: '',
      proposedText: 'The "Map the chain" activity ran 35 minutes but the lesson plan says 15 minutes. We ran out of time for the quiz.',
      status: 'pending',
      reviewer: 'OceanX team',
      createdAt: new Date(baseTime - 4 * hour).toISOString(),
    }
  );

  // Sort by createdAt ascending (oldest first)
  reviewItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Seed library state - one row per component from COMPONENT_ORDER (7 components)
    const now = Date.now();
    const dayMs = 24 * 3600 * 1000;
    libraryState = [
      'game',
      'video-nada',
      'create-activity',
      'video-changi-point',
      'further-reading-unep',
      'learner-organiser',
      'driving-question',
    ].map((componentId) => ({
      componentId,
      hidden: false,
      proven: false,
      coCreated: false,
      obsolete: false,
      updatedAt: nowISO(),
      createdAt: new Date(now - 60 * dayMs).toISOString(), // default 60 days ago
    }));

    // 2 items added within last 30 days (for "New" stat)
    const newItem1 = libraryState.find((s) => s.componentId === 'investigate-prompts');
    if (newItem1) { newItem1.createdAt = new Date(now - 15 * dayMs).toISOString(); }
    const newItem2 = libraryState.find((s) => s.componentId === 'reflect-prompts');
    if (newItem2) { newItem2.createdAt = new Date(now - 5 * dayMs).toISOString(); }

  // logBaseTime for decision log entries (14 days ago)
  const logBaseTime = Date.now() - 14 * day;

  // Apply seeded library state changes to match the decision log
  // Game - Reuse -> proven = true
  const gameState = libraryState.find((s) => s.componentId === 'game');
  if (gameState) { gameState.proven = true; gameState.updatedAt = nowISO(); }

  // Meet Nada - Reuse -> proven = true
  const nadaState = libraryState.find((s) => s.componentId === 'video-nada');
  if (nadaState) { nadaState.proven = true; nadaState.updatedAt = nowISO(); }

  // UNEP - Drop then Restore -> hidden = false, proven = false, obsolete = false
  const unepState = libraryState.find((s) => s.componentId === 'further-reading-unep');
  if (unepState) { unepState.hidden = false; unepState.obsolete = false; unepState.updatedAt = nowISO(); }

  // Changi - Adapt -> hidden = false, proven = false, obsolete = false
  const changiState = libraryState.find((s) => s.componentId === 'video-changi-point');
  if (changiState) { changiState.hidden = false; changiState.proven = false; changiState.obsolete = false; changiState.updatedAt = nowISO(); }

  // Seed adaptation tasks - Changi task created by Adapt, then marked done by Task done
  adaptationTasks = [
    {
      id: 'task-video-changi-point-1',
      componentId: 'video-changi-point',
      componentTitle: COMPONENT_TITLES['video-changi-point'],
      reason: 'University level needs deeper analysis prompts',
      status: 'done' as const,
      decisionId: 'decision-adapt-changi-1',
      createdAt: new Date(logBaseTime + 1 * 1.5 * day).toISOString(),
      doneAt: new Date(logBaseTime + 7 * 1.5 * day).toISOString(),
    },
  ];

  // Seed decision log with 9 entries covering all action types
  // Spread over 14 days: indices 0,1,2,3 are >7 days old (days 14, 12.5, 11, 9.5)
  const seedLogEntries: Omit<DecisionLogEntry, 'id' | 'createdAt'>[] = [
    {
      who: 'OceanX team',
      action: 'Reuse',
      targetType: 'component',
      targetId: 'game',
      why: 'Strong learning gains across all cohorts',
      aiRecommendation: 'Reuse',
      aiOverride: false,
    },
    {
      who: 'OceanX team',
      action: 'Adapt',
      targetType: 'component',
      targetId: 'video-changi-point',
      why: 'University level needs deeper analysis prompts',
      aiRecommendation: 'Reuse',
      aiOverride: true,
    },
    {
      who: 'OceanX team',
      action: 'Drop',
      targetType: 'component',
      targetId: 'further-reading-unep',
      why: 'Too dense; will replace with guided summary',
      aiRecommendation: 'Drop',
      aiOverride: false,
    },
    {
      who: 'OceanX team',
      action: 'Reuse',
      targetType: 'component',
      targetId: 'video-nada',
      why: 'Works well as university opener',
      aiRecommendation: 'Reuse',
      aiOverride: false,
    },
    {
      who: 'OceanX team',
      action: 'Approve',
      targetType: 'ai_adaptation',
      targetId: 'review-create-activity-1',
      why: 'Improved research brief aligns with university outcomes',
      aiRecommendation: undefined,
      aiOverride: false,
    },
    {
      who: 'OceanX team',
      action: 'Edit',
      targetType: 'ai_adaptation',
      targetId: 'review-video-changi-2',
      why: 'Shortened the guiding question for time',
      aiRecommendation: undefined,
      aiOverride: false,
    },
    {
      who: 'OceanX team',
      action: 'Reject',
      targetType: 'issue_report',
      targetId: 'report-game-carbon',
      why: 'Game shows scenario outcome, not annual rate; no correction needed',
      aiRecommendation: undefined,
      aiOverride: false,
    },
    {
      who: 'OceanX team',
      action: 'Task done',
      targetType: 'adaptation_task',
      targetId: 'task-video-changi-point-1',
      why: undefined,
      aiRecommendation: undefined,
      aiOverride: false,
    },
    {
      who: 'OceanX team',
      action: 'Restore',
      targetType: 'component',
      targetId: 'further-reading-unep',
      why: 'Guided summary version now ready for library',
      aiRecommendation: 'Drop',
      aiOverride: true,
    },
  ];

  // Add entries with staggered timestamps over 14 days
  // Index 0: 14 days ago, 1: 12.5 days, 2: 11 days, 3: 9.5 days, 4: 8 days, 5: 6.5 days, 6: 5 days, 7: 3.5 days, 8: 2 days
  seedLogEntries.forEach((entry, index) => {
    const logEntry: DecisionLogEntry = {
      ...entry,
      id: genId(),
      createdAt: new Date(logBaseTime + index * 1.5 * day + (index % 3) * 4 * hour).toISOString(),
    };
    decisionLog.unshift(logEntry);
  });

  // Seed review items to match the log (Approved, Edited, Rejected items appear in Done tab)
  // Note: reviewItems are already seeded above with pending items
  // We need to add the decided items so they show in /team/review Done tab
  const reviewBaseTime = Date.now() - 5 * day;
  const decidedReviews: ReviewItem[] = [
    {
      id: 'review-create-activity-1',
      kind: 'ai_adaptation',
      componentId: 'create-activity',
      componentTitle: COMPONENT_TITLES['create-activity'],
      packageId: 'pkg-university-2026-q3',
      educatorEmail: 'dr.chen@university.edu',
      educatorNote: 'Students need more time to develop their research questions.',
      originalText:
        'Groups use sticky notes to trace how one decision ripples through a seagrass ecosystem over time. For university, becomes a short research question.',
      proposedText:
        'Groups use sticky notes to trace how one decision ripples through a seagrass ecosystem over time. For university, students write a 500-word research brief on the cascade effects of their chosen management action, citing at least two peer-reviewed sources.',
      status: 'approved',
      reviewer: 'OceanX team',
      reason: 'Improved research brief aligns with university outcomes',
      createdAt: new Date(reviewBaseTime - 2 * day).toISOString(),
      decidedAt: new Date(reviewBaseTime - 1 * day + 15 * 60 * 1000).toISOString(), // openedAt + 15 min
      openedAt: new Date(reviewBaseTime - 1 * day).toISOString(),
      adaptationStartedAt: new Date(reviewBaseTime - 2 * day + 30 * 60 * 1000).toISOString(),
      submittedAt: new Date(reviewBaseTime - 2 * day + 55 * 60 * 1000).toISOString(), // adaptationStartedAt + 25 min
    },
    {
      id: 'review-video-changi-2',
      kind: 'ai_adaptation',
      componentId: 'video-changi-point',
      componentTitle: COMPONENT_TITLES['video-changi-point'],
      packageId: 'pkg-university-2026-q3',
      educatorEmail: 'dr.chen@university.edu',
      educatorNote: 'Add a guiding question before the video.',
      originalText:
        'A short film about the seagrass meadow at Changi Point, Singapore.',
      proposedText:
        'A short film about the seagrass meadow at Changi Point, Singapore. Before watching: "What pressures do you think a meadow near a busy port and airport faces?" Discuss predictions, then watch to confirm.',
      status: 'edited',
      reviewer: 'OceanX team',
      reason: 'Shortened the guiding question for time',
      createdAt: new Date(reviewBaseTime - 3 * day).toISOString(),
      decidedAt: new Date(reviewBaseTime - 1 * day + 25 * 60 * 1000).toISOString(), // openedAt + 25 min
      openedAt: new Date(reviewBaseTime - 1 * day).toISOString(),
      adaptationStartedAt: new Date(reviewBaseTime - 3 * day + 45 * 60 * 1000).toISOString(),
      submittedAt: new Date(reviewBaseTime - 3 * day + 70 * 60 * 1000).toISOString(), // adaptationStartedAt + 25 min
    },
    {
      id: 'report-game-carbon',
      kind: 'issue_report',
      componentId: 'game',
      componentTitle: COMPONENT_TITLES['game'],
      packageId: 'pkg-university-2026-q3',
      educatorEmail: 'learner@university.edu',
      educatorNote: undefined,
      originalText: '',
      proposedText: 'The game shows 30% carbon loss after one bad decision, but the UNEP report says 7% per year globally. Which is right?',
      status: 'rejected',
      reviewer: 'OceanX team',
      reason: 'Game shows scenario outcome, not annual rate; no correction needed',
      createdAt: new Date(reviewBaseTime - 4 * day).toISOString(),
      decidedAt: new Date(reviewBaseTime - 2 * day + 12 * 60 * 1000).toISOString(), // openedAt + 12 min
      openedAt: new Date(reviewBaseTime - 2 * day).toISOString(),
    },
  ];

  reviewItems.push(...decidedReviews);
  reviewItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  ensureFlaggedDemoShareBacks();
  saveToStorage();
}

function addDecisionLog(entry: Omit<DecisionLogEntry, 'id' | 'createdAt'>): DecisionLogEntry {
  const logEntry: DecisionLogEntry = {
    ...entry,
    id: genId(),
    createdAt: nowISO(),
  };
  decisionLog.unshift(logEntry); // newest first
  saveToStorage();
  return logEntry;
}

export function recordPackageDecision(
  targetId: string,
  action: Extract<DecisionLogEntry['action'], 'Package pending review' | 'Package cleared' | 'Approve & Send' | 'Edit & Send' | 'Reject & Send Original' | 'Delivery simulated' | 'Delivery failed' | 'Undo'>,
  why?: string,
): void {
  seedIfEmpty();
  addDecisionLog({
    who: 'OceanX team',
    action,
    targetType: 'package_review',
    targetId,
    why,
    aiOverride: false,
  });
}

// ============================================
// Public API
// ============================================

export async function getReviewQueue(kind?: ReviewKind, status: ReviewStatus | 'done' = 'pending'): Promise<ReviewItem[]> {
  await delay(300);
  seedIfEmpty();
  let filtered = reviewItems.filter((item) => status === 'done' ? item.status !== 'pending' : item.status === status);
  if (kind) {
    filtered = filtered.filter((item) => item.kind === kind);
  }
  // Oldest first
  return [...filtered].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function getPendingCounts(): Promise<PendingCounts> {
  await delay(300);
  seedIfEmpty();
  const pending = reviewItems.filter((item) => item.status === 'pending');
  return {
    ai_adaptation: pending.filter((i) => i.kind === 'ai_adaptation').length,
    share_back: pending.filter((i) => i.kind === 'share_back').length,
    issue_report: pending.filter((i) => i.kind === 'issue_report').length,
    total: pending.length,
  };
}

export function getFlaggedSubmissionCount(): number {
  seedIfEmpty();
  return MOCK_FLAGGED_SUBMISSION_IDS.filter((id) => !dismissedFlaggedIds.includes(id)).length;
}

export function isFlaggedSubmissionDismissed(id: string): boolean {
  seedIfEmpty();
  return dismissedFlaggedIds.includes(id);
}

export async function unflagSubmissionForReview(flaggedItem: ReviewItem): Promise<ReviewItem> {
  await delay(300);
  seedIfEmpty();

  const existingItem = reviewItems.find((item) => item.flaggedSourceId === flaggedItem.id);
  if (existingItem) {
    if (!dismissedFlaggedIds.includes(flaggedItem.id)) {
      dismissedFlaggedIds.push(flaggedItem.id);
      saveToStorage();
      window.dispatchEvent(new Event('oceanx-review-counts-changed'));
    }
    return existingItem;
  }

  const reviewItem: ReviewItem = {
    ...flaggedItem,
    id: genId(),
    kind: 'share_back',
    status: 'pending',
    reviewer: 'OceanX team',
    createdAt: nowISO(),
    openedAt: undefined,
    decidedAt: undefined,
    finalText: undefined,
    reason: undefined,
    okToReuse: false,
    flaggedSourceId: flaggedItem.id,
    screeningStatus: undefined,
    screeningReason: undefined,
    screeningMode: undefined,
  };

  reviewItems.push(reviewItem);
  reviewItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  if (!dismissedFlaggedIds.includes(flaggedItem.id)) {
    dismissedFlaggedIds.push(flaggedItem.id);
  }
  saveToStorage();
  window.dispatchEvent(new Event('oceanx-review-counts-changed'));

  return reviewItem;
}

export async function declineFlaggedSubmission(id: string): Promise<void> {
  await delay(300);
  seedIfEmpty();

  if (!dismissedFlaggedIds.includes(id)) {
    dismissedFlaggedIds.push(id);
    saveToStorage();
    window.dispatchEvent(new Event('oceanx-review-counts-changed'));
  }
}

export async function openReview(id: string): Promise<ReviewItem | null> {
  await delay(300);
  seedIfEmpty();
  const item = reviewItems.find((i) => i.id === id);
  if (item && !item.openedAt) {
    item.openedAt = nowISO();
    saveToStorage();
  }
  return item ?? null;
}

export async function decideReview(
  id: string,
  action: DecisionAction,
  finalText?: string,
  reason?: string
): Promise<{ item: ReviewItem | null; result: DecideResult }> {
  await delay(300);
  seedIfEmpty();

  const itemIndex = reviewItems.findIndex((i) => i.id === id);
  if (itemIndex === -1) {
    return { item: null, result: { releaseEmail: false } };
  }

  const item = reviewItems[itemIndex];
  const decidedAt = nowISO();

  let newStatus: ReviewStatus;
  let newFinalText: string | undefined;
  let newReason: string | undefined;

  switch (action) {
    case 'approve':
      newStatus = 'approved';
      newFinalText = item.proposedText;
      break;
    case 'edit':
      newStatus = 'edited';
      newFinalText = finalText;
      break;
    case 'reject':
      newStatus = 'rejected';
      newReason = reason;
      break;
  }

  const updatedItem: ReviewItem = {
    ...item,
    status: newStatus,
    finalText: newFinalText,
    reason: newReason,
    decidedAt,
  };
  reviewItems[itemIndex] = updatedItem;
  saveToStorage();

  // Handle share_back coCreated logic
  if (item.kind === 'share_back' && (action === 'approve' || action === 'edit') && item.okToReuse) {
    const libIndex = libraryState.findIndex((s) => s.componentId === item.componentId);
    if (libIndex !== -1) {
      libraryState[libIndex] = {
        ...libraryState[libIndex],
        coCreated: true,
        updatedAt: nowISO(),
      };
      saveToStorage();
    }
  }

  // Handle new material approval -> update co-created material status
  if (item.kind === 'share_back' && item.isNewMaterial && action === 'approve') {
    const coCreatedIndex = coCreatedMaterials.findIndex((c) => c.sourceTicketId === item.id);
    if (coCreatedIndex !== -1) {
      coCreatedMaterials[coCreatedIndex] = {
        ...coCreatedMaterials[coCreatedIndex],
        reviewStatus: 'approved',
        approvedAt: nowISO(),
      };
      saveToStorage();
    }
  }

  // Handle new material rejection -> remove co-created material
  if (item.kind === 'share_back' && item.isNewMaterial && action === 'reject') {
    coCreatedMaterials = coCreatedMaterials.filter((c) => c.sourceTicketId !== item.id);
    saveToStorage();
  }

  // Log the decision
  let logAction: DecisionLogEntry['action'];
  switch (action) {
    case 'approve':
      logAction = 'Approve';
      break;
    case 'edit':
      logAction = 'Edit';
      break;
    case 'reject':
      logAction = 'Reject';
      break;
  }

  addDecisionLog({
    who: 'OceanX team',
    action: logAction,
    targetType: item.kind,
    targetId: item.id,
    why: newReason,
    aiOverride: false,
  });
  window.dispatchEvent(new Event('oceanx-review-counts-changed'));

  // Check if all ai_adaptation items for this package are approved/edited
  let releaseEmail = false;
  let releaseEmailTarget: { packageId?: string; educatorEmail?: string } = {};

  if (item.kind === 'ai_adaptation' && item.packageId && item.educatorEmail) {
    const packageItems = reviewItems.filter(
      (i) => i.kind === 'ai_adaptation' && i.packageId === item.packageId
    );
    const allDecided = packageItems.every((i) => i.status === 'approved' || i.status === 'edited');
    if (allDecided) {
      releaseEmail = true;
      releaseEmailTarget = { packageId: item.packageId, educatorEmail: item.educatorEmail };
    }
  }

  return {
    item: updatedItem,
    result: { releaseEmail, ...releaseEmailTarget },
  };
}

export async function logDecision(entry: Omit<DecisionLogEntry, 'id' | 'createdAt'>): Promise<DecisionLogEntry> {
  await delay(300);
  return addDecisionLog(entry);
}

export async function getDecisionLog(): Promise<DecisionLogEntry[]> {
  await delay(300);
  return [...decisionLog];
}

// ============================================
// Issue Report API (Lesson Plan)
// ============================================

export type IssueType = 'Wrong fact' | 'Wrong level' | 'Timing' | 'Broken link' | 'Other';

export interface SubmitIssueReportInput {
  packageSlug: string;
  componentId?: string;
  section: string;
  issueType: IssueType;
  note: string;
  reporterEmail?: string;
}

export async function submitIssueReport(input: SubmitIssueReportInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  await delay(300);
  seedIfEmpty();

  // Find the package by slug (using packageId mapping)
  const packageMap: Record<string, string> = {
    'pkg-university-2026-q3': 'pkg-university-2026-q3',
    'pkg-university-2026-q4': 'pkg-university-2026-q4',
  };
  // const _packageId = packageMap[input.packageSlug] || input.packageSlug;
  void packageMap; // suppress unused warning

  // Find the section's current text for originalText
  // For now, we'll use a placeholder - in reality this would come from the lesson plan data
  const sectionTexts: Record<string, string> = {
    'Explore': 'Pairs or tables share initial observations and questions after watching the opening footage.',
    'Investigate': 'Discussion prompts to use during and after the game: what restoration decisions did you face, what trade-offs arose, and what would you change?',
    'Reflect': 'A structured conversation about the human and political dimensions of conservation decisions.',
    'Create': 'Groups use sticky notes to trace how one decision ripples through a seagrass ecosystem over time.',
  };

  const originalText = sectionTexts[input.section] || '';
  const now = nowISO();

  const item: ReviewItem = {
    id: genId(),
    kind: 'issue_report',
    componentId: input.componentId || '',
    componentTitle: input.componentId ? COMPONENT_TITLES[input.componentId] || input.componentId : '',
    packageId: input.packageSlug,
    educatorEmail: input.reporterEmail,
    educatorNote: input.issueType,
    originalText,
    proposedText: input.note,
    status: 'pending',
    reviewer: 'OceanX team',
    createdAt: now,
    openedAt: now,
  };

  reviewItems.push(item);
  reviewItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  saveToStorage();

  return { ok: true, id: item.id };
}

export type ResolveAction = 'Resolved' | 'Not an issue';

export async function resolveIssueReport(
  id: string,
  action: ResolveAction,
  reason?: string
): Promise<{ ok: boolean; error?: string }> {
  await delay(300);
  seedIfEmpty();

  const itemIndex = reviewItems.findIndex((i) => i.id === id);
  if (itemIndex === -1) {
    return { ok: false, error: 'Issue report not found' };
  }

  const item = reviewItems[itemIndex];
  if (item.kind !== 'issue_report') {
    return { ok: false, error: 'Not an issue report' };
  }

  const decidedAt = nowISO();
  let newStatus: ReviewStatus;
  let logAction: DecisionLogEntry['action'];

  if (action === 'Resolved') {
    newStatus = 'approved';
    logAction = 'Resolved';
  } else {
    newStatus = 'rejected';
    logAction = 'Not an issue';
  }

  const updatedItem: ReviewItem = {
    ...item,
    status: newStatus,
    reason: action === 'Not an issue' ? reason : item.reason,
    decidedAt,
  };
  reviewItems[itemIndex] = updatedItem;
  saveToStorage();

  // Log the decision
  addDecisionLog({
    who: 'OceanX team',
    action: logAction,
    targetType: item.kind,
    targetId: item.id,
    why: action === 'Not an issue' ? reason : undefined,
    aiOverride: false,
  });
  window.dispatchEvent(new Event('oceanx-review-counts-changed'));

  return { ok: true };
}

// ============================================
// Share Back API (Step 7)
// ============================================

export interface SubmitShareBackInput {
  packageSlug: string;
  componentId: string;
  changedText: string;
  whatAndWhy: string;
  okToReuse: boolean;
  educatorEmail?: string;
}

export async function submitShareBack(input: SubmitShareBackInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  await delay(300);
  seedIfEmpty();

  // Find the original component text
  const originalText = COMPONENT_ORIGINAL_TEXTS[input.componentId] || COMPONENT_TITLES[input.componentId] || '';
  const now = nowISO();

  const item: ReviewItem = {
    id: genId(),
    kind: 'share_back',
    componentId: input.componentId,
    componentTitle: COMPONENT_TITLES[input.componentId] || input.componentId,
    packageId: input.packageSlug,
    educatorEmail: input.educatorEmail,
    educatorNote: input.whatAndWhy,
    originalText,
    proposedText: input.changedText,
    status: 'pending',
    reviewer: 'OceanX team',
    createdAt: now,
    okToReuse: input.okToReuse,
  };

  reviewItems.push(item);
  reviewItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  saveToStorage();
  window.dispatchEvent(new Event('oceanx-review-counts-changed'));

  return { ok: true, id: item.id };
}

// ============================================
// Share Material API
// ============================================

export interface SubmitNewMaterialInput {
  title: string;
  materialLink: string;
  stage: string;
  description: string;
  coverImageLink?: string;
  creditName: string;
  creditInstitution: string;
  educatorEmail: string;
  okToReuse: boolean;
  pkgSlug?: string;
}

export async function submitNewMaterial(input: SubmitNewMaterialInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  await delay(300);
  seedIfEmpty();

  const now = nowISO();
  const screen = demoScreen(`${input.title}\n${input.description}`);

  const item: ReviewItem = {
    id: genId(),
    kind: 'share_back',
    componentId: `new-${genId()}`,
    componentTitle: input.title,
    packageId: input.pkgSlug,
    educatorEmail: input.educatorEmail,
    originalText: '',
    proposedText: input.description,
    status: 'pending',
    reviewer: 'OceanX team',
    createdAt: now,
    okToReuse: input.okToReuse,
    screeningStatus: screen.status,
    screeningReason: screen.reason,
    screeningMode: 'demo',
    isNewMaterial: true,
    materialLink: input.materialLink,
    stage: input.stage,
    creditName: input.creditName,
    creditInstitution: input.creditInstitution,
    coverImageLink: input.coverImageLink,
  };

  reviewItems.push(item);
  reviewItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  saveToStorage();

  // Also create a co-created material entry with 'in_review' status
  const coCreated: CoCreatedMaterial = {
    id: genId(),
    title: input.title,
    link: input.materialLink,
    stage: input.stage,
    coverImageLink: input.coverImageLink,
    creditName: input.creditName,
    creditInstitution: input.creditInstitution,
    approvedAt: now,
    sourceTicketId: item.id,
    reviewStatus: 'in_review',
  };
  coCreatedMaterials.unshift(coCreated);
  saveToStorage();

  // Write a decision_log entry the same way submitShareBack does
  addDecisionLog({
    who: 'OceanX team',
    action: 'Package pending review',
    targetType: 'share_back',
    targetId: item.id,
    why: `New material shared: ${input.title}`,
    aiOverride: false,
  });

  window.dispatchEvent(new Event('oceanx-review-counts-changed'));

  return { ok: true, id: item.id };
}

export function resetMock(): void {
  reviewItems = [];
  decisionLog = [];
  libraryState = [];
  adaptationTasks = [];
  dismissedFlaggedIds = [];
  coCreatedMaterials = [];
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('oceanx_demo_package_reviews_v2');
  } catch {
    // Ignore
  }
  seedIfEmpty();
}

export function resetShareMaterialDemo(): void {
  seedIfEmpty();
  // Get IDs of new material items before removing them
  const newMaterialIds = reviewItems
    .filter((i) => i.isNewMaterial)
    .map((i) => i.id);
  
  // Remove new material review items
  reviewItems = reviewItems.filter((i) => !i.isNewMaterial);
  
  // Remove decision log rows that belong to removed ticket ids
  decisionLog = decisionLog.filter((entry) => {
    // Check if this log entry is for a new material share_back item
    if (entry.targetType === 'share_back' && newMaterialIds.includes(entry.targetId)) {
      return false;
    }
    return true;
  });
  
  // Clear co-created materials
  coCreatedMaterials = [];
  
  saveToStorage();
  window.dispatchEvent(new Event('oceanx-review-counts-changed'));
}

// ============================================
// AI Adaptation API (Part B)
// ============================================

import { UNIVERSITY_STATUS } from '../../shared/data/university-version';

export async function rewriteWithAI(
  componentId: string,
  level: 'secondary' | 'university' | 'postgrad',
  length: 'shorter' | 'same' | 'longer'
): Promise<RewriteResult> {
  await delay(1500);

  // Check if component is Adapted
  const status = UNIVERSITY_STATUS[componentId];
  if (!status || status.status !== 'Adapted') {
    throw new Error('Only Adapted items can be rewritten');
  }

  const originalText = COMPONENT_ORIGINAL_TEXTS[componentId] || COMPONENT_TITLES[componentId];
  const sourcesUsed = COMPONENT_SOURCES[componentId] || ['seagrass_sources.md'];

  let rewrittenText = '';

  // Mock rewrites for "Map the chain: choice, consequence, change" (create-activity)
  if (componentId === 'create-activity') {
    const levelTexts: Record<string, string> = {
      secondary:
        "In groups of 2 or 3, use 6 to 10 Post-its to show how one choice changes a seagrass meadow. Write the choice first, then what happens next, how the seagrass responds, and what changes over time. Draw arrows to connect each step.",
      university:
        "Groups of 2 to 3 learners map a causal chain for one seagrass restoration decision. Using 6 to 10 Post-its, each group links a Choice or Action to its Consequence, the Habitat Response and the Change Over Time, then connects them with arrows. Each group explains one link in their chain and the evidence from the session that supports it.",
      postgrad:
        "In groups of 2 to 3, build a causal chain for one restoration intervention using 6 to 10 Post-its: Choice or Action, Consequence, Habitat Response, Change Over Time. Connect each link with arrows, then mark the link you are least certain about and discuss what evidence would be needed to confirm it.",
    };

    rewrittenText = levelTexts[level];

    // Apply length modifier
    if (length === 'shorter') {
      // First 2 sentences of the level's text
      const sentences = rewrittenText.split('. ');
      rewrittenText = sentences.slice(0, 2).join('. ') + '.';
    } else if (length === 'longer') {
      // Level's text + new paragraph
      rewrittenText +=
        ' Discuss: Which link in your chain would be hardest to measure in a real meadow, and why?';
    }

    return { rewrittenText, sourcesUsed };
  }

  // Fallback for other components (should not happen for now)
  switch (level) {
    case 'secondary':
      rewrittenText = `For secondary learners: ${originalText} This version uses simpler language and breaks the activity into clear steps with guided prompts.`;
      break;
    case 'university':
      rewrittenText = `For university learners: ${originalText} This version adds a research component where students write a brief analysis citing peer-reviewed sources.`;
      break;
    case 'postgrad':
      rewrittenText = `For postgraduate learners: ${originalText} Discuss: How do the cascade effects of this decision reflect broader systems dynamics in marine conservation? Critically evaluate the evidence base for each predicted outcome.`;
      break;
  }

  if (length === 'shorter') {
    rewrittenText = rewrittenText.split('. ').slice(0, Math.ceil(rewrittenText.split('. ').length / 2)).join('. ') + '.';
  } else if (length === 'longer') {
    rewrittenText += ' This extended version includes additional context, facilitation tips, and assessment criteria for educators.';
  }

  return { rewrittenText, sourcesUsed };
}

export async function markAdaptationStarted(sessionKey: string): Promise<void> {
  await delay(100);
  try {
    const existing = sessionStorage.getItem(sessionKey);
    if (!existing) {
      sessionStorage.setItem(sessionKey, JSON.stringify({ startedAt: nowISO() }));
    }
  } catch {
    // Ignore
  }
}

export async function submitPackage(
  _pkg: { audience: string; picks: any[]; recommendations: any[] },
  acceptedRewrites: Array<{
    componentId: string;
    componentTitle: string;
    level: 'secondary' | 'university' | 'postgrad';
    length: 'shorter' | 'same' | 'longer';
    originalText: string;
    proposedText: string;
    educatorEmail: string;
    packageId: string;
  }>
): Promise<SubmitPackageResult> {
  await delay(300);
  seedIfEmpty();

  if (acceptedRewrites.length === 0) {
    return { status: 'sent' };
  }

  const now = nowISO();
  for (const rewrite of acceptedRewrites) {
    const item: ReviewItem = {
      id: genId(),
      kind: 'ai_adaptation',
      componentId: rewrite.componentId,
      componentTitle: rewrite.componentTitle,
      packageId: rewrite.packageId,
      educatorEmail: rewrite.educatorEmail,
      educatorNote: `AI rewrite: ${rewrite.level}, ${rewrite.length}`,
      originalText: rewrite.originalText,
      proposedText: rewrite.proposedText,
      status: 'pending',
      reviewer: 'OceanX team',
      createdAt: now,
      submittedAt: now,
    };
    reviewItems.push(item);
  }

  // Sort by createdAt
  reviewItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  saveToStorage();

  return { status: 'pending_review' };
}

// ============================================
// Library State API (Part A - Step 3)
// ============================================

export async function getLibraryState(): Promise<LibraryState[]> {
  await delay(300);
  seedIfEmpty();
  return [...libraryState];
}

export async function decideLibrary(
  componentId: string,
  decision: 'Reuse' | 'Adapt' | 'Drop',
  aiRecommendation: 'Reuse' | 'Adapt' | 'Drop',
  why?: string,
  suggestedAction?: string
): Promise<LibraryState> {
  await delay(300);
  seedIfEmpty();

  const aiOverride = decision !== aiRecommendation;
  if (aiOverride && (!why || why.trim() === '')) {
    throw new Error('Please say why you chose differently from the AI');
  }

  const stateIndex = libraryState.findIndex((s) => s.componentId === componentId);
  if (stateIndex === -1) {
    throw new Error(`Component ${componentId} not found in library state`);
  }

  const currentState = libraryState[stateIndex];
  const now = nowISO();
  let newState: LibraryState;

  // If changing from Adapt to something else, mark any open task for this component as done
  if (currentState.coCreated && decision !== 'Adapt') {
    const openTaskIndex = adaptationTasks.findIndex(
      (t) => t.componentId === componentId && t.status === 'open'
    );
    if (openTaskIndex !== -1) {
      adaptationTasks[openTaskIndex] = {
        ...adaptationTasks[openTaskIndex],
        status: 'done',
        doneAt: now,
      };
      // Log the task completion
      addDecisionLog({
        who: 'OceanX team',
        action: 'Task done',
        targetType: 'adaptation_task',
        targetId: adaptationTasks[openTaskIndex].id,
        why: undefined,
        aiRecommendation: undefined,
        aiOverride: false,
      });
    }
  }

  switch (decision) {
    case 'Drop':
      newState = {
        ...currentState,
        hidden: true,
        proven: false,
        obsolete: true,
        updatedAt: now,
      };
      // Mark any open task for this component as done
      const dropTaskIndex = adaptationTasks.findIndex(
        (t) => t.componentId === componentId && t.status === 'open'
      );
      if (dropTaskIndex !== -1) {
        adaptationTasks[dropTaskIndex] = {
          ...adaptationTasks[dropTaskIndex],
          status: 'done',
          doneAt: now,
        };
        addDecisionLog({
          who: 'OceanX team',
          action: 'Task done',
          targetType: 'adaptation_task',
          targetId: adaptationTasks[dropTaskIndex].id,
          why: undefined,
          aiRecommendation: undefined,
          aiOverride: false,
        });
      }
      break;
    case 'Reuse':
      newState = {
        ...currentState,
        hidden: false,
        proven: true,
        obsolete: false,
        updatedAt: now,
      };
      break;
    case 'Adapt':
      newState = {
        ...currentState,
        hidden: false,
        proven: false,
        obsolete: false,
        updatedAt: now,
      };
      // Create adaptation task
      const task: AdaptationTask = {
        id: genId(),
        componentId,
        componentTitle: COMPONENT_TITLES[componentId] || componentId,
        reason: suggestedAction || why || 'Adaptation needed',
        status: 'open',
        decisionId: genId(),
        createdAt: now,
      };
      adaptationTasks.unshift(task);
      break;
  }

  libraryState[stateIndex] = newState;
  saveToStorage();

  // Log the decision
  addDecisionLog({
    who: 'OceanX team',
    action: decision,
    targetType: 'component',
    targetId: componentId,
    why: why?.trim() || undefined,
    aiRecommendation,
    aiOverride,
  });

  return newState;
}

export async function restoreComponent(componentId: string, why: string): Promise<LibraryState> {
  await delay(300);
  seedIfEmpty();

  if (!why || why.trim() === '') {
    throw new Error('Please say why you are restoring this component');
  }

  const stateIndex = libraryState.findIndex((s) => s.componentId === componentId);
  if (stateIndex === -1) {
    throw new Error(`Component ${componentId} not found in library state`);
  }

  const currentState = libraryState[stateIndex];
  const now = nowISO();

  const newState: LibraryState = {
    ...currentState,
    hidden: false,
    obsolete: false,
    updatedAt: now,
  };

  libraryState[stateIndex] = newState;
  saveToStorage();

  // Log the restore action
  addDecisionLog({
    who: 'OceanX team',
    action: 'Restore',
    targetType: 'component',
    targetId: componentId,
    why: why.trim(),
    aiRecommendation: undefined,
    aiOverride: false,
  });

  return newState;
}

export async function getAdaptationTasks(status?: 'open' | 'done'): Promise<AdaptationTask[]> {
  await delay(300);
  seedIfEmpty();
  let tasks = [...adaptationTasks];
  if (status) {
    tasks = tasks.filter((t) => t.status === status);
  }
  return tasks;
}

export async function markTaskDone(id: string): Promise<void> {
  await delay(300);
  seedIfEmpty();

  const taskIndex = adaptationTasks.findIndex((t) => t.id === id);
  if (taskIndex === -1) {
    throw new Error(`Task ${id} not found`);
  }

  adaptationTasks[taskIndex] = {
    ...adaptationTasks[taskIndex],
    status: 'done',
    doneAt: nowISO(),
  };
  saveToStorage();

  // Log the task completion
  addDecisionLog({
    who: 'OceanX team',
    action: 'Task done',
    targetType: 'adaptation_task',
    targetId: id,
    why: undefined,
    aiRecommendation: undefined,
    aiOverride: false,
  });
}

export async function getLatestDecision(componentId: string): Promise<DecisionLogEntry | null> {
  await delay(300);
  seedIfEmpty();
  // Find the most recent decision log entry for this component
  const entry = decisionLog.find(
    (log) => log.targetType === 'component' && log.targetId === componentId
  );
  return entry || null;
}

// Dev helper to inspect log in console
if (typeof window !== 'undefined' && USE_MOCK) {
  (window as any).__governanceLog = getDecisionLog;
  (window as any).__governanceReset = resetMock;
  (window as any).__gov = {
    getReviewItems,
    getDecisionLog,
    resetMock,
    submitNewMaterial,
    submitShareBack,
    submitIssueReport,
    seedIfEmpty,
    getCoCreatedMaterials,
    decideReview,
  };
}

// ============================================
// Past Feedback (Library drawer)
// ============================================

export interface PastFeedbackItem {
  source: 'educator' | 'learner';
  text: string;
  createdAt: string;
}

export async function getPastFeedback(componentId: string): Promise<PastFeedbackItem[]> {
  await delay(300);
  seedIfEmpty();

  const feedback: PastFeedbackItem[] = [];

  // Collect educator notes from share_back and ai_adaptation review items
  reviewItems
    .filter((item) => item.componentId === componentId && item.educatorNote)
    .forEach((item) => {
      feedback.push({
        source: 'educator',
        text: item.educatorNote!,
        createdAt: item.createdAt,
      });
    });

  // Collect learner comments from issue_report review items
  reviewItems
    .filter((item) => item.kind === 'issue_report' && item.componentId === componentId && item.proposedText)
    .forEach((item) => {
      feedback.push({
        source: 'learner',
        text: item.proposedText,
        createdAt: item.createdAt,
      });
    });

  if (componentId === 'video-nada' && !feedback.some((item) => item.source === 'educator')) {
    const createdAt = nowISO();
    feedback.push(
      {
        source: 'educator',
        text: "Students responded well to Nada's story. It made a strong opener for our discussion about seagrass restoration.",
        createdAt,
      },
      {
        source: 'educator',
        text: 'The video worked well as-is for university learners and helped introduce the people behind marine science.',
        createdAt,
      }
    );
  }

  // Sort by createdAt descending (newest first), take up to 3
  feedback.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return feedback.slice(0, 3);
}