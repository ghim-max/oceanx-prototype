import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LIBRARY_YTD, OCEANX_REPORT_MONTH } from '../data/oceanxMetrics';
import styles from './HealthStrip.module.css';

export function HealthStrip() {
  const [show, setShow] = useState(true);
  const navigate = useNavigate();

  const totalItems = LIBRARY_YTD.websites + LIBRARY_YTD.digitalMedia;
  const newItems = LIBRARY_YTD.newCreated;
  const coCreatedItems = LIBRARY_YTD.alumniCoCreated;
  const obsoleteItems = LIBRARY_YTD.obsolete;

  // Proven from governanceService (prototype)
  // We'll keep it dynamic from localStorage for now, but could also hardcode
  // For now, we'll use a static value from the October report context
  const provenItems = 42; // prototype value

  const formatNumber = (num: number): string => num.toLocaleString();

  const handleScrollToHidden = () => {
    navigate('/team/insights', { state: { scrollToSection: 'hidden' } });
  };

  return (
    <section className={styles.strip} aria-label="Library health">
      <div className={styles.header}>
        <button type="button" className={styles.sectionToggle} onClick={() => setShow(!show)} aria-expanded={show}>
          <span className={styles.title}>Library health</span>
          {show ? 'Hide' : 'Show'}
        </button>
        <a href="/team/insights" className={styles.link}>Go to Insights</a>
      </div>
      {show && (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <div className={styles.statInner}>
              <div className={styles.labelRow}>
                <span className={styles.accentSquare} aria-hidden="true" />
                <span className={styles.labelText}>Total items</span>
              </div>
              <div className={styles.numberRow}>
                <span className={styles.bigNumber}>{formatNumber(totalItems)}</span>
              </div>
            </div>
            <p className={styles.sentence}>
              {LIBRARY_YTD.websites} websites, {LIBRARY_YTD.digitalMedia} digital media files
            </p>
          </div>
          <div className={styles.stat}>
            <div className={styles.statInner}>
              <div className={styles.labelRow}>
                <span className={styles.accentSquare} aria-hidden="true" />
                <span className={styles.labelText}>Proven</span>
              </div>
              <div className={styles.numberRow}>
                <span className={styles.bigNumber}>{formatNumber(provenItems)}</span>
              </div>
            </div>
            <p className={styles.sentence}>Marked Proven by OceanX team</p>
          </div>
          <div className={styles.stat}>
            <div className={styles.statInner}>
              <div className={styles.labelRow}>
                <span className={styles.accentSquare} aria-hidden="true" />
                <span className={styles.labelText}>New (year to date)</span>
              </div>
              <div className={styles.numberRow}>
                <span className={styles.bigNumber}>{formatNumber(newItems)}</span>
              </div>
            </div>
            <p className={styles.sentence}>Recently added to the library</p>
          </div>
          <div className={styles.stat}>
            <div className={styles.statInner}>
              <div className={styles.labelRow}>
                <span className={styles.accentSquare} aria-hidden="true" />
                <span className={styles.labelText}>Co-created</span>
              </div>
              <div className={styles.numberRow}>
                <span className={styles.bigNumber}>{formatNumber(coCreatedItems)}</span>
              </div>
            </div>
            <p className={styles.sentence}>Co-created with alumni</p>
          </div>
          <div className={styles.stat}>
            <div className={styles.statInner}>
              <div className={styles.labelRow}>
                <span className={styles.accentSquare} aria-hidden="true" />
                <span className={styles.labelText}>Obsolete</span>
              </div>
              <div className={styles.numberRow}>
                <span className={styles.bigNumber}>{formatNumber(obsoleteItems)}</span>
              </div>
            </div>
            <p className={styles.sentence}>Hidden from library</p>
            <button type="button" className={styles.obsoleteLink} onClick={handleScrollToHidden}>
              View hidden
            </button>
          </div>
        </div>
      )}
      <p className={styles.sourceLine}>
        Library, year to date. Source: OceanX Digital Content Management, {OCEANX_REPORT_MONTH}.
      </p>
    </section>
  );
}