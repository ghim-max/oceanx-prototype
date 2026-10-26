import { HealthStrip } from '../components/HealthStrip';
import { TimePanel } from '../components/TimePanel';
import { ReachStrip } from '../components/ReachStrip';
import { SUPABASE_IS_SAMPLE } from '../data/dataSource';
import styles from './OverviewPage.module.css';

export function OverviewPage() {
  return (
    <div className={styles.page}>
      {SUPABASE_IS_SAMPLE && (
        <div className={styles.dataLabel}>
          All numbers are prototype sample data until real OceanX sessions are added.
        </div>
      )}

      <header className={styles.header}>
        <h1 className={styles.h1}>Overview</h1>
        <p className={styles.subline}>How the library and the team are doing.</p>
      </header>

      <HealthStrip />
      <TimePanel />
      <ReachStrip cards={[]} session={{}} />
    </div>
  );
}