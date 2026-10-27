import { MONTHLY, OCEANX_REPORT_MONTH } from '../data/oceanxMetrics';
import { SectionHeader } from './SectionHeader';
import styles from './ReachStrip.module.css';

export function ReachStrip() {
  const formatNumber = (num: number): string => num.toLocaleString();

  return (
    <section className={styles.strip} aria-label="Reach">
      <SectionHeader
        title="Reach"
        subtitle={OCEANX_REPORT_MONTH}
        goToLabel=""
        goToHref="#"
      />
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statInner}>
            <div className={styles.labelRow}>
              <span className={styles.accentSquare} aria-hidden="true" />
              <span className={styles.labelText}>Schools</span>
            </div>
            <div className={styles.numberRow}>
              <span className={styles.bigNumber}>{formatNumber(MONTHLY.schools)}</span>
            </div>
          </div>
          <p className={styles.sentence}>Schools using OceanX content</p>
        </div>
        <div className={styles.stat}>
          <div className={styles.statInner}>
            <div className={styles.labelRow}>
              <span className={styles.accentSquare} aria-hidden="true" />
              <span className={styles.labelText}>Other institutions</span>
            </div>
            <div className={styles.numberRow}>
              <span className={styles.bigNumber}>{formatNumber(MONTHLY.otherInstitutions)}</span>
            </div>
          </div>
          <p className={styles.sentence}>Universities and other organisations</p>
        </div>
        <div className={styles.stat}>
          <div className={styles.statInner}>
            <div className={styles.labelRow}>
              <span className={styles.accentSquare} aria-hidden="true" />
              <span className={styles.labelText}>Countries</span>
            </div>
            <div className={styles.numberRow}>
              <span className={styles.bigNumber}>{formatNumber(MONTHLY.countries)}</span>
            </div>
          </div>
          <p className={styles.sentence}>Countries OceanX content was shared to</p>
        </div>
        <div className={styles.stat}>
          <div className={styles.statInner}>
            <div className={styles.labelRow}>
              <span className={styles.accentSquare} aria-hidden="true" />
              <span className={styles.labelText}>Website visits</span>
            </div>
            <div className={styles.numberRow}>
              <span className={styles.bigNumber}>{formatNumber(MONTHLY.websitesAccessed)}</span>
            </div>
          </div>
          <p className={styles.sentence}>Visits to OceanX content websites</p>
        </div>
      </div>
      <p className={styles.sectionNote}>
        Shared this month: {MONTHLY.websitesShared} websites, {MONTHLY.digitalMediaShared} digital media files.
      </p>
    </section>
  );
}