import emailjs from '@emailjs/browser';

export interface PackagePayload {
  email: string;
  audience: string;
  picks: { id: string; title: string; status: string; stage: string }[];
  recommendations: { id: string; title: string; stage: string }[];
  quizTitle?: string;
  lessonPlanTitle?: string;
  lessonPlanUrl?: string;
}

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;
const BASE_URL = (import.meta.env.VITE_PUBLIC_BASE_URL as string | undefined) ?? '';

export const DEMO_EMAIL = (import.meta.env.VITE_DEMO_EMAIL as string | undefined) ?? '';

export function emailjsConfigured(): boolean {
  return Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);
}

// Stage order mirrors seagrass-stories STAGES array.
const STAGE_ORDER = [
  'Start here',
  'Explore',
  'Investigate',
  'Reflect',
  'Create',
  'Additional support',
];

function buildComponentsText(
  picks: PackagePayload['picks'],
  recs: PackagePayload['recommendations'],
): string {
  type Item = { id: string; title: string; status: string; stage: string };
  const all: Item[] = [
    ...picks,
    ...recs.map(r => ({ ...r, status: 'Added' })),
  ];

  const byStage = new Map<string, Item[]>();
  for (const item of all) {
    const s = item.stage || 'Other';
    if (!byStage.has(s)) byStage.set(s, []);
    byStage.get(s)!.push(item);
  }

  const orderedStages = [...STAGE_ORDER, 'Other'].filter(s => byStage.has(s));
  return orderedStages.map(stage => {
    const items = byStage.get(stage)!;
    const rows = items.map(
      item => `• ${item.title} (${item.status}): ${BASE_URL}/partner/library`,
    );
    return [stage.toUpperCase(), ...rows].join('\n');
  }).join('\n\n');
}

// Demo shortcut: in the real product this email is sent only after OceanX Education
// approves the package (within 1 business day). For the demo it sends immediately.
export async function sendPackage(payload: PackagePayload): Promise<void> {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    throw new MissingEnvError(
      'EmailJS environment variables are not configured. Add VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY to your .env.local file.'
    );
  }

  const { picks, recommendations, quizTitle, lessonPlanUrl } = payload;

  const templateParams = {
    email: payload.email,
    audience: payload.audience,
    components: buildComponentsText(picks, recommendations),
    quiz_link: quizTitle ? `${BASE_URL}/quiz/seagrass-university` : 'Not included',
    lesson_plan_link: lessonPlanUrl ? `${BASE_URL}${lessonPlanUrl}` : 'Not included',
    feedback_link: `${BASE_URL}/educator/seagrass-university`,
  };

  await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, { publicKey: PUBLIC_KEY });
}

export class MissingEnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissingEnvError';
  }
}
