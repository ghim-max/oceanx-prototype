import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getInsights, getRaw, generateInsights } from '../../shared/services/insightsApi';
import { submitTesterDecision } from '../../shared/services/feedbackService';
import { DecisionCard } from '../../team/components/DecisionCard';
import { getComponentThumb, getComponent } from '../../shared/utils/thumbnails';
import { PROJECT } from '../../team/data/projectContext';
import type { RawInsightsResponse } from '../../shared/types/insights';
import styles from './InsightsPage.module.css';

const COMPONENT_ORDER = [
  'game',
  'video-nada',
  'create-activity',
  'video-changi-point',
  'further-reading-unep',
  'learner-organiser',
];

// Answer key (shown only after a tester has saved all 6 decisions, for the debrief).
// Scoring for the report still comes from backend/supabase/007_test_results.sql.
const ANSWER_KEY: Record<string, { answer: 'Reuse' | 'Adapt' | 'Drop'; why: string }> = {
  game: { answer: 'Reuse', why: 'Big learning gain (+50), high learning and engagement, all educators used it.' },
  'video-nada': { answer: 'Reuse', why: 'Big learning gain (+43), rated 4.7, all educators used it.' },
  'create-activity': { answer: 'Adapt', why: 'Strong learning, but too short for the time slot and mostly changed by educators.' },
  'video-changi-point': { answer: 'Adapt', why: 'Learners loved it (engagement 4.7) but learned little (+7). Add a guiding question.' },
  'further-reading-unep': { answer: 'Drop', why: 'Tiny learning gain (+7), mostly skipped, often picked as least useful.' },
  'learner-organiser': { answer: 'Drop', why: 'Skipped by all educators, low fit with course goals.' },
};

const TESTER_SET_X = ['game', 'create-activity', 'learner-organiser'];
const TESTER_SET_Y = ['video-nada', 'video-changi-point', 'further-reading-unep'];

interface TesterAssignment {
  aiComponents: string[];
  rawComponents: string[];
  aiFirst: boolean;
}

const TESTER_ASSIGNMENTS: Record<string, TesterAssignment> = {
  T1: { aiComponents: TESTER_SET_X, rawComponents: TESTER_SET_Y, aiFirst: true },
  T2: { aiComponents: TESTER_SET_Y, rawComponents: TESTER_SET_X, aiFirst: false },
  T3: { aiComponents: TESTER_SET_X, rawComponents: TESTER_SET_Y, aiFirst: false },
};

interface TesterProgress {
  currentIndex: number;
  decisions: Array<{
    component_id: string;
    view: 'ai' | 'raw';
    decision: 'Reuse' | 'Adapt' | 'Drop';
    confidence: number;
    reason: string | undefined;
    seconds_to_decide: number;
    card_recommendation?: string | null;
  }>;
  startTime: number;
  scenarioStartTime: number;
}

