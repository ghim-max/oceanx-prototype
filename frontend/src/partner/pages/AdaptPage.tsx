import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import React from 'react';
import { ArrowLeft, ShieldCheck, Play, Gamepad2, MessageCircle, Pencil, BookOpen, BookMarked, ListChecks, Eye, Sparkles, RotateCcw, CheckCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { getApprovedBankItems, type BankItem } from '../../shared/services/bankApi';
import { assembleQuiz, type QuizType, type QuizDifficulty, type AssembleResult } from '../../shared/services/assembleQuiz';
import { assembleLessonPlan, type LessonLevel, type LessonPlan } from '../../shared/services/assembleLessonPlan';
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
import { usePicks } from '../../shared/context/PicksContext';
import { UNIVERSITY_STATUS } from '../../shared/data/university-version';
import { rewriteWithAI, markAdaptationStarted, getLibraryState } from '../../team/data/governanceService';
import styles from './AdaptPage.module.css';

// ─── Types ──────────────────────────────────────────────────────────────────

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
  ['In class', ['driving-question', 'game', 'video-changi-point', 'investigate-prompts', 'reflect-prompts']],
  ['For you', ['educator-guide']],
];

// Component IDs that should never appear in recommendations
const EXCLUDED_REC_IDS = new Set(['video-nada']);

