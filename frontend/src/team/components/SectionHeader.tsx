import { ChevronDown } from 'lucide-react';
import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
  title: string;
  subtitle: string;
  goToLabel: string;
  goToHref: string;
  isExpanded: boolean;
  onToggle: () => void;
  sectionId: string;
}

export function SectionHeader({
  title,
  subtitle,
  goToLabel,
  goToHref,
  isExpanded,
  onToggle,
  sectionId,
}: SectionHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.sectionToggle}
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-controls={`${sectionId}-content`}
          id={`${sectionId}-toggle`}
        >
          <div className={styles.titleRow}>
            <span className={styles.title}>{title}</span>
          </div>
          <span className={styles.subtitle}>{subtitle}</span>
        </button>
      </div>
      <div className={styles.right}>
        <a href={goToHref} className={styles.goToLink}>
          {goToLabel}
        </a>
        <button
          type="button"
          className={styles.collapseBtn}
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-controls={`${sectionId}-content`}
          aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
        >
          <ChevronDown
            size={18}
            className={isExpanded ? styles.chevronRotated : styles.chevron}
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
}