import { useState, useEffect } from 'react';
import { getReviewItems, type ReviewItem } from '../data/governanceService';
import { BEFORE_HOURS_PER_ITEM, ITEMS_PER_YEAR, TEAM_HOURS_LABEL, TEAM_HOURS_YTD } from '../data/timeBaseline';
import styles from './TimePanel.module.css';

export function TimePanel() {
  const [reviewItemsState, setReviewItemsState] = useState<ReviewItem[]>([]);
  const [show, setShow] = useState(true);

  useEffect(() => {
    getReviewItems().then(setReviewItemsState);
  }, []);

  const decidedReviews = reviewItemsState.filter((r) => r.status === 'approved' || r.status === 'edited' || r.status === 'rejected');
  const reviewTimes = decidedReviews
    .map((r) => r.decidedAt && r.openedAt ? (new Date(r.decidedAt).getTime() - new Date(r.openedAt).getTime()) / 60000 : null)
    .filter((t): t is number => t !== null && t > 0);
  const avgReviewMinutes = reviewTimes.length > 0
    ? reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length
    : null;

  const adaptedReviews = reviewItemsState.filter((r) => r.kind === 'ai_adaptation' && r.submittedAt && r.adaptationStartedAt);
  const adaptationTimes = adaptedReviews
    .map((r) => r.submittedAt && r.adaptationStartedAt ? (new Date(r.submittedAt).getTime() - new Date(r.adaptationStartedAt).getTime()) / 60000 : null)
    .filter((t): t is number => t !== null && t > 0);
  const avgAdaptationMinutes = adaptationTimes.length > 0
    ? adaptationTimes.reduce((a, b) => a + b, 0) / adaptationTimes.length
    : null;

  const beforeReview = BEFORE_HOURS_PER_ITEM.review * 60; // minutes
  const beforeAdaptation = BEFORE_HOURS_PER_ITEM.adaptation * 60; // minutes
  const afterReview = avgReviewMinutes;
  const afterAdaptation = avgAdaptationMinutes;

  const reviewSaved = afterReview !== null ? beforeReview - afterReview : null;
  const adaptationSaved = afterAdaptation !== null ? beforeAdaptation - afterAdaptation : null;

  // Only calculate estimated hours saved when BOTH review and adaptation have data
  const hasBothData = afterReview !== null && afterAdaptation !== null;
  const totalSavedPerItem = hasBothData ? (reviewSaved ?? 0) + (adaptationSaved ?? 0) : null;
  const estimatedHoursSaved = totalSavedPerItem !== null ? totalSavedPerItem / 60 * ITEMS_PER_YEAR : null;

  const formatMinutes = (minutes: number | null): string => {
    if (minutes === null) return 'Not enough data';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}min` : `${hours} h`;
  };

  return (
    <section className={styles.strip} aria-label="Team time">
      <div className={styles.header}>
        <button type="button" className={styles.sectionToggle} onClick={() => setShow(!show)} aria-expanded={show}>
          <span className={styles.title}>Team time</span>
          {show ? 'Hide' : 'Show'}
        </button>
        <a href="/team/review" className={styles.link}>Go to Review</a>
      </div>
      {show && (
        <div className={styles.content}>
          <div className={styles.row}>
            <div className={styles.item}>
              <div className={styles.label}>Review time per item</div>
              <div className={styles.values}>
                <span className={styles.before}>Before {BEFORE_HOURS_PER_ITEM.review} h</span>
                <span className={styles.separator}>&middot;</span>
                <span className={styles.after}>
                  After {formatMinutes(afterReview)}
                </span>
              </div>
            </div>
            <div className={styles.item}>
              <div className={styles.label}>Adaptation time per item</div>
              <div className={styles.values}>
                <span className={styles.before}>Before {BEFORE_HOURS_PER_ITEM.adaptation} h</span>
                <span className={styles.separator}>&middot;</span>
                <span className={styles.after}>
                  After {formatMinutes(afterAdaptation)}
                </span>
              </div>
            </div>
            <div className={styles.itemSaved}>
              <div className={styles.label}>Estimated hours saved per year</div>
              <div className={styles.savedValue} title="((before review - after review) + (before adaptation - after adaptation)) \u00d7 items per year">
                {hasBothData && estimatedHoursSaved !== null ? (
                  (estimatedHoursSaved >= 0 ? '+' : '') + estimatedHoursSaved.toFixed(0) + ' h'
                ) : 'Not enough data yet'}
              </div>
            </div>
          </div>
          <p className={styles.note}>
            {TEAM_HOURS_LABEL} {TEAM_HOURS_YTD.a} / {TEAM_HOURS_YTD.b} / {TEAM_HOURS_YTD.c}
          </p>
        </div>
      )}
    </section>
  );
}