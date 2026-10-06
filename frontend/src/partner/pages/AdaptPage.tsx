import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowLeft,
  Check,
  ShieldCheck,
  X,
  Play,
  Gamepad2,
  MessageCircle,
  Pencil,
  BookOpen,
  BookMarked,
  FileText,
  ListChecks,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import {
  SEAGRASS_STORIES,
  STAGES,
  type ComponentType,
  type ComponentStage,
  type StoryComponent,
} from '../../shared/data/seagrass-stories';
import {
  recommendComponents,
  type Recommendation,
} from '../../shared/services/recommendComponents';
import {
  generateExtras,
  type GeneratedQuiz,
  type GeneratedLessonPlan,
} from '../../shared/services/generateExtras';
import { usePicks } from '../../shared/context/PicksContext';
import { UNIVERSITY_STATUS } from '../../shared/data/university-version';
import styles from './AdaptPage.module.css';

// ─── Types ──────────────────────────────────────────────────────────────────

type ExtraStatus = 'pending' | 'approved' | 'removed';

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_ICONS: Record<ComponentType, React.ComponentType<{ size?: number; 'aria-hidden'?: 'true' }>> = {
  Watch: Play,
  Play: Gamepad2,
  Discuss: MessageCircle,
  Create: Pencil,
  Read: BookOpen,
  Guide: BookMarked,
};


// Groups for recommendations: ordered label → component IDs
const REC_GROUPS: [string, string[]][] = [
  ['Before class', ['further-reading-unep', 'further-reading-seagrass-watch']],
  ['In class', ['driving-question', 'game', 'video-nada', 'investigate-prompts', 'reflect-prompts']],
  ['For you', ['educator-guide']],
];

// Rough durations (min) used for summary bar
const DURATION_MIN: Record<string, number> = {
  'video-changi-point': 4,
  'create-activity': 15,
  'further-reading-unep': 20,
  'further-reading-seagrass-watch': 15,
  'driving-question': 5,
  game: 25,
  'video-nada': 5,
  'investigate-prompts': 10,
  'reflect-prompts': 15,
  'educator-guide': 0,
};

function approxMinutes(ids: string[]): number {
  return ids.reduce((sum, id) => sum + (DURATION_MIN[id] ?? 5), 0);
}

function getComponent(id: string): StoryComponent | undefined {
  return SEAGRASS_STORIES.components.find(c => c.id === id);
}

function getThumbnail(c: StoryComponent | undefined): string | null {
  if (!c) return null;
  if (c.thumbnail) return c.thumbnail;
  if (c.videoId) return `https://img.youtube.com/vi/${c.videoId}/maxresdefault.jpg`;
  return null;
}

function getThumbFallback(c: StoryComponent | undefined): string | undefined {
  if (!c) return undefined;
  if (c.videoId) return `https://img.youtube.com/vi/${c.videoId}/hqdefault.jpg`;
  return undefined;
}

// ─── Thumbnail ───────────────────────────────────────────────────────────────

function Thumb({
  component,
  size = 'sm',
}: {
  component: StoryComponent | undefined;
  size?: 'sm' | 'md';
}) {
  const Icon = component ? TYPE_ICONS[component.type] : BookOpen;
  const src = getThumbnail(component);
  const fallback = getThumbFallback(component);
  const [errored, setErrored] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  if (src && !errored) {
    return (
      <img
        src={usedFallback ? (fallback ?? src) : src}
        alt=""
        className={size === 'md' ? styles.thumbMd : styles.thumbSm}
        onError={() => {
          if (!usedFallback && fallback) {
            setUsedFallback(true);
          } else {
            setErrored(true);
          }
        }}
      />
    );
  }

  return (
    <div
      className={`${size === 'md' ? styles.thumbMd : styles.thumbSm} ${styles.thumbPlaceholder}`}
      aria-hidden="true"
    >
      <Icon size={size === 'md' ? 24 : 18} aria-hidden="true" />
    </div>
  );
}

// ─── PickRow ─────────────────────────────────────────────────────────────────

