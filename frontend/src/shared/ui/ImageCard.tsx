import { Link } from 'react-router-dom';
import styles from './ImageCard.module.css';

interface ImageCardProps {
  to: string;
  title: string;
  description: string;
  imagePath?: string;
  imageSrcWebp?: string;
  imageAlt?: string;
  imagePlaceholderLabel?: string;
  onClick?: () => void;
}

export function ImageCard({
  to,
  title,
  description,
  imagePath,
  imageSrcWebp,
  imageAlt,
  imagePlaceholderLabel,
  onClick,
}: ImageCardProps) {
  return (
    <Link to={to} className={styles.card} onClick={onClick}>
      <div className={styles.imageWrapper}>
        {imagePath ? (
          <picture className={styles.picture}>
            {imageSrcWebp && <source srcSet={imageSrcWebp} type="image/webp" />}
            <img src={imagePath} alt={imageAlt ?? ''} className={styles.img} />
          </picture>
        ) : (
          <div className={styles.placeholder} aria-hidden="true">
            {imagePlaceholderLabel && (
              <span className={styles.placeholderLabel}>{imagePlaceholderLabel}</span>
            )}
          </div>
        )}
      </div>
      <div className={styles.body}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>
      </div>
    </Link>
  );
}
