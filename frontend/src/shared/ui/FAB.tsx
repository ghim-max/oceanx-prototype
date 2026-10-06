import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useRole } from '../context/RoleContext';
import styles from './FAB.module.css';

// Selectors for sections that have a dark background image behind the FAB.
const DARK_SELECTORS = ['[data-hero]', '[data-journey]'];

// FAB geometry: 56 px tall, 24 px from viewport bottom → centre is 52 px from bottom.
const FAB_CENTER_FROM_BOTTOM = 52;

// Returns true only when the FAB's centre Y position falls inside a dark section's rect.
// This is more accurate than IntersectionObserver threshold:0, which fires whenever *any*
// pixel of the (160svh-tall) hero is visible — i.e. long after the FAB has left the hero.
function isFabOverDark(): boolean {
  const fabY = window.innerHeight - FAB_CENTER_FROM_BOTTOM;
  return DARK_SELECTORS.some((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const { top, bottom } = el.getBoundingClientRect();
    return top <= fabY && bottom > fabY;
  });
}

export function FAB() {
  const { setRole } = useRole();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [overDark, setOverDark] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    function update() {
      setOverDark(isFabOverDark());
    }
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [pathname]);

  // Hide while the assistant panel is open (class toggled by AdaptPage)
  useEffect(() => {
    function check() {
      setPanelOpen(document.body.classList.contains('assistant-panel-open'));
    }
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  if (pathname === '/') return null;
  if (pathname.startsWith('/quiz')) return null;
  if (pathname.startsWith('/educator')) return null;
  if (panelOpen) return null;

  function handleClick() {
    setRole(null);
    navigate('/');
  }

  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            className={`${styles.fab}${overDark ? ` ${styles.fabDark}` : ''}`}
            onClick={handleClick}
            aria-label="Back to start"
          >
            <Home size={24} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className={styles.tooltip} side="left" sideOffset={10}>
            Back to start
            <Tooltip.Arrow className={styles.arrow} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
