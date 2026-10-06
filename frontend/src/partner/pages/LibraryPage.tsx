import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Play,
  Gamepad2,
  MessageCircle,
  Pencil,
  BookOpen,
  BookMarked,
  X,
  ExternalLink,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import libraryHeroJpg from '../../assets/library_hero.jpg';
import {
  SEAGRASS_STORIES,
  STAGES,
  STAGE_DESCRIPTIONS,
  GAME_URL,
  type ComponentType,
  type ComponentStage,
  type StoryComponent,
  type ComponentLink,
} from '../../shared/data/seagrass-stories';
import { usePicks } from '../../shared/context/PicksContext';
import { DEMO_PICKABLE_IDS } from '../../shared/data/adaptConfig';
import styles from './LibraryPage.module.css';

// ─── Filter config ─────────────────────────────────────────────────────────

const TYPE_OPTIONS: ComponentType[] = ['Watch', 'Play', 'Discuss', 'Create', 'Read', 'Guide'];
const AUDIENCE_OPTIONS = ['Schools', 'University', 'Museum'] as const;
type Audience = (typeof AUDIENCE_OPTIONS)[number];

const TYPE_ICONS: Record<ComponentType, React.ComponentType<{ size?: number }>> = {
  Watch: Play,
  Play: Gamepad2,
  Discuss: MessageCircle,
  Create: Pencil,
  Read: BookOpen,
  Guide: BookMarked,
};

function stageToAnchor(stage: ComponentStage): string {
  return stage.toLowerCase().replace(/\s+/g, '-');
}

// ─── URL param helpers ─────────────────────────────────────────────────────

