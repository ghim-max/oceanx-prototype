import {
  TEAM_HOURS_YTD,
  HOURS_BREAKDOWN,
  ASSUMED_REDUCTION,
  OCEANX_REPORT_MONTH,
} from '../data/oceanxMetrics';
import { SectionHeader } from './SectionHeader';
import styles from './TimePanel.module.css';

export function TimePanel() {
  // Total team hours YTD (exact, unrounded)
  const totalHoursYTD = Object.values(TEAM_HOURS_YTD).reduce((a, b) => a + b, 0);

  // Hours by category (exact, unrounded)
  const contentReviewHoursExact = totalHoursYTD * HOURS_BREAKDOWN.contentReview;
  const contentAdaptationHoursExact = totalHoursYTD * HOURS_BREAKDOWN.contentAdaptation;

  // Rounded for display
  const contentReviewHours = Math.round(contentReviewHoursExact);
  const contentAdaptationHours = Math.round(contentAdaptationHoursExact);

  // Estimated hours saved (compute with exact, round final)
  const reviewSaved = Math.round(contentReviewHoursExact * ASSUMED_REDUCTION.review);
  const adaptationSaved = Math.round(contentAdaptationHoursExact * ASSUMED_REDUCTION.adaptation);
  const totalSaved = reviewSaved + adaptationSaved;

  const formatNumber = (num: number): string => num.toLocaleString();

  return (
    <section className={styles.strip} aria-label="Team time">
      <SectionHeader
        title="Team time"
        subtitle="Year to date, 3 staff"
        goToLabel="Go to Review"
        goToHref="/team/review"
      />
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statInner}>
            <div className={styles.labelRow}>
              <span className={styles.accentSquare} aria-hidden="true" />
              <span className={styles.labelText}>Total team hours</span>
            </div>
            <div className={styles.numberRow}>
              <span className={styles.bigNumber}>{formatNumber(totalHoursYTD)} h</span>
            </div>
          </div>
          <p className={styles.sentence}>
            3 staff: S.T. {formatNumber(TEAM_HOURS_YTD["S.T."])} h, P.H. {formatNumber(TEAM_HOURS_YTD["P.H."])} h, A.N. {formatNumber(TEAM_HOURS_YTD["A.N."])} h
          </p>
        </div>
        <div className={styles.stat}>
          <div className={styles.statInner}>
            <div className={styles.labelRow}>
              <span className={styles.accentSquare} aria-hidden="true" />
              <span className={styles.labelText}>Content review</span>
            </div>
            <div className={styles.numberRow}>
              <span className={styles.bigNumber}>{formatNumber(contentReviewHours)} h</span>
              <span className={styles.percentage}>({Math.round(HOURS_BREAKDOWN.contentReview * 100)}%)</span>
            </div>
          </div>
          <p className={styles.sentence}>Year to date</p>
        </div>
        <div className={styles.stat}>
          <div className={styles.statInner}>
            <div className={styles.labelRow}>
              <span className={styles.accentSquare} aria-hidden="true" />
              <span className={styles.labelText}>Content adaptation</span>
            </div>
            <div className={styles.numberRow}>
              <span className={styles.bigNumber}>{formatNumber(contentAdaptationHours)} h</span>
              <span className={styles.percentage}>({Math.round(HOURS_BREAKDOWN.contentAdaptation * 100)}%)</span>
            </div>
          </div>
          <p className={styles.sentence}>Year to date</p>
        </div>
        <div className={styles.stat}>
          <div className={styles.statInner}>
            <div className={styles.labelRow}>
              <span className={styles.accentSquare} aria-hidden="true" />
              <span className={styles.labelText}>Estimated hours saved</span>
            </div>
            <div className={styles.numberRow}>
              <span className={styles.bigNumber}>{formatNumber(totalSaved)} h</span>
            </div>
          </div>
          <p className={styles.sentence}>
            Assumes review and adaptation time drop by 50% with the prototype. Prototype estimate.
          </p>
        </div>
      </div>
      <p className={styles.sectionNote}>
        Team time, year to date. Source: OceanX Operations, {OCEANX_REPORT_MONTH}.
      </p>
    </section>
  );
}