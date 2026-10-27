import { useState, useEffect, useMemo, Component, type ReactNode } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { getDecisionLog, COMPONENT_TITLES, type DecisionLogEntry, getReviewItems, resetMock } from '../data/governanceService';
import { SUPABASE_IS_SAMPLE } from '../data/dataSource';
import styles from './LogPage.module.css';

type FilterAction = 'All' | 'Reuse' | 'Adapt' | 'Drop' | 'Restore' | 'Approve' | 'Edit' | 'Reject' | 'Task done';
type FilterType = 'All' | 'Library' | 'Review';

interface FilterState {
  action: FilterAction;
  type: FilterType;
  overridesOnly: boolean;
  dateRange: '7d' | '30d' | 'all';
}

interface ItemInfo {
  label: string;
  onClick?: () => void;
}

/** Error boundary for team pages */
class TeamErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  handleReset = () => {
    resetMock();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '22px', fontWeight: 300, color: '#0B1F33' }}>
            Something went wrong on this page
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: '16px', fontWeight: 350, color: '#5B6770', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '999px',
              background: '#90E0EF',
              color: '#0F1E28',
              fontSize: '15px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Reset demo data
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function LogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [log, setLog] = useState<Awaited<ReturnType<typeof getDecisionLog>>>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<FilterState>({
    action: (searchParams.get('action') as FilterAction) || 'All',
    type: (searchParams.get('type') as FilterType) || 'All',
    overridesOnly: searchParams.get('overrides') === 'true',
    dateRange: (searchParams.get('date') as '7d' | '30d' | 'all') || 'all',
  });

  // Handle filterComponent from state (e.g., from History link on DecisionCard)
  useEffect(() => {
    const state = location.state as { filterComponent?: string } | null;
    if (state?.filterComponent) {
      setFilters((prev) => ({ ...prev, action: 'All', type: 'All', overridesOnly: false, dateRange: 'all' }));
    }
  }, [location.state]);

  // Sync filters with URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.action !== 'All') params.set('action', filters.action);
    if (filters.type !== 'All') params.set('type', filters.type);
    if (filters.overridesOnly) params.set('overrides', 'true');
    if (filters.dateRange !== 'all') params.set('date', filters.dateRange);
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  // Load log data
  useEffect(() => {
    let mounted = true;
    getDecisionLog().then((data) => {
      if (mounted) {
        setLog(data);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, []);

  // Filter log entries
  const filteredLog = useMemo(() => {
    const now = Date.now();
    const day = 24 * 3600 * 1000;
    const state = location.state as { filterComponent?: string } | null;
    const filterComponent = state?.filterComponent;

    return log.filter((entry) => {
      const createdAt = new Date(entry.createdAt).getTime();

      // Date range filter
      if (filters.dateRange === '7d' && now - createdAt > 7 * day) return false;
      if (filters.dateRange === '30d' && now - createdAt > 30 * day) return false;

      // Action filter
      if (filters.action !== 'All' && entry.action !== filters.action) return false;

      // Type filter
      if (filters.type !== 'All') {
        const isLibrary = entry.targetType === 'component' || entry.targetType === 'adaptation_task';
        const isReview = entry.targetType === 'ai_adaptation' || entry.targetType === 'share_back' || entry.targetType === 'issue_report';
        if (filters.type === 'Library' && !isLibrary) return false;
        if (filters.type === 'Review' && !isReview) return false;
      }

      // Overrides only filter
      if (filters.overridesOnly && !entry.aiOverride) return false;

      // Component filter (from History link)
      if (filterComponent && entry.targetType === 'component' && entry.targetId !== filterComponent) return false;
      if (filterComponent && entry.targetType === 'adaptation_task' && !entry.targetId.includes(filterComponent)) return false;
      if (filterComponent && entry.targetType !== 'component' && entry.targetType !== 'adaptation_task') return false;

      return true;
    });
  }, [log, filters, location.state]);

  // Pre-compute item info for filtered log entries
  const [itemInfoMap, setItemInfoMap] = useState<Record<string, ItemInfo>>({});

  useEffect(() => {
    const loadItemInfo = async () => {
      const allReviewItems = await getReviewItems();
      const infoMap: Record<string, ItemInfo> = {};

      for (const entry of filteredLog) {
        if (entry.targetType === 'component') {
          const title = COMPONENT_TITLES[entry.targetId] || entry.targetId;
          infoMap[entry.id] = {
            label: title,
            onClick: () => navigate('/team/insights', { state: { scrollTo: entry.targetId } }),
          };
        } else if (entry.targetType === 'adaptation_task') {
          const componentId = entry.targetId.replace('task-', '').replace(/-1$/, '');
          const title = COMPONENT_TITLES[componentId] || componentId;
          infoMap[entry.id] = {
            label: `Adaptation task: ${title}`,
            onClick: () => navigate('/team/insights', { state: { scrollTo: componentId } }),
          };
        } else if (entry.targetType === 'ai_adaptation' || entry.targetType === 'share_back' || entry.targetType === 'issue_report') {
          const kindLabels: Record<string, string> = {
            ai_adaptation: 'AI adaptation',
            share_back: 'Share back',
            issue_report: 'Issue report',
          };
          const kind = kindLabels[entry.targetType] || entry.targetType;
          let componentTitle = entry.targetId;
          const reviewItem = allReviewItems.find((r) => r.id === entry.targetId);
          if (reviewItem) {
            componentTitle = reviewItem.componentTitle;
          } else if (entry.targetType === 'ai_adaptation' && entry.targetId.startsWith('review-')) {
            const parts = entry.targetId.split('-');
            if (parts.length >= 3) {
              const compId = parts.slice(1, -1).join('-');
              if (COMPONENT_TITLES[compId]) {
                componentTitle = COMPONENT_TITLES[compId];
              }
            }
          }
          infoMap[entry.id] = {
            label: `${kind}: ${componentTitle}`,
            onClick: () => navigate('/team/review', { state: { openItem: entry.targetId } }),
          };
        } else {
          // Unknown targetType - show targetId, no link
          infoMap[entry.id] = {
            label: entry.targetId,
            onClick: undefined,
          };
        }
      }

      setItemInfoMap(infoMap);
    };

    loadItemInfo();
  }, [filteredLog, navigate]);

  // Compute summary stats
  const summary = useMemo(() => {
    const total = log.length;
    const libraryDecisions = log.filter((e) => e.targetType === 'component');
    const aiOverrides = libraryDecisions.filter((e) => e.aiOverride).length;
    const overridePct = libraryDecisions.length > 0 ? Math.round((aiOverrides / libraryDecisions.length) * 100) : 0;
    const rejectedReviews = log.filter((e) => e.action === 'Reject' && e.targetType !== 'component').length;
    const lastDecision = log.length > 0 ? log[0] : null;

    return { total, aiOverrides, overridePct, rejectedReviews, lastDecision };
  }, [log]);

  // Format date for display
  const formatDate = (iso: string) => {
    const date = new Date(iso);
    const day = date.getDate();
    const month = date.toLocaleString('en-GB', { month: 'short' });
    const time = date.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${day} ${month}, ${time}`;
  };

  // Format time ago
  const formatTimeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  // Get action pill class
  const getActionPillClass = (action: DecisionLogEntry['action']) => {
    switch (action) {
      case 'Reuse': return styles.pillReuse;
      case 'Adapt': return styles.pillAdapt;
      case 'Drop': return styles.pillDrop;
      case 'Restore': return styles.pillRestore;
      case 'Approve': return styles.pillApprove;
      case 'Edit': return styles.pillEdit;
      case 'Reject': return styles.pillReject;
      case 'Task done': return styles.pillTaskDone;
      default: return styles.pillDefault;
    }
  };

  // Handle filter change
  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['When', 'Who', 'Action', 'Item', 'Why', 'AI recommended', 'Override'];
    const rows = filteredLog.map((entry) => {
      const itemInfo = itemInfoMap[entry.id];
      const aiRec = entry.aiRecommendation || '';
      const override = entry.aiOverride ? 'Overrides AI' : '';
      return [
        formatDate(entry.createdAt),
        entry.who,
        entry.action,
        itemInfo?.label || '',
        entry.why || '',
        aiRec,
        override,
      ].map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const today = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `decision-log-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setFilters({ action: 'All', type: 'All', overridesOnly: false, dateRange: 'all' });
  };

  const hasActiveFilters = filters.action !== 'All' || filters.type !== 'All' || filters.overridesOnly || filters.dateRange !== 'all';

  return (
    <TeamErrorBoundary>
      <article className={styles.page}>
        <div className={styles.container}>
          {/* Header */}
          <header className={styles.header}>
            <div className={styles.headerContent}>
              <div>
                <h1 className={styles.pageTitle}>Decision log</h1>
                <p className={styles.pageSubtitle}>Every decision by the OceanX team, with the reason.</p>
              </div>
              {SUPABASE_IS_SAMPLE && <span className={styles.prototypeTag}>Prototype sample</span>}
            </div>
          </header>

          {/* Summary strip */}
          <div className={styles.summaryStrip}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryValue}>{summary.total}</span>
              <span className={styles.summaryLabel}>Total decisions</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryValue}>
                {summary.aiOverrides} ({summary.overridePct}%)
              </span>
              <span className={styles.summaryLabel}>AI overrides</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryValue}>{summary.rejectedReviews}</span>
              <span className={styles.summaryLabel}>Rejected reviews</span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryValue}>
                {summary.lastDecision ? formatTimeAgo(summary.lastDecision.createdAt) : '-'}
              </span>
              <span className={styles.summaryLabel}>Last decision</span>
            </div>
          </div>

          {/* Filters */}
          <div className={styles.filtersRow}>
            <div className={styles.filterGroup}>
              <label htmlFor="filter-action" className={styles.filterLabel}>Action</label>
              <select
                id="filter-action"
                className={styles.filterSelect}
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value as FilterAction)}
              >
                <option value="All">All</option>
                <option value="Reuse">Reuse</option>
                <option value="Adapt">Adapt</option>
                <option value="Drop">Drop</option>
                <option value="Restore">Restore</option>
                <option value="Approve">Approve</option>
                <option value="Edit">Edit</option>
                <option value="Reject">Reject</option>
                <option value="Task done">Task done</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label htmlFor="filter-type" className={styles.filterLabel}>Type</label>
              <select
                id="filter-type"
                className={styles.filterSelect}
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value as FilterType)}
              >
                <option value="All">All</option>
                <option value="Library">Library</option>
                <option value="Review">Review</option>
              </select>
            </div>

            <div className={`${styles.filterGroup} ${styles.filterGroupCheckbox}`}>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={filters.overridesOnly}
                  onChange={(e) => handleFilterChange('overridesOnly', e.target.checked)}
                  className={styles.toggleInput}
                />
                <span className={styles.toggleText}>Overrides only</span>
              </label>
            </div>

            <div className={styles.filterGroup}>
              <label htmlFor="filter-date" className={styles.filterLabel}>Date</label>
              <select
                id="filter-date"
                className={styles.filterSelect}
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value as '7d' | '30d' | 'all')}
              >
                <option value="all">All</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
            </div>

            <div className={`${styles.filterGroup} ${styles.filterGroupActions}`}>
              {hasActiveFilters && (
                <button type="button" className={styles.clearBtn} onClick={handleClearFilters}>
                  Clear filters
                </button>
              )}
              <button type="button" className={styles.exportBtn} onClick={handleExportCsv}>
                Export CSV
              </button>
            </div>
          </div>

          {/* Table */}
          <div className={styles.tableWrapper}>
            {loading ? (
              <div className={styles.loading}>Loading…</div>
            ) : filteredLog.length === 0 ? (
              <div className={styles.emptyState}>No decisions match these filters.</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.colWhen}>When</th>
                    <th className={styles.colWho}>Who</th>
                    <th className={styles.colAction}>Action</th>
                    <th className={styles.colItem}>Item</th>
                    <th className={styles.colWhy}>Why</th>
                    <th className={styles.colAiRec}>AI recommended</th>
                    <th className={styles.colOverride}>Override</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLog.map((entry) => {
                    const itemInfo = itemInfoMap[entry.id];
                    const hasClick = itemInfo?.onClick;
                    return (
                      <tr key={entry.id} className={styles.tableRow}>
                        <td className={styles.colWhen}>
                          <div className={styles.whenMain}>{formatDate(entry.createdAt)}</div>
                          <div className={styles.whenAgo}>{formatTimeAgo(entry.createdAt)}</div>
                        </td>
                        <td className={styles.colWho}>{entry.who}</td>
                        <td className={styles.colAction}>
                          <span className={`${styles.actionPill} ${getActionPillClass(entry.action)}`}>
                            {entry.action}
                          </span>
                        </td>
                        <td className={styles.colItem}>
                          {hasClick ? (
                            <button
                              type="button"
                              className={styles.itemLink}
                              onClick={itemInfo.onClick}
                            >
                              {itemInfo.label}
                            </button>
                          ) : (
                            <span>{itemInfo?.label || entry.targetId}</span>
                          )}
                        </td>
                        <td className={styles.colWhy}>
                          <span className={entry.why ? '' : styles.emptyWhy}>
                            {entry.why || '-'}
                          </span>
                        </td>
                        <td className={styles.colAiRec}>
                          {entry.aiRecommendation || '-'}
                        </td>
                        <td className={styles.colOverride}>
                          {entry.aiOverride && (
                            <span className={styles.overrideTag}>Overrides AI</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </article>
    </TeamErrorBoundary>
  );
}