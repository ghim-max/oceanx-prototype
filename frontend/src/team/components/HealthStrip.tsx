import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLibraryState, getLatestDecision, type LibraryState } from '../data/governanceService';
import { COMPONENT_TITLES } from '../data/governanceService';
import styles from './HealthStrip.module.css';

export function HealthStrip() {
  const [libraryState, setLibraryState] = useState<LibraryState[]>([]);
  const [show, setShow] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getLibraryState().then(setLibraryState);
    // Load latest decisions for each component
    Object.keys(COMPONENT_TITLES).forEach((componentId) => {
      getLatestDecision(componentId).then((decision) => {
        if (decision) {
          // Decision loaded but not used in this component
        }
      });
    });
  }, []);

  const COMPONENT_COUNT = 7; // from COMPONENT_ORDER
  const totalItems = COMPONENT_COUNT;
  const provenItems = libraryState.filter((s) => s.proven).length;
  const now = Date.now();
  const day = 24 * 3600 * 1000;
  const newItems = libraryState.filter((s) => now - new Date(s.createdAt).getTime() < 30 * day).length;
  const coCreatedItems = libraryState.filter((s) => s.coCreated).length;
  const obsoleteItems = libraryState.filter((s) => s.obsolete).length;

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
                <span className={styles.bigNumber}>{totalItems}</span>
              </div>
            </div>
            <p className={styles.sentence}>components in the educator library</p>
          </div>
          <div className={styles.stat}>
            <div className={styles.statInner}>
              <div className={styles.labelRow}>
                <span className={styles.accentSquare} aria-hidden="true" />
                <span className={styles.labelText}>Proven</span>
              </div>
              <div className={styles.numberRow}>
                <span className={styles.bigNumber}>{provenItems}</span>
              </div>
            </div>
            <p className={styles.sentence}>Marked Proven by OceanX team</p>
          </div>
          <div className={styles.stat}>
            <div className={styles.statInner}>
              <div className={styles.labelRow}>
                <span className={styles.accentSquare} aria-hidden="true" />
                <span className={styles.labelText}>New (last 30 days)</span>
              </div>
              <div className={styles.numberRow}>
                <span className={styles.bigNumber}>{newItems}</span>
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
                <span className={styles.bigNumber}>{coCreatedItems}</span>
              </div>
            </div>
            <p className={styles.sentence}>Adapted by educators and approved</p>
          </div>
          <div className={styles.stat}>
            <div className={styles.statInner}>
              <div className={styles.labelRow}>
                <span className={styles.accentSquare} aria-hidden="true" />
                <span className={styles.labelText}>Obsolete</span>
              </div>
              <div className={styles.numberRow}>
                <span className={styles.bigNumber}>{obsoleteItems}</span>
              </div>
            </div>
            <p className={styles.sentence}>Hidden from library</p>
            <button type="button" className={styles.obsoleteLink} onClick={handleScrollToHidden}>
              View hidden
            </button>
          </div>
        </div>
      )}
    </section>
  );
}