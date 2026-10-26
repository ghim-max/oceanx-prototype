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
import { PreviewPage } from './partner/pages/PreviewPage';
import { ReviewPage } from './partner/pages/ReviewPage';
import { EmailPreviewPage } from './partner/pages/EmailPreviewPage';
import { InsightsPage } from './team/pages/InsightsPage';
import { BankPage } from './team/pages/BankPage';
import { ReviewPage as TeamReviewPage } from './team/pages/ReviewPage';
import { LogPage } from './team/pages/LogPage';
import { OverviewPage } from './team/pages/OverviewPage';
import { QuizPage } from './learner/pages/QuizPage';
import { QuizPackagePage } from './learner/pages/QuizPackagePage';
import { QuizPreviewPage } from './preview/QuizPreviewPage';
import { LessonPlanPage } from './learner/pages/LessonPlanPage';
import { LessonPlanPreviewPage } from './preview/LessonPlanPreviewPage';
import { EducatorFeedbackPage } from './educator/pages/EducatorFeedbackPage';
import { EducatorPackageFeedbackPage } from './educator/pages/EducatorPackageFeedbackPage';

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
          <Route path="/partner/adapt/options" element={<Navigate to="/partner/adapt" replace />} />
          <Route path="/partner/adapt/preview" element={<PreviewPage />} />
          <Route path="/partner/adapt/review" element={<ReviewPage />} />
          <Route path="/partner/adapt/email-preview" element={<EmailPreviewPage />} />
          <Route path="/team" element={<Navigate to="/team/overview" replace />} />
          <Route path="/team/overview" element={<OverviewPage />} />
          <Route path="/team/insights" element={<InsightsPage />} />
          <Route path="/team/bank" element={<BankPage />} />
          <Route path="/team/review" element={<TeamReviewPage />} />
          <Route path="/team/log" element={<LogPage />} />
          <Route path="/kit" element={<KitPage />} />
          <Route path="/quiz/seagrass-university" element={<QuizPage />} />
          <Route path="/quiz/p/:slug" element={<QuizPackagePage />} />
          <Route path="/feedback" element={<Navigate to="/quiz/seagrass-university" replace />} />
          <Route path="/educator/seagrass-university" element={<EducatorFeedbackPage />} />
          <Route path="/educator/p/:slug" element={<EducatorPackageFeedbackPage />} />
          <Route path="/lesson/p/:slug" element={<LessonPlanPage />} />
          <Route path="/preview/quiz" element={<QuizPreviewPage />} />
          <Route path="/preview/lesson" element={<LessonPlanPreviewPage />} />
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
