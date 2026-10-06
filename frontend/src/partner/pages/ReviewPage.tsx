import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, AlertCircle, ExternalLink } from 'lucide-react';
import {
  sendPackage,
  emailjsConfigured,
  DEMO_EMAIL,
  MissingEnvError,
  type PackagePayload,
} from '../../shared/services/sendPackage';
import type { GeneratedQuiz, GeneratedLessonPlan } from '../../shared/services/generateExtras';
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
  quiz: GeneratedQuiz | null;
  lessonPlan: GeneratedLessonPlan | null;
}

type SendState = 'idle' | 'sending' | 'success' | 'error' | 'missing-env';

// ─── Email validation ────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ─── Check row ───────────────────────────────────────────────────────────────

function CheckRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.checkRow}>
      <span className={styles.checkIcon} aria-hidden="true">
        <Check size={14} />
      </span>
      <span className={styles.checkLabel}>{label}</span>
      <span className={styles.checkValue}>{value}</span>
    </div>
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
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [emailTouched, setEmailTouched] = useState(false);
  const [sendState, setSendState] = useState<SendState>('idle');
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

    const payload: PackagePayload = {
      email: email.trim(),
      audience: pkg.audience,
      picks: pkg.picks,
      recommendations: pkg.recommendations,
      quizTitle: pkg.quiz?.title,
      lessonPlanTitle: pkg.lessonPlan?.title,
      lessonPlanUrl: pkg.lessonPlan?.pdfUrl,
    };

    try {
      await sendPackage(payload);
      setSendState('success');
      sessionStorage.removeItem('adaptPackage');
    } catch (err) {
      console.error('[sendPackage error]', err);
      if (err instanceof MissingEnvError) {
        setSendState('missing-env');
        setErrorMessage(err.message);
      } else {
        setSendState('error');
        // EmailJS rejects with {status, text} — not an Error instance
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === 'object' && err !== null && 'text' in err
            ? String((err as { text: unknown }).text)
            : 'Something went wrong. Please try again.';
        setErrorMessage(msg);
      }
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
            <h1 className={styles.h1} ref={h1Ref} tabIndex={-1}>Your package is on its way.</h1>
            <p className={styles.successDesc}>
              Check <strong>{email}</strong> for your seminar links. Allow a few minutes for delivery.
            </p>
            <div className={styles.successActions}>
              <Link to="/partner/library" className={styles.pill}>
                Back to library
              </Link>
              <button
                type="button"
                className={styles.pillSecondary}
                onClick={() => {
                  setSendState('idle');
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

  const totalComponents = (pkg?.picks.length ?? 0) + (pkg?.recommendations.length ?? 0);

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
            Check what will be sent, then enter your email to receive the links.
          </p>
        </header>

        {/* ── Auto-check section ── */}
        <section className={styles.section} aria-labelledby="check-heading" aria-busy={checking}>
          <h2 className={styles.h2} id="check-heading">Automatic check</h2>

          {checking ? (
            <div className={styles.checkingRow}>
              <span className={styles.checkingDots} aria-hidden="true">
                <span /><span /><span />
              </span>
              <p className={styles.checkingLabel}>Reviewing your package...</p>
            </div>
          ) : (
            <>
            <div className={styles.checkList}>
              <CheckRow
                label="Components selected"
                value={`${totalComponents} (${pkg?.picks.length ?? 0} ${(pkg?.picks.length ?? 0) === 1 ? 'pick' : 'picks'}, ${pkg?.recommendations.length ?? 0} ${(pkg?.recommendations.length ?? 0) === 1 ? 'recommendation' : 'recommendations'})`}
              />
              {pkg?.quiz ? (
                <CheckRow label="Quiz" value={pkg.quiz.title} />
              ) : (
                <div className={styles.checkRowMuted}>
                  <span className={styles.checkIconMuted} aria-hidden="true" />
                  <span className={styles.checkLabel}>Quiz</span>
                  <span className={styles.checkValueMuted}>Not included</span>
                </div>
              )}
              {pkg?.lessonPlan ? (
                <div className={styles.checkRow}>
                  <span className={styles.checkIcon} aria-hidden="true">
                    <Check size={14} />
                  </span>
                  <span className={styles.checkLabel}>Lesson plan</span>
                  <div className={styles.checkValueWithLink}>
                    <span className={styles.checkValue}>{pkg.lessonPlan.title}</span>
                    <a
                      href={pkg.lessonPlan.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.pdfLink}
                    >
                      Open PDF
                      <ExternalLink size={12} aria-hidden="true" />
                      <span className="visually-hidden">(opens in a new tab)</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className={styles.checkRowMuted}>
                  <span className={styles.checkIconMuted} aria-hidden="true" />
                  <span className={styles.checkLabel}>Lesson plan</span>
                  <span className={styles.checkValueMuted}>Not included</span>
                </div>
              )}
            </div>
            <p className={styles.gateNotice}>
              Your package has entered the OceanX Education Review Gate. Allow up to 1 business day for your links to arrive.
            </p>
            </>
          )}
        </section>

        {/* ── Email section ── */}
        <section className={styles.section} aria-labelledby="email-heading">
          <h2 className={styles.h2} id="email-heading">Send to</h2>

          {sendState === 'missing-env' && (
            <div className={styles.envWarning} role="alert">
              <AlertCircle size={16} aria-hidden="true" />
              <div>
                <p className={styles.envWarningTitle}>EmailJS not configured</p>
                <p className={styles.envWarningDesc}>
                  Add <code>VITE_EMAILJS_SERVICE_ID</code>,{' '}
                  <code>VITE_EMAILJS_TEMPLATE_ID</code>, and{' '}
                  <code>VITE_EMAILJS_PUBLIC_KEY</code> to your <code>.env</code> file, then restart the dev server.
                </p>
              </div>
            </div>
          )}

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

          {!emailjsConfigured() && sendState === 'idle' && (
            <div className={styles.envNotice} role="note">
              <AlertCircle size={14} aria-hidden="true" />
              <p>EmailJS credentials are not set. The send button will show the configuration error when clicked.</p>
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
                Sending...
              </>
            ) : (
              'Send package'
            )}
          </button>
        </section>
      </div>
    </div>
  );
}
