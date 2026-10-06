import { PROJECT } from '../../team/data/projectContext';
import { getComponentThumb } from '../../shared/utils/thumbnails';
import styles from './DecisionCard.module.css';

interface DecisionCardProps {
  card: {
    component_id: string;
    title: string;
    status: 'Fixed' | 'Adapted';
    recommendation: 'Reuse' | 'Adapt' | 'Drop';
    why: string;
    suggested_action: string;
    quotes?: Array<{ text: string; who: 'Learner' | 'Educator' }>;
    metrics: {
      gain_pts: number | null;
      pre_pct: number | null;
      post_pct: number | null;
      learning: number | null;
      engagement: number | null;
      used_as_is: number;
      changed: number;
      skipped: number;
      educator_count: number;
      learner_count: number;
    };
  };
  showActions?: boolean;
  approvalState?: 'approve' | 'reject' | null;
  onApprovalChange?: (state: 'approve' | 'reject' | null) => void;
}

interface StatCardItemProps {
  label: string;
  number: string | number;
  suffix?: string;
  sub: string;
}

const ACCENT_SQUARE = (
  <span
    style={{
      display: 'inline-block',
      width: '10px',
      height: '10px',
      background: '#90E0EF',
      marginRight: '8px',
      verticalAlign: 'middle',
    }}
    aria-hidden="true"
  />
);

const STAT_LABEL_STYLE = {
  fontFamily: "var(--font-body)",
  fontSize: '12px',
  fontWeight: 400,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: '#0F1E28',
} as const;

function StatCardItem({ label, number, suffix, sub }: StatCardItemProps) {
  return (
    <div className={styles.statCardItem}>
      <div className={styles.statCardLabelRow}>
        {ACCENT_SQUARE}
        <span style={STAT_LABEL_STYLE}>{label}</span>
      </div>
      <div className={styles.statCardNumberRow}>
        <span className={styles.statCardBigNumber}>{number}</span>
        {suffix && <span className={styles.statSuffix}>{suffix}</span>}
      </div>
      <p className={styles.statCardSub}>{sub}</p>
    </div>
  );
}

export function DecisionCard({
  card,
  showActions = true,
  approvalState,
  onApprovalChange,
}: DecisionCardProps) {
  const m = card.metrics;
  const recColor =
    card.recommendation === 'Reuse'
      ? { bg: '#DDF3E4', text: '#1A7A40' }
      : card.recommendation === 'Adapt'
      ? { bg: '#FBEBC8', text: '#8B5A00' }
      : { bg: '#F6DADA', text: '#8B2020' };

  const gainNumber = m.gain_pts !== null ? `${m.gain_pts}` : 'n/a';
  const gainSuffix = m.gain_pts !== null ? 'pts' : '';
  const gainSub =
    m.gain_pts !== null
      ? `${m.pre_pct}% to ${m.post_pct}% correct`
      : 'No quiz question';

  const learningNumber = m.learning !== null ? m.learning : 'n/a';
  const learningSuffix = m.learning !== null ? '/5' : '';
  const learningSub =
    m.learning !== null ? 'Educator rating' : 'Not used';

  const engagementNumber = m.engagement !== null ? m.engagement : 'n/a';
  const engagementSuffix = m.engagement !== null ? '/5' : '';
  const engagementSub = m.engagement !== null ? 'Educator rating' : 'n/a';

  const usedCount = m.used_as_is + m.changed;
  const educatorUseNumber = `${usedCount}/${m.educator_count}`;
  const educatorUseSuffix = '';
  const educatorUseSub = `${m.changed} changed, ${m.skipped} skipped`;

  const thumb = getComponentThumb(card.component_id);

  return (
    <article className={styles.aiCard}>
      <div className={styles.cardGrid}>
        {/* Column 1: Identity */}
        <div className={styles.cardCol1}>
          {/* Thumbnail */}
          <div className={styles.thumbWrapper}>
            {thumb ? (
              <>
                <img
                  src={thumb.src}
                  alt={thumb.alt}
                  className={styles.thumbImg}
                  loading="lazy"
                />
                <span className={styles.thumbBadge}>
                  {thumb.type}
                  {thumb.duration && ` · ${thumb.duration}`}
                </span>
              </>
            ) : (
              <div className={styles.thumbPlaceholder}>
                Preview not available
              </div>
            )}
          </div>
          <div className={styles.cardMeta}>
            <span className={styles.statusTag}>
              {card.status === 'Adapted'
                ? 'Adapted for university'
                : 'Fixed content'}
            </span>
            <span className={styles.sourceLine}>
              From {PROJECT.projectCount} project &middot;{' '}
              {m.learner_count} learners &middot;{' '}
              {m.educator_count} educators
            </span>
          </div>
          <h3 className={styles.cardTitle}>{card.title}</h3>
        </div>

        {/* Column 2: Numbers */}
        <div className={styles.cardCol2}>
          <div className={styles.statsGrid}>
            <StatCardItem
              label="LEARNING GAIN"
              number={gainNumber}
              suffix={gainSuffix}
              sub={gainSub}
            />
            <StatCardItem
              label="LEARNING IMPACT"
              number={learningNumber}
              suffix={learningSuffix}
              sub={learningSub}
            />
            <StatCardItem
              label="ENGAGEMENT"
              number={engagementNumber}
              suffix={engagementSuffix}
              sub={engagementSub}
            />
            <StatCardItem
              label="EDUCATOR USE"
              number={educatorUseNumber}
              suffix={educatorUseSuffix}
              sub={educatorUseSub}
            />
          </div>
        </div>

        {/* Column 3: Decision + explanation */}
        <div className={styles.cardCol3}>
          <div className={styles.decisionBar}>
          <div className={styles.recommendationPillWrapper}>
              <span
                className={styles.recommendationPill}
                style={{ color: recColor.text }}
              >
                <span className={styles.recDot} style={{ background: recColor.text }} aria-hidden="true" />
                <span className={styles.recLabel}>Recommended:</span>
                <span className={styles.recValue}>{card.recommendation}</span>
              </span>
            </div>
          {showActions && (
              <div className={styles.cardActions}>
                {approvalState === 'approve' ? (
                  <span className={styles.approved}>
                    Approved{' '}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        onApprovalChange?.(null);
                      }}
                    >
                      Undo
                    </a>
                  </span>
                ) : approvalState === 'reject' ? (
                  <span className={styles.rejected}>
                    Rejected{' '}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        onApprovalChange?.(null);
                      }}
                    >
                      Undo
                    </a>
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      className={styles.approveBtn}
                      onClick={() => onApprovalChange?.('approve')}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className={styles.rejectBtn}
                      onClick={() => onApprovalChange?.('reject')}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          <div className={styles.cardSection}>
            <h4 className={styles.sectionLabel}>WHY</h4>
            <p className={styles.whyText}>{card.why}</p>
          </div>
          <div className={styles.cardSection}>
            <h4 className={styles.sectionLabel}>SUGGESTED ACTION</h4>
            <p className={styles.actionText}>{card.suggested_action}</p>
          </div>
          {card.quotes && card.quotes.length > 0 && (
            <div className={styles.cardSection}>
              <h4 className={styles.sectionLabel}>QUOTES</h4>
              <ul className={styles.quotesList}>
                {card.quotes.map((q, i) => (
                  <li key={i} className={styles.quoteItem}>
                    <p className={styles.quoteText}>"{q.text}"</p>
                    <span className={styles.quoteAttribution}>
                      {q.who.toUpperCase()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}