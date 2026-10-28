import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  submitLearnerPackageFeedback,
  type LearnerPackageFeedbackInsert,
  submitLearnerPackageResponses,
  type LearnerPackageResponseInsert,
  submitIssueReport,
} from '../../shared/services/feedbackService';
import { isSupabaseConfigured } from '../../shared/services/supabase';
import { API_BASE } from '../../shared/services/apiBase';
import { getApprovedBankItems } from '../../shared/services/bankApi';
import { Flag } from 'lucide-react';
import styles from './QuizPackagePage.module.css';

const PRECHECK_KEY = 'oxe-precheck-package-';
const SUBMITTED_KEY = 'oxe-submitted-package-';

type Step = 'start' | 'pre' | 'post' | 'success';

type PrecheckData = {
  session_id: string;
  correctByItemId: Record<string, boolean>;
  score: number;
  confidence_pre: number;
  startedAt: string;
};

// item_id -> chosen option index (MCQ) or answer text (short)
type PostQuizAnswers = Record<string, number | string>;

type FeedbackAnswers = {
  satisfaction?: number;
  wouldRecommend?: boolean;
  helpedMost?: string;
  comment: string;
  confidence_post?: number;
  least_useful?: string;
};

interface QuestionBankItem {
  id: string;
  component_id: string;
  qtype: 'mcq' | 'short';
  question: string;
  options: string[] | null;
  correct_index: number | null;
  answer: string | null;
  difficulty: string;
}

