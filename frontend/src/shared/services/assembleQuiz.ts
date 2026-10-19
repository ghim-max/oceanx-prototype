import type { BankItem } from './bankApi';

export type QuizType = 'mcq' | 'short' | 'mixed';
export type QuizDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';

export interface AssembleOptions {
  componentIds: string[];
  qtype: QuizType;
  difficulty: QuizDifficulty;
  count: number;
}

export interface ComponentAvailability {
  componentId: string;
  title: string;
  available: number;
  used: number;
}

export interface AssembleResult {
  itemIds: string[];
  componentAvailability: ComponentAvailability[];
  zeroQuestionComponents: ComponentAvailability[];
  error?: string;
}

const QTYPE_LABEL: Record<QuizType, string> = {
  mcq: 'multiple-choice',
  short: 'short answer',
  mixed: 'mixed',
};

const DIFFICULTY_LABEL: Record<QuizDifficulty, string> = {
  easy: 'easy',
  medium: 'medium',
  hard: 'hard',
  mixed: 'mixed',
};

const TITLE_MAP: Record<string, string> = {
  'video-nada': 'Meet Nada: a seagrass scientist',
  'create-activity': 'Map the chain: choice, consequence, change',
  'further-reading-unep': 'UNEP: Seagrass meadows',
  'video-changi-point': 'Changi Point: a meadow in trouble',
  'game': 'Seagrass Stories game',
  'investigate-prompts': 'Investigate prompts',
  'reflect-prompts': 'Reflect prompts',
  'educator-guide': 'Educator guide',
  'driving-question': 'Driving question',
  'further-reading-seagrass-watch': 'Seagrass-Watch: Why seagrass matters',
  'video-ecology-in-action': 'Ecology in action',
  'explore-prompts': 'What do you notice, what do you wonder?',
  'learning-intention': 'Learning intentions',
};

/**
 * Pure deterministic function: same inputs always produce the same item IDs.
 * Algorithm:
 * 1. Filter approved items by component, qtype, difficulty
 * 2. Group into per-component buckets
 * 3. Drop components with 0 available items
 * 4. Round-robin across remaining components
 * 5. Error only if total available across all picked < requested count
 */
export function assembleQuiz(
  approvedItems: BankItem[],
  opts: AssembleOptions,
): AssembleResult {
  const { qtype, difficulty, count } = opts;
  // Sort componentIds for stable output regardless of input order
  const componentIds = [...opts.componentIds].sort();

  if (componentIds.length === 0 || count <= 0) {
    return { itemIds: [], componentAvailability: [], zeroQuestionComponents: [] };
  }

  // 1. Filter to relevant items
  const filtered = approvedItems.filter((item) => {
    if (!componentIds.includes(item.component_id)) return false;
    if (qtype !== 'mixed' && item.qtype !== qtype) return false;
    if (difficulty !== 'mixed' && item.difficulty !== difficulty) return false;
    return true;
  });

  // 2. Group into per-component buckets, sorted by id ASC for stable order
  const buckets: Record<string, BankItem[]> = {};
  for (const cid of componentIds) {
    buckets[cid] = filtered
      .filter((i) => i.component_id === cid)
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  // 3. Calculate how many items each component must contribute via round-robin
  const K = componentIds.length;
  const needed: Record<string, number> = Object.fromEntries(componentIds.map((c) => [c, 0]));
  for (let i = 0; i < count; i++) {
    needed[componentIds[i % K]]++;
  }

  // 4. Identify components with 0 available items
  const zeroQuestionComponents: ComponentAvailability[] = [];
  const activeComponents: string[] = [];

  for (const cid of componentIds) {
    const available = buckets[cid]?.length ?? 0;
    const title = TITLE_MAP[cid] ?? cid;

    if (available === 0) {
      zeroQuestionComponents.push({
        componentId: cid,
        title,
        available: 0,
        used: 0,
      });
    } else {
      activeComponents.push(cid);
    }
  }

  // 5. Total available across active components
  const totalAvailable = activeComponents.reduce((sum, cid) => sum + (buckets[cid]?.length ?? 0), 0);

  if (totalAvailable < count) {
    const qtypeLabel = QTYPE_LABEL[qtype] ?? qtype;
    const diffLabel = DIFFICULTY_LABEL[difficulty] ?? difficulty;
    const zeroTitles = zeroQuestionComponents.map((z) => z.title).join(', ');
    const zeroNote = zeroQuestionComponents.length > 0
      ? ` No questions yet for: ${zeroTitles}.`
      : '';
    return {
      itemIds: [],
      componentAvailability: componentIds.map((cid) => ({
        componentId: cid,
        title: TITLE_MAP[cid] ?? cid,
        available: buckets[cid]?.length ?? 0,
        used: 0,
      })),
      zeroQuestionComponents,
      error: `Only ${totalAvailable} approved ${qtypeLabel} ${diffLabel}questions available across ${activeComponents.length} picked activity${activeComponents.length === 1 ? '' : 'ies'}.${zeroNote} Reduce the number or change difficulty.`,
    };
  }

  // 6. Round-robin pick from active components only
  // Redistribute needed counts across active components proportionally
  const activeNeeded: Record<string, number> = Object.fromEntries(activeComponents.map((c) => [c, 0]));
  for (let i = 0; i < count; i++) {
    activeNeeded[activeComponents[i % activeComponents.length]]++;
  }

  // 7. Check each active component can supply its required share
  for (const cid of activeComponents) {
    const available = buckets[cid].length;
    const required = activeNeeded[cid];
    if (available < required) {
      const qtypeLabel = QTYPE_LABEL[qtype] ?? qtype;
      const diffLabel = DIFFICULTY_LABEL[difficulty] ?? difficulty;
      return {
        itemIds: [],
        componentAvailability: componentIds.map((c) => ({
          componentId: c,
          title: TITLE_MAP[c] ?? c,
          available: buckets[c]?.length ?? 0,
          used: 0,
        })),
        zeroQuestionComponents,
        error: `Only ${available} approved ${qtypeLabel} ${diffLabel}questions for ${TITLE_MAP[cid] ?? cid}. Reduce the number or change difficulty.`,
      };
    }
  }

  // 8. Round-robin pick from active components
  const indices = Object.fromEntries(activeComponents.map((c) => [c, 0]));
  const result: string[] = [];
  const usedCounts: Record<string, number> = Object.fromEntries(activeComponents.map((c) => [c, 0]));

  for (let i = 0; i < count; i++) {
    const cid = activeComponents[i % activeComponents.length];
    result.push(buckets[cid][indices[cid]].id);
    indices[cid]++;
    usedCounts[cid] = (usedCounts[cid] ?? 0) + 1;
  }

  // 9. Build component availability info for UI
  const componentAvailability: ComponentAvailability[] = componentIds.map((cid) => ({
    componentId: cid,
    title: TITLE_MAP[cid] ?? cid,
    available: buckets[cid]?.length ?? 0,
    used: usedCounts[cid] ?? 0,
  }));

  return {
    itemIds: result,
    componentAvailability,
    zeroQuestionComponents,
  };
}