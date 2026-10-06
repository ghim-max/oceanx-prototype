import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UNIVERSITY_QUIZ } from '../../shared/services/generateExtras';
import {
  TRACKED_COMPONENTS,
  SCORED_QUESTION_IDS,
  scoreAnswers,
  CONFIDENCE_QUESTION,
} from '../../shared/data/quizComponentMap';
import {
  submitLearnerResponse,
  submitPrecheck,
  type LearnerResponseInsert,
  type PrecheckInsert,
  type SubmitResult,
} from '../../shared/services/feedbackService';
import { isSupabaseConfigured } from '../../shared/services/supabase';
import styles from './QuizPage.module.css';

const PRECHECK_KEY = 'oxe-precheck-seagrass-university';
const SUBMITTED_KEY = 'oxe-submitted-seagrass-university';

type Step = 'start' | 'pre' | 'post' | 'success';

type PrecheckData = {
  session_id: string;
  correct: Record<'q1' | 'q2' | 'q3' | 'q4' | 'q5', boolean>;
  score: number;
  confidence_pre: number;
  startedAt: string;
};

type PostQuizAnswers = {
  q1?: number;
  q2?: number;
  q3?: number;
  q4?: number;
  q5?: number;
  q6: string;
};

type FeedbackAnswers = {
  satisfaction?: number;
  wouldRecommend?: boolean;
  helpedMost?: string;
  comment: string;
  confidence_post?: number;
  did_pre_reading?: boolean;
  least_useful?: string;
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

function getHelpedMostId(title: string): string | undefined {
  const found = TRACKED_COMPONENTS.find((c) => c.title === title);
  return found?.id;
}

export function QuizPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [step, setStep] = useState<Step>('start');
  const [pageLoadTime] = useState(Date.now());
  const [precheck, setPrecheck] = useState<PrecheckData | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [preAnswers, setPreAnswers] = useState<Record<string, number | undefined>>({});
  const [preConfidence, setPreConfidence] = useState<number | undefined>(undefined);
  const [preDone, setPreDone] = useState(false);
  const [postAnswers, setPostAnswers] = useState<PostQuizAnswers>({
    q1: undefined,
    q2: undefined,
    q3: undefined,
    q4: undefined,
    q5: undefined,
    q6: '',
  });
  const [feedbackAnswers, setFeedbackAnswers] = useState<FeedbackAnswers>({
    satisfaction: undefined,
    wouldRecommend: undefined,
    helpedMost: undefined,
    comment: '',
    confidence_post: undefined,
    did_pre_reading: undefined,
    least_useful: undefined,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle ?reset=1
  useEffect(() => {
    if (searchParams.get('reset') === '1') {
      safeLocalStorageRemove(PRECHECK_KEY);
      safeLocalStorageRemove(SUBMITTED_KEY);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Determine step from URL param on mount
  useEffect(() => {
    const stepParam = searchParams.get('step');
    const submittedFlag = safeLocalStorageGet(SUBMITTED_KEY) === '1';
    const savedPrecheck = safeLocalStorageGet(PRECHECK_KEY);

    if (savedPrecheck) {
      try {
        setPrecheck(JSON.parse(savedPrecheck) as PrecheckData);
      } catch {
        safeLocalStorageRemove(PRECHECK_KEY);
      }
    }

    if (submittedFlag && stepParam === 'post') {
      setStep('success');
      return;
    }

    if (stepParam === 'pre') {
      setStep('pre');
    } else if (stepParam === 'post') {
      setStep('post');
    } else {
      setStep('start');
    }
  }, [searchParams, setSearchParams]);

  const handlePreDone = async () => {
    const result = scoreAnswers(preAnswers);
    if (preConfidence === undefined) return;
    // Time spent is measured from when the learner opened the pre-check.
    const startedAt = new Date(pageLoadTime).toISOString();
    const session_id = crypto.randomUUID();
    const data: PrecheckData = {
      session_id,
      correct: result.correct,
      score: result.score,
      confidence_pre: preConfidence,
      startedAt,
    };
    safeLocalStorageSet(PRECHECK_KEY, JSON.stringify(data));
    setPrecheck(data);
    setPreDone(true);
    window.scrollTo({ top: 0 });

    // Submit precheck to database (non-blocking)
    const precheckRow: PrecheckInsert = {
      session_id,
      pre_q1: result.correct.q1,
      pre_q2: result.correct.q2,
      pre_q3: result.correct.q3,
      pre_q4: result.correct.q4,
      pre_q5: result.correct.q5,
      pre_score: result.score,
      confidence_pre: preConfidence,
      story_id: 'seagrass-stories',
      audience: 'university',
      version_id: 'v-university',
      is_sample: false,
    };
    const precheckResult = await submitPrecheck(precheckRow);
    if (!precheckResult.ok) {
      console.error('Precheck submission failed:', precheckResult.error);
    }
  };

  const handlePostQuizChange = (questionId: string, value: number | string) => {
    setPostAnswers((prev) => ({ ...prev, [questionId]: value }));
    setError(null);
  };

  const handleFeedbackChange = (field: keyof FeedbackAnswers, value: string | number | boolean) => {
    setFeedbackAnswers((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const isPostQuizComplete = () => {
    return SCORED_QUESTION_IDS.every((q) => postAnswers[q as keyof PostQuizAnswers] !== undefined);
  };

  const isFeedbackComplete = () => {
    return (
      feedbackAnswers.satisfaction !== undefined &&
      feedbackAnswers.wouldRecommend !== undefined &&
      feedbackAnswers.helpedMost !== undefined &&
      feedbackAnswers.confidence_post !== undefined &&
      feedbackAnswers.did_pre_reading !== undefined &&
      feedbackAnswers.least_useful !== undefined
    );
  };

  const isSubmitReady = () => {
    return isPostQuizComplete() && isFeedbackComplete();
  };

  const handleSubmit = async () => {
    if (!isSubmitReady()) return;
    if (!isSupabaseConfigured) {
      setError('Saving is not available right now.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const postResult = scoreAnswers({
      q1: postAnswers.q1,
      q2: postAnswers.q2,
      q3: postAnswers.q3,
      q4: postAnswers.q4,
      q5: postAnswers.q5,
    });

    const preScore = precheck?.score ?? null;
    const preCorrect = precheck?.correct ?? {
      q1: false,
      q2: false,
      q3: false,
      q4: false,
      q5: false,
    };

    const now = Date.now();
    const startedAt = precheck?.startedAt ? new Date(precheck.startedAt).getTime() : pageLoadTime;
    const timeSpent = Math.round((now - startedAt) / 1000);

    const row: LearnerResponseInsert = {
      story_id: 'seagrass-stories',
      audience: 'university',
      version_id: 'v-university',
      time_spent_seconds: timeSpent,
      completed: true,
      pre_q1: preCorrect.q1,
      pre_q2: preCorrect.q2,
      pre_q3: preCorrect.q3,
      pre_q4: preCorrect.q4,
      pre_q5: preCorrect.q5,
      post_q1: postResult.correct.q1,
      post_q2: postResult.correct.q2,
      post_q3: postResult.correct.q3,
      post_q4: postResult.correct.q4,
      post_q5: postResult.correct.q5,
      pre_score: preScore ?? undefined,
      post_score: postResult.score,
      short_answer: postAnswers.q6.trim() || undefined,
      satisfaction: feedbackAnswers.satisfaction,
      would_recommend: feedbackAnswers.wouldRecommend,
      helped_most: getHelpedMostId(feedbackAnswers.helpedMost ?? ''),
      comment: feedbackAnswers.comment.trim() || undefined,
      session_id: precheck?.session_id ?? crypto.randomUUID(),
      confidence_pre: precheck?.confidence_pre ?? undefined,
      confidence_post: feedbackAnswers.confidence_post ?? undefined,
      did_pre_reading: feedbackAnswers.did_pre_reading ?? undefined,
      least_useful: feedbackAnswers.least_useful ?? undefined,
      is_sample: false,
    };

    const result: SubmitResult = await submitLearnerResponse(row);

    if (result.ok) {
      safeLocalStorageRemove(PRECHECK_KEY);
      safeLocalStorageSet(SUBMITTED_KEY, '1');
      setSubmitted(true);
      setStep('success');
      const preText = preScore !== null ? ` (and ${preScore} of 5 before class)` : '';
      setSuccessMessage(
        `Thank you. Your answers are saved. You got ${postResult.score} of 5 right after class${preText}.`
      );
    } else {
      setError(result.error);
    }
    setSubmitting(false);
  };

  const renderStart = () => (
    <div className={styles.start}>
      <h1>Seagrass Stories: knowledge check</h1>
      <p>
        This quick check helps you see what you know before class and what you learned after.
        It takes about 3 minutes each time. No names or emails are collected.
      </p>
      <div className={styles.choices}>
        <button
          type="button"
          className={styles.choiceBtn}
          onClick={() => setSearchParams({ step: 'pre' }, { replace: true })}
        >
          Start of class
        </button>
        <button
          type="button"
          className={styles.choiceBtn}
          onClick={() => setSearchParams({ step: 'post' }, { replace: true })}
        >
          After class
        </button>
      </div>
    </div>
  );

  const renderPre = () => preDone ? (
    <div className={styles.quiz} aria-live="polite">
      <h1>Thanks. See you after class.</h1>
      <p>
        Your answers are saved on this device. After the session, come back to this page
        on the same phone and choose "After class".
      </p>
      <div className={styles.choices}>
        <a href="/quiz/seagrass-university" className={styles.choiceBtn}>
          Back to start
        </a>
      </div>
    </div>
  ) : (
    <div className={styles.quiz}>
      <h1>Pre-check: before class</h1>
      <p>5 questions. No score shown yet. Just pick your best answer for each.</p>
      <form onSubmit={(e) => e.preventDefault()}>
        {UNIVERSITY_QUIZ.questions
          .filter((q) => q.id !== 'q6')
          .map((question, qi) => (
            <fieldset key={question.id} className={styles.questionCard}>
              <legend className={styles.questionLegend}>
                <span className={styles.questionNumber}>Question {qi + 1} of 5</span>
                {question.question}
              </legend>
              <div className={styles.options} role="radiogroup" aria-label={question.question}>
                {question.options.map((option, idx) => (
                  <label key={idx} className={styles.optionLabel}>
                    <input
                      type="radio"
                      name={question.id}
                      value={idx}
                      checked={preAnswers[question.id] === idx}
                      onChange={() =>
                        setPreAnswers((prev) => ({ ...prev, [question.id]: idx }))
                      }
                      className={styles.optionInput}
                    />
                    <span className={styles.optionText}>{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        <fieldset className={styles.questionCard}>
          <legend className={styles.questionLegend}>
            <span className={styles.questionNumber}>Confidence</span>
            {CONFIDENCE_QUESTION}
          </legend>
          <div className={styles.confidencePillGroup} role="radiogroup" aria-label={CONFIDENCE_QUESTION}>
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className={styles.pillLabel}>
                <input
                  type="radio"
                  name="confidence_pre"
                  value={n}
                  checked={preConfidence === n}
                  onChange={() => setPreConfidence(n)}
                  className={styles.pillInput}
                />
                <span className={styles.pillText}>{n}</span>
              </label>
            ))}
            <div className={styles.confidenceScale} aria-hidden="true">
              <span>1 = Not at all</span>
              <span>5 = Very confident</span>
            </div>
          </div>
        </fieldset>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.submitBtn}
            onClick={handlePreDone}
            disabled={
              !SCORED_QUESTION_IDS.every((q) => preAnswers[q] !== undefined) ||
              preConfidence === undefined
            }
          >
            Done
          </button>
        </div>
      </form>
    </div>
  );

  const renderPost = () => {
    if (submitted) return renderSuccess();

    return (
      <div className={styles.quiz}>
        <h1>After class: knowledge check</h1>
        <p>5 multiple choice questions and 1 short answer. All multiple choice are required.</p>

        <form onSubmit={(e) => e.preventDefault()}>
          {UNIVERSITY_QUIZ.questions.map((question) => (
            <fieldset key={question.id} className={styles.questionCard}>
              <legend className={styles.questionLegend}>
                <span className={styles.questionNumber}>
                  Question {UNIVERSITY_QUIZ.questions.indexOf(question) + 1} of {UNIVERSITY_QUIZ.questions.length}
                </span>
                {question.question}
              </legend>
              {question.type === 'short-answer' ? (
                <div className={styles.shortAnswer}>
                  <textarea
                    name={question.id}
                    value={postAnswers.q6}
                    onChange={(e) => handlePostQuizChange('q6', e.target.value)}
                    maxLength={1000}
                    rows={4}
                    className={styles.textarea}
                    placeholder="Your answer in 2-3 sentences"
                    aria-describedby={`${question.id}-counter`}
                  />
                  <div id={`${question.id}-counter`} className={styles.charCounter}>
                    {postAnswers.q6.length}/1000
                  </div>
                </div>
              ) : (
                <div className={styles.options} role="radiogroup" aria-label={question.question}>
                  {question.options.map((option, idx) => (
                    <label key={idx} className={styles.optionLabel}>
                      <input
                        type="radio"
                        name={question.id}
                        value={idx}
                        checked={postAnswers[question.id as keyof PostQuizAnswers] === idx}
                        onChange={() => handlePostQuizChange(question.id, idx)}
                        className={styles.optionInput}
                      />
                      <span className={styles.optionText}>{option}</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>
          ))}

          <hr className={styles.divider} />

          <h2>Before you go</h2>
          <p>Your feedback helps us improve. All questions below are required except the last one.</p>

          <fieldset className={styles.feedbackFieldset}>
            <legend className={styles.feedbackLegend}>
              {CONFIDENCE_QUESTION}
            </legend>
            <div className={styles.confidencePillGroup} role="radiogroup" aria-label={CONFIDENCE_QUESTION}>
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className={styles.pillLabel}>
                  <input
                    type="radio"
                    name="confidence_post"
                    value={n}
                    checked={feedbackAnswers.confidence_post === n}
                    onChange={() => handleFeedbackChange('confidence_post', n)}
                    className={styles.pillInput}
                  />
                  <span className={styles.pillText}>{n}</span>
                </label>
              ))}
              <div className={styles.confidenceScale} aria-hidden="true">
                <span>1 = Not at all</span>
                <span>5 = Very confident</span>
              </div>
            </div>
          </fieldset>

          <fieldset className={styles.feedbackFieldset}>
            <legend className={styles.feedbackLegend}>
              Did you do the pre-reading before class?
            </legend>
            <div className={styles.pillGroup} role="radiogroup" aria-label="Pre-reading">
              <label className={styles.pillLabel}>
                <input
                  type="radio"
                  name="did_pre_reading"
                  value="yes"
                  checked={feedbackAnswers.did_pre_reading === true}
                  onChange={() => handleFeedbackChange('did_pre_reading', true)}
                  className={styles.pillInput}
                />
                <span className={styles.pillText}>Yes</span>
              </label>
              <label className={styles.pillLabel}>
                <input
                  type="radio"
                  name="did_pre_reading"
                  value="no"
                  checked={feedbackAnswers.did_pre_reading === false}
                  onChange={() => handleFeedbackChange('did_pre_reading', false)}
                  className={styles.pillInput}
                />
                <span className={styles.pillText}>No</span>
              </label>
            </div>
          </fieldset>

          <fieldset className={styles.feedbackFieldset}>
            <legend className={styles.feedbackLegend}>
              Which activity helped you learn most?
            </legend>
            <div className={styles.helpedOptions} role="radiogroup" aria-label="Helped most">
              {TRACKED_COMPONENTS.map((comp) => (
                <label key={comp.id} className={styles.helpedLabel}>
                  <input
                    type="radio"
                    name="helpedMost"
                    value={comp.title}
                    checked={feedbackAnswers.helpedMost === comp.title}
                    onChange={() => handleFeedbackChange('helpedMost', comp.title)}
                    className={styles.helpedInput}
                  />
                  <span className={styles.helpedText}>{comp.title}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.feedbackFieldset}>
            <legend className={styles.feedbackLegend}>
              Which activity was least useful for you?
            </legend>
            <div className={styles.helpedOptions} role="radiogroup" aria-label="Least useful">
              {TRACKED_COMPONENTS.map((comp) => {
                const isDisabled = comp.title === feedbackAnswers.helpedMost;
                return (
                  <label key={comp.id} className={`${styles.helpedLabel} ${isDisabled ? styles.disabledLabel : ''}`}>
                    <input
                      type="radio"
                      name="leastUseful"
                      value={comp.id}
                      checked={feedbackAnswers.least_useful === comp.id}
                      onChange={() => !isDisabled && handleFeedbackChange('least_useful', comp.id)}
                      disabled={isDisabled}
                      className={styles.helpedInput}
                    />
                    <span className={styles.helpedText}>{comp.title}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className={styles.feedbackFieldset}>
            <legend className={styles.feedbackLegend}>
              How satisfied were you with today's session?
            </legend>
            <div className={styles.pillGroup} role="radiogroup" aria-label="Satisfaction">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className={styles.pillLabel}>
                  <input
                    type="radio"
                    name="satisfaction"
                    value={n}
                    checked={feedbackAnswers.satisfaction === n}
                    onChange={() => handleFeedbackChange('satisfaction', n)}
                    className={styles.pillInput}
                  />
                  <span className={styles.pillText}>{n}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.feedbackFieldset}>
            <legend className={styles.feedbackLegend}>
              Would you recommend this session to a friend?
            </legend>
            <div className={styles.pillGroup} role="radiogroup" aria-label="Recommend">
              <label className={styles.pillLabel}>
                <input
                  type="radio"
                  name="wouldRecommend"
                  value="yes"
                  checked={feedbackAnswers.wouldRecommend === true}
                  onChange={() => handleFeedbackChange('wouldRecommend', true)}
                  className={styles.pillInput}
                />
                <span className={styles.pillText}>Yes</span>
              </label>
              <label className={styles.pillLabel}>
                <input
                  type="radio"
                  name="wouldRecommend"
                  value="no"
                  checked={feedbackAnswers.wouldRecommend === false}
                  onChange={() => handleFeedbackChange('wouldRecommend', false)}
                  className={styles.pillInput}
                />
                <span className={styles.pillText}>No</span>
              </label>
            </div>
          </fieldset>

          <fieldset className={styles.feedbackFieldset}>
            <legend className={styles.feedbackLegend}>
              Anything else you want to tell us?
            </legend>
            <div className={styles.commentArea}>
              <textarea
                name="comment"
                value={feedbackAnswers.comment}
                onChange={(e) => handleFeedbackChange('comment', e.target.value)}
                maxLength={1000}
                rows={3}
                className={styles.textarea}
                placeholder="Optional"
                aria-describedby="comment-counter"
              />
              <div id="comment-counter" className={styles.charCounter}>
                {feedbackAnswers.comment.length}/1000
              </div>
            </div>
          </fieldset>

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
              disabled={!isSubmitReady() || submitting || !isSupabaseConfigured}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>

          {!isSupabaseConfigured && (
            <p className={styles.configNote}>Saving is not available right now.</p>
          )}

          <p className={styles.privacy}>
            Your answers are anonymous. We do not collect names or emails.
          </p>
        </form>
      </div>
    );
  };

  const renderSuccess = () => (
    <div className={styles.success} role="status" aria-live="polite">
      <h1>Thank you</h1>
      <p>{successMessage}</p>
      <p>
        <a href="/quiz/seagrass-university?reset=1" className={styles.resetLink}>
          Start over
        </a>
      </p>
    </div>
  );

  return (
    <article className={styles.page}>
      <div className={styles.container}>
        {step === 'start' && renderStart()}
        {step === 'pre' && renderPre()}
        {step === 'post' && renderPost()}
        {step === 'success' && renderSuccess()}
      </div>
    </article>
  );
}