import type { InsightsResponse, RawInsightsResponse, GenerateInsightsResponse } from '../types/insights';

const API_BASE = import.meta.env.VITE_INSIGHTS_API_URL || 'http://localhost:8000';

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`API ${response.status}: ${text || response.statusText}`);
  }
  return response.json();
}

export async function getInsights(): Promise<InsightsResponse> {
  try {
    return await fetchJson<InsightsResponse>('/insights');
  } catch {
    throw new Error('Insights are not available right now. Make sure the insights service is running.');
  }
}

export async function getRaw(): Promise<RawInsightsResponse> {
  try {
    return await fetchJson<RawInsightsResponse>('/insights/raw');
  } catch {
    throw new Error('Raw data is not available right now. Make sure the insights service is running.');
  }
}

export async function generateInsights(): Promise<GenerateInsightsResponse> {
  try {
    return await fetchJson<GenerateInsightsResponse>('/insights/generate', { method: 'POST' });
  } catch {
    throw new Error('Could not generate insights. Please try again.');
  }
}