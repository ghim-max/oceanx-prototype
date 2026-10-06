import { createContext, useContext, useState } from 'react';

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

export function PicksProvider({ children }: { children: React.ReactNode }) {
  const [picks, setPicks] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState('');

  function addPick(id: string, title?: string) {
    setPicks((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setAnnouncement(`${title ?? id} added to your version`);
  }

  function removePick(id: string, title?: string) {
    setPicks((prev) => prev.filter((p) => p !== id));
    setAnnouncement(`${title ?? id} removed from your version`);
  }

  return (
    <PicksContext.Provider
      value={{
        picks,
        announcement,
        addPick,
        removePick,
        hasPick: (id) => picks.includes(id),
        clearPicks: () => setPicks([]),
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
  return useContext(PicksContext);
}
