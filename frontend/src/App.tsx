import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { RoleProvider } from './shared/context/RoleContext';
import { PicksProvider } from './shared/context/PicksContext';
import { Nav } from './shared/ui/Nav';
import { FAB } from './shared/ui/FAB';
import { EntryPage } from './pages/EntryPage';
import { KitPage } from './pages/KitPage';
import { HomePage } from './partner/pages/HomePage';
import { LibraryPage } from './partner/pages/LibraryPage';
import { AdaptPage } from './partner/pages/AdaptPage';
import { ReviewPage } from './partner/pages/ReviewPage';
import { InsightsPage } from './team/pages/InsightsPage';
import { QuizPage } from './learner/pages/QuizPage';
import { EducatorFeedbackPage } from './educator/pages/EducatorFeedbackPage';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    // Defer focus until after the new route has committed to the DOM.
    setTimeout(() => {
      const h1 = document.querySelector<HTMLElement>('main h1');
      if (h1) {
        if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
        h1.focus({ preventScroll: true });
      }
    }, 0);
  }, [pathname]);

  return null;
}

function AppContent() {
  const { pathname } = useLocation();
  const isLanding = pathname === '/partner';

  return (
    <PicksProvider>
      <ScrollToTop />
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Nav />
      <main
        id="main-content"
        className={`page-main${isLanding ? ' page-main--landing' : ''}`}
      >
        <Routes>
          <Route path="/" element={<EntryPage />} />
          <Route path="/partner" element={<HomePage />} />
          <Route path="/partner/library" element={<LibraryPage />} />
          <Route path="/partner/adapt" element={<AdaptPage />} />
          <Route path="/partner/adapt/review" element={<ReviewPage />} />
          <Route path="/team" element={<Navigate to="/team/insights" replace />} />
          <Route path="/team/insights" element={<InsightsPage />} />
          <Route path="/kit" element={<KitPage />} />
          <Route path="/quiz/seagrass-university" element={<QuizPage />} />
          <Route path="/feedback" element={<Navigate to="/quiz/seagrass-university" replace />} />
          <Route path="/educator/seagrass-university" element={<EducatorFeedbackPage />} />
        </Routes>
      </main>
      <FAB />
    </PicksProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <RoleProvider>
        <AppContent />
      </RoleProvider>
    </BrowserRouter>
  );
}

export default App;
