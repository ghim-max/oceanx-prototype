import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getReviewQueue,
  getPendingCounts,
  openReview,
  decideReview,
  getDecisionLog,
  resetMock,
  resolveIssueReport,
  type ReviewItem,
  type ReviewKind,
  type ReviewStatus,
  USE_MOCK,
} from '../data/governanceService';
import styles from './ReviewPage.module.css';

const KIND_LABELS: Record<ReviewKind, string> = {
  ai_adaptation: 'AI adaptations',
  share_back: 'Share backs',
  issue_report: 'Issue reports',
};

const KIND_KEYS: ReviewKind[] = ['ai_adaptation', 'share_back', 'issue_report'];

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatWaiting(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `Waiting ${days} day${days > 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `Waiting ${hours} h`;
  }
  return `Waiting ${minutes} min`;
}

function statusPillClass(status: ReviewStatus): string {
  switch (status) {
    case 'pending':
      return styles.statusPending;
    case 'approved':
      return styles.statusApproved;
    case 'edited':
      return styles.statusEdited;
    case 'rejected':
      return styles.statusRejected;
  }
}

function statusLabel(status: ReviewStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'approved':
      return 'Approved';
    case 'edited':
      return 'Edited & approved';
    case 'rejected':
      return 'Rejected';
  }
}

function getEducatorDisplay(item: ReviewItem): string {
  if (item.educatorEmail) return item.educatorEmail;
  if (item.kind === 'issue_report') return 'Learner';
  return '—';
}

function getPackageDisplay(item: ReviewItem): string {
  if (item.packageId) return item.packageId;
  return '—';
}

export function ReviewPage() {
  const [activeKind, setActiveKind] = useState<ReviewKind>('ai_adaptation');
  const [filterStatus, setFilterStatus] = useState<ReviewStatus>('pending');
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [counts, setCounts] = useState<Record<ReviewKind, number>>({
    ai_adaptation: 0,
    share_back: 0,
    issue_report: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);
  const [editText, setEditText] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [resolveAction, setResolveAction] = useState<'Resolved' | 'Not an issue' | null>(null);
  const [resolveReason, setResolveReason] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [deciding, setDeciding] = useState(false);

  const [searchParams] = useSearchParams();

  // Load counts
  const loadCounts = useCallback(async () => {
    try {
      const c = await getPendingCounts();
      setCounts({ ai_adaptation: c.ai_adaptation, share_back: c.share_back, issue_report: c.issue_report });
    } catch (e) {
      setError('Could not load counts');
    }
  }, []);

  // Load items for current tab + filter
  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReviewQueue(activeKind, filterStatus);
      setItems(data);
    } catch (e) {
      setError('Could not load review queue');
    } finally {
      setLoading(false);
    }
  }, [activeKind, filterStatus]);

  useEffect(() => {
    loadCounts();
    loadItems();
  }, [loadCounts, loadItems]);

  // Handle ?reset=1 to reset mock data
  useEffect(() => {
    if (searchParams.get('reset') === '1') {
      resetMock();
      loadCounts();
      loadItems();
    }
  }, [searchParams, loadCounts, loadItems]);

  // Handle row click
  const handleRowClick = async (item: ReviewItem) => {
    try {
      const opened = await openReview(item.id);
      setSelectedItem(opened ?? item);
    } finally {
    }
  };

  // Handle decision
  const handleDecide = async (action: 'approve' | 'edit' | 'reject', finalText?: string, reason?: string) => {
    if (!selectedItem) return;
    setDeciding(true);
    try {
      const { item: updatedItem, result } = await decideReview(selectedItem.id, action, finalText, reason);
      if (!updatedItem) return;

      // Update local items
      setItems((prev) => prev.map((i) => (i.id === selectedItem.id ? updatedItem : i)));
      // Update counts
      loadCounts();

      // Show toast
      const actionLabel = action === 'approve' ? 'Approved' : action === 'edit' ? 'Edited and approved' : 'Rejected';
      setToast({ message: actionLabel, type: 'success' });

      // Check for share_back coCreated toast
      if (updatedItem.kind === 'share_back' && (action === 'approve' || action === 'edit') && updatedItem.okToReuse) {
        setToast({ message: 'Marked Co-created in the library', type: 'success' });
      }

      // Check for release email
      if (result.releaseEmail && result.educatorEmail) {
        setTimeout(() => {
          setToast({ message: `All items approved. Email would be sent to ${result.educatorEmail} (mock)`, type: 'info' });
        }, 500);
      }

      // Check for "X of Y items approved for this package"
      if (updatedItem.packageId && updatedItem.kind === 'ai_adaptation') {
        const packageItems = items.filter(
          (i) => i.kind === 'ai_adaptation' && i.packageId === updatedItem.packageId
        );
        const approvedCount = packageItems.filter(
          (i) => i.status === 'approved' || i.status === 'edited' || (i.id === updatedItem.id && (action === 'approve' || action === 'edit'))
        ).length;
        const totalPackageItems = packageItems.length;
        if (approvedCount > 0 && approvedCount < totalPackageItems) {
          setTimeout(() => {
            setToast({ message: `${approvedCount} of ${totalPackageItems} items approved for this package`, type: 'info' });
          }, 1000);
        }
      }

      // Close detail panel
      setSelectedItem(null);
      setEditText('');
      setRejectReason('');
      setShowRejectModal(false);
    } catch (e) {
      setToast({ message: 'Decision failed. Please try again.', type: 'success' });
    } finally {
      setDeciding(false);
    }
  };

  // Approve handler
  const handleApprove = () => {
    if (!selectedItem) return;
    handleDecide('approve');
  };

  // Edit handler
  const handleEdit = () => {
    if (!selectedItem || !editText.trim()) return;
    handleDecide('edit', editText.trim());
  };

  // Reject handler (opens modal)
  const handleRejectOpen = () => {
    setShowRejectModal(true);
  };

  const handleRejectConfirm = () => {
    if (!rejectReason.trim()) return;
    handleDecide('reject', undefined, rejectReason.trim());
  };

  const handleRejectCancel = () => {
    setRejectReason('');
    setShowRejectModal(false);
  };

  // Resolve issue report handlers
  const handleResolveOpen = (action: 'Resolved' | 'Not an issue') => {
    setResolveAction(action);
    setResolveReason('');
    setShowResolveModal(true);
  };

  const handleResolveConfirm = async () => {
    if (!resolveAction || !selectedItem) return;
    if (resolveAction === 'Not an issue' && !resolveReason.trim()) return;

    setDeciding(true);
    try {
      const result = await resolveIssueReport(selectedItem.id, resolveAction, resolveReason.trim() || undefined);
      if (!result.ok) {
        setToast({ message: result.error || 'Failed to resolve', type: 'success' });
        return;
      }

      // Update local item
      const newStatus = resolveAction === 'Resolved' ? 'approved' : 'rejected';
      const updatedItem: ReviewItem = {
        ...selectedItem,
        status: newStatus as ReviewStatus,
        reason: resolveAction === 'Not an issue' ? resolveReason.trim() : selectedItem.reason,
        decidedAt: new Date().toISOString(),
      };
      setItems((prev) => prev.map((i) => (i.id === selectedItem.id ? updatedItem : i)));

      // Update counts
      loadCounts();

      setToast({ message: resolveAction === 'Resolved' ? 'Marked as Resolved' : 'Marked as Not an issue', type: 'success' });

      setResolveAction(null);
      setResolveReason('');
      setShowResolveModal(false);
      setSelectedItem(updatedItem);
    } catch (e) {
      setToast({ message: 'Failed to resolve. Please try again.', type: 'success' });
    } finally {
      setDeciding(false);
    }
  };

  const handleResolveCancel = () => {
    setResolveAction(null);
    setResolveReason('');
    setShowResolveModal(false);
  };

  // Dev: log decision log to console
  const handleLogDecisionLog = async () => {
    const log = await getDecisionLog();
    console.log('Decision Log:', log);
  };

  // Render list rows
  const renderList = () => {
    if (loading) {
      return (
        <div className={styles.loading}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={styles.skeletonRow} />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.errorState} role="alert">
          <p>{error}</p>
          <button type="button" className={styles.retryBtn} onClick={loadItems}>
            Retry
          </button>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className={styles.emptyState}>
          <p>Nothing waiting for review.</p>
        </div>
      );
    }

    return (
      <ul className={styles.list} role="listbox" aria-label={`${KIND_LABELS[activeKind]} queue`}>
        {items.map((item) => (
          <li
            key={item.id}
            className={`${styles.listItem} ${selectedItem?.id === item.id ? styles.listItemSelected : ''}`}
            role="option"
            aria-selected={selectedItem?.id === item.id}
            onClick={() => handleRowClick(item)}
          >
            <div className={styles.itemMain}>
              <div className={styles.itemTitle}>{item.componentTitle}</div>
              <div className={styles.itemMeta}>
                <span className={styles.metaItem}>
                  <span className={styles.metaLabel}>Educator:</span> {getEducatorDisplay(item)}
                </span>
                <span className={styles.metaItem}>
                  <span className={styles.metaLabel}>Package:</span> {getPackageDisplay(item)}
                </span>
                {item.kind === 'share_back' && (
                  <span className={styles.metaItem}>
                    <span className={styles.metaLabel}>OK to reuse:</span> {item.okToReuse ? 'Yes' : 'No'}
                  </span>
                )}
                <span className={styles.metaItem}>
                  <span className={styles.metaLabel}>{formatWaiting(item.createdAt)}</span>
                </span>
              </div>
            </div>
            <div className={styles.itemStatus}>
              <span className={`${styles.statusPill} ${statusPillClass(item.status)}`}>
                {statusLabel(item.status)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  // Render detail panel
  const renderDetail = () => {
    if (!selectedItem) {
      return (
        <div className={styles.detailEmpty}>
          <p>Select an item to review</p>
        </div>
      );
    }

    const item = selectedItem;

    return (
      <div className={styles.detailPanel} role="region" aria-label={`${item.componentTitle} review detail`}>
        <div className={styles.detailHeader}>
          <h2 className={styles.detailTitle}>{item.componentTitle}</h2>
          <span className={`${styles.statusPill} ${statusPillClass(item.status)}`}>
            {statusLabel(item.status)}
          </span>
        </div>

        <div className={styles.detailMeta}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Kind:</span> {KIND_LABELS[item.kind]}
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Educator:</span> {getEducatorDisplay(item)}
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Package:</span> {getPackageDisplay(item)}
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Created:</span> {formatDateTime(item.createdAt)}
          </div>
          {item.openedAt && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Opened:</span> {formatDateTime(item.openedAt)}
            </div>
          )}
          {item.decidedAt && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Decided:</span> {formatDateTime(item.decidedAt)}
            </div>
          )}
          {item.educatorNote && (
            <div className={styles.educatorNote}>
              <span className={styles.metaLabel}>Educator note:</span>
              <p>{item.educatorNote}</p>
            </div>
          )}
          {item.kind === 'share_back' && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>OK to reuse:</span> {item.okToReuse ? 'Yes' : 'No'}
            </div>
          )}
        </div>

        <div className={styles.compareSection}>
          <div className={styles.compareCol}>
            <h3 className={styles.compareHeading}>Original</h3>
            <div className={styles.textBlock}>{item.originalText || '(no original text)'}</div>
          </div>
          <div className={styles.compareCol}>
            <h3 className={styles.compareHeading}>
              Proposed {filterStatus !== 'pending' && item.finalText ? '(Final)' : ''}
            </h3>
            {item.kind === 'issue_report' ? (
              <div className={styles.textBlock}>{item.proposedText}</div>
            ) : filterStatus === 'pending' ? (
              <textarea
                className={styles.editTextarea}
                value={editText || item.proposedText}
                onChange={(e) => setEditText(e.target.value)}
                rows={8}
                placeholder="Edit the proposed text here..."
              />
            ) : (
              <div className={styles.textBlock}>{item.finalText || item.proposedText}</div>
            )}
            {item.kind === 'share_back' && !item.okToReuse && (
              <p className={styles.reuseNote}>Educator did not agree to reuse. Approving keeps it for learning only.</p>
            )}
          </div>
        </div>

        {filterStatus === 'pending' && item.kind === 'issue_report' && (
          <div className={styles.detailActions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnResolve}`}
              onClick={() => handleResolveOpen('Resolved')}
              disabled={deciding}
            >
              {deciding ? 'Resolving…' : 'Resolved'}
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnNotIssue}`}
              onClick={() => handleResolveOpen('Not an issue')}
              disabled={deciding}
            >
              Not an issue
            </button>
          </div>
        )}

        {filterStatus === 'pending' && item.kind !== 'issue_report' && (
          <div className={styles.detailActions}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnApprove}`}
              onClick={handleApprove}
              disabled={deciding}
            >
              {deciding ? 'Approving…' : 'Approve'}
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnEdit}`}
              onClick={handleEdit}
              disabled={deciding || !editText.trim() || editText === item.proposedText}
            >
              {deciding ? 'Saving…' : 'Save edit and approve'}
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnReject}`}
              onClick={handleRejectOpen}
              disabled={deciding}
            >
              Reject
            </button>
          </div>
        )}

        {filterStatus !== 'pending' && item.reason && (
          <div className={styles.reasonBlock}>
            <span className={styles.metaLabel}>Reason:</span>
            <p>{item.reason}</p>
          </div>
        )}
      </div>
    );
  };

  // Toast
  const renderToast = () => {
    if (!toast) return null;
    return (
      <div className={`${styles.toast} ${styles[`toast--${toast.type}`]}`} role="alert" aria-live="polite">
        {toast.message}
      </div>
    );
  };

  // Reject modal
  const renderRejectModal = () => {
    if (!showRejectModal) return null;
    return (
      <div className={styles.modalOverlay} onClick={handleRejectCancel}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <h3 className={styles.modalTitle}>Reject this item</h3>
          <p className={styles.modalText}>Please provide a reason for rejection.</p>
          <textarea
            className={styles.modalTextarea}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            placeholder="Reason for rejection..."
            maxLength={500}
            autoFocus
          />
          <div className={styles.modalActions}>
            <button type="button" className={`${styles.btn} ${styles.btnCancel}`} onClick={handleRejectCancel}>
              Cancel
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnConfirmReject}`}
              onClick={handleRejectConfirm}
              disabled={!rejectReason.trim() || deciding}
            >
              {deciding ? 'Rejecting…' : 'Confirm rejection'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Resolve modal
  const renderResolveModal = () => {
    if (!showResolveModal) return null;
    return (
      <div className={styles.modalOverlay} onClick={handleResolveCancel}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <h3 className={styles.modalTitle}>
            {resolveAction === 'Resolved' ? 'Mark as Resolved' : 'Mark as Not an issue'}
          </h3>
          <p className={styles.modalText}>
            {resolveAction === 'Resolved'
              ? 'Confirm that this issue has been resolved.'
              : 'Please provide a reason why this is not an issue.'}
          </p>
          {resolveAction === 'Not an issue' && (
            <textarea
              className={styles.modalTextarea}
              value={resolveReason}
              onChange={(e) => setResolveReason(e.target.value)}
              rows={4}
              placeholder="Reason..."
              maxLength={500}
              autoFocus
            />
          )}
          <div className={styles.modalActions}>
            <button type="button" className={`${styles.btn} ${styles.btnCancel}`} onClick={handleResolveCancel}>
              Cancel
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnConfirmResolve}`}
              onClick={handleResolveConfirm}
              disabled={resolveAction === 'Not an issue' && !resolveReason.trim() || deciding}
            >
              {deciding ? (resolveAction === 'Resolved' ? 'Resolving…' : 'Saving…') : resolveAction === 'Resolved' ? 'Confirm resolved' : 'Confirm not an issue'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <article className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.h1}>Review queue</h1>
        </header>

        {/* Tabs */}
        <div className={styles.tabs} role="tablist" aria-label="Review kind">
          {KIND_KEYS.map((kind) => (
            <button
              key={kind}
              role="tab"
              aria-selected={activeKind === kind}
              className={`${styles.tab} ${activeKind === kind ? styles.tabActive : ''}`}
              onClick={() => setActiveKind(kind)}
            >
              {KIND_LABELS[kind]}
              <span className={styles.tabCount}>{counts[kind]}</span>
            </button>
          ))}
        </div>

        {/* Filter switch */}
        <div className={styles.filterSwitch} role="group" aria-label="Filter by status">
          <button
            type="button"
            className={`${styles.filterBtn} ${filterStatus === 'pending' ? styles.filterBtnActive : ''}`}
            onClick={() => setFilterStatus('pending')}
          >
            Pending
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${filterStatus !== 'pending' ? styles.filterBtnActive : ''}`}
            onClick={() => setFilterStatus('approved')}
          >
            Done
          </button>
        </div>

        {/* Main layout: list + detail */}
        <div className={styles.mainLayout}>
          <section className={styles.listSection} aria-labelledby="list-heading">
            <h2 id="list-heading" className={styles.sectionHeading}>
              {KIND_LABELS[activeKind]} ({items.length})
            </h2>
            {renderList()}
          </section>

          <aside className={styles.detailSection} aria-labelledby="detail-heading">
            <h2 id="detail-heading" className={styles.sectionHeading}>
              {selectedItem ? 'Detail' : 'Detail'}
            </h2>
            {renderDetail()}
          </aside>
        </div>

        {/* Dev button to log decision log */}
        {USE_MOCK && (
          <button type="button" className={styles.devLogBtn} onClick={handleLogDecisionLog}>
            Log decision log to console
          </button>
        )}
      </div>

      {renderToast()}
      {renderRejectModal()}
      {renderResolveModal()}
    </article>
  );
}