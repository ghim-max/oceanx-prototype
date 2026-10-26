import { useState, useEffect } from 'react';
import { getReviewItems, type ReviewItem } from '../data/governanceService';
import styles from './ReachStrip.module.css';

export function ReachStrip({ cards, session }: { cards: any[]; session: any }) {
  const [reviewItemsState, setReviewItemsState] = useState<ReviewItem[]>([]);
  const [show, setShow] = useState(true);

  useEffect(() => {
    getReviewItems().then(setReviewItemsState);
  }, []);

  const educatorEmails = new Set<string>();
  reviewItemsState.forEach((r) => {
    if (r.educatorEmail) educatorEmails.add(r.educatorEmail);
  });
  const insightsEducatorEmails = new Set<string>();
  cards.forEach((c: any) => {
    if (c.educator_emails) {
      c.educator_emails.forEach((e: string) => insightsEducatorEmails.add(e));
    }
  });
  const distinctEducators = new Set([...educatorEmails, ...insightsEducatorEmails]).size;
  const packagesSent = reviewItemsState.filter((r) => r.status === 'approved' || r.status === 'edited').length;
  const learnersReached = session.completed ?? 0;

  return (
    <section className={styles.strip} aria-label="Reach">
      <div className={styles.header}>
        <button type="button" className={styles.sectionToggle} onClick={() => setShow(!show)} aria-expanded={show}>
          <span className={styles.title}>Reach</span>
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {show && (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statInner}>
              <div className={styles.labelRow}>
                <span className={styles.accentSquare} aria-hidden="true" />
                <span className={styles.labelText}>Educators</span>
              </div>
              <div className={styles.numberRow}>
                <span className={styles.bigNumber}>{distinctEducators}</span>
              </div>
            </div>
            <p className={styles.sentence}>Distinct educators who submitted or taught</p>
          </div>
          <div className={styles.stat}>
            <div className={styles.statInner}>
              <div className={styles.labelRow}>
                <span className={styles.accentSquare} aria-hidden="true" />
                <span className={styles.labelText}>Packages sent</span>
              </div>
              <div className={styles.numberRow}>
                <span className={styles.bigNumber}>{packagesSent}</span>
              </div>
            </div>
            <p className={styles.sentence}>Packages approved and emailed</p>
          </div>
          <div className={styles.stat}>
            <div className={styles.statInner}>
              <div className={styles.labelRow}>
                <span className={styles.accentSquare} aria-hidden="true" />
                <span className={styles.labelText}>Learners reached</span>
              </div>
              <div className={styles.numberRow}>
                <span className={styles.bigNumber}>{learnersReached}</span>
              </div>
            </div>
            <p className={styles.sentence}>University learners who completed the session</p>
          </div>
        </div>
      )}
    </section>
  );
}