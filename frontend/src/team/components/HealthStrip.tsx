import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LIBRARY_YTD, OCEANX_REPORT_MONTH } from '../data/oceanxMetrics';
import { SectionHeader } from './SectionHeader';
import styles from './HealthStrip.module.css';

export function HealthStrip() {
  const [show, setShow] = useState(true);
  const navigate = useNavigate();

  const totalItems = LIBRARY_YTD.websites + LIBRARY_YTD.digitalMedia;
  const newItems = LIBRARY_YTD.newCreated;
  const coCreatedItems = LIBRARY_YTD.alumniCoCreated;
  const obsoleteItems = LIBRARY_YTD.obsolete;

  // Proven from governanceService (prototype)
  const provenItems = 42; // prototype value

  const formatNumber = (num: number): string => num.toLocaleString();

  const handleScrollToHidden = () => {
    navigate('/team/insights', { state: { scrollToSection: 'hidden' } });
  };

  const handleToggle = () => setShow(!show);

  return (
    <section className={styles.strip} aria-label="Library health">
      <SectionHeader
        title="Library health"
        subtitle="Year to date"
        goToLabel="Go to Insights"
        goToHref="/team/insights"
        isExpanded={show}
        onToggle={handleToggle}
        sectionId="library-health"
      />
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
      <p className={styles.sectionNote}>
        Library, year to date. Source: OceanX Digital Content Management, {OCEANX_REPORT_MONTH}.
      </p>
    </section>
  );
}