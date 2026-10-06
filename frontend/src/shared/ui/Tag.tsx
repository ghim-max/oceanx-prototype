import styles from './Tag.module.css';
import type { RecommendationLabel } from '../types';

type TagVariant = 'default' | 'accent' | RecommendationLabel;

interface TagProps {
  label: string;
  variant?: TagVariant;
}

export function Tag({ label, variant = 'default' }: TagProps) {
  const variantClass =
    variant === 'default'
      ? ''
      : variant === 'accent'
      ? styles.accent
      : variant === 'Reuse'
      ? styles.reuse
      : variant === 'Adapt'
      ? styles.adapt
      : styles.drop;

  return (
    <span className={`${styles.tag} ${variantClass}`}>
      {label}
    </span>
  );
}
