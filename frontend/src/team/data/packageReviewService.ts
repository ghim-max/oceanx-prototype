import { COMPONENT_ORIGINAL_TEXTS, COMPONENT_TITLES, getComponentOriginalText, recordPackageDecision } from './governanceService';
import { UNIVERSITY_STATUS } from '../../shared/data/university-version';

const STORAGE_KEY = 'oceanx_demo_package_reviews_v1';
const SCREENING_NOTICE = 'The submitted adaptation requires staff review for scientific accuracy and alignment with OceanX learning objectives.';

export type PackageScreeningStatus = 'flagged' | 'passed';
export type PackageReviewStatus = 'pending_review' | 'cleared';
export type PackageComponentDecision = 'approved' | 'edited' | 'original';

export interface PackageReviewMaterial {
  componentId: string;
  title: string;
  originalText: string;
  proposedText: string;
  screeningStatus: PackageScreeningStatus;
  screeningReason?: string;
  decision?: PackageComponentDecision;
  finalText: string;
  originalApproved: boolean;
}

export interface PackageReviewRecord {
  id: string;
  educatorEmail: string;
  audience: string;
  createdAt: string;
  status: PackageReviewStatus;
  deliveryStatus: 'not_sent' | 'simulated';
  materials: PackageReviewMaterial[];
  quiz?: object;
  quizSummary?: string;
  lessonPlan?: object;
  lessonPlanSummary?: string;
}

export interface CreatePackageReviewInput {
  educatorEmail: string;
  audience: string;
  picks: Array<{ id: string; title: string }>;
  recommendations: Array<{ id: string; title: string }>;
  acceptedRewrites: Array<{
    componentId: string;
    componentTitle: string;
    originalText: string;
    proposedText: string;
  }>;
  quiz?: object;
  quizSummary?: string;
  lessonPlan?: object;
  lessonPlanSummary?: string;
}

function readRecords(): PackageReviewRecord[] {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    throw new Error('Package review storage is unavailable. Nothing was submitted.');
  }

  let records: PackageReviewRecord[];
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) throw new Error('Invalid package records');
    records = parsed as PackageReviewRecord[];
  } catch {
    throw new Error('Package review records could not be read. Nothing was submitted.');
  }

  if (addSampleFlaggedPackages(records)) writeRecords(records);
  return records;
}

function writeRecords(records: PackageReviewRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    throw new Error('Package review storage is unavailable. Nothing was submitted.');
  }
}

function addSampleFlaggedPackages(records: PackageReviewRecord[]): boolean {
  const samples: PackageReviewRecord[] = [
    {
      id: 'PKG-2026-1048',
      educatorEmail: 'a.rahman@example.edu',
      audience: 'University',
      createdAt: '2026-10-28T09:15:00.000Z',
      status: 'pending_review',
      deliveryStatus: 'not_sent',
      materials: [
        {
          componentId: 'create-activity',
          title: COMPONENT_TITLES['create-activity'],
          originalText: getComponentOriginalText('create-activity'),
          proposedText: 'Groups of 2 to 3 learners build a causal chain with 6 to 10 Post-its. Planting seagrass always guarantees full meadow recovery within one season.',
          screeningStatus: 'flagged',
          screeningReason: "Absolute claim ('always guarantees') not supported by the approved sources. Recovery depends on site conditions.",
          finalText: 'Groups of 2 to 3 learners build a causal chain with 6 to 10 Post-its. Planting seagrass always guarantees full meadow recovery within one season.',
          originalApproved: true,
        },
      ],
    },
    {
      id: 'PKG-2026-1052',
      educatorEmail: 'j.koh@example.edu',
      audience: 'University',
      createdAt: '2026-10-29T06:40:00.000Z',
      status: 'pending_review',
      deliveryStatus: 'not_sent',
      materials: [
        {
          componentId: 'investigate-prompts',
          title: COMPONENT_TITLES['investigate-prompts'],
          originalText: getComponentOriginalText('investigate-prompts'),
          proposedText: 'Discuss: what restoration decisions did you face? Note that 80% of seagrass meadows recover without help.',
          screeningStatus: 'flagged',
          screeningReason: 'Adds a number (80%) that is not in the approved sources.',
          finalText: 'Discuss: what restoration decisions did you face? Note that 80% of seagrass meadows recover without help.',
          originalApproved: true,
        },
      ],
    },
  ];

  let changed = false;
  for (const sample of samples) {
    const existing = records.find((record) => record.id === sample.id);
    if (!existing) {
      records.push(sample);
      changed = true;
      continue;
    }

    if (existing.audience !== sample.audience) {
      existing.audience = sample.audience;
      changed = true;
    }
    for (const material of sample.materials) {
      const existingMaterial = existing.materials.find((entry) => entry.componentId === material.componentId);
      if (!existingMaterial) continue;

      if (existingMaterial.screeningReason !== material.screeningReason) {
        existingMaterial.screeningReason = material.screeningReason;
        changed = true;
      }
      if (existingMaterial.proposedText !== material.proposedText) {
        existingMaterial.proposedText = material.proposedText;
        if (!existingMaterial.decision) existingMaterial.finalText = material.finalText;
        changed = true;
      }
    }
  }
  return changed;
}

