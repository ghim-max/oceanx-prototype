import { useState } from 'react';
import { buildPackageEmail } from '../../shared/email/packageEmail';
import { BASE_URL } from '../../shared/services/sendPackage';
import styles from './EmailPreviewPage.module.css';

// Sample data for preview
const SAMPLE_COMPONENTS = [
  { title: 'Video: Meet Nada: A Seagrass Scientist', type: 'Watch', minutes: 5 },
  { title: 'Seagrass Stories game', type: 'Play', minutes: 25 },
  { title: 'Investigate prompts', type: 'Discuss', minutes: 10 },
  { title: 'Reflect prompts', type: 'Discuss', minutes: 15 },
  { title: 'Map the chain: choice, consequence, change', type: 'Create', minutes: 15 },
];

const SAMPLE_WITH_AI = {
  educatorName: 'Dr. Marina Chen',
  audience: 'university',
  components: SAMPLE_COMPONENTS,
  quizLink: `${BASE_URL}/quiz/p/pkg-university-2026-q3`,
  quizQuestionCount: 8,
  lessonPlanLink: `${BASE_URL}/lesson/p/pkg-university-2026-q3`,
  lessonPlanLength: 60,
  lessonPlanLevel: 'intermediate',
  feedbackLink: `${BASE_URL}/educator/p/pkg-university-2026-q3`,
  hadAiReview: true,
};

const SAMPLE_NO_AI = {
  educatorName: '',
  audience: 'university',
  components: SAMPLE_COMPONENTS.slice(0, 3),
  quizLink: `${BASE_URL}/quiz/p/pkg-university-2026-q4`,
  quizQuestionCount: 6,
  lessonPlanLink: undefined,
  lessonPlanLength: undefined,
  lessonPlanLevel: undefined,
  feedbackLink: `${BASE_URL}/educator/p/pkg-university-2026-q4`,
  hadAiReview: false,
};

export function EmailPreviewPage() {
  const [scenario, setScenario] = useState<'with-ai' | 'no-ai'>('with-ai');
  const [customEducatorName, setCustomEducatorName] = useState('');
  const [customAudience, setCustomAudience] = useState('university');
  const [showHtml, setShowHtml] = useState(false);

  const input = scenario === 'with-ai' ? SAMPLE_WITH_AI : SAMPLE_NO_AI;
  const mergedInput = {
    ...input,
    educatorName: customEducatorName || input.educatorName,
    audience: customAudience,
  };

  const { html } = buildPackageEmail(mergedInput);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Package Email Preview</h1>
          <p className={styles.subtitle}>Dev-only preview of the educator package email. Not accessible in production.</p>
        </header>

        <div className={styles.controls}>
          <div className={styles.controlGroup}>
            <label htmlFor="scenario" className={styles.label}>Scenario</label>
            <select
              id="scenario"
              value={scenario}
              onChange={e => setScenario(e.target.value as 'with-ai' | 'no-ai')}
              className={styles.select}
            >
              <option value="with-ai">With AI review (full package)</option>
              <option value="no-ai">No AI review (components only)</option>
            </select>
          </div>

          <div className={styles.controlGroup}>
            <label htmlFor="educatorName" className={styles.label}>Educator name</label>
            <input
              id="educatorName"
              type="text"
              value={customEducatorName}
              onChange={e => setCustomEducatorName(e.target.value)}
              className={styles.input}
              placeholder="Leave empty for fallback"
            />
          </div>

          <div className={styles.controlGroup}>
            <label htmlFor="audience" className={styles.label}>Audience</label>
            <select
              id="audience"
              value={customAudience}
              onChange={e => setCustomAudience(e.target.value as 'university' | 'schools' | 'museum')}
              className={styles.select}
            >
              <option value="university">University</option>
              <option value="schools">Schools</option>
              <option value="museum">Museum</option>
            </select>
          </div>

          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={showHtml}
              onChange={e => setShowHtml(e.target.checked)}
            />
            <span>Show raw HTML</span>
          </label>
        </div>

        <div className={styles.previewWrapper}>
          {showHtml ? (
            <div className={styles.rawHtml}>
              <pre>{html}</pre>
            </div>
          ) : (
            <div className={styles.emailFrame} dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </div>
      </div>
    </div>
  );
}