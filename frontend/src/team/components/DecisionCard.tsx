import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  teamDecision?: 'Reuse' | 'Adapt' | 'Drop' | null;
  onTeamDecision?: (componentId: string, decision: 'Reuse' | 'Adapt' | 'Drop', why?: string, suggestedAction?: string) => void;
  latestDecision?: { decision: 'Reuse' | 'Adapt' | 'Drop'; why?: string; aiOverride: boolean; createdAt: string } | null;
  isTesterMode?: boolean;
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

function TeamDecisionRow({
  componentId,
  aiRecommendation,
  teamDecision,
  onTeamDecision,
  latestDecision,
  isLocked,
  setIsLocked,
  isTesterMode = false,
}: {
  componentId: string;
  aiRecommendation: 'Reuse' | 'Adapt' | 'Drop';
  teamDecision?: 'Reuse' | 'Adapt' | 'Drop' | null;
  onTeamDecision: (componentId: string, decision: 'Reuse' | 'Adapt' | 'Drop', why?: string, suggestedAction?: string) => void;
  latestDecision?: { decision: 'Reuse' | 'Adapt' | 'Drop'; why?: string; aiOverride: boolean; createdAt: string } | null;
  isLocked: boolean;
  setIsLocked: (v: boolean) => void;
  isTesterMode?: boolean;
}) {
  const navigate = useNavigate();
  const [selectedDecision, setSelectedDecision] = useState<'Reuse' | 'Adapt' | 'Drop'>(teamDecision || aiRecommendation);
  const [whyText, setWhyText] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOverride = selectedDecision !== aiRecommendation;
  const decided = latestDecision?.decision;

  useEffect(() => {
    if (teamDecision) {
      setSelectedDecision(teamDecision);
    }
  }, [teamDecision]);

  const handleDecisionChange = (decision: 'Reuse' | 'Adapt' | 'Drop') => {
    setSelectedDecision(decision);
    setError(null);
  };

  const handleConfirm = async () => {
    if (isOverride && (!whyText || whyText.trim() === '')) {
      setError('Please say why you chose differently from the AI');
      return;
    }
    setConfirming(true);
    setError(null);
    try {
      await onTeamDecision(componentId, selectedDecision, whyText.trim() || undefined, '');
      setIsLocked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save decision');
    } finally {
      setConfirming(false);
    }
  };

  const handleHistoryClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate('/team/log', { state: { filterComponent: componentId } });
  };

  if (isTesterMode) {
    return null;
  }

  if (decided && isLocked) {
    const timeAgo = formatTimeAgo(latestDecision!.createdAt);
    return (
      <div className={styles.teamDecisionDecided}>
        <div className={styles.decidedLine}>
          <span>Decided: {decided} by OceanX team, {timeAgo}</span>
          <span className={styles.decidedActions}>
            <button
              type="button"
              className={styles.changeLink}
              onClick={() => setIsLocked(false)}
            >
              Change
            </button>
            <span className={styles.decidedSeparator}>·</span>
            <a
              href="#"
              className={styles.historyLink}
              onClick={handleHistoryClick}
            >
              History
            </a>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.teamDecisionRow}>
      <div className={styles.decisionRowTop}>
        <div className={styles.segmentedControl}>
          {['Reuse', 'Adapt', 'Drop'].map((opt) => (
            <button
              key={opt}
              type="button"
              className={`${styles.segmentBtn} ${selectedDecision === opt ? styles.segmentBtnActive : ''} ${isLocked ? styles.segmentBtnDisabled : ''}`}
              onClick={() => !isLocked && handleDecisionChange(opt as 'Reuse' | 'Adapt' | 'Drop')}
              disabled={isLocked}
              aria-pressed={selectedDecision === opt}
            >
              {opt}
              {opt === aiRecommendation && (
                <span className={styles.aiRecBadge}>AI</span>
              )}
            </button>
          ))}
        </div>
        {!isLocked && !decided && (
          <button
            type="button"
            className={`${styles.confirmBtn} ${confirming ? styles.confirmBtnLoading : ''}`}
            onClick={handleConfirm}
            disabled={confirming || (isOverride && !whyText.trim())}
          >
            {confirming ? 'Saving...' : 'Confirm'}
          </button>
        )}
      </div>
      {isOverride && !isLocked && (
        <div className={styles.whyBox}>
          <label htmlFor={`why-${componentId}`} className={styles.whyLabel}>
            Why? <span className={styles.required}>*</span>
          </label>
          <textarea
            id={`why-${componentId}`}
            className={styles.whyTextarea}
            value={whyText}
            onChange={(e) => setWhyText(e.target.value)}
            rows={2}
            placeholder="Required when overriding AI recommendation"
            disabled={isLocked}
          />
        </div>
      )}
      {(isOverride || isLocked) && !isLocked && (
        <div className={styles.overrideTagRow}>
          <span className={styles.overrideTag}>Overrides AI</span>
        </div>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

export function DecisionCard({
  card,
  showActions = true,
  approvalState,
  onApprovalChange,
  teamDecision,
  onTeamDecision,
  latestDecision,
  isTesterMode = false,
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
  const learningSub = m.learning !== null ? 'Educator rating' : 'Not used';

  const engagementNumber = m.engagement !== null ? m.engagement : 'n/a';
  const engagementSuffix = m.engagement !== null ? '/5' : '';
  const engagementSub = m.engagement !== null ? 'Educator rating' : 'n/a';

  const usedCount = m.used_as_is + m.changed;
  const educatorUseNumber = `${usedCount}/${m.educator_count}`;
  const educatorUseSuffix = '';
  const educatorUseSub = `${m.changed} changed, ${m.skipped} skipped`;

  const thumb = getComponentThumb(card.component_id);
  const [isLocked, setIsLocked] = useState(false);

  return (
    <article className={styles.aiCard}>
      <div className={styles.cardGrid}>
        {/* Column 1: Identity (LEFT) */}
        <div className={styles.cardCol1}>
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
              From {PROJECT.projectCount} project ·{' '}
              {m.learner_count} learners ·{' '}
              {m.educator_count} educators
            </span>
          </div>
          <h3 className={styles.cardTitle}>{card.title}</h3>
        </div>

        {/* Column 2: Numbers + Quotes (MIDDLE) */}
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
          {card.quotes && card.quotes.length > 0 && (
            <div className={styles.quotesSection}>
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

        {/* Column 3: Decision + Explanation (RIGHT) */}
        <div className={styles.cardCol3}>
          {/* a. Recommended + Approve/Reject */}
          <div className={styles.recRow}>
            <div className={styles.recLabel} style={{ color: recColor.text }}>
              <span className={styles.recDot} style={{ background: recColor.text }} aria-hidden="true" />
              <span>Recommended:</span>
              <strong className={styles.recValue}>{card.recommendation}</strong>
            </div>
            {showActions && (
              <div className={styles.recActions}>
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

          {/* b. Team decision row: Reuse|Adapt|Drop + Confirm */}
          <TeamDecisionRow
            componentId={card.component_id}
            aiRecommendation={card.recommendation}
            teamDecision={teamDecision}
            onTeamDecision={onTeamDecision ?? (() => {})}
            latestDecision={latestDecision}
            isLocked={isLocked}
            setIsLocked={setIsLocked}
            isTesterMode={isTesterMode}
          />

          {/* d. WHY, then SUGGESTED ACTION */}
          <div className={styles.cardSection}>
            <h4 className={styles.sectionLabel}>WHY</h4>
            <p className={styles.whyText}>{card.why}</p>
          </div>
          <div className={styles.cardSection}>
            <h4 className={styles.sectionLabel}>SUGGESTED ACTION</h4>
            <p className={styles.actionText}>{card.suggested_action}</p>
          </div>
        </div>
      </div>
    </article>
  );
}