function PickRow({
  id,
  isAdded,
  onRemove,
}: {
  id: string;
  isAdded: boolean;
  onRemove: () => void;
}) {
  const component = getComponent(id);
  const entry = UNIVERSITY_STATUS[id];
  const Icon = component ? TYPE_ICONS[component.type] : BookOpen;

  return (
    <div className={styles.pickRow}>
      <Thumb component={component} size="sm" />
      <div className={styles.pickBody}>
        <div className={styles.pickMeta}>
          <span className={styles.typeLabel}>
            <Icon size={12} aria-hidden="true" />
            {component?.type ?? ''}
          </span>
          {entry && (
            <span className={`${styles.statusBadge} ${entry.status === 'Fixed' ? styles.statusFixed : styles.statusAdapted}`}>
              {entry.status}
            </span>
          )}
          {isAdded ? (
            <span className={styles.addedPickBadge}>Added</span>
          ) : (
            <span className={styles.yourPickBadge}>Your pick</span>
          )}
        </div>
        <p className={styles.pickTitle}>{component?.title ?? id}</p>
        {!isAdded && entry?.note && <p className={styles.pickNote}>{entry.note}</p>}
      </div>
      <button
        type="button"
        className={styles.removeLink}
        onClick={onRemove}
        aria-label={`Remove ${component?.title ?? id} from your picks`}
      >
        Remove
      </button>
    </div>
  );
}

// ─── ApprovedExtraRow ─────────────────────────────────────────────────────────

