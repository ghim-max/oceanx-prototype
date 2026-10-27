import styles from './StatsStrip.module.css';

interface StatItem {
  label: string;
  value: number | string;
  sentence?: string;
}

interface StatsStripProps {
  stats: StatItem[];
  className?: string;
}

export function StatsStrip({ stats, className = '' }: StatsStripProps) {
  return (
    <div className={`${styles.stats} ${className}`}>
      {stats.map(({ label, value, sentence }) => (
        <div key={label} className={styles.stat}>
          <div className={styles.statInner}>
            <div className={styles.labelRow}>
              <span className={styles.accentSquare} aria-hidden="true" />
              <span className={styles.labelText}>{label}</span>
            </div>
            <div className={styles.numberRow}>
              <span className={styles.bigNumber}>{value}</span>
            </div>
          </div>
          {sentence && <p className={styles.sentence}>{sentence}</p>}
        </div>
      ))}
    </div>
  );
}