import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, AlertCircle } from 'lucide-react';
import {
  assembleLessonPlan,
  type LessonLevel,
} from '../../shared/services/assembleLessonPlan';
import { submitDemoPackage } from '../../team/data/packageReviewService';
import styles from './ReviewPage.module.css';

// ─── Types ──────────────────────────────────────────────────────────────────

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

interface AcceptedRewrite {
  componentId: string;
  componentTitle: string;
  level: 'secondary' | 'university' | 'postgrad';
  length: 'shorter' | 'same' | 'longer';
  originalText: string;
  proposedText: string;
  educatorEmail: string;
  packageId: string;
}

function readAdaptOptions(): AdaptOptions | null {
  try {
    const raw = sessionStorage.getItem('adaptOptions');
    return raw ? (JSON.parse(raw) as AdaptOptions) : null;
  } catch {
    return null;
  }
}

type SendState = 'idle' | 'sending' | 'success' | 'error';

// ─── Email validation ────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL ?? '';

// ─── Detail row for package summary ────────────────────────────────────────

function CheckRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.checkRow}>
      <span className={styles.checkIcon} aria-hidden="true">
        <Check size={14} />
      </span>
      <span className={styles.checkLabel}>{label}</span>
      <span className={styles.checkValue}>{children}</span>
    </div>
  );
}

function PackageSummary() {
  const acceptedRewritesRaw = sessionStorage.getItem('adaptAcceptedRewrites');
  let acceptedRewrites: AcceptedRewrite[] = [];
  if (acceptedRewritesRaw) {
    try {
      acceptedRewrites = JSON.parse(acceptedRewritesRaw) as AcceptedRewrite[];
    } catch {
      // ignore
    }
  }

  const pkgRaw = sessionStorage.getItem('adaptPackage');
  let pkg: { audience: string; picks: Array<{ id: string; title: string; status: string; stage: string }>; recommendations: Array<{ id: string; title: string; stage: string }> } | null = null;
  if (pkgRaw) {
    try {
      pkg = JSON.parse(pkgRaw);
    } catch {
      // ignore
    }
  }

  const adaptOptionsData = readAdaptOptions();

  const totalComponents = (pkg?.picks.length ?? 0) + (pkg?.recommendations.length ?? 0);

  return (
    <section className={styles.section} aria-labelledby="summary-heading">
      <h2 className={styles.h2} id="summary-heading">Package summary</h2>

      <div className={styles.checkList}>
        {/* Components selected */}
        <CheckRow
          label="Components selected"
          children={
            <>
              {pkg && totalComponents > 0 ? (
                `${totalComponents}: ${[
                  ...pkg.picks.map((pick) => `${pick.title}${acceptedRewrites.some((r) => r.componentId === pick.id) ? ' (AI version)' : ''}`),
                  ...pkg.recommendations.map((rec) => `${rec.title}${acceptedRewrites.some((r) => r.componentId === rec.id) ? ' (AI version)' : ''}`)
                ].join(', ')}`
              ) : (
                'None'
              )}
            </>
          }
        />

        {/* Knowledge check */}
        {adaptOptionsData?.quizEnabled && (adaptOptionsData?.itemIds.length ?? 0) > 0 ? (() => {
          const itemIds = adaptOptionsData!.itemIds;
          const quizType = adaptOptionsData!.quizType;
          const quizDifficulty = adaptOptionsData!.quizDifficulty;
          return (
            <CheckRow
              label="Knowledge check"
              children={
                <>
                  {itemIds.length} {quizType === 'mcq' ? 'MCQ' : quizType === 'short' ? 'short answer' : 'mixed'}, {quizDifficulty}
                  <a href="/preview/quiz" target="_blank" rel="noopener noreferrer" className={styles.addLink} style={{ marginLeft: 'var(--space-2)' }}>
                    Preview
                  </a>
                </>
              }
            />
          );
        })() : (
          <div className={styles.checkRowMuted}>
            <span className={styles.checkIconMuted} aria-hidden="true" />
            <span className={styles.checkLabel}>Knowledge check</span>
            <span className={styles.checkValueMuted}>Not included · <a href="/partner/adapt" className={styles.addLink}>Add</a></span>
          </div>
        )}

        {/* Lesson plan */}
        {adaptOptionsData?.lessonPlanEnabled ? (() => {
          const lp = adaptOptionsData!;
          const level = lp.lessonPlanLevel ? lp.lessonPlanLevel.charAt(0).toUpperCase() + lp.lessonPlanLevel.slice(1) : 'Intermediate';
          return (
            <CheckRow
              label="Lesson plan"
              children={
                <>
                  {lp.lessonPlanLength ?? 60} min, {level}
                  <a href="/preview/lesson" target="_blank" rel="noopener noreferrer" className={styles.addLink} style={{ marginLeft: 'var(--space-2)' }}>
                    Preview
                  </a>
                </>
              }
            />
          );
        })() : (
          <div className={styles.checkRowMuted}>
            <span className={styles.checkIconMuted} aria-hidden="true" />
            <span className={styles.checkLabel}>Lesson plan</span>
            <span className={styles.checkValueMuted}>Not included · <a href="/partner/adapt" className={styles.addLink}>Add</a></span>
          </div>
        )}
      </div>

      {/* Always shown review gate message */}
      <p className={styles.gateNotice}>
        Your package will be automatically checked before delivery. Only flagged materials require additional review by OceanX Education.
        {' '}Demo mode uses deterministic examples; no email is sent.
      </p>
    </section>
  );
}

