import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getReviewQueue,
  getPendingCounts,
  openReview,
  decideReview,
  resetMock,
  resolveIssueReport,
  type ReviewItem,
  type ReviewKind,
  type ReviewStatus,
} from '../data/governanceService';
import {
  decideDemoPackageComponent,
  getPackageReviewRecords,
  type PackageReviewMaterial,
  type PackageReviewRecord,
} from '../data/packageReviewService';
import styles from './ReviewPage.module.css';

const KIND_LABELS: Record<ReviewKind, string> = {
  ai_adaptation: 'AI adaptations',
  share_back: 'Share Backs (AI-checked)',
  issue_report: 'Issues Log',
};

type ReviewTab = 'packages' | 'share_back' | 'issue_report';
const REVIEW_TABS: Array<{ id: ReviewTab; label: string }> = [
  { id: 'packages', label: 'Packages (AI-flagged)' },
  { id: 'share_back', label: KIND_LABELS.share_back },
  { id: 'issue_report', label: KIND_LABELS.issue_report },
];

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
  const diff = Math.max(0, Date.now() - new Date(createdAt).getTime());
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
  const [activeTab, setActiveTab] = useState<ReviewTab>('packages');
  const [filterStatus, setFilterStatus] = useState<'pending' | 'done'>('pending');
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [packageRecords, setPackageRecords] = useState<PackageReviewRecord[]>([]);
  const [counts, setCounts] = useState({
    packages: 0,
    share_back: 0,
    issue_report: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageReviewRecord | null>(null);
  const [packageEdits, setPackageEdits] = useState<Record<string, string>>({});
  const [approvalMaterial, setApprovalMaterial] = useState<PackageReviewMaterial | null>(null);
  const [editText, setEditText] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [resolveAction, setResolveAction] = useState<'Resolved' | 'Not an issue' | null>(null);
  const [resolveReason, setResolveReason] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [deciding, setDeciding] = useState(false);

  const [searchParams] = useSearchParams();

  const loadCounts = useCallback(async () => {
    try {
      const c = await getPendingCounts();
      const packages = getPackageReviewRecords('pending_review').length;
      const pendingShareBacks = await getReviewQueue('share_back', 'pending');
      const flaggedShareBackCount = pendingShareBacks.filter((item) => item.screeningStatus === 'flagged').length;
      setCounts({ packages, share_back: flaggedShareBackCount, issue_report: c.issue_report });
    } catch {
      setError('Could not load counts');
    }
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'packages') {
        const status = filterStatus === 'pending' ? 'pending_review' : 'cleared';
        setPackageRecords(getPackageReviewRecords(status));
        setItems([]);
      } else {
        const data = await getReviewQueue(activeTab, filterStatus === 'pending' ? 'pending' : 'done');
        if (activeTab === 'share_back') {
          const flaggedItems = data.filter((item) => item.screeningStatus === 'flagged');
          flaggedItems.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          setItems(flaggedItems);
        } else {
          setItems(data);
        }
        setPackageRecords([]);
      }
    } catch {
      setError('Could not load review queue');
    } finally {
      setLoading(false);
    }
  }, [activeTab, filterStatus]);

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

  const handlePackageDecision = async (
    packageId: string,
    material: PackageReviewMaterial,
    action: 'approve' | 'edit' | 'reject_original',
  ) => {
    const editKey = `${packageId}:${material.componentId}`;
    setDeciding(true);
    try {
      const result = decideDemoPackageComponent(
        packageId,
        material.componentId,
        action,
        action === 'edit' ? packageEdits[editKey] : undefined,
      );
      setSelectedPackage(result.record);
      setPackageRecords((previous) =>
        previous.map((record) => (record.id === result.record.id ? result.record : record)),
      );
      setToast({
        message: result.unresolvedCount > 0
          ? `Decision saved. ${result.unresolvedCount} flagged component(s) remain; package is still on hold.`
          : 'All flagged components resolved. Delivery was simulated; no email was sent.',
        type: 'success',
      });
      await loadCounts();
      await loadItems();
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Package decision failed. Nothing was released.',
        type: 'info',
      });
    } finally {
      setDeciding(false);
    }
  };

  const handlePackageApprovalConfirm = async () => {
    if (!selectedPackage || !approvalMaterial) return;
    const material = approvalMaterial;
    setApprovalMaterial(null);
    await handlePackageDecision(selectedPackage.id, material, 'approve');
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
          setToast({ message: 'All items approved. Email delivery is simulated; no email was sent.', type: 'info' });
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

    if (activeTab === 'packages') {
      if (packageRecords.length === 0) {
        return (
          <div className={styles.emptyState}>
            <p>{filterStatus === 'pending' ? 'No packages are waiting for review.' : 'No completed packages yet.'}</p>
          </div>
        );
      }

      return (
        <ul className={styles.list} role="listbox" aria-label="Packages requiring review">
          {packageRecords.map((record) => {
            return (
              <li
                key={record.id}
                className={`${styles.listItem} ${selectedPackage?.id === record.id ? styles.listItemSelected : ''}`}
                role="option"
                aria-selected={selectedPackage?.id === record.id}
                onClick={() => {
                  setSelectedPackage(record);
                  setSelectedItem(null);
                }}
              >
                <div className={styles.itemMain}>
                  <div className={styles.itemTitle}>{record.id}</div>
                  <div className={styles.itemMeta}>
                    <span className={styles.metaItem}>{record.educatorEmail}</span>
                    <span className={styles.metaItem}>{formatDateTime(record.createdAt)}</span>
                  </div>
                </div>
                <div className={styles.itemStatus}>
                  <span className={`${styles.statusPill} ${styles.statusFlagged}`}>Flagged</span>
                  <span className={`${styles.statusPill} ${record.status === 'pending_review' ? styles.statusPending : styles.statusApproved}`}>
                    {record.status === 'pending_review' ? 'Pending' : 'Done'}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
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
      <ul className={styles.list} role="listbox" aria-label={`${KIND_LABELS[activeTab]} queue`}>
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
              {activeTab === 'share_back' && item.screeningStatus && (
                <span className={`${styles.statusPill} ${
                  item.screeningStatus === 'flagged'
                    ? styles.statusFlagged
                    : styles.statusApproved
                }`}>
                  {item.screeningStatus === 'flagged'
                    ? '🚩 Flagged'
                    : '✅ Passed'}
                </span>
              )}
              <span className={`${styles.statusPill} ${statusPillClass(item.status)}`}>
                {statusLabel(item.status)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  const renderPackageDetail = () => {
    if (!selectedPackage) {
      return (
        <div className={styles.detailEmpty}>
          <p>Select a package to review</p>
        </div>
      );
    }

    return (
      <div className={styles.detailPanel} role="region" aria-label={`${selectedPackage.id} package detail`}>
        <div className={styles.detailHeader}>
          <h2 className={styles.detailTitle}>{selectedPackage.id}</h2>
          <div className={styles.itemStatus}>
            <span className={`${styles.statusPill} ${styles.statusFlagged}`}>Flagged</span>
            <span className={`${styles.statusPill} ${selectedPackage.status === 'pending_review' ? styles.statusPending : styles.statusApproved}`}>
              {selectedPackage.status === 'pending_review' ? 'Pending' : 'Done'}
            </span>
          </div>
        </div>
        <div className={styles.detailMeta}>
          <div className={styles.metaRow}><span className={styles.metaLabel}>Educator:</span> {selectedPackage.educatorEmail}</div>
          <div className={styles.metaRow}><span className={styles.metaLabel}>Audience:</span> {selectedPackage.audience}</div>
          <div className={styles.metaRow}><span className={styles.metaLabel}>Submitted:</span> {formatDateTime(selectedPackage.createdAt)}</div>
          <div className={styles.metaRow}><span className={styles.metaLabel}>Delivery:</span> {selectedPackage.deliveryStatus === 'simulated' ? 'Simulated — no email sent' : 'On hold'}</div>
          {selectedPackage.quizSummary && <div className={styles.metaRow}><span className={styles.metaLabel}>Knowledge check:</span> {selectedPackage.quizSummary}</div>}
          {selectedPackage.lessonPlanSummary && <div className={styles.metaRow}><span className={styles.metaLabel}>Lesson plan:</span> {selectedPackage.lessonPlanSummary}</div>}
        </div>

        <div className={styles.packageMaterials}>
          <h3 className={styles.sectionHeading}>Selected materials and decisions</h3>
          {selectedPackage.materials.map((material) => {
            const editKey = `${selectedPackage.id}:${material.componentId}`;
            const unresolved = material.screeningStatus === 'flagged' && !material.decision;
            const editedText = packageEdits[editKey] ?? material.proposedText;
            return (
              <section className={styles.packageMaterial} key={material.componentId}>
                <div className={styles.detailHeader}>
                  <h4 className={styles.detailTitle}>{material.title}</h4>
                  <span className={`${styles.statusPill} ${material.screeningStatus === 'flagged' ? styles.statusFlagged : styles.statusApproved}`}>
                    {material.screeningStatus === 'flagged' ? 'Flagged' : 'Passed'}
                  </span>
                </div>
                {material.screeningReason && (
                  <div className={styles.reasonBlock}>
                    <span className={styles.metaLabel}>Flag reason:</span>
                    <p>{material.screeningReason}</p>
                  </div>
                )}
                <div className={styles.compareSection}>
                  <div className={styles.compareCol}>
                    <h4 className={styles.compareHeading}>Original approved resource</h4>
                    <div className={styles.textBlock}>
                      {material.originalApproved && material.originalText
                        ? material.originalText
                        : '(Approved original resource unavailable)'}
                    </div>
                  </div>
                  <div className={styles.compareCol}>
                    <h4 className={styles.compareHeading}>
                      {material.decision === 'original' ? 'Final: approved original' : 'Proposed adaptation'}
                    </h4>
                    {unresolved ? (
                      <textarea
                        className={styles.editTextarea}
                        value={editedText}
                        onChange={(event) => setPackageEdits((previous) => ({ ...previous, [editKey]: event.target.value }))}
                        rows={5}
                        aria-label={`Edit ${material.title}`}
                      />
                    ) : (
                      <div className={styles.textBlock}>
                        {material.finalText || '(No text content is available for this resource.)'}
                      </div>
                    )}
                  </div>
                </div>
                {material.decision && (
                  <p className={styles.reuseNote}>
                    Staff decision: {material.decision === 'approved' ? 'Approved adaptation' : material.decision === 'edited' ? 'Edited and approved' : 'Rejected adaptation; original selected'}
                  </p>
                )}
                {unresolved && (
                  <>
                    {material.screeningStatus === 'flagged' && !material.originalApproved && (
                      <p className={styles.reuseNote}>Reject &amp; Send Original is unavailable because an approved original could not be verified.</p>
                    )}
                    <div className={styles.detailActions}>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnApprove}`}
                        onClick={() => setApprovalMaterial(material)}
                        disabled={deciding}
                      >
                        Approve &amp; Send
                      </button>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnEdit}`}
                        onClick={() => handlePackageDecision(selectedPackage.id, material, 'edit')}
                        disabled={deciding || !editedText.trim() || editedText === material.proposedText}
                      >
                        Edit &amp; Send
                      </button>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnReject}`}
                        onClick={() => handlePackageDecision(selectedPackage.id, material, 'reject_original')}
                        disabled={deciding || !material.originalApproved}
                      >
                        Reject &amp; Send Original
                      </button>
                    </div>
                  </>
                )}
              </section>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDetail = () => {
    if (activeTab === 'packages') return renderPackageDetail();
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
          {item.kind === 'share_back' && item.screeningStatus && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Screening:</span>{' '}
              {item.screeningStatus === 'flagged'
                ? 'Flagged'
                : 'Passed'}
            </div>
          )}
        </div>

        {item.kind === 'share_back' && item.screeningStatus === 'flagged' && item.screeningReason && (
          <div className={styles.reasonBlock}>
            <span className={styles.metaLabel}>Flag reason:</span>
            <p>{item.screeningReason}</p>
          </div>
        )}

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
          <h1 className={styles.h1}>Review</h1>
          <p className={styles.reviewerLine}>Prototype: screening and package delivery are simulated; no email is sent.</p>
        </header>

        {/* Tabs */}
        <div className={styles.tabs} role="tablist" aria-label="Review queue">
          {REVIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedItem(null);
                setSelectedPackage(null);
                setEditText('');
                setPackageEdits({});
              }}
            >
              {tab.label}
              <span className={styles.tabCount}>
                {counts[tab.id]}
              </span>
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
            onClick={() => setFilterStatus('done')}
          >
            Done
          </button>
        </div>

        {/* Main layout: list + detail */}
        <div className={styles.mainLayout}>
          <section className={styles.listSection} aria-labelledby="list-heading">
            <h2 id="list-heading" className={styles.sectionHeading}>
              {REVIEW_TABS.find((tab) => tab.id === activeTab)?.label} ({activeTab === 'packages' ? packageRecords.length : items.length})
            </h2>
            {activeTab === 'share_back' && (
              <p className={styles.flaggedIntro}>
                Only submissions flagged for staff review appear here. All contributions require staff review before library inclusion.
              </p>
            )}
            {renderList()}
          </section>

          <aside className={styles.detailSection} aria-labelledby="detail-heading">
            <h2 id="detail-heading" className={styles.sectionHeading}>
              Detail
            </h2>
            {renderDetail()}
          </aside>
        </div>

      </div>

      {renderToast()}
      {renderRejectModal()}
      {renderResolveModal()}
      {approvalMaterial && (
        <div className={styles.modalOverlay} onClick={() => setApprovalMaterial(null)}>
          <div
            className={styles.modal}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="package-approval-title"
            aria-describedby="package-approval-prompt"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="package-approval-title" className={styles.modalTitle}>Confirm Approval</h2>
            <p id="package-approval-prompt" className={styles.modalText}>
              Have you verified the flagged scientific claims and confirmed this adaptation is suitable for release?
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnCancel}`}
                onClick={() => setApprovalMaterial(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnApprove}`}
                onClick={handlePackageApprovalConfirm}
                disabled={deciding}
              >
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}