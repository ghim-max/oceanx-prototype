import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
  title: string;
  subtitle: string;
  goToLabel?: string;
  goToHref?: string;
}

export function SectionHeader({
  title,
  subtitle,
  goToLabel,
  goToHref,
}: SectionHeaderProps) {
  return (
    <div className={styles.sectionHeader}>
      <div className={styles.sectionHeaderText}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <p className={styles.sectionSubtitle}>{subtitle}</p>
      </div>
      {goToLabel && goToHref && (
        <a href={goToHref} className={styles.goToLink}>
          {goToLabel}
        </a>
      )}
    </div>
  );
}