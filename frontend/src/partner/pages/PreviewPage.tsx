import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Printer } from 'lucide-react';
import { getApprovedBankItems, type BankItem } from '../../shared/services/bankApi';
import {
  assembleLessonPlan,
  type LessonPlan,
  type LessonLevel,
} from '../../shared/services/assembleLessonPlan';
import styles from './PreviewPage.module.css';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdaptOptions {
  quizEnabled: boolean;
  quizType: string;
  quizDifficulty: string;
  quizCount: number;
  itemIds: string[];
  componentIds: string[];
  lessonPlanEnabled?: boolean;
  lessonPlanLength?: 30 | 60 | 90 | 120;
  lessonPlanLevel?: LessonLevel;
}

// ─── PreviewPage ─────────────────────────────────────────────────────────────

export function PreviewPage() {
  const navigate = useNavigate();

  const [adaptOptions, setAdaptOptions] = useState<AdaptOptions | null>(null);
  const [questions, setQuestions] = useState<BankItem[]>([]);
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [lessonPlanError, setLessonPlanError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [reportingItemId, setReportingItemId] = useState<string | null>(null);
  const [reportMessage, setReportMessage] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone, setReportDone] = useState(false);

  useEffect(() => {
    document.title = 'Preview your package — OceanX Education';

    const rawOptions = sessionStorage.getItem('adaptOptions');
    if (!rawOptions) {
      setLoading(false);
      return;
    }

    let opts: AdaptOptions;
    try {
      opts = JSON.parse(rawOptions) as AdaptOptions;
    } catch {
      setLoading(false);
      return;
    }

    setAdaptOptions(opts);

    // Assemble lesson plan if enabled
    if (opts.lessonPlanEnabled && opts.lessonPlanLength && opts.lessonPlanLevel) {
      const quizSummary =
        opts.quizEnabled && opts.itemIds.length > 0
          ? { type: opts.quizType, count: opts.quizCount }
          : undefined;
      const result = assembleLessonPlan(
        opts.componentIds,
        { length: opts.lessonPlanLength, level: opts.lessonPlanLevel },
        quizSummary,
      );
      if ('error' in result) {
        setLessonPlanError(result.error);
      } else {
        setLessonPlan(result);
      }
    }

    if (!opts.quizEnabled || opts.itemIds.length === 0) {
      setLoading(false);
      return;
    }

    getApprovedBankItems()
      .then((all) => {
        const filtered = all.filter((q) => opts.itemIds.includes(q.id));
        // Preserve the order from itemIds (the assembled order)
        const ordered = opts.itemIds
          .map((id) => filtered.find((q) => q.id === id))
          .filter((q): q is BankItem => q !== undefined);
        setQuestions(ordered);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    return () => { document.title = 'OceanX Education'; };
  }, []);

  const handleReportSubmit = async () => {
    if (!reportMessage.trim()) return;
    setReportSubmitting(true);
    // Insert directly via Supabase — package_id is null until package is created
    try {
      const { supabase, isSupabaseConfigured } = await import('../../shared/services/supabase');
      if (!isSupabaseConfigured || !supabase) {
        alert('Saving is not available right now.');
        setReportSubmitting(false);
        return;
      }
      await supabase.from('issue_reports').insert({
        item_id: reportingItemId ?? null,
        message: reportMessage.trim(),
      });
      setReportDone(true);
      setReportMessage('');
      setTimeout(() => {
        setReportingItemId(null);
        setReportDone(false);
      }, 2000);
    } catch {
      alert('Could not submit report. Please try again.');
    }
    setReportSubmitting(false);
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.loading}>Loading preview...</div>
        </div>
      </div>
    );
  }

  if (!adaptOptions) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <button type="button" className={styles.backLink} onClick={() => navigate(-1)}>
            ← Back
          </button>
          <p style={{ color: 'var(--text-muted)', marginTop: 32 }}>
            No options found. Please go back and set quiz options first.
          </p>
        </div>
      </div>
    );
  }

  const LETTERS = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <button type="button" className={styles.backLink} onClick={() => navigate(-1)}>
          ← Back
        </button>

        <header className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.h1}>Preview your package</h1>
            <p className={styles.subtitle}>
              This is what learners will see. Check it before sending.
            </p>
          </div>
          <div className={styles.headerActions}>
            {adaptOptions.quizEnabled && questions.length > 0 && (
              <button
                type="button"
                className={`${styles.answerKeyBtn} ${showAnswerKey ? styles.active : ''}`}
                onClick={() => setShowAnswerKey((v) => !v)}
              >
                {showAnswerKey ? (
                  <><EyeOff size={14} aria-hidden="true" /> Hide answers</>
                ) : (
                  <><Eye size={14} aria-hidden="true" /> Show answers</>
                )}
              </button>
            )}
            <button
              type="button"
              className={styles.downloadBtn}
              onClick={() => window.print()}
            >
              <Printer size={14} aria-hidden="true" />
              Print / Save as PDF
            </button>
          </div>
        </header>

        {/* ── Quiz section ── */}
        <section className={styles.section} aria-labelledby="quiz-preview-heading">
          <h2 className={styles.h2} id="quiz-preview-heading">Knowledge check</h2>

          {!adaptOptions.quizEnabled ? (
            <div className={styles.noQuizBanner}>
              <p>No knowledge check included in this package.</p>
            </div>
          ) : questions.length === 0 ? (
            <div className={styles.noQuizBanner}>
              <p>No questions could be loaded. Go back and adjust your options.</p>
            </div>
          ) : (
            questions.map((q, idx) => (
              <div key={q.id} className={styles.questionCard}>
                <div className={styles.questionMeta}>
                  <span className={styles.questionNum}>Question {idx + 1} of {questions.length}</span>
                  <span className={styles.qTypeBadge}>{q.qtype === 'mcq' ? 'MCQ' : 'Short answer'}</span>
                  <span className={`${styles.diffBadge} ${styles[q.difficulty]}`}>
                    {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
                  </span>
                  <span className={styles.componentLabel}>{q.component_id}</span>
                </div>

                <p className={styles.questionText}>{q.question}</p>

                {q.qtype === 'mcq' && q.options && (
                  <div className={styles.optionList}>
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = showAnswerKey && q.correct_index === optIdx;
                      return (
                        <div
                          key={optIdx}
                          className={`${styles.optionItem} ${isCorrect ? styles.correct : ''}`}
                        >
                          <span className={styles.optionLetter}>{LETTERS[optIdx]}</span>
                          <span>{opt}</span>
                          {isCorrect && <span className={styles.correctMark}>Correct</span>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {q.qtype === 'short' && showAnswerKey && q.answer && (
                  <div className={styles.answerKey}>
                    <p className={styles.answerKeyLabel}>Answer guide</p>
                    <p className={styles.answerKeyText}>{q.answer}</p>
                  </div>
                )}

                <div className={styles.reportRow}>
                  <button
                    type="button"
                    className={styles.reportLink}
                    onClick={() => setReportingItemId(q.id)}
                  >
                    Report an issue with this question
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        {/* ── Lesson plan section ── */}
        {adaptOptions.lessonPlanEnabled && (
          <section className={styles.section} aria-labelledby="lp-preview-heading">
            <h2 className={styles.h2} id="lp-preview-heading">Lesson plan</h2>

            {lessonPlanError ? (
              <div className={styles.noQuizBanner}>
                <p>{lessonPlanError}</p>
              </div>
            ) : lessonPlan ? (
              <div className={styles.lessonPlanCard}>
                <div className={styles.lpHeader}>
                  <p className={styles.lpMeta}>
                    {lessonPlan.length} min &middot; {lessonPlan.level.charAt(0).toUpperCase() + lessonPlan.level.slice(1)}
                  </p>
                  <p className={styles.lpIntention}>
                    <strong>Learning intention</strong> {lessonPlan.learningIntention}
                  </p>
                  <p className={styles.lpIntention}>
                    <strong>Driving question</strong> {lessonPlan.drivingQuestion}
                  </p>
                </div>

                <table className={styles.lpTable}>
                  <thead>
                    <tr>
                      <th>Stage</th>
                      <th>Activity</th>
                      <th>Time</th>
                      <th className={styles.lpColWide}>How to run</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lessonPlan.timeline.map((row, idx) => (
                      <tr key={idx} className={row.isSample ? styles.lpRowSample : undefined}>
                        <td className={styles.lpStage}>{row.stage}</td>
                        <td className={styles.lpLabel}>
                          {row.label}
                          {row.isSample && <span className={styles.lpSampleMark}> *</span>}
                        </td>
                        <td className={styles.lpTime}>{row.minutes} min</td>
                        <td className={styles.lpHowToRun}>
                          {row.howToRun}
                          {row.prompts && row.prompts.length > 0 && (
                            <ul className={styles.lpPrompts}>
                              {row.prompts.map((p, pi) => (
                                <li key={pi}>
                                  {p.text}
                                  {p.sample && <span className={styles.lpSampleMark}> *</span>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {lessonPlan.hasSampleContent && (
                  <p className={styles.lpSampleNote}>
                    * Content marked with an asterisk is a sample or adaptation not included in the OceanX Educator Guide.
                  </p>
                )}

                <p className={styles.lpLevelNote}>{lessonPlan.levelNote}</p>
              </div>
            ) : null}
          </section>
        )}

        {/* ── Actions ── */}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.continuePill}
            onClick={() => navigate('/partner/adapt/review')}
          >
            Continue to send
          </button>
        </div>
      </div>

      {/* ── Report issue modal ── */}
      {reportingItemId !== null && (
        <div className={styles.modalOverlay} onClick={() => setReportingItemId(null)}>
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
          >
            <div className={styles.modalHeader}>
              <h2 id="report-title">Report an issue</h2>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setReportingItemId(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            {reportDone ? (
              <p>Thank you. The OceanX team will review your report.</p>
            ) : (
              <>
                <div className={styles.formGroup}>
                  <label htmlFor="report-message" className={styles.label}>
                    Describe the issue
                  </label>
                  <textarea
                    id="report-message"
                    value={reportMessage}
                    onChange={(e) => setReportMessage(e.target.value)}
                    rows={5}
                    className={styles.textarea}
                    placeholder="e.g. The correct answer seems wrong, or the question is unclear..."
                    maxLength={2000}
                  />
                </div>
                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => setReportingItemId(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={handleReportSubmit}
                    disabled={!reportMessage.trim() || reportSubmitting}
                  >
                    {reportSubmitting ? 'Submitting...' : 'Submit report'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
