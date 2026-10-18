import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { getApprovedBankItems } from '../../shared/services/bankApi';
import { assembleQuiz, type QuizType, type QuizDifficulty } from '../../shared/services/assembleQuiz';
import styles from './OptionsPage.module.css';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StoredPick {
  id: string;
  title: string;
  status: string;
  stage: string;
}

interface StoredRec {
  id: string;
  title: string;
  stage: string;
}

interface AdaptPackage {
  audience: string;
  picks: StoredPick[];
  recommendations: StoredRec[];
}

// ─── OptionsPage ─────────────────────────────────────────────────────────────

export function OptionsPage() {
  const navigate = useNavigate();

  const [pkg, setPkg] = useState<AdaptPackage | null>(null);
  const [quizEnabled, setQuizEnabled] = useState(true);
  const [quizType, setQuizType] = useState<QuizType>('mcq');
  const [quizDifficulty, setQuizDifficulty] = useState<QuizDifficulty>('medium');
  const [quizCount, setQuizCount] = useState(4);
  const [assembleError, setAssembleError] = useState<string | null>(null);
  const [proceeding, setProceeding] = useState(false);

  useEffect(() => {
    document.title = 'Set quiz options — OceanX Education';
    const raw = sessionStorage.getItem('adaptPackage');
    if (raw) {
      try {
        setPkg(JSON.parse(raw) as AdaptPackage);
      } catch {
        // malformed — show no-package state
      }
    }
    return () => { document.title = 'OceanX Education'; };
  }, []);

  // Clear assemble error when options change
  useEffect(() => {
    setAssembleError(null);
  }, [quizEnabled, quizType, quizDifficulty, quizCount]);

  if (!pkg) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <p className={styles.noPackageMsg}>
            No package found. Go back to the library and build your version first.
          </p>
          <Link to="/partner/library" className={styles.pill}>
            Back to library
          </Link>
        </div>
      </div>
    );
  }

  const componentIds = [
    ...pkg.picks.map((p) => p.id),
    ...pkg.recommendations.map((r) => r.id),
  ];

  const handleContinue = async () => {
    setProceeding(true);
    setAssembleError(null);

    if (!quizEnabled) {
      sessionStorage.setItem(
        'adaptOptions',
        JSON.stringify({
          quizEnabled: false,
          quizType,
          quizDifficulty,
          quizCount,
          itemIds: [],
          componentIds,
        }),
      );
      navigate('/partner/adapt/preview');
      return;
    }

    try {
      const approvedItems = await getApprovedBankItems();
      const result = assembleQuiz(approvedItems, {
        componentIds,
        qtype: quizType,
        difficulty: quizDifficulty,
        count: quizCount,
      });

      if (result.error) {
        setAssembleError(result.error);
        setProceeding(false);
        return;
      }

      sessionStorage.setItem(
        'adaptOptions',
        JSON.stringify({
          quizEnabled: true,
          quizType,
          quizDifficulty,
          quizCount,
          itemIds: result.itemIds,
          componentIds,
        }),
      );
      navigate('/partner/adapt/preview');
    } catch {
      setAssembleError('Could not load the question bank. Please check your connection and try again.');
      setProceeding(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <button
          type="button"
          className={styles.backLink}
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        <header className={styles.pageHeader}>
          <h1 className={styles.h1}>Set quiz options</h1>
          <p className={styles.subtitle}>
            Choose how the knowledge check is assembled for your learners.
          </p>
        </header>

        {/* ── Quiz on/off ── */}
        <section className={styles.section}>
          <div className={styles.toggleRow}>
            <div>
              <p className={styles.toggleLabel}>Include a knowledge check</p>
              <p className={styles.toggleDesc}>
                A short quiz sent with your package so learners can check what they know before and after class.
              </p>
            </div>
            <label className={styles.toggle} aria-label="Include knowledge check">
              <input
                type="checkbox"
                checked={quizEnabled}
                onChange={(e) => setQuizEnabled(e.target.checked)}
              />
              <span className={styles.toggleSlider} />
            </label>
          </div>

          {/* ── Quiz options ── */}
          <div className={`${styles.optionsGrid} ${!quizEnabled ? styles.disabled : ''}`}>

            {/* Type */}
            <fieldset className={styles.fieldGroup}>
              <legend className={styles.fieldLabel}>Question type</legend>
              <div className={styles.pillGroup} role="radiogroup">
                {(['mcq', 'short', 'mixed'] as const).map((t) => (
                  <label key={t} className={styles.pillOption}>
                    <input
                      type="radio"
                      name="quizType"
                      value={t}
                      checked={quizType === t}
                      disabled={!quizEnabled}
                      onChange={() => setQuizType(t)}
                    />
                    <span className={styles.pillText}>
                      {t === 'mcq' ? 'Multiple choice' : t === 'short' ? 'Short answer' : 'Mixed'}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Difficulty */}
            <fieldset className={styles.fieldGroup}>
              <legend className={styles.fieldLabel}>Difficulty</legend>
              <div className={styles.pillGroup} role="radiogroup">
                {(['easy', 'medium', 'hard', 'mixed'] as const).map((d) => (
                  <label key={d} className={styles.pillOption}>
                    <input
                      type="radio"
                      name="quizDifficulty"
                      value={d}
                      checked={quizDifficulty === d}
                      disabled={!quizEnabled}
                      onChange={() => setQuizDifficulty(d)}
                    />
                    <span className={styles.pillText}>
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Count */}
            <div className={styles.fieldGroup}>
              <p className={styles.fieldLabel}>Number of questions</p>
              <div className={styles.countRow}>
                <button
                  type="button"
                  className={styles.countBtn}
                  onClick={() => setQuizCount((n) => Math.max(3, n - 1))}
                  disabled={!quizEnabled || quizCount <= 3}
                  aria-label="Decrease question count"
                >
                  −
                </button>
                <span className={styles.countValue} aria-live="polite" aria-atomic="true">
                  {quizCount}
                </span>
                <button
                  type="button"
                  className={styles.countBtn}
                  onClick={() => setQuizCount((n) => Math.min(10, n + 1))}
                  disabled={!quizEnabled || quizCount >= 10}
                  aria-label="Increase question count"
                >
                  +
                </button>
              </div>
            </div>

          </div>

          {assembleError && (
            <div className={styles.assembleError} role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <p>{assembleError}</p>
            </div>
          )}
        </section>

        {/* ── Lesson plan stub ── */}
        <section className={styles.section} aria-labelledby="lesson-plan-heading">
          <h2 className={styles.h2} id="lesson-plan-heading">Lesson plan</h2>
          <div className={styles.comingSoon}>
            <strong>Coming in the next step</strong>
            Lesson plan options will be available in an upcoming update.
          </div>
        </section>

        <button
          type="button"
          className={styles.continuePill}
          onClick={handleContinue}
          disabled={proceeding}
        >
          {proceeding ? (
            <>
              <span className={styles.sendingDots} aria-hidden="true">
                <span /><span /><span />
              </span>
              Checking bank...
            </>
          ) : (
            'Preview and send'
          )}
        </button>
      </div>
    </div>
  );
}
