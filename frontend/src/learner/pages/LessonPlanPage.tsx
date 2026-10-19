import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE } from '../../shared/services/apiBase';
import type { LessonPlan, LessonTimelineRow } from '../../shared/services/assembleLessonPlan';
import styles from './LessonPlanPage.module.css';

// ─── LessonPlanPage ───────────────────────────────────────────────────────────

export function LessonPlanPage() {
  const { slug } = useParams<{ slug: string }>();
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          setPlan(pkg.lesson_plan as LessonPlan);
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

  const totalMin = plan.timeline.reduce((s: number, r: LessonTimelineRow) => s + r.minutes, 0);

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
            Print / Save as PDF
          </button>
        </header>

        <section className={styles.section}>
          <dl className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <dt>Learning intention</dt>
              <dd>{plan.learningIntention}</dd>
            </div>
            <div className={styles.metaItem}>
              <dt>Driving question</dt>
              <dd>{plan.drivingQuestion}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>Materials</h2>
          <ul className={styles.materialsList}>
            {plan.materials.map((m: string, i: number) => (
              <li key={i}>{m}</li>
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
                <th>Stage</th>
                <th>Activity</th>
                <th>Time</th>
                <th>How to run</th>
              </tr>
            </thead>
            <tbody>
              {plan.timeline.map((row: LessonTimelineRow, idx: number) => (
                <tr key={idx} className={row.isSample ? styles.rowSample : undefined}>
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
                        {row.prompts.map((p, pi: number) => (
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={styles.section}>
          <h2 className={styles.h2}>For this group</h2>
          <p className={styles.levelNote}>{plan.levelNote}</p>
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
