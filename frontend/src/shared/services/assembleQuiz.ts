import type { BankItem } from './bankApi';

export type QuizType = 'mcq' | 'short' | 'mixed';
export type QuizDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';

export interface AssembleOptions {
  componentIds: string[];
  qtype: QuizType;
  difficulty: QuizDifficulty;
  count: number;
}

export interface AssembleResult {
  itemIds: string[];
  error?: string;
}

/**
 * Pure deterministic function: same inputs always produce the same item IDs.
 * Algorithm: filter approved items → sort by component_id ASC then id ASC →
 * round-robin across component buckets → error if any bucket runs dry.
 */
export function assembleQuiz(
  approvedItems: BankItem[],
  opts: AssembleOptions,
): AssembleResult {
  const { qtype, difficulty, count } = opts;
  // Sort componentIds for stable output regardless of input order
  const componentIds = [...opts.componentIds].sort();

  if (componentIds.length === 0 || count <= 0) {
    return { itemIds: [] };
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

  // 4. Check each component can supply its required share
  for (const cid of componentIds) {
    const available = buckets[cid].length;
    const required = needed[cid];
    if (available < required) {
      const qtypeLabel = qtype === 'mixed' ? '' : `${qtype} `;
      const diffLabel = difficulty === 'mixed' ? '' : `${difficulty} `;
      return {
        itemIds: [],
        error: `Only ${available} approved ${qtypeLabel}${diffLabel}questions for ${cid}. Reduce the number or change difficulty.`,
      };
    }
  }

  // 5. Round-robin pick
  const indices = Object.fromEntries(componentIds.map((c) => [c, 0]));
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const cid = componentIds[i % K];
    result.push(buckets[cid][indices[cid]].id);
    indices[cid]++;
  }

  return { itemIds: result };
}