function ApprovedExtraRow({
  typeLabel,
  title,
  actionLabel,
  actionHref,
  onAction,
  onRemove,
}: {
  typeLabel: string;
  title: string;
  actionLabel: string;
  actionHref?: string;
  onAction?: () => void;
  onRemove: () => void;
}) {
  return (
    <div className={styles.pickRow}>
      <div className={styles.pickBody}>
        <div className={styles.pickMeta}>
          <span className={styles.typeLabel}>{typeLabel}</span>
          <span className={`${styles.statusBadge} ${styles.statusAdapted}`}>Adapted</span>
          <span className={styles.approvedPickBadge}>Approved</span>
        </div>
        <p className={styles.pickTitle}>{title}</p>
        <div className={styles.approvedExtraActions}>
          {actionHref ? (
            <a
              href={actionHref}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.extraActionPill}
            >
              {actionLabel}
              <ExternalLink size={12} aria-hidden="true" />
              <span className="visually-hidden">(opens in a new tab)</span>
            </a>
          ) : (
            <button type="button" className={styles.extraActionPill} onClick={onAction}>
              {actionLabel}
            </button>
          )}
          <button type="button" className={styles.removeLink} onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── RecommendationCard ───────────────────────────────────────────────────────

function RecommendationCard({
  recommendation,
  onAdd,
}: {
  recommendation: Recommendation;
  onAdd: () => void;
}) {
  const component = getComponent(recommendation.id);
  const entry = UNIVERSITY_STATUS[recommendation.id];
  const Icon = component ? TYPE_ICONS[component.type] : BookOpen;

  return (
    <div className={styles.recCard}>
      <Thumb component={component} size="md" />
      <div className={styles.recBody}>
        <div className={styles.recMeta}>
          <span className={styles.typeLabel}>
            <Icon size={12} aria-hidden="true" />
            {component?.type ?? ''}
          </span>
          {entry && (
            <span className={`${styles.statusBadge} ${entry.status === 'Fixed' ? styles.statusFixed : styles.statusAdapted}`}>
              {entry.status}
            </span>
          )}
        </div>
        <p className={styles.recTitle}>{component?.title ?? recommendation.id}</p>
        <p className={styles.recRationale}>{recommendation.rationale}</p>
      </div>
      <div className={styles.recActions}>
        <button
          type="button"
          className={styles.addPill}
          onClick={onAdd}
          aria-label={`Add ${component?.title ?? recommendation.id} to your picks`}
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ─── LoadingRecs ──────────────────────────────────────────────────────────────

function LoadingRecs() {
  return (
    <section className={styles.section} aria-label="Loading recommendations" aria-busy="true">
      <div className={styles.loadingRow}>
        <span className={styles.loadingDots} aria-hidden="true">
          <span /><span /><span />
        </span>
        <p className={styles.loadingLabel}>Finding components that match your picks...</p>
      </div>
    </section>
  );
}

// ─── AssistantPanel ───────────────────────────────────────────────────────────

const CHIPS = [
  { label: 'Generate a quiz', request: 'Generate a quiz' },
  { label: 'Build a lesson plan', request: 'Build a lesson plan' },
  { label: 'Add both', request: 'Generate a quiz and build a lesson plan' },
];

function AssistantPanel({
  open,
  onClose,
  onSubmit,
  generating,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (request: string) => void;
  generating: boolean;
}) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = (request: string) => {
    if (!request.trim() || generating) return;
    setInput('');
    onSubmit(request);
  };

  return (
    <Dialog.Root open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.panelOverlay} />
        <Dialog.Content
          className={styles.panel}
          aria-describedby="panel-desc"
          onOpenAutoFocus={e => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          {/* Header */}
          <div className={styles.panelHeader}>
            <Dialog.Title asChild>
              <h2 className={styles.panelTitle}>Assistant</h2>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className={styles.panelClose} aria-label="Close assistant">
                <X size={20} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          {/* Conversation area */}
          <div className={styles.panelConversation}>
            <p id="panel-desc" className={styles.panelIntroMsg}>
              Tell me what you need for your seminar, and how you'd like to run it.
            </p>
            {generating && (
              <div className={styles.panelThinking} role="status">
                <span className={styles.loadingDots} aria-hidden="true">
                  <span /><span /><span />
                </span>
                <span>Thinking...</span>
              </div>
            )}
          </div>

          {/* Input area */}
          <div className={styles.panelInputArea}>
            <div className={styles.panelChips} role="group" aria-label="Quick options">
              {CHIPS.map(chip => (
                <button
                  key={chip.label}
                  type="button"
                  className={styles.panelChip}
                  onClick={() => submit(chip.request)}
                  disabled={generating}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <form
              className={styles.panelForm}
              onSubmit={e => {
                e.preventDefault();
                submit(input);
              }}
            >
              <input
                ref={inputRef}
                type="text"
                className={styles.panelInput}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Or describe what you need..."
                disabled={generating}
                aria-label="Describe what you need"
              />
              <button
                type="submit"
                className={styles.panelSubmit}
                disabled={generating || !input.trim()}
              >
                Send
              </button>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── QuizCard ─────────────────────────────────────────────────────────────────

function QuizCard({
  quiz,
  onApprove,
  onRemove,
  onPreview,
}: {
  quiz: GeneratedQuiz;
  onApprove: () => void;
  onRemove: () => void;
  onPreview: () => void;
}) {
  return (
    <div className={styles.extraCard}>
      <div className={styles.extraIcon} aria-hidden="true">
        <ListChecks size={22} />
      </div>
      <div className={styles.extraBody}>
        <p className={styles.extraType}>Quiz</p>
        <p className={styles.extraTitle}>{quiz.title}</p>
        <p className={styles.extraMeta}>
          {quiz.metaLabel ?? `${quiz.questionCount} questions · ${quiz.duration}`}
        </p>
        <div className={styles.extraCardActions}>
          <button type="button" className={styles.extraActionPill} onClick={onPreview}>
            Preview quiz
          </button>
          <button type="button" className={styles.extraActionPillPrimary} onClick={onApprove}>
            <Check size={13} aria-hidden="true" />
            Looks good
          </button>
          <button type="button" className={styles.extraActionPill} onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LessonPlanCard ───────────────────────────────────────────────────────────

function LessonPlanCard({
  plan,
  onApprove,
  onRemove,
}: {
  plan: GeneratedLessonPlan;
  onApprove: () => void;
  onRemove: () => void;
}) {
  return (
    <div className={styles.extraCard}>
      <div className={styles.extraIcon} aria-hidden="true">
        <FileText size={22} />
      </div>
      <div className={styles.extraBody}>
        <p className={styles.extraType}>Lesson plan</p>
        <p className={styles.extraTitle}>{plan.title}</p>
        <p className={styles.extraMeta}>{plan.totalDuration}</p>
        <p className={styles.extraDesc}>{plan.description}</p>
        <div className={styles.extraCardActions}>
          <a
            href={plan.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.extraActionPill}
          >
            Open PDF
            <ExternalLink size={13} aria-hidden="true" />
            <span className="visually-hidden">(opens in a new tab)</span>
          </a>
          <button type="button" className={styles.extraActionPillPrimary} onClick={onApprove}>
            <Check size={13} aria-hidden="true" />
            Looks good
          </button>
          <button type="button" className={styles.extraActionPill} onClick={onRemove}>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── QuizPreviewModal ─────────────────────────────────────────────────────────

function QuizPreviewModal({
  quiz,
  open,
  onClose,
}: {
  quiz: GeneratedQuiz;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.previewOverlay} />
        <Dialog.Content className={styles.previewModal} aria-describedby={undefined}>
          <div className={styles.previewHeader}>
            <Dialog.Title asChild>
              <h2 className={styles.previewTitle}>{quiz.title}</h2>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className={styles.panelClose} aria-label="Close quiz preview">
                <X size={20} aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>
          <div className={styles.previewBody}>
            <p className={styles.previewMeta}>
              {quiz.metaLabel ?? `${quiz.questionCount} questions · ${quiz.duration}`}
            </p>
            <ol className={styles.questionList}>
              {quiz.questions.map((q, qi) => (
                <li key={q.id} className={styles.questionItem}>
                  <p className={styles.questionText}>{qi + 1}. {q.question}</p>
                  {q.type === 'short-answer' ? (
                    <div className={styles.shortAnswerBox} aria-label="Short answer response area (not interactive in preview)" />
                  ) : (
                    <ul className={styles.optionList}>
                      {q.options.map((opt, oi) => (
                        <li
                          key={oi}
                          className={`${styles.optionItem} ${oi === q.correct ? styles.optionCorrect : ''}`}
                        >
                          <span className={styles.optionLetter}>{String.fromCharCode(65 + oi)}</span>
                          {opt}
                          {oi === q.correct && (
                            <span className={styles.correctMark} aria-label="Correct answer">
                              <Check size={13} aria-hidden="true" />
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── SummaryBar ───────────────────────────────────────────────────────────────

function SummaryBar({
  componentCount,
  minutes,
  extrasCount,
  canContinue,
  onContinue,
}: {
  componentCount: number;
  minutes: number;
  extrasCount: number;
  canContinue: boolean;
  onContinue: () => void;
}) {
  return (
    <div className={styles.summaryBar} role="region" aria-label="Version summary">
      <p className={styles.summaryStats}>
        <span>{componentCount} {componentCount === 1 ? 'component' : 'components'}</span>
        <span className={styles.summarySep} aria-hidden="true">·</span>
        <span>about {minutes} min</span>
        {extrasCount > 0 && (
          <>
            <span className={styles.summarySep} aria-hidden="true">·</span>
            <span>{extrasCount} {extrasCount === 1 ? 'extra' : 'extras'}</span>
          </>
        )}
      </p>
      <button
        type="button"
        className={`${styles.continuePill} ${!canContinue ? styles.continuePillDisabled : ''}`}
        onClick={canContinue ? onContinue : undefined}
        aria-disabled={!canContinue}
        title={!canContinue ? 'Approve or remove all generated extras to continue' : undefined}
      >
        Continue to review
      </button>
    </div>
  );
}

// ─── AdaptPage ────────────────────────────────────────────────────────────────

export function AdaptPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addPick: ctxAddPick, clearPicks: ctxClearPicks } = usePicks();

  const audience = searchParams.get('audience') ?? 'university';
  const picksParam = searchParams.get('picks') ?? '';
  const [picks, setPicks] = useState<string[]>(() =>
    picksParam.split(',').filter(Boolean)
  );

  const [recsLoading, setRecsLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [addedRecs, setAddedRecs] = useState<Set<string>>(new Set());

  const [liveMsg, setLiveMsg] = useState('');

  const [assistantOpen, setAssistantOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuiz | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedLessonPlan | null>(null);
  const [quizStatus, setQuizStatus] = useState<ExtraStatus>('pending');
  const [planStatus, setPlanStatus] = useState<ExtraStatus>('pending');
  const [quizPreviewOpen, setQuizPreviewOpen] = useState(false);

  const extrasRef = useRef<HTMLDivElement>(null);

  // Load recommendations
  useEffect(() => {
    recommendComponents({ audience, picks }).then(recs => {
      setRecommendations(recs);
      setRecsLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hide FAB while assistant panel is open
  useEffect(() => {
    if (assistantOpen) {
      document.body.classList.add('assistant-panel-open');
    } else {
      document.body.classList.remove('assistant-panel-open');
    }
    return () => document.body.classList.remove('assistant-panel-open');
  }, [assistantOpen]);

  // Page title
  useEffect(() => {
    document.title = 'Build your university version — OceanX Education';
    return () => { document.title = 'OceanX Education'; };
  }, []);

  const handleRemovePick = (id: string) => {
    const next = picks.filter(p => p !== id);
    if (next.length === 0 && addedRecs.size === 0) {
      navigate('/partner/library');
      return;
    }
    setPicks(next);
    const c = getComponent(id);
    setLiveMsg(`${c?.title ?? id} removed from your picks`);
  };

  const handleAddRec = (id: string) => {
    setAddedRecs(prev => new Set([...prev, id]));
    const c = getComponent(id);
    setLiveMsg(`${c?.title ?? id} added to your picks`);
  };

  const handleRemoveAddedRec = (id: string) => {
    setAddedRecs(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    const c = getComponent(id);
    setLiveMsg(`${c?.title ?? id} moved back to recommendations`);
  };

  const handleBackToLibrary = () => {
    const allCurrentPicks = [...picks, ...Array.from(addedRecs)];
    ctxClearPicks();
    allCurrentPicks.forEach(id => {
      const c = getComponent(id);
      ctxAddPick(id, c?.title);
    });
    const picksStr = allCurrentPicks.join(',');
    navigate(`/partner/library?audience=${encodeURIComponent(audience)}&picks=${encodeURIComponent(picksStr)}`);
  };

  const handleAssistantSubmit = async (request: string) => {
    setGenerating(true);
    try {
      const extras = await generateExtras({ audience, picks, request });
      if (extras.quiz) {
        setGeneratedQuiz(extras.quiz);
        setQuizStatus('pending');
      }
      if (extras.lessonPlan) {
        setGeneratedPlan(extras.lessonPlan);
        setPlanStatus('pending');
      }
    } finally {
      setGenerating(false);
      setAssistantOpen(false);
      setTimeout(() => {
        extrasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
    }
  };

  // All picks grouped by stage
  const allPickIds = [...picks, ...Array.from(addedRecs)];
  const picksByStage = STAGES
    .map((stage: ComponentStage) => ({
      stage,
      items: allPickIds.filter(id => getComponent(id)?.stage === stage),
    }))
    .filter(g => g.items.length > 0);

  // Recs not yet added to picks
  const allRecsAdded =
    recommendations.length > 0 &&
    recommendations.every(r => addedRecs.has(r.id));

  // Extras state helpers
  const quizPending = generatedQuiz !== null && quizStatus === 'pending';
  const planPending = generatedPlan !== null && planStatus === 'pending';
  const quizApproved = generatedQuiz !== null && quizStatus === 'approved';
  const planApproved = generatedPlan !== null && planStatus === 'approved';
  const hasPendingExtras = quizPending || planPending;
  const hasApprovedExtras = quizApproved || planApproved;
  const hasAnyNonRemovedExtra =
    (generatedQuiz !== null && quizStatus !== 'removed') ||
    (generatedPlan !== null && planStatus !== 'removed');
  const allNonRemovedExtrasApproved = hasAnyNonRemovedExtra && !hasPendingExtras;

  // Summary bar values
  const componentCount = allPickIds.length;
  const minutes = approxMinutes(allPickIds);
  const approvedExtrasCount = [quizApproved, planApproved].filter(Boolean).length;

  // Enabled: at least 1 pick exists and no extra is awaiting approval.
  // Extras are optional — if none were generated, hasPendingExtras is false.
  const canContinue = allPickIds.length > 0 && !hasPendingExtras;

  const handleContinue = () => {
    const addedRecDetails = Array.from(addedRecs).map(id => {
      const c = getComponent(id);
      return { id, title: c?.title ?? id, stage: c?.stage ?? '' };
    });
    const pickDetails = picks.map(id => {
      const c = getComponent(id);
      return { id, title: c?.title ?? id, status: UNIVERSITY_STATUS[id]?.status ?? 'Fixed', stage: c?.stage ?? '' };
    });

    sessionStorage.setItem(
      'adaptPackage',
      JSON.stringify({
        audience,
        picks: pickDetails,
        recommendations: addedRecDetails,
        quiz: generatedQuiz && quizStatus === 'approved' ? generatedQuiz : null,
        lessonPlan: generatedPlan && planStatus === 'approved' ? generatedPlan : null,
      })
    );
    navigate('/partner/adapt/review');
  };

  // No-picks state
  if (picks.length === 0 && addedRecs.size === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.wideInner}>
          <p className={styles.emptyMessage}>
            No components selected. Go back to the library to pick your starting set.
          </p>
          <button type="button" className={styles.backPill} onClick={handleBackToLibrary}>
            Back to library
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className={styles.page}>
      {/* aria-live for add/remove announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="visually-hidden">
        {liveMsg}
      </div>

      <div className={styles.wideInner}>

        {/* ── Back link ── */}
        <button
          type="button"
          className={styles.backLink}
          onClick={handleBackToLibrary}
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to library
        </button>

        {/* ── Page header ── */}
        <header className={styles.pageHeader}>
          <h1 className={styles.h1}>Build your university version</h1>
          <p className={styles.subtitle}>Seagrass Stories, shaped for your seminar.</p>
        </header>

        {/* ── Section 1: Your picks ── */}
        <section className={styles.section} aria-labelledby="picks-heading">
          <h2 className={styles.h2} id="picks-heading">Your picks</h2>
          <div className={styles.picksNote}>
            <ShieldCheck size={18} aria-hidden="true" className={styles.picksNoteIcon} />
            <div className={styles.picksNoteContent}>
              <p className={styles.picksNoteText}>
                Some items are already adapted for university learners. OceanX Education reviews every adaptation at the review gate before release, so there's nothing you need to change.
              </p>
              <p className={styles.picksNoteLegend}>
                <span className={`${styles.statusBadge} ${styles.statusAdapted}`}>Adapted</span>
                {' '}tailored for your audience
                <span className={styles.picksNoteSep} aria-hidden="true"> · </span>
                <span className={`${styles.statusBadge} ${styles.statusFixed}`}>Fixed</span>
                {' '}used as is
              </p>
            </div>
          </div>
          <div className={styles.pickList}>
            {picksByStage.map(({ stage, items }) => (
              <div key={stage} className={styles.pickGroup}>
                <p className={styles.pickGroupLabel}>{stage}</p>
                {items.map(id => (
                  <PickRow
                    key={id}
                    id={id}
                    isAdded={addedRecs.has(id)}
                    onRemove={() =>
                      addedRecs.has(id)
                        ? handleRemoveAddedRec(id)
                        : handleRemovePick(id)
                    }
                  />
                ))}
              </div>
            ))}
            {hasApprovedExtras && (
              <div className={styles.pickGroup}>
                <p className={styles.pickGroupLabel}>Extras</p>
                {quizApproved && generatedQuiz && (
                  <ApprovedExtraRow
                    typeLabel="Quiz"
                    title={generatedQuiz.title}
                    actionLabel="Preview quiz"
                    onAction={() => setQuizPreviewOpen(true)}
                    onRemove={() => {
                      setQuizStatus('pending');
                      setLiveMsg('Quiz moved back to your extras');
                    }}
                  />
                )}
                {planApproved && generatedPlan && (
                  <ApprovedExtraRow
                    typeLabel="Lesson plan"
                    title={generatedPlan.title}
                    actionLabel="Open PDF"
                    actionHref={generatedPlan.pdfUrl}
                    onRemove={() => {
                      setPlanStatus('pending');
                      setLiveMsg('Lesson plan moved back to your extras');
                    }}
                  />
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Section 2: Recommendations ── */}
        {recsLoading ? (
          <LoadingRecs />
        ) : (
          <section className={styles.section} aria-labelledby="recs-heading">
            <div className={styles.recsSectionHead}>
              <h2 className={styles.h2} id="recs-heading">Recommended for your seminar</h2>
              <p className={styles.recsNote}>
                AI-assisted suggestions, reviewed by OceanX before release.
              </p>
            </div>

            {allRecsAdded ? (
              <p className={styles.recsAllAdded}>All recommendations have been added to your picks.</p>
            ) : (
              REC_GROUPS.map(([groupLabel, ids]) => {
                const groupRecs = ids
                  .map(id => recommendations.find(r => r.id === id))
                  .filter((r): r is Recommendation => r !== undefined && !addedRecs.has(r.id));
                if (groupRecs.length === 0) return null;
                return (
                  <div key={groupLabel} className={styles.recGroup}>
                    <p className={styles.recGroupLabel}>{groupLabel}</p>
                    <div className={styles.recGrid}>
                      {groupRecs.map(rec => (
                        <RecommendationCard
                          key={rec.id}
                          recommendation={rec}
                          onAdd={() => handleAddRec(rec.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        )}

        {/* ── Section 3: Assistant trigger + Section 4: Generated extras ── */}
        {!recsLoading && (
          <section
            className={styles.section}
            aria-labelledby="extras-heading"
            ref={extrasRef}
          >
            <div className={styles.extrasHead}>
              <div className={styles.extrasHeadText}>
                <h2 className={styles.h2} id="extras-heading">
                  {hasAnyNonRemovedExtra ? 'Your extras' : 'Need More Materials?'}
                </h2>
                {!hasAnyNonRemovedExtra && (
                  <p className={styles.extrasSubline}>
                    You can generate here - a quiz or lesson plan, created for this seminar in seconds.
                  </p>
                )}
              </div>
              <button
                type="button"
                className={styles.openAssistantPill}
                onClick={() => setAssistantOpen(true)}
                aria-label="Open assistant to generate extras"
              >
                <Sparkles size={15} aria-hidden="true" />
                Ask the assistant
              </button>
            </div>

            {generatedQuiz === null && generatedPlan === null && !generating && (
              <p className={styles.extrasEmpty}>
                Nothing generated yet. Open the assistant to get started.
              </p>
            )}

            {hasPendingExtras && (
              <div className={styles.extrasList}>
                {quizPending && (
                  <QuizCard
                    quiz={generatedQuiz!}
                    onApprove={() => {
                      setQuizStatus('approved');
                      setLiveMsg('Quiz approved and added to your picks');
                    }}
                    onRemove={() => setQuizStatus('removed')}
                    onPreview={() => setQuizPreviewOpen(true)}
                  />
                )}
                {planPending && (
                  <LessonPlanCard
                    plan={generatedPlan!}
                    onApprove={() => {
                      setPlanStatus('approved');
                      setLiveMsg('Lesson plan approved and added to your picks');
                    }}
                    onRemove={() => setPlanStatus('removed')}
                  />
                )}
              </div>
            )}

            {allNonRemovedExtrasApproved && (
              <p className={styles.allExtrasApprovedMsg} role="status">
                All extras approved and added to your picks.
              </p>
            )}
          </section>
        )}

      </div>

      {/* ── Summary bar ── */}
      <SummaryBar
        componentCount={componentCount}
        minutes={minutes}
        extrasCount={approvedExtrasCount}
        canContinue={canContinue}
        onContinue={handleContinue}
      />

      {/* ── Assistant panel ── */}
      <AssistantPanel
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        onSubmit={handleAssistantSubmit}
        generating={generating}
      />

      {/* ── Quiz preview modal ── */}
      {generatedQuiz && (
        <QuizPreviewModal
          quiz={generatedQuiz}
          open={quizPreviewOpen}
          onClose={() => setQuizPreviewOpen(false)}
        />
      )}
    </div>
  );
}