interface PackageData {
  slug: string;
  audience: string;
  picks: { id: string; title: string; status: string; stage: string }[];
  recommendations: { id: string; title: string; stage: string }[];
  quiz_title?: string;
  lesson_plan_title?: string;
  lesson_plan_url?: string;
  component_ids: string[];
  options: any[];
  item_ids: string[];
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

export function QuizPackagePage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [step, setStep] = useState<Step>('start');
  const [pageLoadTime] = useState(Date.now());
  const [precheck, setPrecheck] = useState<PrecheckData | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [preAnswers, setPreAnswers] = useState<Record<string, number | undefined>>({});
  const [preConfidence, setPreConfidence] = useState<number | undefined>(undefined);
  const [preDone, setPreDone] = useState(false);
  const [postAnswers, setPostAnswers] = useState<PostQuizAnswers>({});
  const [feedbackAnswers, setFeedbackAnswers] = useState<FeedbackAnswers>({
    satisfaction: undefined,
    wouldRecommend: undefined,
    helpedMost: undefined,
    comment: '',
    confidence_post: undefined,
    least_useful: undefined,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pkg, setPkg] = useState<PackageData | null>(null);
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueMessage, setIssueMessage] = useState('');
  const [issueSeverity, setIssueSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [issueSubmitting, setIssueSubmitting] = useState(false);

  // Load package data
  useEffect(() => {
    if (slug) {
      fetch(`${API_BASE}/packages/${slug}`)
        .then((res) => {
          if (!res.ok) throw new Error('Package not found');
          return res.json();
        })
        .then((data) => {
          setPkg(data);
          setLoading(false);
          // Load questions from item_ids
          if (data.item_ids && data.item_ids.length > 0) {
            loadQuestions(data.item_ids);
          }
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [slug]);

  const loadQuestions = async (itemIds: string[]) => {
    try {
      // Fetch all approved and filter client-side since we don't have a batch endpoint
      // In production, add a batch endpoint
      const allApproved = await getApprovedBankItems();
      const filtered = allApproved.filter((q) => itemIds.includes(q.id));
      // Sort by the order in item_ids
      const sorted = itemIds.map(id => filtered.find((q) => q.id === id)).filter(Boolean) as QuestionBankItem[];
      setQuestions(sorted);
    } catch (err) {
      console.error('Failed to load questions:', err);
    }
  };

  // Handle ?reset=1
  useEffect(() => {
    if (searchParams.get('reset') === '1') {
      safeLocalStorageRemove(`${PRECHECK_KEY}${slug}`);
      safeLocalStorageRemove(`${SUBMITTED_KEY}${slug}`);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, slug]);

  // Determine step from URL param on mount
  useEffect(() => {
    if (loading) return;
    const stepParam = searchParams.get('step');
    const submittedFlag = safeLocalStorageGet(`${SUBMITTED_KEY}${slug}`) === '1';
    const savedPrecheck = safeLocalStorageGet(`${PRECHECK_KEY}${slug}`);

    if (savedPrecheck) {
      try {
        setPrecheck(JSON.parse(savedPrecheck) as PrecheckData);
      } catch {
        safeLocalStorageRemove(`${PRECHECK_KEY}${slug}`);
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
  }, [searchParams, setSearchParams, slug, loading]);

  const handlePreDone = async () => {
    if (preConfidence === undefined) return;
    const mcqItems = questions.filter((q) => q.qtype === 'mcq');

    // Score by correct_index
    let score = 0;
    const correctByItemId: Record<string, boolean> = {};
    mcqItems.forEach((item) => {
      const chosen = preAnswers[item.id] as number | undefined;
      const isCorrect = chosen !== undefined && item.correct_index !== null && chosen === item.correct_index;
      correctByItemId[item.id] = isCorrect;
      if (isCorrect) score++;
    });

    const startedAt = new Date(pageLoadTime).toISOString();
    const session_id = crypto.randomUUID();
    const data: PrecheckData = {
      session_id,
      correctByItemId,
      score,
      confidence_pre: preConfidence,
      startedAt,
    };
    safeLocalStorageSet(`${PRECHECK_KEY}${slug}`, JSON.stringify(data));
    setPrecheck(data);
    setPreDone(true);
    window.scrollTo({ top: 0 });

    // Save pre-check answers to learner_package_responses (non-blocking)
    const responseRows: LearnerPackageResponseInsert[] = mcqItems.map((item) => ({
      session_id,
      item_id: item.id,
      component_id: item.component_id,
      qtype: 'mcq' as const,
      chosen_index: preAnswers[item.id] as number | undefined,
      correct: correctByItemId[item.id],
      is_precheck: true,
      is_sample: false,
    }));
    if (responseRows.length > 0) {
      const saveResult = await submitLearnerPackageResponses(slug, responseRows);
      if (!saveResult.ok) {
        console.error('Pre-check submission failed:', saveResult.error);
      }
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
    // All MCQ items must be answered; short answers are optional
    return questions.filter((q) => q.qtype === 'mcq').every((q) => postAnswers[q.id] !== undefined);
  };

  const isFeedbackComplete = () => {
    return (
      feedbackAnswers.satisfaction !== undefined &&
      feedbackAnswers.wouldRecommend !== undefined &&
      feedbackAnswers.helpedMost !== undefined &&
      feedbackAnswers.confidence_post !== undefined &&
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

    const mcqItems = questions.filter((q) => q.qtype === 'mcq');
    let mcqCorrect = 0;
    mcqItems.forEach((item) => {
      const chosen = postAnswers[item.id] as number | undefined;
      if (chosen !== undefined && item.correct_index !== null && chosen === item.correct_index) {
        mcqCorrect++;
      }
    });

    const preScore = precheck?.score ?? null;
    const session_id = precheck?.session_id ?? crypto.randomUUID();

    // Build learner package responses (one per question)
    const responseRows: LearnerPackageResponseInsert[] = questions.map((q) => {
      const chosen = postAnswers[q.id];
      const chosenIndex = q.qtype === 'mcq' ? (chosen as number | undefined) : undefined;
      const shortAnswer = q.qtype === 'short' ? (chosen as string | undefined) : undefined;
      const correct = q.qtype === 'mcq' && chosenIndex !== undefined && q.correct_index !== null
        ? chosenIndex === q.correct_index
        : undefined;

      return {
        session_id,
        item_id: q.id,
        component_id: q.component_id,
        qtype: q.qtype as 'mcq' | 'short',
        chosen_index: chosenIndex,
        short_answer: shortAnswer || undefined,
        correct,
        is_precheck: false,
        is_sample: false,
      };
    });

    // Submit individual responses
    const responsesResult = await submitLearnerPackageResponses(slug, responseRows);
    if (!responsesResult.ok) {
      console.error('Failed to save responses:', responsesResult.error);
    }

    // Submit feedback
    const row: LearnerPackageFeedbackInsert = {
      session_id,
      satisfaction: feedbackAnswers.satisfaction,
      would_recommend: feedbackAnswers.wouldRecommend,
      helped_most: pkg?.picks.find((p) => p.title === feedbackAnswers.helpedMost)?.id ?? feedbackAnswers.helpedMost,
      comment: feedbackAnswers.comment.trim() || undefined,
      confidence_post: feedbackAnswers.confidence_post ?? undefined,
      least_useful: feedbackAnswers.least_useful ?? undefined,
      is_sample: false,
    };

    const result = await submitLearnerPackageFeedback(slug, row);

    if (result.ok) {
      safeLocalStorageRemove(`${PRECHECK_KEY}${slug}`);
      safeLocalStorageSet(`${SUBMITTED_KEY}${slug}`, '1');
      setSubmitted(true);
      setStep('success');
      const preText = preScore !== null ? ` (and ${preScore} of ${mcqItems.length} before class)` : '';
      setSuccessMessage(
        `Thank you. Your answers are saved. You got ${mcqCorrect} of ${mcqItems.length} right after class${preText}.`
      );
    } else {
      setError(result.error);
    }
    setSubmitting(false);
  };

  const handleReportIssue = async () => {
    if (!issueMessage.trim()) return;
    setIssueSubmitting(true);
    const result = await submitIssueReport(slug, {
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      message: issueMessage,
      severity: issueSeverity,
      is_sample: false,
    });
    if (result.ok) {
      setShowIssueModal(false);
      setIssueMessage('');
      alert('Thank you for reporting this issue. Our team will review it.');
    } else {
      alert('Failed to submit issue: ' + result.error);
    }
    setIssueSubmitting(false);
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

  const preCheckItems = questions.filter((q) => q.qtype === 'mcq');

  const renderPre = () => preDone ? (
    <div className={styles.quiz} aria-live="polite">
      <h1>Thanks. See you after class.</h1>
      <p>
        Your answers are saved on this device. After the session, come back to this page
        on the same phone and choose "After class".
      </p>
      <div className={styles.choices}>
        <a href={`/quiz/p/${slug}`} className={styles.choiceBtn}>
          Back to start
        </a>
      </div>
    </div>
  ) : preCheckItems.length === 0 ? (
    <div className={styles.quiz}>
      <h1>Pre-check: before class</h1>
      <p>No multiple choice questions are included in this quiz, so there is no pre-check for this session.</p>
      <div className={styles.choices}>
        <a href={`/quiz/p/${slug}`} className={styles.choiceBtn}>
          Back to start
        </a>
      </div>
    </div>
  ) : (
    <div className={styles.quiz}>
      <h1>Pre-check: before class</h1>
      <p>{preCheckItems.length} {preCheckItems.length === 1 ? 'question' : 'questions'}. No score shown yet. Just pick your best answer for each.</p>
      <form onSubmit={(e) => e.preventDefault()}>
        {preCheckItems.map((item, qi) => (
          <div key={item.id} className={styles.questionCard}>
            <div className={styles.questionHeader}>
              <span className={styles.questionNumber}>Question {qi + 1} of {preCheckItems.length}</span>
            </div>
            <p className={styles.questionText}>{item.question}</p>
            <div className={styles.options} role="radiogroup" aria-label={item.question}>
              {(item.options ?? []).map((option, idx) => (
                <label key={idx} className={styles.optionLabel}>
                  <input
                    type="radio"
                    name={item.id}
                    value={idx}
                    checked={preAnswers[item.id] === idx}
                    onChange={() => setPreAnswers((prev) => ({ ...prev, [item.id]: idx }))}
                    className={styles.optionInput}
                  />
                  <span className={styles.optionLetter}>{String.fromCharCode(65 + idx)}</span>
                  <span className={styles.optionText}>{option}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <fieldset className={styles.questionCard}>
                  <legend className={styles.questionLegend}>
                    <span className={styles.questionNumber}>Confidence</span>
                    How confident are you in the topics covered today?
                  </legend>
                  <div className={styles.ratingScale} role="radiogroup" aria-label="Confidence">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <label key={n} className={`${styles.segBtn} ${preConfidence === n ? styles.segBtnActive : ''}`}>
                        <input
                          type="radio"
                          name="confidence_pre"
                          value={n}
                          checked={preConfidence === n}
                          onChange={() => setPreConfidence(n)}
                          className={styles.visuallyHidden}
                        />
                        <span>{n}</span>
                      </label>
                    ))}
                  </div>
                  <div className={styles.ratingLabels} aria-hidden="true">
                    <span>1 = Not at all</span>
                    <span>5 = Very confident</span>
                  </div>
                </fieldset>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.submitBtn}
            onClick={handlePreDone}
            disabled={
              !preCheckItems.every((q) => preAnswers[q.id] !== undefined) ||
              preConfidence === undefined
            }
          >
            Done
          </button>
        </div>
      </form>
    </div>
  );

  // Get picked component titles for helpedMost/leastUseful options
  const pickedComponentTitles = pkg?.picks.map((p) => p.title) ?? [];

  const renderPost = () => {
    if (submitted) return renderSuccess();

    return (
      <div className={styles.quiz}>
        <div className={styles.headerWithIssue}>
          <h1>After class: knowledge check</h1>
          <button
            type="button"
            className={styles.issueBtn}
            onClick={() => setShowIssueModal(true)}
            aria-label="Report an issue"
          >
            <Flag size={18} aria-hidden="true" />
            Report an issue
          </button>
        </div>
        <p>{questions.length} {questions.length === 1 ? 'question' : 'questions'} from your package. All multiple choice questions are required.</p>

        <form onSubmit={(e) => e.preventDefault()}>
          {questions.map((q, idx) => (
            <div key={q.id} className={styles.questionCard}>
              <div className={styles.questionHeader}>
                <span className={styles.questionNumber}>Question {idx + 1} of {questions.length}</span>
              </div>
              <p className={styles.questionText}>{q.question}</p>
              {q.qtype === 'short' ? (
                <div className={styles.shortAnswer}>
                  <textarea
                    name={q.id}
                    value={(postAnswers[q.id] as string) ?? ''}
                    onChange={(e) => handlePostQuizChange(q.id, e.target.value)}
                    maxLength={1000}
                    rows={4}
                    className={styles.textarea}
                    placeholder="Your answer in 2-3 sentences"
                    aria-describedby={`${q.id}-counter`}
                  />
                  <div id={`${q.id}-counter`} className={styles.charCounter}>
                    {((postAnswers[q.id] as string) ?? '').length}/1000
                  </div>
                </div>
              ) : (
                <div className={styles.options} role="radiogroup" aria-label={q.question}>
                  {(q.options ?? []).map((option, optIdx) => (
                    <label key={optIdx} className={styles.optionLabel}>
                      <input
                        type="radio"
                        name={q.id}
                        value={optIdx}
                        checked={postAnswers[q.id] === optIdx}
                        onChange={() => handlePostQuizChange(q.id, optIdx)}
                        className={styles.optionInput}
                      />
                      <span className={styles.optionLetter}>{String.fromCharCode(65 + optIdx)}</span>
                      <span className={styles.optionText}>{option}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}

          <hr className={styles.divider} />

          <div className={styles.headerWithIssue}>
            <h2>Before you go</h2>
            <button
              type="button"
              className={styles.issueBtn}
              onClick={() => setShowIssueModal(true)}
              aria-label="Report an issue"
            >
              <Flag size={18} aria-hidden="true" />
              Report an issue
            </button>
          </div>
          <p>Your feedback helps us improve. All questions below are required except the last one.</p>

          <fieldset className={styles.feedbackFieldset}>
                      <legend className={styles.feedbackLegend}>
                        How confident are you in the topics covered today?
                      </legend>
                      <div className={styles.ratingScale} role="radiogroup" aria-label="Confidence">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <label key={n} className={`${styles.segBtn} ${feedbackAnswers.confidence_post === n ? styles.segBtnActive : ''}`}>
                            <input
                              type="radio"
                              name="confidence_post"
                              value={n}
                              checked={feedbackAnswers.confidence_post === n}
                              onChange={() => handleFeedbackChange('confidence_post', n)}
                              className={styles.visuallyHidden}
                            />
                            <span>{n}</span>
                          </label>
                        ))}
                      </div>
                      <div className={styles.ratingLabels} aria-hidden="true">
                        <span>1 = Not at all</span>
                        <span>5 = Very confident</span>
                      </div>
                    </fieldset>


          <fieldset className={styles.feedbackFieldset}>
            <legend className={styles.feedbackLegend}>
              Which activity helped you learn most?
            </legend>
            <div className={styles.helpedOptions} role="radiogroup" aria-label="Helped most">
              {pickedComponentTitles.map((title) => (
                <label key={title} className={styles.helpedLabel}>
                  <input
                    type="radio"
                    name="helpedMost"
                    value={title}
                    checked={feedbackAnswers.helpedMost === title}
                    onChange={() => handleFeedbackChange('helpedMost', title)}
                    className={styles.visuallyHidden}
                  />
                  <span className={styles.helpedText}>{title}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.feedbackFieldset}>
            <legend className={styles.feedbackLegend}>
              Which activity was least useful for you?
            </legend>
            <div className={styles.helpedOptions} role="radiogroup" aria-label="Least useful">
              {pickedComponentTitles.map((title) => {
                const isDisabled = title === feedbackAnswers.helpedMost;
                return (
                  <label key={title} className={`${styles.helpedLabel} ${isDisabled ? styles.disabledLabel : ''}`}>
                    <input
                      type="radio"
                      name="leastUseful"
                      value={title}
                      checked={feedbackAnswers.least_useful === title}
                      onChange={() => !isDisabled && handleFeedbackChange('least_useful', title)}
                      disabled={isDisabled}
                      className={styles.visuallyHidden}
                    />
                    <span className={styles.helpedText}>{title}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className={styles.feedbackFieldset}>
            <legend className={styles.feedbackLegend}>
              How satisfied were you with today's session?
            </legend>
            <div className={styles.ratingScale} role="radiogroup" aria-label="Satisfaction">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className={`${styles.segBtn} ${feedbackAnswers.satisfaction === n ? styles.segBtnActive : ''}`}>
                  <input
                    type="radio"
                    name="satisfaction"
                    value={n}
                    checked={feedbackAnswers.satisfaction === n}
                    onChange={() => handleFeedbackChange('satisfaction', n)}
                    className={styles.visuallyHidden}
                  />
                  <span>{n}</span>
                </label>
              ))}
            </div>
            <div className={styles.ratingLabels} aria-hidden="true">
              <span>1 = Not at all</span>
              <span>5 = Very satisfied</span>
            </div>
          </fieldset>

          <fieldset className={styles.feedbackFieldset}>
            <legend className={styles.feedbackLegend}>
              Would you recommend this session to a friend?
            </legend>
            <div className={styles.segBtns} role="radiogroup" aria-label="Recommend">
              <label className={`${styles.segBtn} ${feedbackAnswers.wouldRecommend === true ? styles.segBtnActive : ''}`}>
                <input
                  type="radio"
                  name="wouldRecommend"
                  value="yes"
                  checked={feedbackAnswers.wouldRecommend === true}
                  onChange={() => handleFeedbackChange('wouldRecommend', true)}
                  className={styles.visuallyHidden}
                />
                <span>Yes</span>
              </label>
              <label className={`${styles.segBtn} ${feedbackAnswers.wouldRecommend === false ? styles.segBtnActive : ''}`}>
                <input
                  type="radio"
                  name="wouldRecommend"
                  value="no"
                  checked={feedbackAnswers.wouldRecommend === false}
                  onChange={() => handleFeedbackChange('wouldRecommend', false)}
                  className={styles.visuallyHidden}
                />
                <span>No</span>
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
        <a href={`/quiz/p/${slug}?reset=1`} className={styles.resetLink}>
          Start over
        </a>
      </p>
    </div>
  );

  const renderIssueModal = () => (
    <div className={styles.modalOverlay} onClick={() => setShowIssueModal(false)}>
      <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="issue-title">
        <div className={styles.modalHeader}>
          <h2 id="issue-title">Report an Issue</h2>
          <button type="button" className={styles.modalClose} onClick={() => setShowIssueModal(false)} aria-label="Close">
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          <p>Help us improve by reporting a problem with this quiz.</p>
          <div className={styles.formGroup}>
            <label htmlFor="issue-severity" className={styles.label}>Severity</label>
            <select
              id="issue-severity"
              value={issueSeverity}
              onChange={e => setIssueSeverity(e.target.value as 'low' | 'medium' | 'high' | 'critical')}
              className={styles.select}
            >
              <option value="low">Low - Minor inconvenience</option>
              <option value="medium">Medium - Affects my experience</option>
              <option value="high">High - Prevents me from completing the quiz</option>
              <option value="critical">Critical - Data loss or security issue</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="issue-message" className={styles.label}>Description</label>
            <textarea
              id="issue-message"
              value={issueMessage}
              onChange={e => setIssueMessage(e.target.value)}
              rows={5}
              className={styles.textarea}
              placeholder="Describe the issue you encountered..."
              maxLength={2000}
            />
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button type="button" className={styles.btnSecondary} onClick={() => setShowIssueModal(false)}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleReportIssue}
            disabled={!issueMessage.trim() || issueSubmitting}
          >
            {issueSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
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
        {step === 'start' && renderStart()}
        {step === 'pre' && renderPre()}
        {step === 'post' && renderPost()}
        {step === 'success' && renderSuccess()}
        {showIssueModal && renderIssueModal()}
      </div>
    </article>
  );
}