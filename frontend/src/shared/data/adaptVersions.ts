import { SEAGRASS_STORIES, type ComponentStage } from './seagrass-stories';

export type Audience = 'Schools' | 'University' | 'Museum';
export type ComponentStatus = 'adapted' | 'fixed' | 'as-is';
export type Format = 'Groups' | 'Solo';

export interface AdaptRequest {
  audience: Audience;
  sessionLength?: 30 | 60 | 90;
  format?: Format;
  fromComponentId?: string;
}

export interface AdaptedComponent {
  id: string;
  stage: ComponentStage;
  status: ComponentStatus;
}

export interface AdaptedVersion {
  audience: Audience;
  components: AdaptedComponent[];
  totalMinutes: number;
  notes: string[];
}

// ─── Lookups ───────────────────────────────────────────────────────────────

const COMPONENT_MAP = new Map(
  SEAGRASS_STORIES.components.map(c => [c.id, c])
);

function stageOf(id: string): ComponentStage {
  return COMPONENT_MAP.get(id)!.stage;
}

// ─── Predetermined sets ────────────────────────────────────────────────────

// OceanX / third-party media that cannot be edited
const ALWAYS_FIXED = new Set([
  'video-ecology-in-action',
  'video-changi-point',
  'video-nada',
  'game',
]);

const FURTHER_READING = new Set([
  'further-reading-unep',
  'further-reading-seagrass-watch',
]);

const ALL_IDS = SEAGRASS_STORIES.components.map(c => c.id);

const SHORT_IDS: string[] = [
  'driving-question',
  'learning-intention',
  'video-nada',
  'game',
  'reflect-prompts',
];

// 60-min standard: full set minus further reading
const STANDARD_IDS = ALL_IDS.filter(id => !FURTHER_READING.has(id));

const UNIVERSITY_ADAPTED = new Set([
  'learning-intention',
  'explore-prompts',
  'investigate-prompts',
  'reflect-prompts',
  'create-activity',
  'further-reading-unep',
  'further-reading-seagrass-watch',
]);

const MUSEUM_IDS: string[] = [
  'driving-question',
  'learning-intention',
  'video-nada',
  'game',
  'reflect-prompts',
];

const MUSEUM_ADAPTED = new Set(['learning-intention', 'reflect-prompts']);

// ─── Builder ───────────────────────────────────────────────────────────────

function buildComponents(
  ids: string[],
  adaptedSet: Set<string>,
  fixedSet: Set<string>
): AdaptedComponent[] {
  return ids.map(id => ({
    id,
    stage: stageOf(id),
    status: (
      adaptedSet.has(id) ? 'adapted'
      : fixedSet.has(id) ? 'fixed'
      : 'as-is'
    ) as ComponentStatus,
  }));
}

// ─── Main export ───────────────────────────────────────────────────────────

export function getAdaptedVersion(req: AdaptRequest): AdaptedVersion {
  const { audience, sessionLength = 60, fromComponentId } = req;

  if (audience === 'Museum') {
    return {
      audience,
      components: buildComponents(MUSEUM_IDS, MUSEUM_ADAPTED, new Set([...ALWAYS_FIXED])),
      totalMinutes: 10,
      notes: fromComponentId === 'create-activity'
        ? ["Map the chain isn't part of the museum version, because it needs groups and more time."]
        : [],
    };
  }

  const ids =
    sessionLength === 30 ? SHORT_IDS
    : sessionLength === 90 ? ALL_IDS
    : STANDARD_IDS;

  const adaptedSet =
    audience === 'University'
      ? new Set([...UNIVERSITY_ADAPTED].filter(id => ids.includes(id)))
      : new Set<string>();

  const fixedSet = new Set([...ALWAYS_FIXED]);
  if (audience === 'Schools') {
    FURTHER_READING.forEach(id => fixedSet.add(id));
  }

  const minuteMap: Record<string, Record<number, number>> = {
    Schools:    { 30: 30, 60: 65, 90: 75 },
    University: { 30: 35, 60: 75, 90: 90 },
  };

  return {
    audience,
    components: buildComponents(ids, adaptedSet, fixedSet),
    totalMinutes: minuteMap[audience]?.[sessionLength] ?? 60,
    notes: [],
  };
}
