import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE } from '../../shared/services/apiBase';
import { submitIssueReport, type IssueType } from '../../team/data/governanceService';
import styles from './LessonPlanPage.module.css';

// ─── LessonPlanPage ───────────────────────────────────────────────────────────

type IssueFormState = {
  issueType: IssueType;
  note: string;
  reporterEmail: string;
  submitting: boolean;
  error: string | null;
  success: boolean;
};

export function LessonPlanPage() {
  const { slug } = useParams<{ slug: string }>();
  const [plan, setPlan] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openIssueSection, setOpenIssueSection] = useState<string | null>(null);
  const [issueForms, setIssueForms] = useState<Record<string, IssueFormState>>({});

  useEffect(() => {
    document.title = 'Lesson Plan — OceanX Education';
    if (!slug) {
      setError('No package found.');
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/packages/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error('Package not found.');
        return r.json();
      })
      .then((pkg) => {
        if (!pkg.lesson_plan) {
          setError('No lesson plan in this package.');
        } else {
          setPlan(pkg.lesson_plan);
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load the lesson plan. Check your link and try again.');
        setLoading(false);
      });
    return () => { document.title = 'OceanX Education'; };
  }, [slug]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <p className={styles.loading}>Loading lesson plan...</p>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <p className={styles.errorMsg}>{error ?? 'No lesson plan found.'}</p>
        </div>
      </div>
    );
  }

  const getInitialFormState = (): IssueFormState => ({
    issueType: 'Wrong fact',
    note: '',
    reporterEmail: '',
    submitting: false,
    error: null,
    success: false,
  });

  const totalMin = plan.timeline.reduce((s: number, r: any) => s + r.minutes, 0);

  const getFormState = (sectionKey: string) => {
    if (!issueForms[sectionKey]) {
      setIssueForms(prev => ({ ...prev, [sectionKey]: getInitialFormState() }));
      return getInitialFormState();
    }
    return issueForms[sectionKey];
  };

  const updateFormField = (sectionKey: string, field: keyof IssueFormState, value: any) => {
    setIssueForms(prev => ({
      ...prev,
      [sectionKey]: { ...getFormState(sectionKey), [field]: value },
    }));
  };

  const handleSubmitIssue = async (sectionKey: string) => {
    const form = getFormState(sectionKey);
    if (!form.note.trim()) {
      updateFormField(sectionKey, 'error', 'Please describe the issue');
      return;
    }

    updateFormField(sectionKey, 'submitting', true);
    updateFormField(sectionKey, 'error', null);

    // Map section key to the section name used by governanceService
    const sectionMap: Record<string, string> = {
      learningIntention: 'Learning intention',
      drivingQuestion: 'Driving question',
      materials: 'Materials',
      Explore: 'Explore',
      Investigate: 'Investigate',
      Reflect: 'Reflect',
      Create: 'Create',
    };

    const result = await submitIssueReport({
      packageSlug: slug || '',
      section: sectionMap[sectionKey] || sectionKey,
      issueType: form.issueType,
      note: form.note.trim(),
      reporterEmail: form.reporterEmail.trim() || undefined,
    });

    if (result.ok) {
      updateFormField(sectionKey, 'submitting', false);
      updateFormField(sectionKey, 'success', true);
      setOpenIssueSection(null);
    } else {
      updateFormField(sectionKey, 'submitting', false);
      updateFormField(sectionKey, 'error', result.error || 'Failed to submit');
    }
  };

  const handleCancel = (sectionKey: string) => {
    setIssueForms(prev => {
      const next = { ...prev };
      delete next[sectionKey];
      return next;
    });
    setOpenIssueSection(null);
  };

  const handleReportClick = (sectionKey: string) => {
    if (openIssueSection === sectionKey) {
      setOpenIssueSection(null);
    } else {
      setOpenIssueSection(sectionKey);
      // Initialize form state if not exists
      if (!issueForms[sectionKey]) {
        setIssueForms(prev => ({ ...prev, [sectionKey]: getInitialFormState() }));
      }
    }
  };

  // Calculate start minutes for each timeline row
  const getStartMinute = (index: number): number => {
    if (!plan) return 0;
    let total = 0;
    for (let i = 0; i < index; i++) {
      total += plan.timeline[i].minutes;
    }
    return total;
  };

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <header className={styles.pageHeader}>
          <div className={styles.orgLabel}>OceanX Education</div>
          <h1 className={styles.h1}>Seagrass Stories</h1>
          <p className={styles.planMeta}>
            Lesson Plan &middot; {plan.length} min &middot;{' '}
            {plan.level.charAt(0).toUpperCase() + plan.level.slice(1)}
          </p>
          <button
            type="button"
            className={styles.printBtn}
            onClick={() => window.print()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Print / Save as PDF
          </button>
        </header>

        <section className={styles.section}>
          <dl className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <dt>Learning intention</dt>
              <dd>{plan.learningIntention}</dd>
              <ReportIssueLink
                _sectionKey="learningIntention"
                isOpen={openIssueSection === 'learningIntention'}
                onClick={() => handleReportClick('learningIntention')}
                form={getFormState('learningIntention')}
                onSubmit={() => handleSubmitIssue('learningIntention')}
                onCancel={() => handleCancel('learningIntention')}
                onChange={(field, value) => updateFormField('learningIntention', field, value)}
              />
            </div>
            <div className={styles.metaItem}>
              <dt>Driving question</dt>
              <dd>{plan.drivingQuestion}</dd>
              <ReportIssueLink
                _sectionKey="drivingQuestion"
                isOpen={openIssueSection === 'drivingQuestion'}
                onClick={() => handleReportClick('drivingQuestion')}
                form={getFormState('drivingQuestion')}
                onSubmit={() => handleSubmitIssue('drivingQuestion')}
                onCancel={() => handleCancel('drivingQuestion')}
                onChange={(field, value) => updateFormField('drivingQuestion', field, value)}
              />
            </div>
          </dl>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Materials</h2>
          <ul className={styles.materialsList}>
            {plan.materials.map((m: string, i: number) => (
              <li key={i}>
                {m}
                <ReportIssueLink
                  _sectionKey={`materials-${i}`}
                  isOpen={openIssueSection === `materials-${i}`}
                  onClick={() => handleReportClick(`materials-${i}`)}
                  form={getFormState(`materials-${i}`)}
                  onSubmit={() => handleSubmitIssue(`materials-${i}`)}
                  onCancel={() => handleCancel(`materials-${i}`)}
                  onChange={(field, value) => updateFormField(`materials-${i}`, field, value)}
                />
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>
            Session plan <span className={styles.totalTime}>{totalMin} min</span>
          </h2>

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Start</th>
                <th>Stage</th>
                <th>Activity</th>
                <th>Time</th>
                <th>How to run</th>
              </tr>
            </thead>
            <tbody>
              {plan.timeline.map((row: any, idx: number) => (
                <tr key={idx} className={row.isSample ? styles.rowSample : undefined}>
                  <td className={styles.cellStart}>{getStartMinute(idx)}</td>
                  <td className={styles.cellStage}>{row.stage}</td>
                  <td className={styles.cellLabel}>
                    {row.label}
                    {row.isSample && <span className={styles.sampleMark}> *</span>}
                  </td>
                  <td className={styles.cellTime}>{row.minutes} min</td>
                  <td className={styles.cellHowToRun}>
                    <span className={styles.howToRunText}>{row.howToRun}</span>
                    {row.prompts && row.prompts.length > 0 && (
                      <ul className={styles.promptList}>
                        {row.prompts.map((p: any, pi: number) => (
                          <li key={pi}>
                            {p.text}
                            {p.sample && <span className={styles.sampleMark}> *</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                    {row.evidenceOfLearning && (
                      <p className={styles.evidence}>
                        <em>Evidence of learning:</em> {row.evidenceOfLearning}
                      </p>
                    )}
                    <ReportIssueLink
                      _sectionKey={`timeline-${idx}`}
                      isOpen={openIssueSection === `timeline-${idx}`}
                      onClick={() => handleReportClick(`timeline-${idx}`)}
                      form={getFormState(`timeline-${idx}`)}
                      onSubmit={() => handleSubmitIssue(`timeline-${idx}`)}
                      onCancel={() => handleCancel(`timeline-${idx}`)}
                      onChange={(field, value) => updateFormField(`timeline-${idx}`, field, value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>For this group</h2>
          <p className={styles.levelNote}>{plan.levelNote}</p>
          <ReportIssueLink
            _sectionKey="levelNote"
            isOpen={openIssueSection === 'levelNote'}
            onClick={() => handleReportClick('levelNote')}
            form={getFormState('levelNote')}
            onSubmit={() => handleSubmitIssue('levelNote')}
            onCancel={() => handleCancel('levelNote')}
            onChange={(field, value) => updateFormField('levelNote', field, value)}
          />
        </section>

        {plan.hasSampleContent && (
          <p className={styles.sampleNote}>
            * Content marked with an asterisk is a sample or adaptation not included in the OceanX Educator Guide.
          </p>
        )}

        <footer className={styles.footer}>
          <p>
            Seagrass Stories is produced by OceanX Education. Share your feedback at{' '}
            <span className={styles.feedbackLink}>seagrassstoriesforschools.oceanx.org</span>.
          </p>
        </footer>
      </div>
    </div>
  );
}

// ─── ReportIssueLink Component ──────────────────────────────────────────────
function ReportIssueLink({
  isOpen,
  onClick,
  form,
  onSubmit,
  onCancel,
  onChange,
}: {
  _sectionKey: string;
  isOpen: boolean;
  onClick: () => void;
  form: {
    issueType: string;
    note: string;
    reporterEmail: string;
    submitting: boolean;
    error: string | null;
    success: boolean;
  };
  onSubmit: () => void;
  onCancel: () => void;
  onChange: (field: keyof { issueType: string; note: string; reporterEmail: string; submitting: boolean; error: string | null; success: boolean }, value: any) => void;
}) {
  const showForm = isOpen && !form.success;

  return (
    <>
      <button
        type="button"
        className={styles.reportLink}
        onClick={onClick}
        aria-expanded={isOpen}
      >
        {isOpen ? 'Hide report form' : 'Report an issue'}
      </button>

      {showForm && (
        <div className={styles.issueForm}>
          <div className={styles.formGroup}>
            <label htmlFor={`issue-type-${form.note}`} className={styles.label}>Issue type</label>
            <select
              value={form.issueType}
              onChange={e => onChange('issueType', e.target.value)}
              className={styles.select}
            >
              <option value="Wrong fact">Wrong fact</option>
              <option value="Wrong level">Wrong level</option>
              <option value="Timing">Timing</option>
              <option value="Broken link">Broken link</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor={`issue-note-${form.note}`} className={styles.label}>
              What is wrong? <span className={styles.required}>*</span>
            </label>
            <textarea
              id={`issue-note-${form.note}`}
              value={form.note}
              onChange={e => onChange('note', e.target.value)}
              rows={4}
              className={styles.textarea}
              placeholder="Describe the issue..."
              maxLength={500}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor={`issue-email-${form.note}`} className={styles.label}>
              Your email (optional)
            </label>
            <input
              type="email"
              value={form.reporterEmail}
              onChange={e => onChange('reporterEmail', e.target.value)}
              className={styles.input}
              placeholder="you@example.com"
            />
          </div>

          {form.error && <p className={styles.error}>{form.error}</p>}

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onCancel}
              disabled={form.submitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={onSubmit}
              disabled={!form.note.trim() || form.submitting}
            >
              {form.submitting ? 'Sending...' : 'Send report'}
            </button>
          </div>
        </div>
      )}

      {form.success && (
        <p className={styles.thanks}>Thanks. The OceanX team will check this.</p>
      )}
    </>
  );
}