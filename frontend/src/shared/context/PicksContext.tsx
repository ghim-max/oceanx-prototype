import { createContext, useContext, useState, useEffect } from 'react';

interface PicksContextValue {
  picks: string[];
  announcement: string;
  addPick: (id: string, title?: string) => void;
  removePick: (id: string, title?: string) => void;
  hasPick: (id: string) => boolean;
  clearPicks: () => void;
}

const PicksContext = createContext<PicksContextValue>({
  picks: [],
  announcement: '',
  addPick: () => {},
  removePick: () => {},
  hasPick: () => false,
  clearPicks: () => {},
});

const STORAGE_KEY = 'oxe-partner-cart';

function isPartnerRoute(pathname: string): boolean {
  return pathname.startsWith('/partner/');
}

function safeGetItem(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeRemoveItem(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function PicksProvider({ children }: { children: React.ReactNode }) {
  const [picks, setPicks] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState('');
  const [hydrated, setHydrated] = useState(false);

  // Load from sessionStorage on mount, but only if we're on a partner route
  useEffect(() => {
    const stored = safeGetItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setPicks(parsed);
        }
      } catch {
        // ignore corrupted storage
      }
    }
    setHydrated(true);
  }, []);

  // Persist to sessionStorage whenever picks change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    if (picks.length === 0) {
      safeRemoveItem(STORAGE_KEY);
    } else {
      safeSetItem(STORAGE_KEY, JSON.stringify(picks));
    }
  }, [picks, hydrated]);

  // Clear cart when leaving partner flow (navigate to non-partner route)
  useEffect(() => {
    const handleLocationChange = () => {
      if (!isPartnerRoute(window.location.pathname)) {
        setPicks([]);
        safeRemoveItem(STORAGE_KEY);
      }
    };

    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', handleLocationChange);

    // Also intercept link clicks (but not programmatic navigation)
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (link && link.href) {
        try {
          const url = new URL(link.href);
          if (!isPartnerRoute(url.pathname)) {
            // Leaving partner flow - clear cart after a brief delay to allow navigation
            setTimeout(() => {
              if (!isPartnerRoute(window.location.pathname)) {
                setPicks([]);
                safeRemoveItem(STORAGE_KEY);
              }
            }, 100);
          }
        } catch {
          // ignore invalid URLs
        }
      }
    };

    document.addEventListener('click', handleClick, true);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      document.removeEventListener('click', handleClick, true);
    };
  }, []);

  function addPick(id: string, title?: string) {
    setPicks((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setAnnouncement(`${title ?? id} added to your cart`);
  }

  function removePick(id: string, title?: string) {
    setPicks((prev) => prev.filter((p) => p !== id));
    setAnnouncement(`${title ?? id} removed from your cart`);
  }

  function clearPicks() {
    setPicks([]);
    safeRemoveItem(STORAGE_KEY);
  }

  return (
    <PicksContext.Provider
      value={{
        picks,
        announcement,
        addPick,
        removePick,
        hasPick: (id) => picks.includes(id),
        clearPicks,
      }}
    >
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="visually-hidden"
      >
        {announcement}
      </div>
      {children}
    </PicksContext.Provider>
  );
}

export function usePicks() {
  const context = useContext(PicksContext);
  if (!context) {
    throw new Error('usePicks must be used within a PicksProvider');
  }
  return context;
}