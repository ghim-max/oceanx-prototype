import { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation, useSearchParams } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
// TODO: replace with official OceanX files once available
import logoColoured from '../../assets/OXE_logo_transparent.png';
import logoWhite from '../../assets/OXE_logo_white.png';
import { useRole } from '../context/RoleContext';
import {
  SEAGRASS_STORIES,
  STAGES,
  type ComponentStage,
} from '../data/seagrass-stories';
import styles from './Nav.module.css';

const PARTNER_LINKS = [{ to: '/partner/library', label: 'Browse library' }];
const TEAM_LINKS: Array<{ to: string; label: string }> = []; // No nav links on /team pages - Insights is the landing page

function stageToAnchor(stage: ComponentStage): string {
  return stage.toLowerCase().replace(/\s+/g, '-');
}

function parseParam(params: URLSearchParams, key: string): string[] {
  const raw = params.get(key);
  if (!raw) return [];
  return raw.split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
}

function stageHasComponents(
  stage: ComponentStage,
  activeTypes: string[],
  activeAudiences: string[],
  activeStages: string[]
): boolean {
  return SEAGRASS_STORIES.components.some((c) => {
    if (c.stage !== stage) return false;
    if (activeTypes.length > 0 && !activeTypes.includes(c.type.toLowerCase())) return false;
    if (activeAudiences.length > 0 && !c.audiences.some((a) => activeAudiences.includes(a.toLowerCase()))) return false;
    if (activeStages.length > 0 && !activeStages.includes(stageToAnchor(stage))) return false;
    return true;
  });
}

function LibraryNavLinks({ overHero }: { overHero: boolean }) {
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const activeTypes = parseParam(searchParams, 'type');
  const activeAudiences = parseParam(searchParams, 'audience');
  const activeStageFilter = parseParam(searchParams, 'stage');

  // Stages that have at least one visible component given current filters
  const visibleStages = STAGES.filter((stage) =>
    stageHasComponents(stage, activeTypes, activeAudiences, activeStageFilter)
  );
  const visibleKey = visibleStages.join(',');

  // Scroll-spy: observe visible stage sections, update active link
  useEffect(() => {
    if (visibleStages.length === 0) return;

    const elements = visibleStages
      .map((s) => document.getElementById(stageToAnchor(s)))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection((entry.target as HTMLElement).id);
          }
        });
      },
      // Trigger zone: just below the nav down to ~40% of viewport height
      { rootMargin: '-56px 0px -60% 0px', threshold: 0 }
    );

    elements.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey]);

  const scrollTo = useCallback((anchor: string) => {
    const el = document.getElementById(anchor);
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }, []);

  const handleClick = useCallback(
    (stage: ComponentStage, fromSheet = false) => {
      if (fromSheet) setMenuOpen(false);
      scrollTo(stageToAnchor(stage));
    },
    [scrollTo]
  );

  // Suppress active highlight while user is still over the hero
  const displayActive = overHero ? null : activeSection;
  const isActive = (stage: ComponentStage) => displayActive === stageToAnchor(stage);

  return (
    <>
      {/* Desktop links (≥768px) */}
      <nav className={styles.libLinks} aria-label="Jump to section">
        {visibleStages.map((stage) => (
          <button
            key={stage}
            type="button"
            className={`${styles.libPill} ${isActive(stage) ? styles.libPillActive : ''}`}
            aria-current={isActive(stage) ? 'true' : undefined}
            onClick={() => handleClick(stage)}
          >
            {stage}
          </button>
        ))}
      </nav>

      {/* Mobile: single "Menu" button → bottom sheet (≤768px) */}
      <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Dialog.Trigger asChild>
          <button
            type="button"
            className={`${styles.libPill} ${styles.libMenuPill}`}
            aria-label="Open section navigation"
          >
            Menu
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.libSheetOverlay} />
          <Dialog.Content
            className={styles.libSheetContent}
            aria-describedby={undefined}
          >
            <div className={styles.libSheetHeader}>
              <Dialog.Title className={styles.libSheetTitle}>Sections</Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className={styles.libSheetClose}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>
            <div className={styles.libSheetBody}>
              {visibleStages.map((stage) => (
                <button
                  key={stage}
                  type="button"
                  className={`${styles.libSheetItem} ${isActive(stage) ? styles.libSheetItemActive : ''}`}
                  aria-current={isActive(stage) ? 'true' : undefined}
                  onClick={() => handleClick(stage, true)}
                >
                  {stage}
                </button>
              ))}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

export function Nav() {
  const { role } = useRole();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [overHero, setOverHero] = useState(false);

  // Switch nav between transparent-white (over hero) and opaque (everywhere else)
  useEffect(() => {
    setMenuOpen(false);
    const hero = document.querySelector('[data-hero]');
    if (!hero) {
      setOverHero(false);
      return;
    }
    setOverHero(true);
    const obs = new IntersectionObserver(
      ([entry]) => setOverHero(entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(hero);
    return () => obs.disconnect();
  }, [pathname]);

  const effectiveRole =
    role ??
    (pathname.startsWith('/partner') ? 'partner'
    : pathname.startsWith('/team') ? 'team'
    : null);

  const logoTarget =
    effectiveRole === 'partner' ? '/partner'
    : effectiveRole === 'team' ? '/team/insights'
    : '/';

  const isLibraryPage = pathname === '/partner/library';
  const isAdaptPage =
    pathname === '/partner/adapt' || pathname === '/partner/adapt/review';
  const isQuizPage = pathname.startsWith('/quiz');
  const isEducatorPage = pathname.startsWith('/educator');
  const isTeamPage = pathname.startsWith('/team');

  const navLinks =
    isLibraryPage ? []
    : isQuizPage ? []
    : isEducatorPage ? []
    : effectiveRole === 'partner' ? PARTNER_LINKS
    : effectiveRole === 'team' ? TEAM_LINKS
    : [];

  return (
    <nav
      className={`${styles.nav} ${overHero ? styles.navOver : ''}`}
      aria-label="Main navigation"
    >
      <div className={`${styles.inner} ${isLibraryPage || isAdaptPage ? styles.innerWide : isTeamPage ? styles.innerTeam : ''}`}>
        <NavLink
          to={logoTarget}
          className={styles.wordmark}
          aria-label="OceanX Education home"
          onClick={() => setMenuOpen(false)}
        >
          <img
            src={overHero ? logoWhite : logoColoured}
            alt=""
            className={styles.logo}
          />
        </NavLink>

        {isLibraryPage && <LibraryNavLinks overHero={overHero} />}

        {!isLibraryPage && !isAdaptPage && navLinks.length > 0 && (
          <>
            <button
              className={styles.menuToggle}
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={menuOpen}
              aria-controls="nav-links"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              {menuOpen ? (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M2 2L16 16M16 2L2 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M2 4H16M2 9H16M2 14H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </button>

            <ul
              id="nav-links"
              className={`${styles.links} ${menuOpen ? styles.open : ''}`}
            >
              {navLinks.map(({ to, label }) => (
                <li key={label} className={styles.linkItem}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      `${styles.link} ${isActive ? styles.active : ''}`
                    }
                    onClick={() => setMenuOpen(false)}
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </nav>
  );
}
