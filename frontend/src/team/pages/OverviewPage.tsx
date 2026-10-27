import { HealthStrip } from '../components/HealthStrip';
import { TimePanel } from '../components/TimePanel';
import { ReachStrip } from '../components/ReachStrip';
import styles from './OverviewPage.module.css';

export function OverviewPage() {
  return (
    <article className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.h1}>Overview</h1>
          <p className={styles.subline}>How the library and the team are doing.</p>
        </header>

        <HealthStrip />
        <TimePanel />
        <ReachStrip />
      </div>
    </article>
  );
}