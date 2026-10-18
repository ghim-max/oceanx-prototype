import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Play, Gamepad2, MessageCircle, Pencil, BookOpen, BookMarked, ListChecks } from 'lucide-react';
import { getApprovedBankItems, type BankItem } from '../../shared/services/bankApi';
import { assembleQuiz, type QuizType, type QuizDifficulty, type AssembleResult } from '../../shared/services/assembleQuiz';
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
  const allPickIds = [...picks, ...Array.from(addedRecs)];
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

  // Summary bar values
  const componentCount = allPickIds.length;
  const minutes = approxMinutes(allPickIds);

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
    sessionStorage.setItem(
      'adaptOptions',
      JSON.stringify({
        quizEnabled: quizItemIds.length > 0,
        quizType,
        quizDifficulty,
        quizCount,
        itemIds: quizItemIds,
        componentIds: allPickIds,
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

        {/* ── Section 3: Need more materials? ── */}
        <section className={styles.section} aria-labelledby="extras-heading">
          <h2 className={styles.h2} id="extras-heading">
            Need more materials?
            <span className={styles.optionalBadge}>Optional</span>
          </h2>
          <p className={styles.extrasSubline}>Add a knowledge check or lesson plan to your package.</p>

          <div className={styles.extrasGrid}>
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
              <p className={styles.extraDesc}>Questions drawn from the approved question bank, one per activity.</p>

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

                  <div className={styles.segGroup}>
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

                  <div className={styles.segGroup}>
                    <p className={styles.segLabel}>Questions</p>
                    <div className={styles.countStepper}>
                      <button
                        type="button"
                        className={styles.countBtn}
                        onClick={() => setQuizCount(c => Math.max(3, c - 1))}
                        disabled={quizCount <= 3}
                        aria-label="Decrease question count"
                      >
                        −
                      </button>
                      <span className={styles.countVal} aria-live="polite">{quizCount}</span>
                      <button
                        type="button"
                        className={styles.countBtn}
                        onClick={() => setQuizCount(c => Math.min(10, c + 1))}
                        disabled={quizCount >= 10}
                        aria-label="Increase question count"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {bankLoading ? (
                    <p className={styles.assembleMsg}>Loading questions...</p>
                  ) : assembleResult ? (
                    assembleResult.error ? (
                      <p className={`${styles.assembleMsg} ${styles.assembleMsgError}`}>{assembleResult.error}</p>
                    ) : (
                      <p className={`${styles.assembleMsg} ${styles.assembleMsgOk}`}>
                        {assembleResult.itemIds.length} {assembleResult.itemIds.length === 1 ? 'question' : 'questions'} selected
                      </p>
                    )
                  ) : null}
                </div>
              )}

              <div className={styles.extrasCardFooter}>
                {quizEnabled ? (
                  <button
                    type="button"
                    className={styles.removeLink}
                    onClick={() => { setQuizEnabled(false); setAssembleResult(null); }}
                  >
                    Remove
                  </button>
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
            <div className={`${styles.extrasCard} ${styles.extrasCardDimmed}`}>
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
              <div className={styles.extrasCardFooter}>
                <span className={styles.comingSoonBadge}>Coming soon</span>
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