function demoScreen(text: string): { status: PackageScreeningStatus; reason?: string } {
  const demoRules = [
    /\b(?:hydrothermal vents?|arctic|sea[- ]ice|coral reefs?)\b/i,
    /\b(?:proves?|guarantees?|always|never|100\s*%)\b/i,
  ];
  return demoRules.some((rule) => rule.test(text))
    ? { status: 'flagged', reason: SCREENING_NOTICE }
    : { status: 'passed' };
}

function makeRecord(input: CreatePackageReviewInput): PackageReviewRecord {
  const rewrites = new Map(input.acceptedRewrites.map((rewrite) => [rewrite.componentId, rewrite]));
  const selected = [...input.picks, ...input.recommendations];
  if (selected.length === 0) throw new Error('Select at least one learning resource before submitting.');

  const materials: PackageReviewMaterial[] = selected.map((component) => {
    const rewrite = rewrites.get(component.id);
    const originalText = rewrite?.originalText ?? COMPONENT_ORIGINAL_TEXTS[component.id] ?? '';
    const proposedText = rewrite?.proposedText ?? originalText;
    const screen = demoScreen(`${component.title}\n${proposedText}`);

    return {
      componentId: component.id,
      title: component.title,
      originalText,
      proposedText,
      screeningStatus: screen.status,
      screeningReason: screen.reason,
      finalText: proposedText,
      originalApproved: !rewrite
        ? Boolean(originalText)
        : UNIVERSITY_STATUS[component.id]?.status === 'Adapted' && Boolean(originalText.trim()),
    };
  });
  if (input.quiz) {
    const text = JSON.stringify(input.quiz);
    const screen = demoScreen(text);
    materials.push({
      componentId: 'package-knowledge-check',
      title: 'Knowledge check',
      originalText: getComponentOriginalText('package-knowledge-check'),
      proposedText: 'Knowledge check assembled from the selected question-bank items.',
      screeningStatus: screen.status,
      screeningReason: screen.reason,
      finalText: 'Knowledge check assembled from the selected question-bank items.',
      originalApproved: false,
    });
  }
  if (input.lessonPlan) {
    const text = JSON.stringify(input.lessonPlan);
    const screen = demoScreen(text);
    const proposedText = `Lesson plan${input.lessonPlanSummary ? ` (${input.lessonPlanSummary})` : ''}.`;
    materials.push({
      componentId: 'package-lesson-plan',
      title: 'Lesson plan',
      originalText: getComponentOriginalText('package-lesson-plan'),
      proposedText,
      screeningStatus: screen.status,
      screeningReason: screen.reason,
      finalText: proposedText,
      originalApproved: false,
    });
  }

  const id = `package-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const flagged = materials.some((material) => material.screeningStatus === 'flagged');
  return {
    id,
    educatorEmail: input.educatorEmail,
    audience: input.audience,
    createdAt: new Date().toISOString(),
    status: flagged ? 'pending_review' : 'cleared',
    deliveryStatus: flagged ? 'not_sent' : 'simulated',
    materials,
    quiz: input.quiz,
    quizSummary: input.quizSummary,
    lessonPlan: input.lessonPlan,
    lessonPlanSummary: input.lessonPlanSummary,
  };
}

export function getPackageReviewRecords(status?: PackageReviewStatus): PackageReviewRecord[] {
  const records = readRecords();
  return records
    .filter((record) => !status || record.status === status)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getPendingPackageReviewCount(): number {
  return getPackageReviewRecords('pending_review').length;
}

export function submitDemoPackage(input: CreatePackageReviewInput): PackageReviewRecord {
  const record = makeRecord(input);
  const records = readRecords();
  records.push(record);
  writeRecords(records);

  if (record.status === 'cleared') {
    recordPackageDecision(record.id, 'Package cleared', 'All screening checks passed.');
    recordPackageDecision(record.id, 'Delivery simulated', 'Delivery was simulated; no email was sent.');
  } else {
    recordPackageDecision(
      record.id,
      'Package pending review',
      `${record.materials.filter((material) => material.screeningStatus === 'flagged').length} component(s) were flagged for staff review.`,
    );
  }

  window.dispatchEvent(new Event('oceanx-review-counts-changed'));
  return record;
}

export function decideDemoPackageComponent(
  packageId: string,
  componentId: string,
  action: 'approve' | 'edit' | 'reject_original',
  editedText?: string,
): { record: PackageReviewRecord; unresolvedCount: number } {
  const records = readRecords();
  const recordIndex = records.findIndex((entry) => entry.id === packageId);
  if (recordIndex < 0) throw new Error('Package not found in review storage.');

  const record = records[recordIndex];
  if (record.status !== 'pending_review') throw new Error('This package is no longer awaiting review.');

  const materialIndex = record.materials.findIndex((entry) => entry.componentId === componentId);
  if (materialIndex < 0) throw new Error('Package component not found.');
  const material = record.materials[materialIndex];
  if (material.screeningStatus !== 'flagged' || material.decision) {
    throw new Error('This component does not have an unresolved flag.');
  }
  if (action === 'edit' && !editedText?.trim()) throw new Error('Enter the corrected content before saving.');
  if (action === 'reject_original' && (!material.originalApproved || !material.originalText.trim())) {
    throw new Error('No approved original resource is available. The package remains on hold.');
  }

  const decision: PackageComponentDecision =
    action === 'approve' ? 'approved' : action === 'edit' ? 'edited' : 'original';
  if (action === 'edit') {
    const editedScreen = demoScreen(editedText!.trim());
    if (editedScreen.status === 'flagged') {
      record.materials[materialIndex] = {
        ...material,
        proposedText: editedText!.trim(),
        finalText: editedText!.trim(),
        screeningReason: editedScreen.reason,
        decision: undefined,
      };
      records[recordIndex] = record;
      writeRecords(records);
      recordPackageDecision(
        `${record.id}:${componentId}`,
        'Package pending review',
        'The edited text still matches a screening rule and remains on hold.',
      );
      window.dispatchEvent(new Event('oceanx-review-counts-changed'));
      return {
        record,
        unresolvedCount: record.materials.filter(
          (entry) => entry.screeningStatus === 'flagged' && !entry.decision,
        ).length,
      };
    }
  }

  const finalText =
    action === 'edit' ? editedText!.trim() : action === 'reject_original' ? material.originalText : material.proposedText;

  record.materials[materialIndex] = { ...material, decision, finalText };
  const unresolvedCount = record.materials.filter(
    (entry) => entry.screeningStatus === 'flagged' && !entry.decision,
  ).length;
  if (unresolvedCount === 0) {
    record.status = 'cleared';
    record.deliveryStatus = 'simulated';
  }

  records[recordIndex] = record;
  writeRecords(records);

  const actionLabel =
    action === 'approve' ? 'Approve & Send' : action === 'edit' ? 'Edit & Send' : 'Reject & Send Original';
  recordPackageDecision(
    `${record.id}:${componentId}`,
    actionLabel,
    action === 'reject_original' ? 'Rejected the adaptation; used the approved original.' : undefined,
  );
  if (unresolvedCount === 0) {
    recordPackageDecision(record.id, 'Package cleared', 'All flagged components have staff decisions.');
    recordPackageDecision(record.id, 'Delivery simulated', 'Delivery was simulated; no email was sent.');
  }

  window.dispatchEvent(new Event('oceanx-review-counts-changed'));
  return { record, unresolvedCount };
}
