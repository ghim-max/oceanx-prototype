import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SEAGRASS_STORIES } from '../../shared/data/seagrass-stories';
import { TRACKED_COMPONENTS, getUniversityStatus } from '../../shared/data/quizComponentMap';
import {
  submitEducatorResponse,
  type SubmitResult,
} from '../../shared/services/feedbackService';
import { isSupabaseConfigured } from '../../shared/services/supabase';
import styles from './EducatorFeedbackPage.module.css';

const SUBMITTED_KEY = 'oxe-educator-submitted-seagrass-university';

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

export function EducatorFeedbackPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [answers, setAnswers] = useState<Answers>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('reset') === '1') {
      safeLocalStorageRemove(SUBMITTED_KEY);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const submittedFlag = safeLocalStorageGet(SUBMITTED_KEY) === '1';
    if (submittedFlag) {
      setStep('success');
    }
  }, []);

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

  const isFormComplete = (): boolean => {
    return TRACKED_COMPONENTS.every((comp) => isCardComplete(comp.id));
  };

  const answeredCount = TRACKED_COMPONENTS.filter((comp) => isCardComplete(comp.id)).length;

  const handleSubmit = async () => {
    if (!isFormComplete()) return;
    if (!isSupabaseConfigured) {
      setError('Saving is not available right now.');
      return;
    }

    setSending(true);
    setError(null);

    const rows = TRACKED_COMPONENTS.map((comp) => {
      const answer = answers[comp.id];
      return {
        story_id: 'seagrass-stories',
        audience: 'university',
        version_id: 'v-university',
        component_id: comp.id,
        usage: answer.usage,
        rating: answer.usage !== 'skipped' ? answer.rating : undefined,
        engagement: answer.usage !== 'skipped' ? answer.engagement : undefined,
        time_fit: answer.usage !== 'skipped' ? answer.time_fit : undefined,
        curriculum_fit: answer.curriculum_fit,
        adaptation_helped: answer.usage !== 'skipped' && getUniversityStatus(comp.id) === 'Adapted'
          ? answer.adaptation_helped
          : undefined,
        note: answer.note.trim() || undefined,
        is_sample: false as const,
      };
    });

    const result: SubmitResult = await submitEducatorResponse(rows);

    if (result.ok) {
      safeLocalStorageSet(SUBMITTED_KEY, '1');
      setStep('success');
    } else {
      setError(result.error);
    }
    setSending(false);
  };

  const renderForm = () => (
    <div className={styles.quiz}>
      <div className={styles.progressBar} role="progressbar" aria-valuenow={answeredCount} aria-valuemin={0} aria-valuemax={TRACKED_COMPONENTS.length} aria-label="Progress">
        <div className={styles.progressFill} style={{ width: `${(answeredCount / TRACKED_COMPONENTS.length) * 100}%` }} />
      </div>
      <p className={styles.progressText}>{answeredCount} of {TRACKED_COMPONENTS.length} answered</p>

      <h1>How did the content work in your seminar?</h1>
      <p className={styles.intro}>Tell us about each piece of Seagrass Stories content you planned to use. About 4 minutes.</p>

      <form onSubmit={(e) => e.preventDefault()}>
        {TRACKED_COMPONENTS.map((comp, i) => {
          const a = answers[comp.id];
          const status = getUniversityStatus(comp.id);
          const usageOptions = getUsageOptions(comp.id);
          const isAdapted = status === 'Adapted';
          const isUsed = a?.usage === 'kept' || a?.usage === 'changed';

          return (
            <section key={comp.id} className={styles.componentCard} aria-labelledby={`title-${comp.id}`}>
              <div className={styles.componentLegend}>
                <span className={styles.componentMeta}>{i + 1} of {TRACKED_COMPONENTS.length} · {getComponentMeta(comp.id)}</span>
                <h2 id={`title-${comp.id}`} className={styles.componentTitle}>{comp.title}</h2>
                <span className={styles.statusTag}>{status === 'Adapted' ? 'Adapted for university' : 'Fixed content'}</span>
              </div>

              <fieldset className={styles.fieldGroup}>
                <legend className={styles.fieldLegend}>What did you do with it?</legend>
                <div className={styles.pillGroup}>
                  {usageOptions.map((opt) => (
                    <label key={opt.value} className={styles.pillLabel}>
                      <input
                        type="radio"
                        name={`usage-${comp.id}`}
                        value={opt.value}
                        checked={a?.usage === opt.value}
                        onChange={() => handleUsageChange(comp.id, opt.value)}
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
                            name={`rating-${comp.id}`}
                            value={n}
                            checked={a?.rating === n}
                            onChange={() => handleRatingChange(comp.id, n)}
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
                            name={`engagement-${comp.id}`}
                            value={n}
                            checked={a?.engagement === n}
                            onChange={() => handleEngagementChange(comp.id, n)}
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
                            name={`time-fit-${comp.id}`}
                            value={opt.value}
                            checked={a?.time_fit === opt.value}
                            onChange={() => handleTimeFitChange(comp.id, opt.value as 'right' | 'too_long' | 'too_short')}
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
                              name={`adaptation-helped-${comp.id}`}
                              value={n}
                              checked={a?.adaptation_helped === n}
                              onChange={() => handleAdaptationHelpedChange(comp.id, n)}
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
                        name={`curriculum-fit-${comp.id}`}
                        value={n}
                        checked={a?.curriculum_fit === n}
                        onChange={() => handleCurriculumFitChange(comp.id, n)}
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
                <label htmlFor={`note-${comp.id}`} className={styles.fieldLegend}>
                  Anything we should know? <span className={styles.optionalLabel}>(optional)</span>
                </label>
                <div className={styles.noteArea}>
                  <textarea
                    id={`note-${comp.id}`}
                    value={a?.note || ''}
                    onChange={(e) => handleNoteChange(comp.id, e.target.value)}
                    maxLength={1000}
                    rows={3}
                    className={styles.textarea}
                    placeholder={a?.usage ? getPlaceholder(a.usage) : 'Optional note'}
                    aria-describedby={`note-counter-${comp.id}`}
                  />
                  <div id={`note-counter-${comp.id}`} className={styles.charCounter}>
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

  const renderSuccess = () => (
    <div className={styles.success} role="status" aria-live="polite">
      <h1>Thank you</h1>
      <p>Your feedback is saved.</p>
      <p>It helps OceanX decide which content to keep, change or retire.</p>
      <p>
        <a href="/educator/seagrass-university?reset=1" className={styles.resetLink}>
          Start over
        </a>
      </p>
    </div>
  );

  return (
    <article className={styles.page}>
      <div className={styles.container}>
        {step === 'form' && renderForm()}
        {step === 'success' && renderSuccess()}
      </div>
    </article>
  );
}