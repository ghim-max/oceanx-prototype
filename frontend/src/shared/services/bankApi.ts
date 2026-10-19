import { API_BASE } from './apiBase';

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export interface BankItem {
  id: string;
  created_at: string;
  component_id: string;
  qtype: 'mcq' | 'short';
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options: string[] | null;
  correct_index: number | null;
  answer: string | null;
  key_points: string[] | null;
  source_excerpt: string;
  explanation: string | null;
  status: 'draft' | 'approved' | 'rejected';
  reviewed_at: string | null;
  auto_check_passed: boolean | null;
  auto_check_notes: string | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
}

export interface BankPatch {
  status?: 'approved' | 'rejected';
  question?: string;
  options?: string[];
  correct_index?: number;
  answer?: string;
  key_points?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface DraftResult {
  drafted: number;
  flagged: number;
  results: Array<{
    component_id: string;
    drafted: number;
    flagged: number;
    errors: Array<{ question: string; error: string }>;
    cost_usd: number;
    latency_ms: number;
  }>;
  errors: Array<{ component_id?: string; question?: string; error: string }>;
}

export function getBankItems(params?: {
  component_id?: string;
  status?: string;
}): Promise<BankItem[]> {
  const entries = Object.entries(params ?? {}).filter(([, v]) => v != null) as [string, string][];
  const qs = entries.length ? '?' + new URLSearchParams(entries).toString() : '';
  return fetchJson<BankItem[]>(`/bank${qs}`);
}

export function patchBankItem(
  id: string,
  body: BankPatch,
): Promise<{ ok: boolean; item: BankItem }> {
  return fetchJson(`/bank/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function draftBankItems(componentIds?: string[]): Promise<DraftResult> {
  const qs = componentIds?.length ? `?component_ids=${componentIds.join(',')}` : '';
  return fetchJson<DraftResult>(`/bank/draft${qs}`, { method: 'POST' });
}

export function getApprovedBankItems(): Promise<BankItem[]> {
  return fetchJson<BankItem[]>('/bank/approved');
}
