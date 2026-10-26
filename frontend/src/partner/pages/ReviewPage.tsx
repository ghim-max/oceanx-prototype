import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, AlertCircle, Sparkles, Eye, ExternalLink } from 'lucide-react';
import {
  sendPackage,
  emailjsConfigured,
  DEMO_EMAIL,
  MissingEnvError,
  type PackagePayload,
} from '../../shared/services/sendPackage';
import { API_BASE } from '../../shared/services/apiBase';
import { BASE_URL } from '../../shared/services/sendPackage';
import {
  assembleLessonPlan,
  type LessonLevel,
} from '../../shared/services/assembleLessonPlan';
import { submitPackage } from '../../team/data/governanceService';
import { UNIVERSITY_STATUS } from '../../shared/data/university-version';
import { DURATION_MIN } from './AdaptPage';
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

type SendState = 'idle' | 'sending' | 'success' | 'error' | 'missing-env';

// ─── Email validation ────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ─── Detail row for package summary ────────────────────────────────────────

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{children}</span>
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
  const acceptedRewritesCount = acceptedRewrites.length;

  const totalComponents = (pkg?.picks.length ?? 0) + (pkg?.recommendations.length ?? 0);
  const hasAIAdaptations = acceptedRewritesCount > 0;

  return (
    <section className={styles.section} aria-labelledby="summary-heading">
      <h2 className={styles.h2} id="summary-heading">Package summary</h2>

      <div className={styles.summaryGrid}>
        {/* Components */}
        <div className={styles.summaryCard}>
          <h3 className={styles.summaryCardTitle}>Components</h3>
          {pkg && totalComponents > 0 ? (
            <ul className={styles.componentList}>
              {pkg.picks.map((pick) => (
                <li key={pick.id} className={styles.componentItem}>
                  <span className={styles.componentTitle}>{pick.title}</span>
                  {acceptedRewrites.some((r) => r.componentId === pick.id) && (
                    <span className={styles.aiTag}>AI version</span>
                  )}
                </li>
              ))}
              {pkg.recommendations.map((rec) => (
                <li key={rec.id} className={styles.componentItem}>
                  <span className={styles.componentTitle}>{rec.title}</span>
                  {acceptedRewrites.some((r) => r.componentId === rec.id) && (
                    <span className={styles.aiTag}>AI version</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyText}>No components selected</p>
          )}
        </div>

        {/* Knowledge check */}
        <div className={styles.summaryCard}>
          <h3 className={styles.summaryCardTitle}>Knowledge check</h3>
          {adaptOptionsData?.quizEnabled && (adaptOptionsData?.itemIds.length ?? 0) > 0 ? (
            <>
              <DetailRow label="Questions" children={`${adaptOptionsData.itemIds.length} ${adaptOptionsData.quizType === 'mcq' ? 'MCQ' : adaptOptionsData.quizType === 'short' ? 'short answer' : 'mixed'}`} />
              <DetailRow label="Difficulty" children={adaptOptionsData.quizDifficulty} />
              <DetailRow
                label="Preview"
                children={
                  <a
                    href="/preview/quiz"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.previewLink}
                  >
                    <Eye size={14} aria-hidden="true" />
                    Open preview
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                }
              />
            </>
          ) : (
            <p className={styles.notIncluded}>
              Not included
              <a href="/partner/adapt" className={styles.addLink}>Add</a>
            </p>
          )}
        </div>

        {/* Lesson plan */}
        <div className={styles.summaryCard}>
          <h3 className={styles.summaryCardTitle}>Lesson plan</h3>
          {adaptOptionsData?.lessonPlanEnabled ? (
            <>
              <DetailRow label="Length" children={`${adaptOptionsData.lessonPlanLength ?? 60} min`} />
              <DetailRow
                label="Level"
                children={
                  adaptOptionsData.lessonPlanLevel
                    ? adaptOptionsData.lessonPlanLevel.charAt(0).toUpperCase() + adaptOptionsData.lessonPlanLevel.slice(1)
                    : 'Intermediate'
                }
              />
              <DetailRow
                label="Preview"
                children={
                  <a
                    href="/preview/lesson"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.previewLink}
                  >
                    <Eye size={14} aria-hidden="true" />
                    Open preview
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                }
              />
            </>
          ) : (
            <p className={styles.notIncluded}>
              Not included
              <a href="/partner/adapt" className={styles.addLink}>Add</a>
            </p>
          )}
        </div>
      </div>

      {/* AI adaptations note */}
      {hasAIAdaptations && (
        <div className={styles.aiNote}>
          <Sparkles size={14} aria-hidden="true" />
          <span>
            {acceptedRewritesCount} AI version{acceptedRewritesCount > 1 ? 's' : ''} will be checked by the OceanX team. We will email your package to <strong>{readAdaptOptions()?.quizEnabled ? 'your email' : 'the educator'}</strong> after review.
          </span>
        </div>
      )}

      {/* Conditional review gate message */}
      {hasAIAdaptations && !adaptOptionsData?.quizEnabled && !adaptOptionsData?.lessonPlanEnabled && (
        <p className={styles.gateNotice}>
          Includes AI versions. The OceanX team will check them before your email is sent (allow up to 1 business day).
        </p>
      )}
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
    const quizTitle = quizEnabled && (adaptOptions?.itemIds.length ?? 0) > 0 ? 'Knowledge Check' : undefined;
    const quizAssembly = {
      component_ids: adaptOptions?.componentIds ?? [],
      options: adaptOptions
        ? { type: adaptOptions.quizType, difficulty: adaptOptions.quizDifficulty, count: adaptOptions.quizCount }
        : {},
      item_ids: adaptOptions?.itemIds ?? [],
    };

    // Assemble lesson plan if requested
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

    // If there are accepted AI rewrites, submit them for review instead of sending email directly
    if (acceptedRewrites.length > 0) {
      // Update rewrites with the actual educator email
      const rewritesWithEmail = acceptedRewrites.map(r => ({
        ...r,
        educatorEmail: email.trim(),
      }));

      // Create a package object for submitPackage
      const pkgForSubmit = {
        audience: pkg.audience,
        picks: pkg.picks,
        recommendations: pkg.recommendations,
      };

      const result = await submitPackage(pkgForSubmit, rewritesWithEmail);

      if (result.status === 'pending_review') {
        setSentForReview(true);
        setSendState('success');
        sessionStorage.removeItem('adaptPackage');
        sessionStorage.removeItem('adaptOptions');
        sessionStorage.removeItem('adaptAcceptedRewrites');
        return;
      }
      // If status is 'sent', fall through to normal email sending
    }

    // First, create the package on the backend to get a slug
    let slug: string | undefined;
    try {
      const createResponse = await fetch(`${API_BASE}/packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience: pkg.audience,
          picks: pkg.picks,
          recommendations: pkg.recommendations,
          quiz_title: quizTitle,
          lesson_plan_title: lessonPlanData ? 'Lesson Plan' : undefined,
          lesson_plan_url: lessonPlanData ? undefined : undefined,
          lesson_plan: lessonPlanData ?? undefined,
          educator_email: email.trim(),
          component_ids: quizAssembly.component_ids,
          options: quizAssembly.options,
          item_ids: quizAssembly.item_ids,
        }),
      });
      if (!createResponse.ok) {
        throw new Error('Failed to create package');
      }
      const createdPkg = await createResponse.json();
      slug = createdPkg.slug;
    } catch (err) {
      console.error('[create package error]', err);
      setSendState('error');
      setErrorMessage('Failed to create package. Please try again.');
      return;
    }

    const lessonPlanUrl = lessonPlanData && slug ? `/lesson/p/${slug}` : undefined;

    // Build component list for email
    const allComponents = [
      ...pkg.picks,
      ...pkg.recommendations,
    ];
const emailComponents = allComponents.map(c => ({
      title: c.title,
      type: UNIVERSITY_STATUS[c.id]?.status || 'Fixed',
      minutes: DURATION_MIN[c.id] || 0,
    }));

    // Quiz info
    const quizLink = quizEnabled && slug ? `${BASE_URL}/quiz/p/${slug}` : undefined;
    const quizQuestionCount = adaptOptions?.quizCount;

    // Lesson plan info
    const lessonPlanLength = adaptOptions?.lessonPlanLength;
    const lessonPlanLevel = adaptOptions?.lessonPlanLevel;

    // AI review flag
    const hadAiReview = acceptedRewrites.length > 0;

    // Then send the email with the slug
    const payload: PackagePayload = {
      email: email.trim(),
      educatorName: '', // Will use fallback in email template
      audience: pkg.audience,
      components: emailComponents,
      quizLink,
      quizQuestionCount,
      lessonPlanLink: lessonPlanUrl,
      lessonPlanLength,
      lessonPlanLevel,
      hadAiReview,
      slug,
    };

    try {
      await sendPackage(payload);
      setSendState('success');
      sessionStorage.removeItem('adaptPackage');
      sessionStorage.removeItem('adaptOptions');
      sessionStorage.removeItem('adaptAcceptedRewrites');
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
            {sentForReview ? (
              <>
                <h1 className={styles.h1} ref={h1Ref} tabIndex={-1}>Sent for OceanX review.</h1>
                <p className={styles.successDesc}>
                  Your package has been submitted for review. You will get your email after approval.
                </p>
              </>
            ) : (
              <>
                <h1 className={styles.h1} ref={h1Ref} tabIndex={-1}>Your package is on its way.</h1>
                <p className={styles.successDesc}>
                  Check <strong>{email}</strong> for your seminar links. Allow a few minutes for delivery.
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
            Check what will be sent, then enter your email to receive the links.
          </p>
        </header>

        {/* ── Package summary ── */}
        <PackageSummary />

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
