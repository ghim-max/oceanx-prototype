import { useState } from 'react';
import { MONTHLY, OCEANX_REPORT_MONTH } from '../data/oceanxMetrics';
import styles from './ReachStrip.module.css';

export function ReachStrip() {
  const [show, setShow] = useState(true);

  const formatNumber = (num: number): string => num.toLocaleString();

  return (
    <section className={styles.strip} aria-label="Reach">
      <div className={styles.header}>
        <button type="button" className={styles.sectionToggle} onClick={() => setShow(!show)} aria-expanded={show}>
          <span className={styles.title}>Reach ({OCEANX_REPORT_MONTH})</span>
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {show && (
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
      )}
      <p className={styles.sectionNote}>
        Shared this month: {MONTHLY.websitesShared} websites, {MONTHLY.digitalMediaShared} digital media files.
      </p>
    </section>
  );
}