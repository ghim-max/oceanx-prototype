import { useState } from 'react';
import {
  TEAM_HOURS_YTD,
  HOURS_BREAKDOWN,
  ASSUMED_REDUCTION,
  OCEANX_REPORT_MONTH,
} from '../data/oceanxMetrics';
import styles from './TimePanel.module.css';

export function TimePanel() {
  const [show, setShow] = useState(true);

  // Total team hours YTD
  const totalHoursYTD = Object.values(TEAM_HOURS_YTD).reduce((a, b) => a + b, 0);

  // Hours by category
  const contentReviewHours = Math.round(totalHoursYTD * HOURS_BREAKDOWN.contentReview);
  const contentAdaptationHours = Math.round(totalHoursYTD * HOURS_BREAKDOWN.contentAdaptation);

  // Estimated hours saved
  const reviewSaved = Math.round(contentReviewHours * ASSUMED_REDUCTION.review);
  const adaptationSaved = Math.round(contentAdaptationHours * ASSUMED_REDUCTION.adaptation);
  const totalSaved = reviewSaved + adaptationSaved;

  const formatNumber = (num: number): string => num.toLocaleString();

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
              <div className={styles.label}>Total team hours (year to date)</div>
              <div className={styles.values}>
                <span className={styles.bigNumber}>{formatNumber(totalHoursYTD)} h</span>
              </div>
              <p className={styles.sentence}>
                3 staff: S.T. {formatNumber(TEAM_HOURS_YTD["S.T."])} h, P.H. {formatNumber(TEAM_HOURS_YTD["P.H."])} h, A.N. {formatNumber(TEAM_HOURS_YTD["A.N."])} h
              </p>
            </div>
            <div className={styles.item}>
              <div className={styles.label}>Content review</div>
              <div className={styles.values}>
                <span className={styles.bigNumber}>{formatNumber(contentReviewHours)} h</span>
                <span className={styles.percentage}>({Math.round(HOURS_BREAKDOWN.contentReview * 100)}%)</span>
              </div>
            </div>
            <div className={styles.item}>
              <div className={styles.label}>Content adaptation</div>
              <div className={styles.values}>
                <span className={styles.bigNumber}>{formatNumber(contentAdaptationHours)} h</span>
                <span className={styles.percentage}>({Math.round(HOURS_BREAKDOWN.contentAdaptation * 100)}%)</span>
              </div>
            </div>
            <div className={styles.itemSaved}>
              <div className={styles.label}>Estimated hours saved (year to date)</div>
              <div className={styles.savedValue}>
                {formatNumber(totalSaved)} h
              </div>
              <p className={styles.savedTooltip}>
                Assumes review time drops by 50% and adaptation time by 40% with the prototype. Prototype estimate.
              </p>
            </div>
          </div>
          <div className={styles.breakdownRow}>
            <span className={styles.breakdownLabel}>Full breakdown:</span>
            <span className={styles.breakdownItem}>Review {Math.round(HOURS_BREAKDOWN.contentReview * 100)}%</span>
            <span className={styles.breakdownItem}>Support {Math.round(HOURS_BREAKDOWN.userSupport * 100)}%</span>
            <span className={styles.breakdownItem}>Adaptation {Math.round(HOURS_BREAKDOWN.contentAdaptation * 100)}%</span>
            <span className={styles.breakdownItem}>Admin {Math.round(HOURS_BREAKDOWN.administration * 100)}%</span>
            <span className={styles.breakdownItem}>Maintenance {Math.round(HOURS_BREAKDOWN.maintenance * 100)}%</span>
          </div>
          <p className={styles.sourceLine}>
            Team time, year to date. Source: OceanX Operations, {OCEANX_REPORT_MONTH}.
          </p>
        </div>
      )}
    </section>
  );
}