function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeLocalStorageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function InsightsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<'ai' | 'raw'>('ai');
  const [insights, setInsights] = useState<any>(null);
  const [rawData, setRawData] = useState<RawInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateErrors, setGenerateErrors] = useState<string[]>([]);
  const [approvalState, setApprovalState] = useState<Record<string, 'approve' | 'reject' | null>>({});

  // Tester mode state
  const testerCode = searchParams.get('tester');
  const isTesterMode = testerCode !== null;
  const testerAssignment = testerCode ? TESTER_ASSIGNMENTS[testerCode] : null;
  const isUnknownTester = isTesterMode && !testerAssignment;
  const [testerPhase, setTesterPhase] = useState<'intro' | 'scenario' | 'end'>('intro');
  const [testerProgress, setTesterProgress] = useState<TesterProgress | null>(null);
  const [savingDecision, setSavingDecision] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [testerDecision, setTesterDecision] = useState<'Reuse' | 'Adapt' | 'Drop' | null>(null);
  const [testerConfidence, setTesterConfidence] = useState<number | null>(null);
  const [testerReason, setTesterReason] = useState('');
  const scenarioStartRef = useRef<number>(Date.now());
  // One-click test start: rotates T1 > T2 > T3 so the counterbalancing stays intact
  const startTestSession = () => {
    const order = ['T1', 'T2', 'T3'];
    const last = safeLocalStorageGet('oxe-last-tester');
    const next = order[(order.indexOf(last ?? '') + 1) % order.length];
    safeLocalStorageSet('oxe-last-tester', next);
    setSearchParams({ tester: next, reset: '1' });
  };

  // Check for reset param
  useEffect(() => {
    if (searchParams.get('reset') === '1') {
      if (isTesterMode) {
        safeLocalStorageRemove(`oxe-tester-${testerCode}`);
        setTesterPhase('intro');
        setTesterProgress(null);
      }
      // Remove only ?reset, keep ?tester so the tester stays in tester mode
      const next = new URLSearchParams(searchParams);
      next.delete('reset');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, isTesterMode, testerCode]);

  // Load tester progress from localStorage
  useEffect(() => {
    if (isTesterMode && testerAssignment && testerPhase === 'intro') {
      const saved = safeLocalStorageGet(`oxe-tester-${testerCode}`);
      if (saved) {
        try {
          const progress = JSON.parse(saved) as TesterProgress;
          setTesterProgress(progress);
          setTesterPhase('scenario');
        } catch {
          safeLocalStorageRemove(`oxe-tester-${testerCode}`);
        }
      }
    }
  }, [isTesterMode, testerCode, testerAssignment, testerPhase]);

  // Build ordered scenario list for tester
  const getTesterScenarios = useCallback(() => {
    if (!testerAssignment) return [];
    const scenarios: Array<{ component_id: string; view: 'ai' | 'raw' }> = [];
    if (testerAssignment.aiFirst) {
      scenarios.push(...testerAssignment.aiComponents.map((id) => ({ component_id: id, view: 'ai' as const })));
      scenarios.push(...testerAssignment.rawComponents.map((id) => ({ component_id: id, view: 'raw' as const })));
    } else {
      scenarios.push(...testerAssignment.rawComponents.map((id) => ({ component_id: id, view: 'raw' as const })));
      scenarios.push(...testerAssignment.aiComponents.map((id) => ({ component_id: id, view: 'ai' as const })));
    }
    return scenarios;
  }, [testerAssignment]);

  const scenarios = getTesterScenarios();
  const currentScenario = testerProgress && scenarios[testerProgress.currentIndex];

  // Reset tester form state when scenario changes
  useEffect(() => {
    if (isTesterMode && testerPhase === 'scenario' && testerProgress) {
      setTesterDecision(null);
      setTesterConfidence(null);
      setTesterReason('');
      scenarioStartRef.current = Date.now();
    }
  }, [isTesterMode, testerPhase, testerProgress?.currentIndex]);

  // Fetch data (normal mode AND tester mode: testers need the cards and raw data)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([getInsights(), getRaw()])
      .then(([insightsData, rawDataData]) => {
        if (!cancelled) {
          setInsights(insightsData);
          setRawData(rawDataData);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('The asset dashboard is not available right now. Make sure the insights service is running.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isTesterMode]);

  // Handle generate insights
  const handleGenerate = async () => {
    setGenerating(true);
    setGenerateErrors([]);

    try {
      const result = await generateInsights();
      if (result.errors && result.errors.length > 0) {
        setGenerateErrors(result.errors);
      }
      // Reload insights
      const [insightsData, rawDataData] = await Promise.all([getInsights(), getRaw()]);
      setInsights(insightsData);
      setRawData(rawDataData);
    } catch {
      // Error handled by generateErrors state
    } finally {
      setGenerating(false);
    }
  };

  // Handle retry
  const handleRetry = () => {
    setError(null);
    setLoading(true);
    Promise.all([getInsights(), getRaw()])
      .then(([insightsData, rawDataData]) => {
        setInsights(insightsData);
        setRawData(rawDataData);
        setLoading(false);
      })
      .catch(() => {
        setError('The asset dashboard is not available right now. Make sure the insights service is running.');
        setLoading(false);
      });
  };

  // Start tester mode
  const handleStartTester = () => {
    const progress: TesterProgress = {
      currentIndex: 0,
      decisions: [],
      startTime: Date.now(),
      scenarioStartTime: Date.now(),
    };
    scenarioStartRef.current = Date.now();
    setTesterProgress(progress);
    setTesterPhase('scenario');
    safeLocalStorageSet(`oxe-tester-${testerCode}`, JSON.stringify(progress));
  };

  // Handle decision form submit
  const handleDecisionSubmit = async (decision: 'Reuse' | 'Adapt' | 'Drop', confidence: number, reason: string | null) => {
    if (!testerProgress || !currentScenario || !testerCode) return;

    setSavingDecision(true);
    setSaveError(null);

    const secondsToDecide = Math.round((Date.now() - scenarioStartRef.current) / 1000);

    const row = {
      tester_code: testerCode,
      component_id: currentScenario.component_id,
      view: currentScenario.view,
      card_recommendation: currentScenario.view === 'ai' 
        ? insights?.cards.find((c: any) => c.component_id === currentScenario.component_id)?.recommendation || null
        : null,
      decision,
      confidence,
      reason: reason?.trim() || undefined,
      seconds_to_decide: secondsToDecide,
      position: testerProgress.currentIndex + 1,
    };

    const result = await submitTesterDecision(row);

    if (result.ok) {
      const updatedProgress: TesterProgress = {
        ...testerProgress,
        currentIndex: testerProgress.currentIndex + 1,
        decisions: [
          ...testerProgress.decisions,
          {
            component_id: currentScenario.component_id,
            view: currentScenario.view,
            decision,
            confidence,
            reason: reason?.trim() || undefined,
            seconds_to_decide: secondsToDecide,
            card_recommendation: row.card_recommendation,
          },
        ],
        startTime: testerProgress.startTime,
        scenarioStartTime: Date.now(),
      };
      scenarioStartRef.current = Date.now();
      setTesterProgress(updatedProgress);
      safeLocalStorageSet(`oxe-tester-${testerCode}`, JSON.stringify(updatedProgress));

      if (updatedProgress.currentIndex >= scenarios.length) {
        setTesterPhase('end');
        safeLocalStorageRemove(`oxe-tester-${testerCode}`);
      }
    } else {
      setSaveError(result.error || 'Could not save. Please try again.');
    }
    setSavingDecision(false);
  };

  // Retry save - re-attempt the last save with same values
  const handleRetrySave = () => {
    if (!testerProgress || !currentScenario) return;
    setSaveError(null);
    // Re-trigger save with current form values
    if (testerDecision && testerConfidence !== null) {
      handleDecisionSubmit(testerDecision, testerConfidence, testerReason.trim() || null);
    }
  };

  // Render normal mode
  const renderNormalMode = () => {
    if (loading) {
      return (
        <div className={styles.loading}>
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.errorState} role="alert">
          <p>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={handleRetry}>
            Retry
          </button>
        </div>
      );
    }

    if (!insights || !insights.cards || insights.cards.length === 0) {
      return (
        <div className={styles.emptyState}>
          <p>No recommendations yet.</p>
          <button
            type="button"
            className={styles.generateBtn}
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Generating... (1 to 3 minutes)' : 'Generate recommendations'}
          </button>
        </div>
      );
    }

    const cards = [...insights.cards].sort((a: any, b: any) => 
      COMPONENT_ORDER.indexOf(a.component_id) - COMPONENT_ORDER.indexOf(b.component_id)
    );

    const session = insights.session || {};
    const newestGeneratedAt = cards.length > 0 
      ? cards.reduce((latest: string, c: any) => c.generated_at > latest ? c.generated_at : latest, cards[0].generated_at)
      : null;

    const gainsWithValue = cards.filter((c: any) => c.metrics.gain_pts !== null);
    const avgGain = gainsWithValue.length > 0
      ? Math.round(gainsWithValue.reduce((sum: number, c: any) => sum + (c.metrics.gain_pts || 0), 0) / gainsWithValue.length)
      : null;

    const maxEducatorCount = cards.length > 0
      ? Math.max(...cards.map((c: any) => c.metrics.educator_count || 0))
      : 0;

    const reuseCount = cards.filter((c: any) => c.recommendation === 'Reuse').length;
    const adaptCount = cards.filter((c: any) => c.recommendation === 'Adapt').length;
    const dropCount = cards.filter((c: any) => c.recommendation === 'Drop').length;

    // Generate button is always shown on the dashboard (tester mode has its own view without it).
    const isAdmin = true;

    // Headline stats
    const learnersCompleted = session.completed ?? 0;
    const confidenceAfter = session.confidence_after !== null ? session.confidence_after.toFixed(1) : 'n/a';
    const confidenceBefore = session.confidence_before !== null ? session.confidence_before.toFixed(1) : 'n/a';
    const wouldRecommendPct = session.would_recommend_pct !== null ? Math.round(session.would_recommend_pct) : 0;

    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.h1}>Asset dashboard</h1>
            <p className={styles.projectLine}>
              {PROJECT.story} · {PROJECT.owner}, {PROJECT.programme}
            </p>
            <p className={styles.metaLine}>
                          Last updated {newestGeneratedAt ? formatDateTime(newestGeneratedAt) : 'n/a'} &middot;{' '}
                          {session.completed ?? 0} learners &middot; {maxEducatorCount} educators
                        </p>
          </div>
          {isAdmin && (
            <div className={styles.headerRight}>
              <div className={styles.headerButtons}>
                <div className={styles.testStart}>
                  <div className={styles.testBubble} role="note">
                    <ul>
                      <li>Test how confident you are in deciding what to reuse, adapt or drop.</li>
                      <li>Don't cheat. It's not about right or wrong, but whether AI helps drive better decisions.</li>
                    </ul>
                  </div>
                  <button type="button" className={styles.testMenuBtn} onClick={startTestSession}>
                    Start test session
                  </button>
                </div>
                <button
                  type="button"
                  className={styles.generateBtn}
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? 'Generating... (1 to 3 minutes)' : 'Generate recommendations'}
                </button>
              </div>
              {generateErrors.length > 0 && (
                <ul className={styles.generateErrors} role="alert" aria-live="polite">
                  {generateErrors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}
        </header>

        {/* Headline stats strip */}
        <section className={styles.statsStrip} aria-label="Headline metrics">
          <div className={styles.statColumn}>
            <div className={styles.statColumnInner}>
              <div className={styles.statLabelRow}>
                <span className={styles.accentSquare} aria-hidden="true" />
                <span className={styles.statLabelText}>LEARNERS COMPLETED</span>
              </div>
              <div className={styles.statNumberRow}>
                <span className={styles.statBigNumber}>{learnersCompleted}</span>
              </div>
            </div>
            <p className={styles.statSentence}>university learners finished the after-class quiz and feedback</p>
          </div>
          <div className={styles.statColumn}>
            <div className={styles.statColumnInner}>
              <div className={styles.statLabelRow}>
                <span className={styles.accentSquare} aria-hidden="true" />
                <span className={styles.statLabelText}>AVG LEARNING GAIN</span>
              </div>
              <div className={styles.statNumberRow}>
                <span className={styles.statBigNumber}>{avgGain !== null ? `${avgGain}` : 'n/a'}</span>
                <span className={styles.statSuffix}>pts</span>
              </div>
            </div>
            <p className={styles.statSentence}>more learners answered correctly after class (percentage points)</p>
          </div>
          <div className={styles.statColumn}>
            <div className={styles.statColumnInner}>
              <div className={styles.statLabelRow}>
                <span className={styles.accentSquare} aria-hidden="true" />
                <span className={styles.statLabelText}>CONFIDENCE AFTER CLASS</span>
              </div>
              <div className={styles.statNumberRow}>
                <span className={styles.statBigNumber}>{confidenceAfter}</span>
                <span className={styles.statSuffix}>/5</span>
              </div>
            </div>
            <p className={styles.statSentence}>up from {confidenceBefore} before class</p>
          </div>
          <div className={styles.statColumn}>
            <div className={styles.statColumnInner}>
              <div className={styles.statLabelRow}>
                <span className={styles.accentSquare} aria-hidden="true" />
                <span className={styles.statLabelText}>WOULD RECOMMEND</span>
              </div>
              <div className={styles.statNumberRow}>
                <span className={styles.statBigNumber}>{wouldRecommendPct}</span>
                <span className={styles.statSuffix}>%</span>
              </div>
            </div>
            <p className={styles.statSentence}>of learners would recommend the session</p>
          </div>
        </section>

        {/* Secondary line */}
        <p className={styles.secondaryLine}>
          {session.dropped_off ?? 0} of {session.prechecks ?? 0} dropped off after the pre-check &middot;{' '}
          {session.did_pre_reading ?? 0} of {session.completed ?? 0} did the pre-reading &middot;
          Satisfaction {session.satisfaction !== null ? session.satisfaction.toFixed(1) : 'n/a'}/5
        </p>

        {/* Decision summary */}
        <section className={styles.summaryRow} aria-label="Recommendation summary">
          <span className={styles.summaryLabel}>Summary:</span>
          <div className={styles.summaryPills}>
            {reuseCount > 0 && (
              <span className={styles.summaryPill} style={{ background: '#DDF3E4', color: '#1A7A40' }}>
                {reuseCount} Reuse
              </span>
            )}
            {adaptCount > 0 && (
              <span className={styles.summaryPill} style={{ background: '#FBEBC8', color: '#8B5A00' }}>
                {adaptCount} Adapt
              </span>
            )}
            {dropCount > 0 && (
              <span className={styles.summaryPill} style={{ background: '#F6DADA', color: '#8B2020' }}>
                {dropCount} Drop
              </span>
            )}
          </div>
        </section>

        {/* View switch */}
        <div className={styles.viewSwitch} role="tablist" aria-label="View mode">
          <button
            role="tab"
            aria-selected={view === 'ai'}
            className={`${styles.viewTab} ${view === 'ai' ? styles.viewTabActive : ''}`}
            onClick={() => setView('ai')}
          >
            AI recommendations
          </button>
          <button
            role="tab"
            aria-selected={view === 'raw'}
            className={`${styles.viewTab} ${view === 'raw' ? styles.viewTabActive : ''}`}
            onClick={() => setView('raw')}
          >
            Raw data
          </button>
        </div>

        {view === 'ai' && (
          <section className={styles.aiCardsList} aria-label="AI recommendations">
            {cards.map((card: any) => (
              <DecisionCard
                key={card.component_id}
                card={card}
                showActions={true}
                approvalState={approvalState[card.component_id]}
                onApprovalChange={(state) => setApprovalState(prev => ({ ...prev, [card.component_id]: state }))}
              />
            ))}
          </section>
        )}

        {view === 'raw' && rawData && (
          <section className={styles.rawDataSection} aria-label="Raw data">
            <div className={styles.tableWrapper}>
              <table className={styles.rawTable}>
                              <thead>
                                <tr>
                                  <th></th>
                                  <th>Component</th>
                                  <th>Correct before</th>
                                  <th>Correct after</th>
                                  <th>Gain</th>
                                  <th>Learning</th>
                                  <th>Engagement</th>
                                  <th>Used as is</th>
                                  <th>Changed</th>
                                  <th>Skipped</th>
                                  <th>Time about right</th>
                                  <th>Time too long</th>
                                  <th>Time too short</th>
                                  <th>Curriculum fit</th>
                                  <th>Adaptation helped</th>
                                  <th>Helped most</th>
                                  <th>Least useful</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rawData.component_metrics.map((m: any) => {
                                  const card = cards.find((c: any) => c.component_id === m.component_id);
                                  const thumb = getComponentThumb(m.component_id);
                                  return (
                                    <tr key={m.component_id}>
                                      <td className={styles.rawThumbCell}>
                                        {thumb ? (
                                          <img
                                            src={thumb.src}
                                            alt={thumb.alt}
                                            className={styles.rawThumbImg}
                                            loading="lazy"
                                          />
                                        ) : (
                                          <div className={styles.rawThumbPlaceholder} />
                                        )}
                                      </td>
                                      <td className={styles.componentCell}>{card?.title || m.component_id}</td>
                                      <td>{m.pre_pct !== null ? `${m.pre_pct}%` : 'n/a'}</td>
                                      <td>{m.post_pct !== null ? `${m.post_pct}%` : 'n/a'}</td>
                                      <td>{m.gain_pts !== null ? `+${m.gain_pts}` : 'n/a'}</td>
                                      <td>{m.learning !== null ? `${m.learning} / 5` : 'n/a'}</td>
                                      <td>{m.engagement !== null ? `${m.engagement} / 5` : 'n/a'}</td>
                                      <td>{m.used_as_is}</td>
                                      <td>{m.changed}</td>
                                      <td>{m.skipped}</td>
                                      <td>{m.time_right}</td>
                                      <td>{m.time_too_long}</td>
                                      <td>{m.time_too_short}</td>
                                      <td>{m.curriculum_fit !== null ? `${m.curriculum_fit} / 5` : 'n/a'}</td>
                                      <td>{m.adaptation_helped !== null ? `${m.adaptation_helped} / 5` : 'n/a'}</td>
                                      <td>{m.helped_most}</td>
                                      <td>{m.least_useful}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
            </div>

            {/* Educator notes */}
            <div className={styles.rawNotesSection}>
              <h3 className={styles.rawSectionHeading}>Educator notes</h3>
              {Object.entries(rawData.educator_notes_by_component).map(([componentId, notes]: [string, Array<{id: string; note: string; usage: 'kept' | 'changed' | 'skipped'; is_sample: boolean}>]) => {
                const card = cards.find((c: any) => c.component_id === componentId);
                if (!notes || notes.length === 0) return null;
                return (
                  <div key={componentId} className={styles.notesGroup}>
                    <h4 className={styles.notesGroupTitle}>{card?.title || componentId}</h4>
                    <ul className={styles.notesList}>
                      {notes.map((note: any) => (
                        <li key={note.id} className={styles.noteItem}>
                          <p className={styles.noteText}>{note.note}</p>
                          <span className={styles.noteUsage}>({note.usage})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* All learner comments */}
            <div className={styles.rawNotesSection}>
              <h3 className={styles.rawSectionHeading}>All learner comments</h3>
              <ul className={styles.notesList}>
                {rawData.learner_comments.map((lc: any) => {
                  if (lc.comment) {
                    return (
                      <li key={lc.id} className={styles.noteItem}>
                        <p className={styles.noteText}>{lc.comment}</p>
                      </li>
                    );
                  }
                  if (lc.short_answer) {
                    return (
                      <li key={lc.id} className={styles.noteItem}>
                        <p className={styles.noteText}>{lc.short_answer}</p>
                        <span className={styles.noteUsage}>(Short answer)</span>
                      </li>
                    );
                  }
                  return null;
                })}
              </ul>
            </div>
          </section>
        )}
      </div>
    );
  };

  // Render tester mode
  const renderAnswers = () => {
    const decisions = testerProgress?.decisions ?? [];
    if (decisions.length === 0) {
      return <p className={styles.testerEndText}>Answers are not available for this session (the page was reloaded after finishing).</p>;
    }
    const rows = decisions.map((d, i) => {
      const key = ANSWER_KEY[d.component_id];
      const correct = key ? d.decision === key.answer : false;
      const plantedWrong = d.view === 'ai' && !!d.card_recommendation && !!key && d.card_recommendation !== key.answer;
      return { ...d, i, key, correct, plantedWrong, title: getComponent(d.component_id)?.title ?? d.component_id };
    });
    const ai = rows.filter((r) => r.view === 'ai');
    const raw = rows.filter((r) => r.view === 'raw');
    return (
      <section className={styles.answers} aria-label="Answers">
        <p className={styles.answersSummary}>
          AI cards: <strong>{ai.filter((r) => r.correct).length} of {ai.length}</strong> correct
          {' · '}
          Raw data: <strong>{raw.filter((r) => r.correct).length} of {raw.length}</strong> correct
        </p>
        <div className={styles.answersTableWrap}>
          <table className={styles.answersTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>Content</th>
                <th>View</th>
                <th>Your answer</th>
                <th>Confidence</th>
                <th>Correct answer</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.component_id}>
                  <td>{r.i + 1}</td>
                  <td>{r.title}</td>
                  <td>{r.view === 'ai' ? 'AI card' : 'Raw data'}</td>
                  <td>{r.decision}</td>
                  <td>{r.confidence} / 5</td>
                  <td>
                    <strong>{r.key?.answer ?? 'n/a'}</strong>
                    {r.key && <span className={styles.answerWhy}>{r.key.why}</span>}
                    {r.plantedWrong && (
                      <span className={styles.answerFlag}>
                        This AI card was deliberately wrong (it showed {r.card_recommendation}).
                      </span>
                    )}
                  </td>
                  <td className={r.correct ? styles.answerCorrect : styles.answerWrong}>
                    {r.correct ? 'Correct' : 'Different'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  const renderTesterMode = () => {
    if (isUnknownTester) {
      return (
        <div className={`${styles.testerContainer} ${styles.testerIntro}`}>
          <h1 className={styles.h1}>Content decisions</h1>
          <p className={styles.testerError}>Unknown tester code</p>
        </div>
      );
    }

    if (!testerAssignment) {
      return (
        <div className={`${styles.testerContainer} ${styles.testerIntro}`}>
          <h1 className={styles.h1}>Content decisions</h1>
          <p className={styles.testerError}>Invalid tester assignment</p>
        </div>
      );
    }

    if (testerPhase === 'intro') {
      return (
        <div className={`${styles.testerContainer} ${styles.testerIntro}`}>
          <h1 className={styles.h1}>Content decisions</h1>
          <p className={styles.testerIntroText}>
            We hope you now understand how this website works and what it is for.
          </p>

          <h2 className={styles.introH2}>The three decisions</h2>
          <dl className={styles.introTerms}>
            <div>
              <dt>Reuse</dt>
              <dd>The content works as it is. Learners improve after using it and educators keep it. OceanX keeps it in the next package unchanged.</dd>
            </div>
            <div>
              <dt>Adapt</dt>
              <dd>The content has value, but something gets in the way, such as timing, an unclear message or a poor fit with the seminar. OceanX keeps it with a specific change.</dd>
            </div>
            <div>
              <dt>Drop</dt>
              <dd>The content is not helping. Learners do not improve or educators skip it. OceanX removes it and frees up seminar time.</dd>
            </div>
          </dl>

          <h2 className={styles.introH2}>How this helps OceanX</h2>
          <ul className={styles.introList}>
            <li>Design time goes to content that needs work, not content that already works.</li>
            <li>Decisions are based on what learners and educators actually said and scored, not gut feel.</li>
            <li>Each new package gets better than the last one.</li>
          </ul>

          <h2 className={styles.introH2}>What you will do</h2>
          <p className={styles.testerIntroText}>
            You will see 6 pieces of Seagrass Stories content used in university seminars.
            For each one, decide whether OceanX should Reuse, Adapt or Drop it, and how confident you are.
            Take as long as you need.
          </p>
          <button type="button" className={styles.startBtn} onClick={handleStartTester}>
            Start
          </button>
        </div>
      );
    }

    if (testerPhase === 'end') {
      return (
        <div className={`${styles.testerContainer} ${styles.testerIntro}`}>
          <h1 className={styles.h1}>Content decisions</h1>
          <p className={styles.testerEndText}>Thank you. Your decisions are saved.</p>
          {!showAnswers ? (
            <button type="button" className={styles.startBtn} onClick={() => setShowAnswers(true)}>
              View answers
            </button>
          ) : (
            renderAnswers()
          )}
        </div>
      );
    }

    if (testerPhase === 'scenario' && currentScenario && testerProgress) {
      const card = insights?.cards.find((c: any) => c.component_id === currentScenario.component_id);
      const rawMetric = rawData?.component_metrics.find((m: any) => m.component_id === currentScenario.component_id);
      const rawNotes = rawData?.educator_notes_by_component[currentScenario.component_id] || [];
      const allLearnerComments = rawData?.learner_comments || [];
      const thumb = getComponentThumb(currentScenario.component_id);

      const progressPercent = ((testerProgress.currentIndex + 1) / scenarios.length) * 100;

      const handleSubmit = () => {
        if (testerDecision && testerConfidence !== null) {
          handleDecisionSubmit(testerDecision, testerConfidence, testerReason.trim() || null);
        }
      };

      return (
        <div className={styles.testerLayout}>
          <div className={styles.testerMain}>
            <header className={styles.testerHeader}>
              <h1 className={styles.h1}>Asset dashboard</h1>
              <p className={styles.projectLine}>
                {PROJECT.story} · {PROJECT.owner}, {PROJECT.programme}
              </p>
            </header>
              <p className={styles.testerContext}>You manage Seagrass Stories for universities.</p>

              {loading && <p className={styles.testerContext}>Loading content...</p>}
              {!loading && error && (
                <p className={styles.testerContext} role="alert">
                  Content could not be loaded. Make sure the insights service is running, then refresh.
                </p>
              )}

              {currentScenario.view === 'ai' && card && (
                <DecisionCard
                  card={card}
                  showActions={false}
                />
              )}

              {currentScenario.view === 'raw' && rawMetric && (
                <div className={styles.testerRawCard}>
                  {/* Thumbnail */}
                  <div className={styles.rawComponentThumb}>
                    {thumb ? (
                      <img
                        src={thumb.src}
                        alt={thumb.alt}
                        className={styles.rawComponentThumbImg}
                        loading="lazy"
                      />
                    ) : (
                      <div className={styles.rawComponentThumbPlaceholder} />
                    )}
                  </div>
                  <h3 className={styles.cardTitle}>{card?.title || rawMetric.component_id}</h3>
                  <dl className={styles.rawFields}>
                    <div><dt>Correct before</dt><dd>{rawMetric.pre_pct !== null ? `${rawMetric.pre_pct}%` : 'n/a'}</dd></div>
                    <div><dt>Correct after</dt><dd>{rawMetric.post_pct !== null ? `${rawMetric.post_pct}%` : 'n/a'}</dd></div>
                    <div><dt>Gain</dt><dd>{rawMetric.gain_pts !== null ? `+${rawMetric.gain_pts}` : 'n/a'}</dd></div>
                    <div><dt>Learning</dt><dd>{rawMetric.learning !== null ? `${rawMetric.learning} / 5` : 'n/a'}</dd></div>
                    <div><dt>Engagement</dt><dd>{rawMetric.engagement !== null ? `${rawMetric.engagement} / 5` : 'n/a'}</dd></div>
                    <div><dt>Used as is</dt><dd>{rawMetric.used_as_is}</dd></div>
                    <div><dt>Changed</dt><dd>{rawMetric.changed}</dd></div>
                    <div><dt>Skipped</dt><dd>{rawMetric.skipped}</dd></div>
                    <div><dt>Time about right</dt><dd>{rawMetric.time_right}</dd></div>
                    <div><dt>Time too long</dt><dd>{rawMetric.time_too_long}</dd></div>
                    <div><dt>Time too short</dt><dd>{rawMetric.time_too_short}</dd></div>
                    <div><dt>Curriculum fit</dt><dd>{rawMetric.curriculum_fit !== null ? `${rawMetric.curriculum_fit} / 5` : 'n/a'}</dd></div>
                    <div><dt>Adaptation helped</dt><dd>{rawMetric.adaptation_helped !== null ? `${rawMetric.adaptation_helped} / 5` : 'n/a'}</dd></div>
                    <div><dt>Helped most</dt><dd>{rawMetric.helped_most}</dd></div>
                    <div><dt>Least useful</dt><dd>{rawMetric.least_useful}</dd></div>
                  </dl>

                  {rawNotes.length > 0 && (
                    <div className={styles.rawNotesSection}>
                      <h4 className={styles.sectionLabel}>Educator notes</h4>
                      <ul className={styles.notesList}>
                        {rawNotes.map((note: any) => (
                          <li key={note.id} className={styles.noteItem}>
                            <p className={styles.noteText}>{note.note}</p>
                            <span className={styles.noteUsage}>({note.usage})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {allLearnerComments.length > 0 && (
                    <div className={styles.rawNotesSection}>
                      <h4 className={styles.sectionLabel}>All learner comments</h4>
                      <ul className={styles.notesList}>
                        {allLearnerComments.map((lc: any) => {
                          if (lc.comment) {
                            return (
                              <li key={lc.id} className={styles.noteItem}>
                                <p className={styles.noteText}>{lc.comment}</p>
                              </li>
                            );
                          }
                          if (lc.short_answer) {
                            return (
                              <li key={lc.id} className={styles.noteItem}>
                                <p className={styles.noteText}>{lc.short_answer}</p>
                                <span className={styles.noteUsage}>(Short answer)</span>
                              </li>
                            );
                          }
                          return null;
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}

          </div>
          <aside className={styles.testerPanel} aria-label="Your decision">
              <div className={styles.testerProgress} role="progressbar" aria-valuenow={testerProgress.currentIndex + 1} aria-valuemin={1} aria-valuemax={scenarios.length}>
                <div className={styles.testerProgressFill} style={{ width: `${progressPercent}%` }} />
              </div>
              <p className={styles.testerProgressText}>Scenario {testerProgress.currentIndex + 1} of {scenarios.length}</p>

              <fieldset className={styles.decisionForm}>
                <legend className={styles.decisionLegend}>What should OceanX do with this content?</legend>
                <div className={styles.pillGroup} role="radiogroup" aria-label="Decision">
                  {['Reuse', 'Adapt', 'Drop'].map((opt) => (
                    <label key={opt} className={`${styles.pillLabel} ${testerDecision === opt ? styles.pillSelected : ''}`}>
                      <input
                        type="radio"
                        name="decision"
                        value={opt}
                        checked={testerDecision === opt}
                        onChange={() => setTesterDecision(opt as 'Reuse' | 'Adapt' | 'Drop')}
                        className={styles.pillInput}
                      />
                      <span className={styles.pillText}>{opt}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className={styles.decisionForm}>
                <legend className={styles.decisionLegend}>How confident are you?</legend>
                <div className={styles.confidenceScale} aria-hidden="true">
                  <span>1 = Not at all</span>
                  <span>5 = Very confident</span>
                </div>
                <div className={styles.pillGroup} role="radiogroup" aria-label="Confidence">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} className={`${styles.pillLabel} ${testerConfidence === n ? styles.pillSelected : ''}`}>
                      <input
                        type="radio"
                        name="confidence"
                        value={n}
                        checked={testerConfidence === n}
                        onChange={() => setTesterConfidence(n)}
                        className={styles.pillInput}
                      />
                      <span className={styles.pillText}>{n}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className={styles.decisionForm}>
                <legend className={styles.decisionLegend}>In one line, why?</legend>
                <textarea
                  className={styles.reasonInput}
                  value={testerReason}
                  onChange={(e) => setTesterReason(e.target.value.slice(0, 500))}
                  maxLength={500}
                  rows={2}
                  placeholder="Optional"
                />
                <div className={styles.charCounter}>{testerReason.length}/500</div>
              </fieldset>

              {saveError && (
                <div className={styles.saveError} role="alert" aria-live="polite">
                  <p>{saveError}</p>
                  <button type="button" className={styles.retryBtn} onClick={handleRetrySave}>
                    Try again
                  </button>
                </div>
              )}

              <button
                type="button"
                className={styles.submitDecisionBtn}
                onClick={handleSubmit}
                disabled={!testerDecision || testerConfidence === null || savingDecision}
              >
                {savingDecision ? 'Saving...' : 'Save and continue'}
              </button>
          </aside>
        </div>
      );
    }

    return null;
  };

  return (
    <article className={styles.page}>
      <div className={styles.container}>
        {isTesterMode ? renderTesterMode() : renderNormalMode()}
      </div>
    </article>
  );
}