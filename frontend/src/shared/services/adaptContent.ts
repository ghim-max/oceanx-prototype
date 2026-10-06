import { getAdaptedVersion, type AdaptRequest, type AdaptedVersion } from '../data/adaptVersions';

export type {
  Audience,
  ComponentStatus,
  Format,
  AdaptRequest,
  AdaptedComponent,
  AdaptedVersion,
} from '../data/adaptVersions';

/**
 * Mock. Replace with the real adapting service from the teammate's RAG tool.
 * Keep this input/output shape.
 */
export async function adaptContent(request: AdaptRequest): Promise<AdaptedVersion> {
  const delayMs = 2000 + Math.random() * 1000;
  await new Promise<void>(resolve => setTimeout(resolve, delayMs));
  return getAdaptedVersion(request);
}