// Rough durations (min) used for summary bar
export const DURATION_MIN: Record<string, number> = {
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

// ─── RecommendationCard ───────────────────────────────────────────────────────

function RecommendationCard({
  recommendation,
  onAdd,
  disabled = false,
}: {
  recommendation: Recommendation;
  onAdd: () => void;
  disabled?: boolean;
}) {
  const component = getComponent(recommendation.id);
  const entry = UNIVERSITY_STATUS[recommendation.id];
  const Icon = component ? TYPE_ICONS[component.type] : BookOpen;

  return (
    <div className={`${styles.recCard} ${disabled ? styles.recCardDisabled : ''}`}>
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
        {disabled && <span className={styles.comingSoonBadge}>Coming soon</span>}
      </div>
      <div className={styles.recActions}>
        <button
          type="button"
          className={styles.addPill}
          onClick={onAdd}
          aria-label={`Add ${component?.title ?? recommendation.id} to your picks`}
          disabled={disabled}
          aria-disabled={disabled}
        >
          {disabled ? 'Coming soon' : 'Add'}
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

// ─── SummaryBar ───────────────────────────────────────────────────────────────

function SummaryBar({
  componentCount,
  minutes,
  canContinue,
  onContinue,
}: {
  componentCount: number;
  minutes: number;
  canContinue: boolean;
  onContinue: () => void;
}) {
  return (
    <div className={styles.summaryBar} role="region" aria-label="Version summary">
      <p className={styles.summaryStats}>
        <span>{componentCount} {componentCount === 1 ? 'component' : 'components'}</span>
        <span className={styles.summarySep} aria-hidden="true">·</span>
        <span>about {minutes} min</span>
      </p>
      <button
        type="button"
        className={`${styles.continuePill} ${!canContinue ? styles.continuePillDisabled : ''}`}
        onClick={canContinue ? onContinue : undefined}
        aria-disabled={!canContinue}
        title={!canContinue ? 'Add at least one component to continue' : undefined}
      >
        Continue to review
      </button>
    </div>
  );
}

// ─── AIAdaptationSection ──────────────────────────────────────────────────────
interface AIAdaptationSectionProps {
  componentId: string;
  componentTitle: string;
  acceptedRewrites: Map<string, {
    componentId: string;
    componentTitle: string;
    level: 'secondary' | 'university' | 'postgrad';
    length: 'shorter' | 'same' | 'longer';
    originalText: string;
    rewrittenText: string;
    sourcesUsed: string[];
  }>;
  onAcceptRewrite: (data: {
    componentId: string;
    componentTitle: string;
    level: 'secondary' | 'university' | 'postgrad';
    length: 'shorter' | 'same' | 'longer';
    originalText: string;
    rewrittenText: string;
    sourcesUsed: string[];
  }) => void;
  onRemoveRewrite: (componentId: string) => void;
  onRewrite: (componentId: string, level: 'secondary' | 'university' | 'postgrad', length: 'shorter' | 'same' | 'longer') => void;
  aiRewriteState: {
    componentId: string | null;
    status: 'idle' | 'loading' | 'result' | 'error';
    level: 'secondary' | 'university' | 'postgrad';
    length: 'shorter' | 'same' | 'longer';
    result: { rewrittenText: string; sourcesUsed: string[] } | null;
    error: string | null;
  };
  setAiRewriteState: React.Dispatch<React.SetStateAction<{
    componentId: string | null;
    status: 'idle' | 'loading' | 'result' | 'error';
    level: 'secondary' | 'university' | 'postgrad';
    length: 'shorter' | 'same' | 'longer';
    result: { rewrittenText: string; sourcesUsed: string[] } | null;
    error: string | null;
  }>>;
}

function AIAdaptationSection({
  componentId,
  componentTitle,
  acceptedRewrites,
  onAcceptRewrite,
  onRemoveRewrite,
  onRewrite,
  aiRewriteState,
  setAiRewriteState,
}: AIAdaptationSectionProps) {
  const isAccepted = acceptedRewrites.has(componentId);
  const acceptedData = acceptedRewrites.get(componentId);
  const isActive = aiRewriteState.componentId === componentId;
  const status = isActive ? aiRewriteState.status : 'idle';

  const handleStartRewrite = (level: 'secondary' | 'university' | 'postgrad', length: 'shorter' | 'same' | 'longer') => {
    setAiRewriteState({
      componentId,
      status: 'loading',
      level,
      length,
      result: null,
      error: null,
    });
    onRewrite(componentId, level, length);
  };

  const handleUseAI = () => {
    if (aiRewriteState.result) {
      onAcceptRewrite({
        componentId,
        componentTitle,
        level: aiRewriteState.level,
        length: aiRewriteState.length,
        originalText: acceptedData?.originalText || '',
        rewrittenText: aiRewriteState.result.rewrittenText,
        sourcesUsed: aiRewriteState.result.sourcesUsed,
      });
      setAiRewriteState({
        componentId: null,
        status: 'idle',
        level: 'university',
        length: 'same',
        result: null,
        error: null,
      });
    }
  };

  const handleDiscard = () => {
    setAiRewriteState({
      componentId: null,
      status: 'idle',
      level: 'university',
      length: 'same',
      result: null,
      error: null,
    });
  };

  const handleTryAgain = () => {
    if (aiRewriteState.componentId) {
      handleStartRewrite(aiRewriteState.level, aiRewriteState.length);
    }
  };

  const handleRemoveAccepted = () => {
    onRemoveRewrite(componentId);
  };

  if (isAccepted && acceptedData) {
    return (
      <div className={styles.aiAccepted}>
        <div className={styles.aiAcceptedBadge}>
          <CheckCheck size={14} aria-hidden="true" />
          <span>AI version, needs OceanX review</span>
        </div>
        <div className={styles.aiAcceptedPreview}>
          <div className={styles.aiPreviewCol}>
            <span className={styles.aiPreviewLabel}>Original</span>
            <p className={styles.aiPreviewText}>{acceptedData.originalText}</p>
          </div>
          <div className={styles.aiPreviewCol}>
            <span className={styles.aiPreviewLabel}>AI version ({acceptedData.level}, {acceptedData.length})</span>
            <p className={styles.aiPreviewText}>{acceptedData.rewrittenText}</p>
          </div>
        </div>
        <p className={styles.aiSources}>Sources used: {acceptedData.sourcesUsed.join(', ')}</p>
        <button type="button" className={styles.aiUndoBtn} onClick={handleRemoveAccepted}>
          <RotateCcw size={14} aria-hidden="true" />
          Undo
        </button>
        <p className={styles.aiNote}>AI versions are checked by the OceanX team before your email is sent.</p>
      </div>
    );
  }

  return (
    <div className={styles.aiSection}>
      <h4 className={styles.aiSectionTitle}>
        <Sparkles size={16} aria-hidden="true" />
        Adapt with AI
      </h4>
      <p className={styles.aiSectionDesc}>Rewrite this component for a different level or length using approved OceanX sources.</p>

      <div className={styles.aiControls}>
        <div className={styles.aiControlGroup}>
          <label className={styles.aiControlLabel}>Level</label>
          <select
            className={styles.aiSelect}
            value={isActive && aiRewriteState.level || 'university'}
            onChange={(e) => setAiRewriteState(prev => ({ ...prev, level: e.target.value as 'secondary' | 'university' | 'postgrad' }))}
            disabled={status === 'loading'}
          >
            <option value="secondary">Secondary</option>
            <option value="university">University</option>
            <option value="postgrad">Postgraduate</option>
          </select>
        </div>
        <div className={styles.aiControlGroup}>
          <label className={styles.aiControlLabel}>Length</label>
          <select
            className={styles.aiSelect}
            value={isActive && aiRewriteState.length || 'same'}
            onChange={(e) => setAiRewriteState(prev => ({ ...prev, length: e.target.value as 'shorter' | 'same' | 'longer' }))}
            disabled={status === 'loading'}
          >
            <option value="shorter">Shorter</option>
            <option value="same">Same</option>
            <option value="longer">Longer</option>
          </select>
        </div>
        <button
          type="button"
          className={`${styles.aiRewriteBtn} ${status === 'loading' ? styles.aiRewriteBtnLoading : ''}`}
          onClick={() => handleStartRewrite(isActive ? aiRewriteState.level : 'university', isActive ? aiRewriteState.length : 'same')}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? (
            <>
              <span className={styles.loadingDots} aria-hidden="true"><span /><span /><span /></span>
              Rewriting from approved OceanX sources...
            </>
          ) : (
            'Rewrite with AI'
          )}
        </button>
      </div>

      {status === 'error' && aiRewriteState.error && (
        <div className={styles.aiError} role="alert">
          {aiRewriteState.error}
          <button type="button" className={styles.aiErrorDismiss} onClick={handleDiscard}>Dismiss</button>
        </div>
      )}

      {status === 'result' && aiRewriteState.result && (
        <div className={styles.aiResult}>
          <div className={styles.aiPreviewCol}>
            <span className={styles.aiPreviewLabel}>Original</span>
            <p className={styles.aiPreviewText}>{acceptedData?.originalText || 'Original text not available'}</p>
          </div>
          <div className={styles.aiPreviewCol}>
            <span className={styles.aiPreviewLabel}>AI version ({isActive ? aiRewriteState.level : 'university'}, {isActive ? aiRewriteState.length : 'same'})</span>
            <p className={styles.aiPreviewText}>{aiRewriteState.result.rewrittenText}</p>
          </div>
          <p className={styles.aiSources}>Sources used: {aiRewriteState.result.sourcesUsed.join(', ')}</p>
          <div className={styles.aiResultActions}>
            <button type="button" className={styles.aiUseBtn} onClick={handleUseAI}>
              <CheckCheck size={14} aria-hidden="true" />
              Use AI version
            </button>
            <button type="button" className={styles.aiDiscardBtn} onClick={handleDiscard}>
              Discard
            </button>
            <button type="button" className={styles.aiRetryBtn} onClick={handleTryAgain}>
              <RotateCcw size={14} aria-hidden="true" />
              Try again
            </button>
          </div>
        </div>
      )}

      <p className={styles.aiNote}>AI versions are checked by the OceanX team before your email is sent.</p>
    </div>
  );
}

// ─── AdaptPage ────────────────────────────────────────────────────────────

export function AdaptPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addPick: ctxAddPick, clearPicks: ctxClearPicks } = usePicks();

  const audience = searchParams.get('audience') ?? 'university';
  const picksParam = searchParams.get('picks') ?? '';
  const [picks, setPicks] = useState<string[]>(() =>
    picksParam.split(',').filter(Boolean)
  );

  // Apply default picks if no URL picks provided
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (picks.length === 0 && !picksParam) {
      const defaultPicks = ['video-nada', 'create-activity'];
      setPicks(defaultPicks);
    }
  }, [picks, picksParam]);

  const [recsLoading, setRecsLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [addedRecs, setAddedRecs] = useState<Set<string>>(new Set());

  const [quizEnabled, setQuizEnabled] = useState(false);
  const [quizType, setQuizType] = useState<QuizType>('mcq');
  const [quizDifficulty, setQuizDifficulty] = useState<QuizDifficulty>('medium');
  const [quizCount, setQuizCount] = useState(4);
  const [bankItems, setBankItems] = useState<BankItem[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankLoaded, setBankLoaded] = useState(false);
  const [assembleResult, setAssembleResult] = useState<AssembleResult | null>(null);

  const [lessonPlanEnabled, setLessonPlanEnabled] = useState(false);
  const [lessonPlanLength, setLessonPlanLength] = useState<30 | 60 | 90 | 120>(60);
  const [lessonPlanLevel, setLessonPlanLevel] = useState<LessonLevel>('introductory');
  const [lessonPlanAssembleResult, setLessonPlanAssembleResult] = useState<LessonPlan | { error: string } | null>(null);

  // Extras added state (confirmed by user)
  const [quizAdded, setQuizAdded] = useState(false);
  const [lessonPlanAdded, setLessonPlanAdded] = useState(false);

  // Need more materials section collapsed state (persisted in sessionStorage)
  const [extrasCollapsed, setExtrasCollapsed] = useState(() => {
    try {
      return sessionStorage.getItem('adapt-extras-collapsed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('adapt-extras-collapsed', String(extrasCollapsed));
    } catch {
      // ignore
    }
  }, [extrasCollapsed]);

  // AI Adaptation state
  const [acceptedRewrites, setAcceptedRewrites] = useState<Map<string, {
    componentId: string;
    componentTitle: string;
    level: 'secondary' | 'university' | 'postgrad';
    length: 'shorter' | 'same' | 'longer';
    originalText: string;
    rewrittenText: string;
    sourcesUsed: string[];
  }>>(new Map());
  const [aiRewriteState, setAiRewriteState] = useState<{
    componentId: string | null;
    status: 'idle' | 'loading' | 'result' | 'error';
    level: 'secondary' | 'university' | 'postgrad';
    length: 'shorter' | 'same' | 'longer';
    result: { rewrittenText: string; sourcesUsed: string[] } | null;
    error: string | null;
  }>({
    componentId: null,
    status: 'idle',
    level: 'university',
    length: 'same',
    result: null,
    error: null,
  });

  // Library state for hidden/proven items
  const [libraryState, setLibraryState] = useState<Record<string, { hidden: boolean; proven: boolean }>>({});

  // Load library state on mount
  useEffect(() => {
    getLibraryState().then((state) => {
      const map: Record<string, { hidden: boolean; proven: boolean }> = {};
      state.forEach((s) => {
        map[s.componentId] = { hidden: s.hidden, proven: s.proven };
      });
      setLibraryState(map);
    });
  }, []);

  // Mark adaptation started on page load
  useEffect(() => {
    markAdaptationStarted('adapt-session');
  }, []);

  // Preview modal state
  // const [quizPreviewOpen, setQuizPreviewOpen] = useState(false);
  // const [lessonPlanPreviewOpen, setLessonPlanPreviewOpen] = useState(false);

  const [liveMsg, setLiveMsg] = useState('');

  // Load recommendations
  useEffect(() => {
    recommendComponents({ audience, picks }).then(recs => {
      setRecommendations(recs);
      setRecsLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Page title
  useEffect(() => {
    document.title = 'Build your university version — OceanX Education';
    return () => { document.title = 'OceanX Education'; };
  }, []);

  // Fetch bank items once when quiz is first enabled.
  // bankLoading intentionally excluded from deps — including it causes an infinite retry loop
  // when the fetch fails (finally resets bankLoading, which re-triggers the effect).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!quizEnabled || bankLoaded || bankLoading) return;
    setBankLoading(true);
    getApprovedBankItems()
      .then(items => {
        setBankItems(items);
        setBankLoaded(true);
      })
      .catch(() => {})
      .finally(() => setBankLoading(false));
  }, [quizEnabled, bankLoaded]);

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

  // AI Rewrite handlers
  const handleRewrite = useCallback(async (componentId: string, level: 'secondary' | 'university' | 'postgrad', length: 'shorter' | 'same' | 'longer') => {
    try {
      const result = await rewriteWithAI(componentId, level, length);
      setAiRewriteState(prev => ({ ...prev, status: 'result', result }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to rewrite. Please try again.';
      setAiRewriteState(prev => ({ ...prev, status: 'error', error: message }));
    }
  }, []);

  const handleAcceptRewrite = useCallback((data: {
    componentId: string;
    componentTitle: string;
    level: 'secondary' | 'university' | 'postgrad';
    length: 'shorter' | 'same' | 'longer';
    originalText: string;
    rewrittenText: string;
    sourcesUsed: string[];
  }) => {
    setAcceptedRewrites(prev => {
      const next = new Map(prev);
      next.set(data.componentId, {
        componentId: data.componentId,
        componentTitle: data.componentTitle,
        level: data.level,
        length: data.length,
        originalText: data.originalText,
        rewrittenText: data.rewrittenText,
        sourcesUsed: data.sourcesUsed,
      });
      return next;
    });
    const c = getComponent(data.componentId);
    setLiveMsg(`AI version accepted for ${c?.title ?? data.componentId}`);
  }, []);

  const handleRemoveRewrite = useCallback((componentId: string) => {
    setAcceptedRewrites(prev => {
      const next = new Map(prev);
      next.delete(componentId);
      return next;
    });
    const c = getComponent(componentId);
    setLiveMsg(`AI version removed for ${c?.title ?? componentId}`);
  }, []);

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

  // All picks grouped by stage
  const allPickIds = [...picks, ...Array.from(addedRecs)].filter((id) => !libraryState[id]?.hidden);
  const picksKey = allPickIds.join(',');

  // Run assembleQuiz live whenever options or picks change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!bankLoaded || !quizEnabled || allPickIds.length === 0) {
      setAssembleResult(null);
      return;
    }
    setAssembleResult(
      assembleQuiz(bankItems, {
        componentIds: allPickIds,
        qtype: quizType,
        difficulty: quizDifficulty,
        count: quizCount,
      })
    );
  // picksKey is a stable string proxy for allPickIds
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankLoaded, bankItems, quizEnabled, quizType, quizDifficulty, quizCount, picksKey]);

  // Run assembleLessonPlan live whenever options or picks change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!lessonPlanEnabled || allPickIds.length === 0) {
      setLessonPlanAssembleResult(null);
      return;
    }
    const quizSummary = assembleResult && !assembleResult.error
      ? { type: quizType, count: assembleResult.itemIds.length }
      : undefined;
    setLessonPlanAssembleResult(
      assembleLessonPlan(allPickIds, { length: lessonPlanLength, level: lessonPlanLevel }, quizSummary)
    );
  // picksKey is a stable string proxy for allPickIds
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonPlanEnabled, lessonPlanLength, lessonPlanLevel, assembleResult, quizType, picksKey]);

  const picksByStage = STAGES
    .map((stage: ComponentStage) => ({
      stage,
      items: allPickIds.filter(id => getComponent(id)?.stage === stage),
    }))
    .filter(g => g.items.length > 0);

  // Also filter recommendations to exclude hidden items
  const visibleRecommendations = recommendations.filter((r) => !libraryState[r.id]?.hidden);

  // Recs not yet added to picks
  const allRecsAdded =
    visibleRecommendations.length > 0 &&
    visibleRecommendations.every(r => addedRecs.has(r.id));

  // Summary bar values
  const componentCount = allPickIds.length;
  const minutes = approxMinutes(allPickIds);

  // Max available questions for current quiz type/difficulty across active components
  const maxAvailableQuestions = assembleResult && !assembleResult.error
    ? assembleResult.componentAvailability.reduce((sum, ca) => sum + ca.available, 0)
    : 0;

  // Auto-clamp quizCount when max available changes (no error state on load)
  useEffect(() => {
    if (maxAvailableQuestions > 0 && quizCount > maxAvailableQuestions) {
      setQuizCount(maxAvailableQuestions);
    }
  }, [maxAvailableQuestions, quizCount]);

  // Enabled: at least 1 pick exists
  const canContinue = allPickIds.length > 0;

  const handleContinue = () => {
    const addedRecDetails = Array.from(addedRecs).map(id => {
      const c = getComponent(id);
      return { id, title: c?.title ?? id, stage: c?.stage ?? '' };
    });
    const pickDetails = picks.map(id => {
      const c = getComponent(id);
      return { id, title: c?.title ?? id, status: UNIVERSITY_STATUS[id]?.status ?? 'Fixed', stage: c?.stage ?? '' };
    });

    // Store accepted AI rewrites for the review page
    const acceptedRewritesArray = Array.from(acceptedRewrites.values()).map(r => ({
      componentId: r.componentId,
      componentTitle: r.componentTitle,
      level: r.level,
      length: r.length,
      originalText: r.originalText,
      proposedText: r.rewrittenText,
      educatorEmail: '', // Will be filled on review page
      packageId: `pkg-${Date.now()}`,
    }));
    sessionStorage.setItem('adaptAcceptedRewrites', JSON.stringify(acceptedRewritesArray));

    sessionStorage.setItem(
      'adaptPackage',
      JSON.stringify({
        audience,
        picks: pickDetails,
        recommendations: addedRecDetails,
      })
    );

    const quizItemIds =
      quizEnabled && assembleResult && !assembleResult.error
        ? assembleResult.itemIds
        : [];

    const lessonPlanData =
      lessonPlanEnabled && lessonPlanAssembleResult && !('error' in lessonPlanAssembleResult)
        ? { length: lessonPlanLength, level: lessonPlanLevel }
        : null;

    sessionStorage.setItem(
      'adaptOptions',
      JSON.stringify({
        quizEnabled: quizItemIds.length > 0,
        quizType,
        quizDifficulty,
        quizCount,
        itemIds: quizItemIds,
        componentIds: allPickIds,
        lessonPlanEnabled: lessonPlanData !== null,
        lessonPlanLength: lessonPlanData?.length ?? lessonPlanLength,
        lessonPlanLevel: lessonPlanData?.level ?? lessonPlanLevel,
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
                {items.map(id => {
                  const entry = UNIVERSITY_STATUS[id];
                  const isAdapted = entry?.status === 'Adapted';
                  const isHidden = libraryState[id]?.hidden;
                  return (
                    <React.Fragment key={id}>
                      {!isHidden ? (
                        <>
                          <PickRow
                            id={id}
                            isAdded={addedRecs.has(id)}
                            onRemove={() =>
                              addedRecs.has(id)
                                ? handleRemoveAddedRec(id)
                                : handleRemovePick(id)
                            }
                          />
                          {isAdapted && (
                            <AIAdaptationSection
                              componentId={id}
                              componentTitle={getComponent(id)?.title ?? id}
                              acceptedRewrites={acceptedRewrites}
                              onAcceptRewrite={handleAcceptRewrite}
                              onRemoveRewrite={handleRemoveRewrite}
                              onRewrite={handleRewrite}
                              aiRewriteState={aiRewriteState}
                              setAiRewriteState={setAiRewriteState}
                            />
                          )}
                        </>
                      ) : (
                        <div className={styles.pickRow} style={{ opacity: 0.5 }}>
                          <div className={styles.pickBody}>
                            <div className={styles.pickMeta}>
                              <span className={styles.typeLabel}>Hidden</span>
                              <span className={styles.noLongerAvailable}>No longer available</span>
                            </div>
                            <p className={styles.pickTitle}>{getComponent(id)?.title ?? id}</p>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            ))}
            {/* Extras (quiz/lesson plan) added to picks */}
            {(quizAdded || lessonPlanAdded) && (
              <div className={styles.pickGroup}>
                <p className={styles.pickGroupLabel}>Extras</p>
                {quizAdded && (
                  <div className={styles.pickRow} style={{opacity: quizEnabled ? 1 : 0.5}}>
                    <div className={styles.pickBody}>
                      <div className={styles.pickMeta}>
                        <span className={styles.typeLabel}>Quiz</span>
                        <span className={`${styles.statusBadge} ${styles.statusAdapted}`}>Extra</span>
                      </div>
                      <p className={styles.pickTitle}>
                        Knowledge check · {assembleResult?.itemIds.length ?? quizCount} questions · {quizType === 'mcq' ? 'Multiple choice' : quizType === 'short' ? 'Short answer' : 'Mixed'} · {quizDifficulty.charAt(0).toUpperCase() + quizDifficulty.slice(1)}
                      </p>
                    </div>
                    <div className={styles.pickActions}>
                      <button
                        type="button"
                        className={styles.previewLink}
                        onClick={() => {
                          const addedRecDetails = Array.from(addedRecs).map(id => {
                            const c = getComponent(id);
                            return { id, title: c?.title ?? id, stage: c?.stage ?? '' };
                          });
                          const quizData = {
                            itemIds: assembleResult?.itemIds ?? [],
                            componentIds: allPickIds,
                            picks: addedRecDetails,
                            quizType,
                            quizDifficulty,
                            quizCount,
                          };
                          sessionStorage.setItem('previewQuizData', JSON.stringify(quizData));
                          window.open('/preview/quiz', '_blank');
                        }}
                      >
                        <Eye size={14} aria-hidden="true" />
                        Preview
                      </button>
                      <button type="button" className={styles.editLink} onClick={() => setQuizAdded(false)}>Edit</button>
                      <button type="button" className={styles.removeLink} onClick={() => { setQuizAdded(false); setQuizEnabled(false); setAssembleResult(null); }}>Remove</button>
                    </div>
                  </div>
                )}
                {lessonPlanAdded && (
                  <div className={styles.pickRow} style={{opacity: lessonPlanEnabled ? 1 : 0.5}}>
                    <div className={styles.pickBody}>
                      <div className={styles.pickMeta}>
                        <span className={styles.typeLabel}>Lesson plan</span>
                        <span className={`${styles.statusBadge} ${styles.statusAdapted}`}>Extra</span>
                      </div>
                      <p className={styles.pickTitle}>
                        Lesson plan · {lessonPlanLength} min · {lessonPlanLevel.charAt(0).toUpperCase() + lessonPlanLevel.slice(1)}
                      </p>
                    </div>
                    <div className={styles.pickActions}>
                      <button
                        type="button"
                        className={styles.previewLink}
                        onClick={() => {
                          const lessonPlanData = lessonPlanAssembleResult && !('error' in lessonPlanAssembleResult) ? lessonPlanAssembleResult : null;
                          sessionStorage.setItem('previewLessonPlanData', JSON.stringify(lessonPlanData));
                          window.open('/preview/lesson', '_blank');
                        }}
                      >
                        <Eye size={14} aria-hidden="true" />
                        Preview
                      </button>
                      <button type="button" className={styles.editLink} onClick={() => setLessonPlanAdded(false)}>Edit</button>
                      <button type="button" className={styles.removeLink} onClick={() => { setLessonPlanAdded(false); setLessonPlanEnabled(false); setLessonPlanAssembleResult(null); }}>Remove</button>
                    </div>
                  </div>
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
                  .map(id => visibleRecommendations.find(r => r.id === id))
                  .filter((r): r is Recommendation => r !== undefined && !addedRecs.has(r.id) && !picks.includes(r.id) && !EXCLUDED_REC_IDS.has(r.id));
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
                          disabled={rec.id !== 'game' && rec.id !== 'further-reading-unep'}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        )}

        {/* ── Section 3: Need more materials? ── */}
        <section className={styles.section} aria-labelledby="extras-heading">
          <div className={styles.extrasSectionHead}>
            <h2 className={styles.h2} id="extras-heading">
              Need more materials?
              <span className={styles.optionalBadge}>Optional</span>
            </h2>
            <button
              type="button"
              className={styles.extrasCollapseBtn}
              onClick={() => setExtrasCollapsed(!extrasCollapsed)}
              aria-expanded={!extrasCollapsed}
              aria-controls="extras-content"
            >
              {extrasCollapsed ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
            </button>
          </div>
          <p className={styles.extrasSubline}>Add a knowledge check or lesson plan to your package.</p>

          {/* Collapsed summary line */}
          {extrasCollapsed && (
            <p className={styles.extrasCollapsedSummary}>
              {quizAdded || lessonPlanAdded
                ? `${quizAdded ? 'Knowledge check added' : ''}${quizAdded && lessonPlanAdded ? ' · ' : ''}${lessonPlanAdded ? 'Lesson plan added' : ''}`
                : 'Nothing added'}
            </p>
          )}

          <div id="extras-content" className={styles.extrasGrid} hidden={extrasCollapsed}>
            {/* Knowledge check card */}
            <div className={styles.extrasCard}>
              <div className={styles.extrasCardHead}>
                <div className={styles.extraIcon}>
                  <ListChecks size={20} aria-hidden="true" />
                </div>
                <div>
                  <p className={styles.extraType}>Quiz</p>
                  <p className={styles.extraTitle}>Knowledge check</p>
                </div>
              </div>
              <p className={styles.extraDesc}>Questions come only from the OceanX approved question bank.</p>

              {quizEnabled && (
                <div className={styles.quizExpand}>
                  <div className={styles.segGroup}>
                    <p className={styles.segLabel}>Type</p>
                    <div className={styles.segBtns}>
                      {(['mcq', 'short', 'mixed'] as QuizType[]).map((val) => {
                        const label = val === 'mcq' ? 'Multiple choice' : val === 'short' ? 'Short answer' : 'Mixed';
                        return (
                          <button
                            key={val}
                            type="button"
                            className={`${styles.segBtn} ${quizType === val ? styles.segBtnActive : ''}`}
                            aria-pressed={quizType === val}
                            onClick={() => setQuizType(val)}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className={styles.segGroup} style={{ marginTop: '12px' }}>
                    <p className={styles.segLabel}>Difficulty</p>
                    <div className={styles.segBtns}>
                      {(['easy', 'medium', 'hard', 'mixed'] as QuizDifficulty[]).map((val) => (
                        <button
                          key={val}
                          type="button"
                          className={`${styles.segBtn} ${quizDifficulty === val ? styles.segBtnActive : ''}`}
                          aria-pressed={quizDifficulty === val}
                          onClick={() => setQuizDifficulty(val)}
                        >
                          {val.charAt(0).toUpperCase() + val.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.segGroup} style={{ marginTop: '12px' }}>
                    <p className={styles.segLabel}>Questions</p>
                    <div className={styles.countStepper}>
                      <button
                        type="button"
                        className={styles.countBtn}
                        onClick={() => setQuizCount(c => Math.max(1, c - 1))}
                        disabled={quizCount <= 1}
                        aria-label="Decrease question count"
                      >
                        −
                      </button>
                      <span className={styles.countVal} aria-live="polite">{quizCount}</span>
                      <button
                        type="button"
                        className={styles.countBtn}
                        onClick={() => setQuizCount(c => Math.min(maxAvailableQuestions, c + 1))}
                        disabled={quizCount >= maxAvailableQuestions}
                        aria-label="Increase question count"
                      >
                        +
                      </button>
                    </div>
                    {maxAvailableQuestions > 0 && (
                      <span className={styles.maxAvailableNote}>Up to {maxAvailableQuestions} available</span>
                    )}
                  </div>

                  {/* Zero questions note */}
                  {assembleResult && assembleResult.zeroQuestionComponents.length > 0 && (
                    <p className={styles.zeroQuestionsNote} style={{ marginTop: '12px' }}>
                      No questions yet for: {assembleResult.zeroQuestionComponents.map(z => z.title).join(', ')}.
                    </p>
                  )}

                  {bankLoading ? (
                    <p className={styles.assembleMsg} style={{ marginTop: '12px' }}>Loading questions...</p>
                  ) : assembleResult ? (
                    assembleResult.error ? (
                      <p className={`${styles.assembleMsg} ${styles.assembleMsgError}`} style={{ marginTop: '12px' }}>{assembleResult.error}</p>
                    ) : (
                      <p className={`${styles.assembleMsg} ${styles.assembleMsgOk}`} style={{ marginTop: '12px', padding: '12px' }}>
                        {assembleResult.itemIds.length} {assembleResult.itemIds.length === 1 ? 'question' : 'questions'} selected
                      </p>
                    )
                  ) : null}
                </div>
              )}

              <div className={styles.extrasCardFooter}>
                {quizEnabled ? (
                quizAdded ? (
                  // Collapsed summary when added
                  <div className={styles.extrasCardSummary}>
                    <p className={styles.summaryTitle}>
                      Knowledge check · {assembleResult?.itemIds.length ?? quizCount} questions · {quizType === 'mcq' ? 'Multiple choice' : quizType === 'short' ? 'Short answer' : 'Mixed'} · {quizDifficulty.charAt(0).toUpperCase() + quizDifficulty.slice(1)}
                    </p>
                    <div className={styles.summaryActions}>
                      <button type="button" className={styles.editLink} onClick={() => setQuizAdded(false)}>Edit</button>
                      <button type="button" className={styles.removeLink} onClick={() => { setQuizAdded(false); setQuizEnabled(false); setAssembleResult(null); }}>Remove</button>
                    </div>
                  </div>
                ) : (
                  // Expanded with "Add to my picks" primary + Remove
                  <>
                    <div className={styles.extrasCardFooter}>
                      <button
                        type="button"
                        className={styles.addToPicksBtn}
                        onClick={() => setQuizAdded(true)}
                        disabled={!!assembleResult?.error}
                        aria-disabled={!!assembleResult?.error}
                      >
                        Add to my picks
                      </button>
                      <button
                        type="button"
                        className={styles.removeLink}
                        onClick={() => { setQuizEnabled(false); setAssembleResult(null); }}
                      >
                        Remove
                      </button>
                    </div>
                    {assembleResult?.error && (
                      <p className={`${styles.assembleMsg} ${styles.assembleMsgError}`}>Cannot add: {assembleResult.error}</p>
                    )}
                  </>
                )
              ) : (
                <button
                  type="button"
                  className={styles.addPill}
                  onClick={() => setQuizEnabled(true)}
                >
                  Add
                </button>
              )}
              </div>
            </div>

            {/* Lesson plan card */}
            <div className={styles.extrasCard}>
              <div className={styles.extrasCardHead}>
                <div className={styles.extraIcon}>
                  <BookMarked size={20} aria-hidden="true" />
                </div>
                <div>
                  <p className={styles.extraType}>Resources</p>
                  <p className={styles.extraTitle}>Lesson plan</p>
                </div>
              </div>
              <p className={styles.extraDesc}>A structured plan for your seminar session.</p>

              {lessonPlanEnabled && (
                <div className={styles.lessonPlanExpand}>
                  <div className={styles.segGroup}>
                    <p className={styles.segLabel}>Length</p>
                    <div className={styles.segBtns}>
                      {([30, 60, 90, 120] as const).map((val) => (
                        <button
                          key={val}
                          type="button"
                          className={`${styles.segBtn} ${lessonPlanLength === val ? styles.segBtnActive : ''}`}
                          aria-pressed={lessonPlanLength === val}
                          onClick={() => setLessonPlanLength(val)}
                        >
                          {val} min
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.segGroup} style={{ marginTop: '12px' }}>
                    <p className={styles.segLabel}>Level</p>
                    <div className={styles.segBtns}>
                      {(['introductory', 'intermediate', 'advanced'] as LessonLevel[]).map((val) => {
                        const label = val.charAt(0).toUpperCase() + val.slice(1);
                        return (
                          <button
                            key={val}
                            type="button"
                            className={`${styles.segBtn} ${lessonPlanLevel === val ? styles.segBtnActive : ''}`}
                            aria-pressed={lessonPlanLevel === val}
                            onClick={() => setLessonPlanLevel(val)}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {lessonPlanAssembleResult && 'error' in lessonPlanAssembleResult ? (
                    <p className={`${styles.assembleMsg} ${styles.assembleMsgError}`} style={{ marginTop: '12px' }}>{lessonPlanAssembleResult.error}</p>
                  ) : lessonPlanAssembleResult ? (
                    <p className={`${styles.assembleMsg} ${styles.assembleMsgOk}`} style={{ marginTop: '12px', padding: '12px' }}>
                      {lessonPlanAssembleResult.timeline.length} activities · {lessonPlanAssembleResult.length} min · {lessonPlanAssembleResult.level}
                    </p>
                  ) : (
                    <p className={styles.assembleMsg} style={{ marginTop: '12px' }}>Building timeline…</p>
                  )}
                </div>
              )}

              <div className={styles.extrasCardFooter}>
                {lessonPlanEnabled ? (
                  lessonPlanAdded ? (
                    // Collapsed summary when added
                    <div className={styles.extrasCardSummary}>
                      <p className={styles.summaryTitle}>
                        Lesson plan · {lessonPlanLength} min · {lessonPlanLevel.charAt(0).toUpperCase() + lessonPlanLevel.slice(1)}
                      </p>
                      <div className={styles.summaryActions}>
                        <button type="button" className={styles.editLink} onClick={() => setLessonPlanAdded(false)}>Edit</button>
                        <button type="button" className={styles.removeLink} onClick={() => { setLessonPlanAdded(false); setLessonPlanEnabled(false); setLessonPlanAssembleResult(null); }}>Remove</button>
                      </div>
                    </div>
                  ) : (
                    // Expanded with "Add to my picks" primary + Remove
                    <>
                      <div className={styles.extrasCardFooter}>
                        <button
                          type="button"
                          className={styles.addToPicksBtn}
                          onClick={() => setLessonPlanAdded(true)}
                          disabled={!!(lessonPlanAssembleResult && 'error' in lessonPlanAssembleResult)}
                          aria-disabled={!!(lessonPlanAssembleResult && 'error' in lessonPlanAssembleResult)}
                        >
                          Add to my picks
                        </button>
                        <button
                          type="button"
                          className={styles.removeLink}
                          onClick={() => { setLessonPlanEnabled(false); setLessonPlanAssembleResult(null); }}
                        >
                          Remove
                        </button>
                      </div>
                      {lessonPlanAssembleResult && 'error' in lessonPlanAssembleResult && (
                        <p className={`${styles.assembleMsg} ${styles.assembleMsgError}`}>Cannot add: {lessonPlanAssembleResult.error}</p>
                      )}
                    </>
                  )
                ) : (
                  <button
                    type="button"
                    className={styles.addPill}
                    onClick={() => setLessonPlanEnabled(true)}
                  >
                    Add
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* ── Summary bar ── */}
      <SummaryBar
        componentCount={componentCount}
        minutes={minutes}
        canContinue={canContinue}
        onContinue={handleContinue}
      />
    </div>
  );
}