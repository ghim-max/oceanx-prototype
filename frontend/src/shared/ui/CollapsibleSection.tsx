import { useState, useEffect, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './CollapsibleSection.module.css';

interface CollapsibleSectionProps {
  title: ReactNode;
  subtitle?: ReactNode;
  summary: string;
  defaultOpen?: boolean;
  storageKey?: string;
  children: ReactNode;
  autoCollapse?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

export function CollapsibleSection({
  title,
  subtitle,
  summary,
  defaultOpen = true,
  storageKey,
  children,
  autoCollapse = false,
  onToggle,
}: CollapsibleSectionProps) {
  // Initialize state from sessionStorage
  const [isOpen, setIsOpen] = useState(() => {
    if (storageKey) {
      try {
        const stored = sessionStorage.getItem(storageKey);
        if (stored !== null) {
          return stored === 'true';
        }
      } catch {
        // ignore
      }
    }
    return defaultOpen;
  });

  // Persist to sessionStorage
  useEffect(() => {
    if (storageKey) {
      try {
        sessionStorage.setItem(storageKey, String(isOpen));
      } catch {
        // ignore
      }
    }
  }, [isOpen, storageKey]);

  // Auto-collapse effect
  useEffect(() => {
    if (autoCollapse && isOpen) {
      setIsOpen(false);
    }
  }, [autoCollapse]);

  const handleToggle = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    onToggle?.(nextOpen);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <section className={styles.section} aria-labelledby={storageKey ? `${storageKey}-heading` : undefined}>
      <div
        className={styles.header}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-controls={storageKey ? `${storageKey}-content` : undefined}
        id={storageKey ? `${storageKey}-heading` : undefined}
      >
        <div className={styles.headerLeft}>
          <span className={styles.title}>{title}</span>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </div>
        <button
          type="button"
          className={styles.collapseBtn}
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Collapse section' : 'Expand section'}
          aria-controls={storageKey ? `${storageKey}-content` : undefined}
        >
          <ChevronDown
            size={18}
            className={`${styles.chevron} ${isOpen ? styles.chevronRotated : ''}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {isOpen ? (
        <div
          id={storageKey ? `${storageKey}-content` : undefined}
          className={styles.content}
          role="region"
          aria-label={typeof title === 'string' ? title : 'Section content'}
        >
          {children}
        </div>
      ) : (
        <p className={styles.summary} aria-hidden="true">
          {summary}
        </p>
      )}
    </section>
  );
}