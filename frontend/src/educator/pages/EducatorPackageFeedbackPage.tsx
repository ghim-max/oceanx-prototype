import { useState, useEffect } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { SEAGRASS_STORIES } from '../../shared/data/seagrass-stories';
import { getUniversityStatus } from '../../shared/data/quizComponentMap';
import {
  submitEducatorPackageFeedback,
  type EducatorPackageFeedbackRowInsert,
} from '../../shared/services/feedbackService';
import { isSupabaseConfigured } from '../../shared/services/supabase';
import styles from './EducatorPackageFeedbackPage.module.css';

const SUBMITTED_KEY = 'oxe-educator-submitted-package-';

type UsageChoice = 'kept' | 'changed' | 'skipped';

type ComponentAnswer = {
  usage: UsageChoice;
  rating?: number;
  engagement?: number;
  time_fit?: 'right' | 'too_long' | 'too_short';
  curriculum_fit?: number;
  adaptation_helped?: number;
  note: string;
};

type Answers = Record<string, ComponentAnswer>;

const FIXED_USAGE_OPTIONS: { value: UsageChoice; label: string }[] = [
  { value: 'kept', label: 'Used it' },
  { value: 'skipped', label: 'Skipped it' },
];

const ADAPTED_USAGE_OPTIONS: { value: UsageChoice; label: string }[] = [
  { value: 'kept', label: 'Used as is' },
  { value: 'changed', label: 'Changed it' },
  { value: 'skipped', label: 'Skipped it' },
];

const getComponentMeta = (componentId: string): string => {
  const component = SEAGRASS_STORIES.components.find((c) => c.id === componentId);
  if (!component) return '';
  const parts: string[] = [component.stage, component.type];
  if (component.duration) parts.push(component.duration);
  return Array.from(new Set(parts)).join(' · ');
};

const getPlaceholder = (usage: UsageChoice): string => {
  switch (usage) {
    case 'changed':
      return 'What did you change, and why?';
    case 'skipped':
      return 'Why did you skip it?';
    default:
      return 'Optional note';
  }
};

const getUsageOptions = (componentId: string) => {
  const status = getUniversityStatus(componentId);
  return status === 'Adapted' ? ADAPTED_USAGE_OPTIONS : FIXED_USAGE_OPTIONS;
};

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

interface PackageData {
  slug: string;
  audience: string;
  picks: { id: string; title: string; status: string; stage: string }[];
  recommendations: { id: string; title: string; stage: string }[];
  quiz_title?: string;
  lesson_plan_title?: string;
  lesson_plan_url?: string;
}

export function EducatorPackageFeedbackPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { slug: slugParam } = useParams<{ slug: string }>();
  const slug = slugParam ?? searchParams.get('slug') ?? '';

  const [step, setStep] = useState<'form' | 'success'>('form');
  const [answers, setAnswers] = useState<Answers>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pkg, setPkg] = useState<PackageData | null>(null);
  const [loading, setLoading] = useState(true);

  // Load package data
  useEffect(() => {
    if (slug) {
      fetch(`/api/packages/${slug}`)
        .then((res) => {
          if (!res.ok) throw new Error('Package not found');
          return res.json();
        })
        .then((data) => {
          setPkg(data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (searchParams.get('reset') === '1') {
      safeLocalStorageRemove(`${SUBMITTED_KEY}${slug}`);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, slug]);

  useEffect(() => {
    if (loading) return;
    const submittedFlag = safeLocalStorageGet(`${SUBMITTED_KEY}${slug}`) === '1';
    if (submittedFlag) {
      setStep('success');
    }
  }, [slug, loading]);

  const handleUsageChange = (componentId: string, usage: UsageChoice) => {
    const current = answers[componentId] || { usage: 'kept' as UsageChoice, note: '' };
    const updated: ComponentAnswer = {
      ...current,
      usage,
      note: current.note,
      curriculum_fit: current.curriculum_fit,
    };
    if (usage === 'skipped') {
      updated.rating = undefined;
      updated.engagement = undefined;
      updated.time_fit = undefined;
      updated.adaptation_helped = undefined;
    }
    setAnswers((prev) => ({ ...prev, [componentId]: updated }));
    setError(null);
  };

  const handleRatingChange = (componentId: string, rating: number) => {
    setAnswers((prev) => ({
      ...prev,
      [componentId]: { ...prev[componentId], rating },
    }));
    setError(null);
  };

  const handleEngagementChange = (componentId: string, engagement: number) => {
    setAnswers((prev) => ({
      ...prev,
      [componentId]: { ...prev[componentId], engagement },
    }));
    setError(null);
  };

  const handleTimeFitChange = (componentId: string, time_fit: 'right' | 'too_long' | 'too_short') => {
    setAnswers((prev) => ({
      ...prev,
      [componentId]: { ...prev[componentId], time_fit },
    }));
    setError(null);
  };

  const handleCurriculumFitChange = (componentId: string, curriculum_fit: number) => {
    setAnswers((prev) => ({
      ...prev,
      [componentId]: { ...prev[componentId], curriculum_fit },
    }));
    setError(null);
  };

  const handleAdaptationHelpedChange = (componentId: string, adaptation_helped: number) => {
    setAnswers((prev) => ({
      ...prev,
      [componentId]: { ...prev[componentId], adaptation_helped },
    }));
    setError(null);
  };

  const handleNoteChange = (componentId: string, note: string) => {
    setAnswers((prev) => ({
      ...prev,
      [componentId]: { ...prev[componentId], note: note.slice(0, 1000) },
    }));
  };

  const isCardComplete = (componentId: string): boolean => {
    const answer = answers[componentId];
    if (!answer) return false;
    if (!answer.usage) return false;
    if (!answer.curriculum_fit) return false;
    if (answer.usage !== 'skipped') {
      if (answer.rating === undefined) return false;
      if (answer.engagement === undefined) return false;
      if (!answer.time_fit) return false;
      const status = getUniversityStatus(componentId);
      if (status === 'Adapted' && answer.adaptation_helped === undefined) return false;
    }
    return true;
  };

  const pickedComponentIds = pkg?.picks.map((p) => p.id) ?? [];

  const isFormComplete = (): boolean => {
    return pickedComponentIds.every((compId) => isCardComplete(compId));
  };

  const answeredCount = pickedComponentIds.filter((compId) => isCardComplete(compId)).length;

  const handleSubmit = async () => {
    if (!isFormComplete()) return;
    if (!isSupabaseConfigured) {
      setError('Saving is not available right now.');
      return;
    }

    setSending(true);
    setError(null);

    const rows: EducatorPackageFeedbackRowInsert[] = pickedComponentIds.map((compId) => {
      const answer = answers[compId];
      return {
        component_id: compId,
        usage: answer.usage,
        rating: answer.usage !== 'skipped' ? answer.rating : undefined,
        engagement: answer.usage !== 'skipped' ? answer.engagement : undefined,
        time_fit: answer.usage !== 'skipped' ? answer.time_fit : undefined,
        curriculum_fit: answer.curriculum_fit,
        adaptation_helped:
          answer.usage !== 'skipped' && getUniversityStatus(compId) === 'Adapted'
            ? answer.adaptation_helped
            : undefined,
        note: answer.note.trim() || undefined,
        is_sample: false,
      };
    });

    const result = await submitEducatorPackageFeedback(slug, rows);

    if (result.ok) {
      safeLocalStorageSet(`${SUBMITTED_KEY}${slug}`, '1');
      setStep('success');
    } else {
      setError(result.error);
    }
    setSending(false);
  };

  const renderForm = () => {
    if (!pkg) return null;

    return (
      <div className={styles.quiz}>
        <div className={styles.progressBar} role="progressbar" aria-valuenow={answeredCount} aria-valuemin={0} aria-valuemax={pickedComponentIds.length} aria-label="Progress">
          <div className={styles.progressFill} style={{ width: `${pickedComponentIds.length > 0 ? (answeredCount / pickedComponentIds.length) * 100 : 0}%` }} />
        </div>
        <p className={styles.progressText}>{answeredCount} of {pickedComponentIds.length} answered</p>

        <h1>How did the content work in your seminar?</h1>
        <p className={styles.intro}>Tell us about each piece of Seagrass Stories content you planned to use. About 4 minutes.</p>

        <form onSubmit={(e) => e.preventDefault()}>
          {pickedComponentIds.map((compId, i) => {
            const a = answers[compId];
            const status = getUniversityStatus(compId);
            const usageOptions = getUsageOptions(compId);
            const isAdapted = status === 'Adapted';
            const isUsed = a?.usage === 'kept' || a?.usage === 'changed';
            const comp = SEAGRASS_STORIES.components.find((c) => c.id === compId);
            const title = comp?.title ?? compId;

            return (
              <section key={compId} className={styles.componentCard} aria-labelledby={`title-${compId}`}>
                <div className={styles.componentLegend}>
                  <span className={styles.componentMeta}>{i + 1} of {pickedComponentIds.length} · {getComponentMeta(compId)}</span>
                  <h2 id={`title-${compId}`} className={styles.componentTitle}>{title}</h2>
                  <span className={styles.statusTag}>{status === 'Adapted' ? 'Adapted for university' : 'Fixed content'}</span>
                </div>

                <fieldset className={styles.fieldGroup}>
                  <legend className={styles.fieldLegend}>What did you do with it?</legend>
                  <div className={styles.pillGroup}>
                    {usageOptions.map((opt) => (
                      <label key={opt.value} className={styles.pillLabel}>
                        <input
                          type="radio"
                          name={`usage-${compId}`}
                          value={opt.value}
                          checked={a?.usage === opt.value}
                          onChange={() => handleUsageChange(compId, opt.value)}
                          className={styles.pillInput}
                        />
                        <span className={styles.pillText}>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {isUsed && (
                  <div className={styles.impactReveal}>
                    <fieldset className={styles.fieldGroup}>
                      <legend className={styles.fieldLegend}>How much did it help learners understand the topic?</legend>
                      <div className={styles.pillGroup}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <label key={n} className={`${styles.pillLabel} ${styles.ratingPill}`}>
                            <input
                              type="radio"
                              name={`rating-${compId}`}
                              value={n}
                              checked={a?.rating === n}
                              onChange={() => handleRatingChange(compId, n)}
                              className={styles.pillInput}
                              aria-label={n === 1 ? '1, not at all' : n === 5 ? '5, a lot' : String(n)}
                            />
                            <span className={styles.pillText}>{n}</span>
                          </label>
                        ))}
                      </div>
                      <div className={styles.pillLabelText} aria-hidden="true">
                        <span>1 = Not at all</span>
                        <span>5 = A lot</span>
                      </div>
                    </fieldset>

                    <fieldset className={styles.fieldGroup}>
                      <legend className={styles.fieldLegend}>How engaged were learners?</legend>
                      <div className={styles.pillGroup}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <label key={n} className={`${styles.pillLabel} ${styles.ratingPill}`}>
                            <input
                              type="radio"
                              name={`engagement-${compId}`}
                              value={n}
                              checked={a?.engagement === n}
                              onChange={() => handleEngagementChange(compId, n)}
                              className={styles.pillInput}
                              aria-label={n === 1 ? '1, not engaged' : n === 5 ? '5, very engaged' : String(n)}
                            />
                            <span className={styles.pillText}>{n}</span>
                          </label>
                        ))}
                      </div>
                      <div className={styles.pillLabelText} aria-hidden="true">
                        <span>1 = Not engaged</span>
                        <span>5 = Very engaged</span>
                      </div>
                    </fieldset>

                    <fieldset className={styles.fieldGroup}>
                      <legend className={styles.fieldLegend}>Did it fit the time you planned?</legend>
                      <div className={styles.pillGroup}>
                        {[
                          { value: 'right', label: 'About right' },
                          { value: 'too_long', label: 'Too long' },
                          { value: 'too_short', label: 'Too short' },
                        ].map((opt) => (
                          <label key={opt.value} className={styles.pillLabel}>
                            <input
                              type="radio"
                              name={`time-fit-${compId}`}
                              value={opt.value}
                              checked={a?.time_fit === opt.value}
                              onChange={() => handleTimeFitChange(compId, opt.value as 'right' | 'too_long' | 'too_short')}
                              className={styles.pillInput}
                            />
                            <span className={styles.pillText}>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    {isAdapted && (
                      <fieldset className={styles.fieldGroup}>
                        <legend className={styles.fieldLegend}>Did the university adaptation help your teaching?</legend>
                        <div className={styles.pillGroup}>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <label key={n} className={`${styles.pillLabel} ${styles.ratingPill}`}>
                              <input
                                type="radio"
                                name={`adaptation-helped-${compId}`}
                                value={n}
                                checked={a?.adaptation_helped === n}
                                onChange={() => handleAdaptationHelpedChange(compId, n)}
                                className={styles.pillInput}
                                aria-label={n === 1 ? '1, not at all' : n === 5 ? '5, a lot' : String(n)}
                              />
                              <span className={styles.pillText}>{n}</span>
                            </label>
                          ))}
                        </div>
                        <div className={styles.pillLabelText} aria-hidden="true">
                          <span>1 = Not at all</span>
                          <span>5 = A lot</span>
                        </div>
                      </fieldset>
                    )}
                  </div>
                )}

                <fieldset className={styles.fieldGroup}>
                  <legend className={styles.fieldLegend}>How well did it match your course goals?</legend>
                  <div className={styles.pillGroup}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <label key={n} className={`${styles.pillLabel} ${styles.ratingPill}`}>
                        <input
                          type="radio"
                          name={`curriculum-fit-${compId}`}
                          value={n}
                          checked={a?.curriculum_fit === n}
                          onChange={() => handleCurriculumFitChange(compId, n)}
                          className={styles.pillInput}
                          aria-label={n === 1 ? '1, not at all' : n === 5 ? '5, very well' : String(n)}
                        />
                        <span className={styles.pillText}>{n}</span>
                      </label>
                    ))}
                  </div>
                  <div className={styles.pillLabelText} aria-hidden="true">
                    <span>1 = Not at all</span>
                    <span>5 = Very well</span>
                  </div>
                </fieldset>

                <div className={styles.fieldGroup}>
                  <label htmlFor={`note-${compId}`} className={styles.fieldLegend}>
                    Anything we should know? <span className={styles.optionalLabel}>(optional)</span>
                  </label>
                  <div className={styles.noteArea}>
                    <textarea
                      id={`note-${compId}`}
                      value={a?.note || ''}
                      onChange={(e) => handleNoteChange(compId, e.target.value)}
                      maxLength={1000}
                      rows={3}
                      className={styles.textarea}
                      placeholder={a?.usage ? getPlaceholder(a.usage) : 'Optional note'}
                      aria-describedby={`note-counter-${compId}`}
                    />
                    <div id={`note-counter-${compId}`} className={styles.charCounter}>
                      {a?.note?.length || 0}/1000
                    </div>
                  </div>
                </div>
              </section>
            );
          })}

          {error && (
            <div className={styles.error} role="alert" aria-live="polite">
              {error}
              <button type="button" className={styles.retryBtn} onClick={() => setError(null)}>
                Try again
              </button>
            </div>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={!isFormComplete() || sending || !isSupabaseConfigured}
            >
              {sending ? 'Sending...' : 'Send feedback'}
            </button>
          </div>

          {!isSupabaseConfigured && (
            <p className={styles.configNote}>Saving is not available right now.</p>
          )}

          <p className={styles.privacy}>
            Your feedback is linked to your seminar for OceanX's internal review only. It is never shown publicly.
          </p>
        </form>
      </div>
    );
  };

  const renderSuccess = () => (
    <div className={styles.success} role="status" aria-live="polite">
      <h1>Thank you</h1>
      <p>Your feedback is saved.</p>
      <p>It helps OceanX decide which content to keep, change or retire.</p>
      <p>
        <a href={`/educator/p/${slug}?reset=1`} className={styles.resetLink}>
          Start over
        </a>
      </p>
    </div>
  );

  if (loading) {
    return (
      <article className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loading}>Loading package...</div>
        </div>
      </article>
    );
  }

  if (!pkg) {
    return (
      <article className={styles.page}>
        <div className={styles.container}>
          <div className={styles.error}>
            Package not found. The link may have expired.
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={styles.page}>
      <div className={styles.container}>
        {step === 'form' && renderForm()}
        {step === 'success' && renderSuccess()}
      </div>
    </article>
  );
}