// ─── ReviewPage ──────────────────────────────────────────────────────────────

export function ReviewPage() {
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const h1Ref = useRef<HTMLHeadingElement>(null);

  const scrollToTopAndFocus = useCallback(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    setTimeout(() => h1Ref.current?.focus({ preventScroll: true }), 0);
  }, []);

  const [pkg, setPkg] = useState<AdaptPackage | null>(null);
  const [acceptedRewrites, setAcceptedRewrites] = useState<AcceptedRewrite[]>([]);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [emailTouched, setEmailTouched] = useState(false);
  const [sendState, setSendState] = useState<SendState>('idle');
  const [sentForReview, setSentForReview] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Scroll to top when auto-check completes and content appears.
  useEffect(() => {
    if (!checking) scrollToTopAndFocus();
  }, [checking, scrollToTopAndFocus]);

  // Scroll to top when the success view replaces the form.
  useEffect(() => {
    if (sendState === 'success') scrollToTopAndFocus();
  }, [sendState, scrollToTopAndFocus]);

  // Read package from sessionStorage, simulate auto-check delay
  useEffect(() => {
    document.title = 'Review your package — OceanX Education';
    const raw = sessionStorage.getItem('adaptPackage');
    if (raw) {
      try {
        setPkg(JSON.parse(raw) as AdaptPackage);
      } catch {
        // malformed — will show no-package state
      }
    }

    // Read accepted AI rewrites
    const rewritesRaw = sessionStorage.getItem('adaptAcceptedRewrites');
    if (rewritesRaw) {
      try {
        setAcceptedRewrites(JSON.parse(rewritesRaw) as AcceptedRewrite[]);
      } catch {
        // ignore
      }
    }

    const t = setTimeout(() => setChecking(false), 1000);
    return () => {
      clearTimeout(t);
      document.title = 'OceanX Education';
    };
  }, []);

  const emailInvalid = emailTouched && email.length > 0 && !isValidEmail(email);
  const canSend =
    pkg !== null &&
    !checking &&
    isValidEmail(email) &&
    sendState !== 'sending' &&
    sendState !== 'success';

  const handleSend = async () => {
    if (!canSend || !pkg) return;
    setSendState('sending');
    setErrorMessage('');

    const adaptOptions = readAdaptOptions();
    const quizEnabled = adaptOptions?.quizEnabled ?? false;
    const lpEnabled = adaptOptions?.lessonPlanEnabled ?? false;
    let assembledPlan: ReturnType<typeof assembleLessonPlan> | null = null;
    if (lpEnabled && adaptOptions?.lessonPlanLength && adaptOptions?.lessonPlanLevel) {
      const quizSummary =
        quizEnabled && (adaptOptions.itemIds.length ?? 0) > 0
          ? { type: adaptOptions.quizType, count: adaptOptions.quizCount }
          : undefined;
      assembledPlan = assembleLessonPlan(
        adaptOptions.componentIds,
        { length: adaptOptions.lessonPlanLength, level: adaptOptions.lessonPlanLevel },
        quizSummary,
      );
      if ('error' in assembledPlan) {
        setSendState('error');
        setErrorMessage(`Lesson plan error: ${assembledPlan.error}`);
        return;
      }
    }

    const lessonPlanData = assembledPlan && !('error' in assembledPlan) ? assembledPlan : null;
    try {
      const record = submitDemoPackage({
        educatorEmail: email.trim(),
        audience: pkg.audience,
        picks: pkg.picks,
        recommendations: pkg.recommendations,
        acceptedRewrites,
        quiz: quizEnabled
          ? {
              title: adaptOptions?.itemIds.length ? 'Knowledge Check' : undefined,
              componentIds: adaptOptions?.componentIds ?? [],
              options: adaptOptions
                ? { type: adaptOptions.quizType, difficulty: adaptOptions.quizDifficulty, count: adaptOptions.quizCount }
                : {},
              itemIds: adaptOptions?.itemIds ?? [],
            }
          : undefined,
        quizSummary: quizEnabled
          ? `${adaptOptions?.itemIds.length ?? 0} ${adaptOptions?.quizType ?? 'mixed'} question(s)`
          : undefined,
        lessonPlan: lessonPlanData ?? undefined,
        lessonPlanSummary: lessonPlanData
          ? `${lessonPlanData.length} minutes, ${lessonPlanData.level} level`
          : undefined,
      });
      setSentForReview(record.status === 'pending_review');
      setSendState('success');
      sessionStorage.removeItem('adaptPackage');
      sessionStorage.removeItem('adaptOptions');
      sessionStorage.removeItem('adaptAcceptedRewrites');
    } catch (err) {
      setSendState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Package submission failed. Nothing was sent.');
    }
  };

  // No package state
  if (!pkg && !checking) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <p className={styles.noPackageMsg}>
            No package to review. Go back to the library and build your version first.
          </p>
          <Link to="/partner/library" className={styles.pill}>
            Back to library
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (sendState === 'success') {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.successBlock}>
            <span className={styles.successIcon} aria-hidden="true">
              <Check size={28} />
            </span>
            {sentForReview ? (
              <>
                <h1 className={styles.h1} ref={h1Ref} tabIndex={-1}>Your package requires additional review.</h1>
                <p className={styles.successDesc}>
                  In a live workflow, OceanX Education would email your resources once the review is complete. Demo mode: no email was sent.
                </p>
              </>
            ) : (
              <>
                <h1 className={styles.h1} ref={h1Ref} tabIndex={-1}>Your package has passed the review check.</h1>
                <p className={styles.successDesc}>
                  Demo mode: the package was recorded for preview. No email was sent to <strong>{email}</strong>.
                </p>
              </>
            )}
            <div className={styles.successActions}>
              <Link to="/partner/library" className={styles.pill}>
                Back to library
              </Link>
              <button
                type="button"
                className={styles.pillSecondary}
                onClick={() => {
                  setSendState('idle');
                  setSentForReview(false);
                  setEmail('');
                  setEmailTouched(false);
                }}
              >
                Send to another address
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.pageHeader}>
          <button
            type="button"
            className={styles.backLink}
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
          <h1 className={styles.h1} ref={h1Ref} tabIndex={-1}>Review your package</h1>
          <p className={styles.subtitle}>
            Check what will be included in the demo package, then enter your email address.
          </p>
        </header>

        {/* ── Package summary ── */}
        <PackageSummary />

        {/* ── Email section ── */}
        <section className={styles.section} aria-labelledby="email-heading">
          <h2 className={styles.h2} id="email-heading">Educator email</h2>

          {sendState === 'error' && (
            <div className={styles.errorBanner} role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <p>{errorMessage || 'Something went wrong. Please try again.'}</p>
              <button
                type="button"
                className={styles.retryLink}
                onClick={() => setSendState('idle')}
              >
                Try again
              </button>
            </div>
          )}

          <div className={styles.emailField}>
            <label htmlFor="email-input" className={styles.emailLabel}>
              Your email address
            </label>
            <input
              ref={emailRef}
              id="email-input"
              type="email"
              className={`${styles.emailInput} ${emailInvalid ? styles.emailInputError : ''}`}
              value={email}
              onChange={e => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              placeholder="professor@university.edu"
              aria-invalid={emailInvalid}
              aria-describedby={emailInvalid ? 'email-error' : undefined}
              disabled={sendState === 'sending'}
              autoComplete="email"
            />
            {emailInvalid && (
              <p id="email-error" className={styles.emailError} role="alert">
                Enter a valid email address.
              </p>
            )}
          </div>

          <button
            type="button"
            className={`${styles.sendPill} ${!canSend ? styles.sendPillDisabled : ''}`}
            onClick={handleSend}
            aria-disabled={!canSend}
            disabled={!canSend}
          >
            {sendState === 'sending' ? (
              <>
                <span className={styles.sendingDots} aria-hidden="true">
                  <span /><span /><span />
                </span>
                Checking...
              </>
            ) : (
              'Submit package'
            )}
          </button>
        </section>
      </div>
    </div>
  );
}
