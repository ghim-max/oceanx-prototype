import emailjs from '@emailjs/browser';
import { buildPackageEmail } from '../email/packageEmail';

export interface PackagePayload {
  email: string;
  educatorName?: string;
  audience: string;
  components: { title: string; type: string; minutes: number }[];
  quizLink?: string;
  quizQuestionCount?: number;
  lessonPlanLink?: string;
  lessonPlanLength?: number;
  lessonPlanLevel?: string;
  hadAiReview: boolean;
  slug?: string; // package slug for feedback links
}

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;
export const BASE_URL = (import.meta.env.VITE_PUBLIC_BASE_URL as string | undefined) ?? '';
// Email asset base URL - defaults to production Vercel URL, never localhost
export const EMAIL_ASSET_BASE_URL = (import.meta.env.VITE_EMAIL_ASSET_BASE_URL as string | undefined) ?? 'https://oceanx-prototype.vercel.app';
export const DEMO_EMAIL = (import.meta.env.VITE_DEMO_EMAIL as string | undefined) ?? '';

export function emailjsConfigured(): boolean {
  return Boolean(SERVICE_ID && TEMPLATE_ID && PUBLIC_KEY);
}

export class MissingEnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MissingEnvError';
  }
}

export async function sendPackage(payload: PackagePayload): Promise<void> {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    throw new MissingEnvError(
      'EmailJS environment variables are not configured. Add VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY to your .env.local file.'
    );
  }

  const feedbackLink = `${BASE_URL}/educator${payload.slug ? `/p/${payload.slug}` : '/seagrass-university'}`;

  const emailInput = {
    educatorName: payload.educatorName,
    audience: payload.audience,
    components: payload.components,
    quizLink: payload.quizLink,
    quizQuestionCount: payload.quizQuestionCount,
    lessonPlanLink: payload.lessonPlanLink,
    lessonPlanLength: payload.lessonPlanLength,
    lessonPlanLevel: payload.lessonPlanLevel,
    feedbackLink,
    hadAiReview: payload.hadAiReview,
  };

  const { subject, html } = buildPackageEmail(emailInput);

  const templateParams = {
    email: payload.email,
    email_html: html,
    subject,
    to_email: payload.email,
    reply_to: 'noreply@oceanx.org',
  };

  console.log('[sendPackage] params keys:', Object.keys(templateParams), 'email_html length:', html.length);

  await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, { publicKey: PUBLIC_KEY });
}