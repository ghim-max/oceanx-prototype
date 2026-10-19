import { useEffect, useState } from 'react';
import { Printer, Flag, X, Clock } from 'lucide-react';
import styles from './LessonPlanPreviewPage.module.css';

interface TimelineRow {
  label: string;
  minutes: number;
  stage: string;
  howToRun?: string;
  prompts?: { text: string; sample?: boolean }[];
  evidenceOfLearning?: string;
  isOpening?: boolean;
  isClose?: boolean;
}

interface LessonPlanData {
  learningIntention: string;
  drivingQuestion: string;
  length: number;
  level: 'introductory' | 'intermediate' | 'advanced';
  materials: string[];
  timeline: TimelineRow[];
  levelNote: string;
  hasSampleContent: boolean;
}

export function LessonPlanPreviewPage() {
  const [plan, setPlan] = useState<LessonPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const planDataStr = sessionStorage.getItem('previewLessonPlanData');

  useEffect(() => {
    if (!planDataStr) {
      setError('No lesson plan data found. Please go back to the adapt page.');
      setLoading(false);
      return;
    }

    try {
      const planData: LessonPlanData = JSON.parse(planDataStr);
      setPlan(planData);
      setLoading(false);
    } catch {
      setError('Failed to parse lesson plan data.');
      setLoading(false);
    }
  }, [planDataStr]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading lesson plan preview...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Lesson Plan Preview</h1>
        <div className={styles.headerActions}>
          <button className={styles.btnPrint} onClick={handlePrint}>
            <Printer size={16} aria-hidden="true" />
            Print
          </button>
          <button className={styles.btnIssue} onClick={() => alert('Report an issue - not implemented yet')}>
            <Flag size={16} aria-hidden="true" />
            Report an issue
          </button>
          <button className={styles.btnClose} onClick={() => window.close()}>
            <X size={16} aria-hidden="true" />
            Close
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.planHeader}>
          <h2>{plan.learningIntention}</h2>
          <p className={styles.drivingQuestion}>{plan.drivingQuestion}</p>
          <div className={styles.planMeta}>
            <span>{plan.length} min · {plan.level.charAt(0).toUpperCase() + plan.level.slice(1)}</span>
          </div>
        </div>

        {plan.materials.length > 0 && (
          <div className={styles.materials}>
            <h3>Materials</h3>
            <ul>
              {plan.materials.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.timelineContainer}>
          <h3>Timeline</h3>
          <table className={styles.timelineTable}>
            <thead>
              <tr>
                <th>Start</th>
                <th>Stage</th>
                <th>Block</th>
                <th>Min</th>
                <th>Prompts / How to Run</th>
              </tr>
            </thead>
            <tbody>
              {plan.timeline.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.isOpening ? '0' : row.isClose ? '—' : '—'}</td>
                  <td>{row.stage}</td>
                  <td>{row.label}</td>
                  <td>{row.minutes} min</td>
                  <td>
                    {row.prompts?.map((p, i) => (
                      <div key={i} className={styles.prompt}>
                        {p.text}
                        {p.sample && <span className={styles.sampleTag}>Sample</span>}
                      </div>
                    ))}
                    {row.howToRun && <div className={styles.howToRun}>{row.howToRun}</div>}
                    {row.evidenceOfLearning && <div className={styles.evidence}>{row.evidenceOfLearning}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {plan.levelNote && (
          <div className={styles.levelNote}>
            <strong>Level note:</strong> {plan.levelNote}
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <button className={styles.btnPrint} onClick={() => window.print()}>
          <Clock size={16} aria-hidden="true" />
          Print
        </button>
        <button className={styles.btnIssue} onClick={() => alert('Report an issue - not implemented yet')}>
          <Flag size={16} aria-hidden="true" />
          Report an issue
        </button>
        <button className={styles.btnClose} onClick={() => window.close()}>
          <X size={16} aria-hidden="true" />
          Close
        </button>
      </footer>
    </div>
  );
}