function parseParam(params: URLSearchParams, key: string): string[] {
  const raw = params.get(key);
  if (!raw) return [];
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function toParam(values: string[]): string {
  return values.map((v) => v.toLowerCase()).join(',');
}

function matchesFilter(
  component: StoryComponent,
  types: string[],
  audiences: string[],
  stages: string[]
): boolean {
  const typeMatch =
    types.length === 0 ||
    types.some((t) => t.toLowerCase() === component.type.toLowerCase());
  const audienceMatch =
    audiences.length === 0 ||
    component.audiences.some((a) =>
      audiences.some((f) => f.toLowerCase() === a.toLowerCase())
    );
  const stageMatch =
    stages.length === 0 ||
    stages.some((s) => s === stageToAnchor(component.stage));
  return typeMatch && audienceMatch && stageMatch;
}

// ─── Thumbnail helper ──────────────────────────────────────────────────────

function getThumbnail(c: StoryComponent): string | null {
  if (c.thumbnail) return c.thumbnail;
  if (c.videoId) return `https://img.youtube.com/vi/${c.videoId}/maxresdefault.jpg`;
  return null;
}

function getThumbFallback(c: StoryComponent): string | undefined {
  if (c.videoId) return `https://img.youtube.com/vi/${c.videoId}/hqdefault.jpg`;
  return undefined;
}

// ─── Audience copy ─────────────────────────────────────────────────────────

const AUDIENCE_LINES: Record<Audience, string> = {
  Schools: 'Use in groups of 2 to 3 as part of a 60 to 75 minute session.',
  University: 'Pair with the further reading for a deeper look at restoration evidence.',
  Museum: 'Works on its own in under 10 minutes.',
};

// ─── Card ──────────────────────────────────────────────────────────────────

function ComponentCard({
  component,
  onOpen,
  isPickable,
}: {
  component: StoryComponent;
  onOpen: () => void;
  isPickable: boolean;
}) {
  const Icon = TYPE_ICONS[component.type];
  const thumb = getThumbnail(component);
  const thumbFallback = getThumbFallback(component);
  const [showTouchCaption, setShowTouchCaption] = useState(false);
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = () => {
    if (isPickable) return;
    setShowTouchCaption(true);
    if (touchTimer.current) clearTimeout(touchTimer.current);
    touchTimer.current = setTimeout(() => setShowTouchCaption(false), 2000);
  };

  return (
    <button
      type="button"
      className={`${styles.card}${!isPickable ? ` ${styles.cardDisabled}` : ''}`}
      onClick={isPickable ? onOpen : undefined}
      aria-disabled={!isPickable ? 'true' : undefined}
      aria-label={
        !isPickable
          ? `${component.title} – available in the full version`
          : `Open ${component.title}`
      }
      tabIndex={!isPickable ? -1 : 0}
      data-tooltip={!isPickable ? 'Available in the full version' : undefined}
      title={!isPickable ? 'Available in the full version' : undefined}
      onTouchStart={handleTouchStart}
    >
      <div className={styles.cardThumb}>
        {thumb ? (
          <img
            src={thumb}
            alt=""
            className={styles.cardThumbImg}
            onError={
              thumbFallback
                ? (e) => {
                    (e.currentTarget as HTMLImageElement).src = thumbFallback;
                    (e.currentTarget as HTMLImageElement).onerror = null;
                  }
                : undefined
            }
          />
        ) : (
          <div className={styles.cardThumbPlaceholder} aria-hidden="true">
            <Icon size={28} />
          </div>
        )}
      </div>
      <div className={styles.cardBody}>
        <span className={styles.cardTypeLabel}>
          <Icon size={13} aria-hidden="true" />
          {component.type}
        </span>
        <span className={styles.cardTitle}>{component.title}</span>
        <p className={styles.cardDesc}>{component.description}</p>
        <div className={styles.cardMeta}>
          {component.duration && (
            <span className={styles.cardMetaItem}>{component.duration}</span>
          )}
          {component.audiences.map((a) => (
            <span key={a} className={styles.cardAudienceTag}>{a}</span>
          ))}
        </div>
      </div>
      {showTouchCaption && (
        <p className={styles.touchCaption} aria-hidden="true">
          Available in the full version
        </p>
      )}
    </button>
  );
}

// ─── Drawer content ────────────────────────────────────────────────────────

function DrawerContent({
  component,
  activeAudiences,
  onClose,
}: {
  component: StoryComponent;
  activeAudiences: string[];
  onClose: () => void;
}) {
  const Icon = TYPE_ICONS[component.type];
  const { hasPick, addPick, removePick } = usePicks();
  const isPickable = (DEMO_PICKABLE_IDS as readonly string[]).includes(component.id);

  const audiencesToShow =
    activeAudiences.length > 0
      ? component.audiences.filter((a) =>
          activeAudiences.some((f) => f.toLowerCase() === a.toLowerCase())
        )
      : component.audiences;

  return (
    <Dialog.Content className={styles.drawerContent} aria-describedby={undefined}>
      <div className={styles.drawerHeader}>
        <span className={styles.drawerTypeLabel}>
          <Icon size={13} aria-hidden="true" />
          {component.type}
        </span>
        <Dialog.Title asChild>
          <h2 className={styles.drawerTitle}>{component.title}</h2>
        </Dialog.Title>
        <Dialog.Close asChild>
          <button
            type="button"
            className={styles.drawerClose}
            aria-label="Close"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </Dialog.Close>
      </div>

      <div className={styles.drawerBody}>
        {component.isWorking && <WorkingContent component={component} />}
        {component.links && component.links.length > 0 && (
          <LinksSection links={component.links} />
        )}
        {!component.isWorking && (!component.links || component.links.length === 0) && (
          <div className={styles.comingSoon}>Full preview coming soon.</div>
        )}

        <div className={styles.drawerDetails}>
          <h3 className={styles.drawerDetailHeading}>About this resource</h3>
          <p className={styles.drawerDetailText}>{component.description}</p>

          {audiencesToShow.length > 0 && (
            <div className={styles.drawerDetailRow}>
              <span className={styles.drawerDetailLabel}>Audience</span>
              <span className={styles.drawerDetailValue}>
                {audiencesToShow.join(', ')}
              </span>
            </div>
          )}
          {component.gradeLevel && (
            <div className={styles.drawerDetailRow}>
              <span className={styles.drawerDetailLabel}>Level</span>
              <span className={styles.drawerDetailValue}>{component.gradeLevel}</span>
            </div>
          )}
          {component.curriculum && (
            <div className={styles.drawerDetailRow}>
              <span className={styles.drawerDetailLabel}>Curriculum</span>
              <span className={styles.drawerDetailValue}>{component.curriculum}</span>
            </div>
          )}
          {component.duration && (
            <div className={styles.drawerDetailRow}>
              <span className={styles.drawerDetailLabel}>Duration</span>
              <span className={styles.drawerDetailValue}>{component.duration}</span>
            </div>
          )}
          {component.source && (
            <div className={styles.drawerDetailRow}>
              <span className={styles.drawerDetailLabel}>Source</span>
              <span className={styles.drawerDetailValue}>{component.source}</span>
            </div>
          )}
          {component.isExternal && (
            <p className={styles.externalNote}>External resource</p>
          )}

          {audiencesToShow.length > 0 && (
            <div className={styles.forAudienceBlock}>
              <h4 className={styles.forAudienceHeading}>For your audience</h4>
              {audiencesToShow.map((a) => (
                <p key={a} className={styles.forAudienceLine}>
                  <strong>{a}:</strong> {AUDIENCE_LINES[a as Audience]}
                </p>
              ))}
            </div>
          )}

          {isPickable && (
            <div className={styles.pickActionRow}>
              {hasPick(component.id) ? (
                <>
                  <span className={styles.addedBadge}>
                    <Check size={13} aria-hidden="true" />
                    Added
                  </span>
                  <button
                    type="button"
                    className={styles.removePickBtn}
                    onClick={() => removePick(component.id, component.title)}
                  >
                    Remove
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={styles.addToVersionBtn}
                  onClick={() => addPick(component.id, component.title)}
                >
                  Add to my version
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Dialog.Content>
  );
}

// ─── External links section ────────────────────────────────────────────────

function LinksSection({ links }: { links: ComponentLink[] }) {
  return (
    <div className={styles.linksSection}>
      {links.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.gameButton}
        >
          {link.label}
          <ExternalLink size={14} aria-hidden="true" />
          <span className="visually-hidden">(opens in a new tab)</span>
        </a>
      ))}
    </div>
  );
}

// ─── Working content implementations ──────────────────────────────────────

function WorkingContent({ component }: { component: StoryComponent }) {
  if (component.id === 'video-nada' && component.videoId) {
    return (
      <div className={styles.workingVideo}>
        <div className={styles.videoWrapper}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${component.videoId}`}
            title={component.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className={styles.videoIframe}
          />
        </div>
        <p className={styles.videoCredit}>Video via YouTube</p>
        <p className={styles.fixedNote}>Used as is in every version.</p>
      </div>
    );
  }

  if (component.id === 'video-changi-point' && component.videoId) {
    return (
      <div className={styles.workingVideo}>
        <div className={styles.videoWrapper}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${component.videoId}`}
            title={component.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className={styles.videoIframe}
          />
        </div>
        <p className={styles.videoCredit}>Tidal Treasures, via YouTube</p>
        <p className={styles.fixedNote}>Fixed · used as is in every version.</p>
      </div>
    );
  }

  if (component.id === 'game') {
    return (
      <div className={styles.workingGame}>
        <p className={styles.gameDesc}>
          An interactive game where you make decisions about restoring a seagrass meadow and watch the consequences unfold.
        </p>
        <a
          href={GAME_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.gameButton}
        >
          Play the game
          <ExternalLink size={14} aria-hidden="true" />
          <span className="visually-hidden">(opens in a new tab)</span>
        </a>
        <p className={styles.fixedNote}>Used as is in every version.</p>
      </div>
    );
  }

  if (component.id === 'create-activity') {
    return (
      <div className={styles.workingActivity}>
        <p className={styles.activityGoal}>
          <strong>Goal:</strong> Map a cause and effect chain through a seagrass ecosystem.
        </p>
        <h4 className={styles.activitySectionHead}>Steps</h4>
        <ol className={styles.activitySteps}>
          <li>Work in groups of 2 to 3.</li>
          <li>Use 6 to 10 sticky notes to represent a choice, its consequence, the habitat response, and how the ecosystem changes over time.</li>
          <li>Arrange the notes in order on the table.</li>
          <li>Explain your chain to another group.</li>
        </ol>
        <h4 className={styles.activitySectionHead}>Materials</h4>
        <p className={styles.activityMeta}>Sticky notes, pens</p>
        <h4 className={styles.activitySectionHead}>Time</h4>
        <p className={styles.activityMeta}>About 15 minutes</p>
        <p className={styles.activityUniversity}>
          For older learners, turn the chain into a short research question or proposal.
        </p>
      </div>
    );
  }

  return null;
}

// ─── Floating tray ─────────────────────────────────────────────────────────

function FloatingTray({
  picks,
  pickTitles,
  onRemove,
  continueHref,
}: {
  picks: string[];
  pickTitles: Record<string, string>;
  onRemove: (id: string) => void;
  continueHref: string;
}) {
  if (picks.length === 0) return null;

  return (
    <div className={styles.tray} role="region" aria-label="My version summary">
      <span className={styles.trayLabel}>My version</span>
      <span className={styles.trayCount}>
        {picks.length} {picks.length === 1 ? 'item' : 'items'}
      </span>
      <div className={styles.trayChips}>
        {picks.map((id) => (
          <span key={id} className={styles.trayChip}>
            <span className={styles.trayChipTitle}>{pickTitles[id] ?? id}</span>
            <button
              type="button"
              className={styles.trayChipRemove}
              aria-label={`Remove ${pickTitles[id] ?? id}`}
              onClick={() => onRemove(id)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <Link to={continueHref} className={styles.trayContinue}>
        Continue
      </Link>
    </div>
  );
}

// ─── Filter chips row ──────────────────────────────────────────────────────

function FilterChips({
  label,
  options,
  active,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  active: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className={styles.chipGroup} role="group" aria-label={label}>
      <span className={styles.chipGroupLabel}>{label}</span>
      {options.map((opt) => {
        const isActive = active.some((a) => a.toLowerCase() === opt.toLowerCase());
        return (
          <button
            key={opt}
            type="button"
            className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
            aria-pressed={isActive}
            onClick={() => onToggle(opt)}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export function LibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const story = SEAGRASS_STORIES;
  const { picks, addPick, removePick } = usePicks();

  // Active filters from URL
  const activeTypes = parseParam(searchParams, 'type');
  const activeAudiences = parseParam(searchParams, 'audience');
  const activeStages = parseParam(searchParams, 'stage');
  const activeItem = searchParams.get('item');

  const hasFilters =
    activeTypes.length > 0 || activeAudiences.length > 0 || activeStages.length > 0;

  // Filtered component list
  const filtered = story.components.filter((c) =>
    matchesFilter(c, activeTypes, activeAudiences, activeStages)
  );

  const activeComponent = activeItem
    ? story.components.find((c) => c.id === activeItem) ?? null
    : null;

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Initialize picks from URL once on mount (handles page refresh)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const urlPicks = searchParams.get('picks')?.split(',').filter(Boolean) ?? [];
    urlPicks.forEach((id) => {
      if ((DEMO_PICKABLE_IDS as readonly string[]).includes(id)) {
        const c = story.components.find((comp) => comp.id === id);
        addPick(id, c?.title);
      }
    });
  }, []); // intentionally empty — runs once on mount

  // Sync picks to URL on change (skip the very first render to avoid clearing URL picks
  // before the init effect above has run)
  const picksSyncSkipRef = useRef(true);
  useEffect(() => {
    if (picksSyncSkipRef.current) {
      picksSyncSkipRef.current = false;
      return;
    }
    setSearchParams(
      (prev) => {
        const np = new URLSearchParams(prev);
        if (picks.length === 0) {
          np.delete('picks');
        } else {
          np.set('picks', picks.join(','));
        }
        return np;
      },
      { replace: true }
    );
  }, [picks, setSearchParams]);

  // Title tag
  useEffect(() => {
    document.title = 'Library — OceanX Education';
    return () => {
      document.title = 'OceanX Education';
    };
  }, []);

  // Toggle a single filter value
  const toggleFilter = useCallback(
    (key: 'type' | 'audience' | 'stage', value: string) => {
      setSearchParams(
        (prev) => {
          const current = parseParam(prev, key);
          const lv = key === 'stage' ? stageToAnchor(value as ComponentStage) : value.toLowerCase();
          const next = current.some((v) => v === lv)
            ? current.filter((v) => v !== lv)
            : [...current, lv];
          const np = new URLSearchParams(prev);
          if (next.length === 0) {
            np.delete(key);
          } else {
            np.set(key, toParam(next));
          }
          return np;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const clearFilters = useCallback(() => {
    setSearchParams(
      (prev) => {
        const np = new URLSearchParams(prev);
        np.delete('type');
        np.delete('audience');
        np.delete('stage');
        return np;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const openDrawer = useCallback(
    (id: string) => {
      setSearchParams(
        (prev) => {
          const np = new URLSearchParams(prev);
          np.set('item', id);
          return np;
        },
        { replace: false }
      );
    },
    [setSearchParams]
  );

  const closeDrawer = useCallback(() => {
    window.history.back();
  }, []);

  const drawerOpen = activeComponent !== null;

  // Tray data
  const pickTitles = Object.fromEntries(
    picks.map((id) => {
      const c = story.components.find((comp) => comp.id === id);
      return [id, c?.title ?? id];
    })
  );
  const trayAudience =
    activeAudiences.length > 0 ? activeAudiences[0] : 'university';
  const continueHref = `/partner/adapt?audience=${trayAudience}&picks=${picks.join(',')}`;

  const filtersPanel = (
    <div className={styles.filtersPanel}>
      <FilterChips
        label="Type"
        options={TYPE_OPTIONS}
        active={activeTypes}
        onToggle={(v) => toggleFilter('type', v)}
      />
      <FilterChips
        label="Audience"
        options={AUDIENCE_OPTIONS}
        active={activeAudiences}
        onToggle={(v) => toggleFilter('audience', v)}
      />
      <FilterChips
        label="Stage"
        options={STAGES}
        active={activeStages}
        onToggle={(v) => toggleFilter('stage', v)}
      />
    </div>
  );

  return (
    <div className={styles.page}>

      {/* ── Hero ── */}
      <section data-hero className={styles.hero} aria-labelledby="library-hero-heading">
        <div className={styles.heroMedia} aria-hidden="true">
          <img src={libraryHeroJpg} alt="" className={styles.heroImg} />
        </div>
        <div className={styles.heroSticky}>
          <div className={styles.heroOverlay} aria-hidden="true" />
          <div className={styles.heroContent}>
            <h1 className={styles.heroHeadline} id="library-hero-heading">
              What does it take to bring an underwater meadow back to life?
            </h1>
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <div className={styles.wideInner}>

        {/* Filter bar */}
        <div id="filter-section" className={styles.filterBar}>
          {/* Desktop */}
          <div className={styles.filterBarDesktop}>
            <h2 className={styles.filterHeading}>Filter</h2>
            {filtersPanel}
            <div className={styles.filterBarMeta}>
              <p
                className={styles.resultCount}
                aria-live="polite"
              >
                {filtered.length} {filtered.length === 1 ? 'resource' : 'resources'}
              </p>
              {hasFilters && (
                <button
                  type="button"
                  className={`${styles.chip} ${styles.chipClear}`}
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Mobile trigger */}
          <div className={styles.filterBarMobile}>
            <button
              type="button"
              className={`${styles.chip} ${hasFilters ? styles.chipActive : ''}`}
              onClick={() => setMobileFiltersOpen(true)}
              aria-pressed={mobileFiltersOpen}
            >
              <SlidersHorizontal size={14} aria-hidden="true" />
              Filters
              {hasFilters && (
                <span className={styles.filterBadge}>
                  {activeTypes.length + activeAudiences.length + activeStages.length}
                </span>
              )}
            </button>
            <p className={styles.resultCount} aria-live="polite">
              {filtered.length} {filtered.length === 1 ? 'resource' : 'resources'}
            </p>
            {hasFilters && (
              <button
                type="button"
                className={`${styles.chip} ${styles.chipClear}`}
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Content — using div to avoid duplicate <main>; App.tsx wraps everything in <main> */}
        <div className={styles.main}>
          {filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>No resources match these filters yet.</p>
              <button
                type="button"
                className={`${styles.chip} ${styles.chipClear}`}
                onClick={clearFilters}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className={styles.storyGroup}>
              {/* Stage sections */}
              {STAGES.map((stage) => {
                const stageComponents = filtered.filter((c) => c.stage === stage);
                if (stageComponents.length === 0) return null;
                return (
                  <section
                    key={stage}
                    id={stageToAnchor(stage)}
                    className={styles.stageSection}
                    aria-labelledby={`stage-${stage}`}
                  >
                    <div className={styles.stageHeadingRow}>
                      <h2 className={styles.stageHeading} id={`stage-${stage}`}>
                        {stage}
                      </h2>
                      <p className={styles.stageDesc}>{STAGE_DESCRIPTIONS[stage]}</p>
                    </div>
                    <div className={styles.cardGrid}>
                      {stageComponents.map((c) => (
                        <ComponentCard
                          key={c.id}
                          component={c}
                          isPickable={(DEMO_PICKABLE_IDS as readonly string[]).includes(c.id)}
                          onOpen={() => openDrawer(c.id)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      <Dialog.Root open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.sheetOverlay} />
          <Dialog.Content className={styles.sheetContent} aria-describedby={undefined}>
            <div className={styles.sheetHeader}>
              <Dialog.Title className={styles.sheetTitle}>Filter</Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className={styles.drawerClose} aria-label="Close">
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>
            <div className={styles.sheetBody}>{filtersPanel}</div>
            <div className={styles.sheetFooter}>
              {hasFilters && (
                <button
                  type="button"
                  className={`${styles.chip} ${styles.chipClear}`}
                  onClick={() => {
                    clearFilters();
                    setMobileFiltersOpen(false);
                  }}
                >
                  Clear filters
                </button>
              )}
              <Dialog.Close asChild>
                <button type="button" className={styles.sheetDoneButton}>
                  Show {filtered.length} {filtered.length === 1 ? 'resource' : 'resources'}
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Component drawer */}
      <Dialog.Root
        open={drawerOpen}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className={styles.drawerOverlay} />
          {activeComponent && (
            <DrawerContent
              component={activeComponent}
              activeAudiences={activeAudiences}
              onClose={closeDrawer}
            />
          )}
        </Dialog.Portal>
      </Dialog.Root>

      {/* Floating picks tray */}
      <FloatingTray
        picks={picks}
        pickTitles={pickTitles}
        onRemove={(id) => removePick(id, pickTitles[id])}
        continueHref={continueHref}
      />
    </div>
  );
}
