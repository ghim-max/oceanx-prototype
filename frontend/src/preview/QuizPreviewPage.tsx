import { useEffect, useState } from 'react';
import { Printer, Flag, X, Check } from 'lucide-react';
import { getApprovedBankItems } from '../shared/services/bankApi';
import styles from './QuizPreviewPage.module.css';

interface PackageQuizData {
  itemIds: string[];
  componentIds: string[];
  picks: { id: string; title: string }[];
  quizType: 'mcq' | 'short' | 'mixed';
  quizDifficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  quizCount: number;
}

interface BankItem {
  id: string;
  component_id: string;
  question: string;
  qtype: 'mcq' | 'short';
  options: string[] | null;
  correct_index: number | null;
  answer: string | null;
  key_points: string[] | null;
  explanation: string | null;
  source_excerpt: string | null;
}

const TITLE_MAP: Record<string, string> = {
  'video-nada': 'Video: Meet Nada: A Seagrass Scientist',
  'create-activity': 'Map the chain',
  'further-reading-unep': 'UNEP: Seagrass meadows',
  'further-reading-seagrass-watch': 'Seagrass-Watch monitoring',
  'driving-question': 'Driving question board',
  'game': 'Seagrass Stories game',
  'video-changi-point': 'Video: Changi Point',
  'investigate-prompts': 'Investigate prompts',
  'reflect-prompts': 'Reflect prompts',
  'educator-guide': 'Educator guide',
};

function getComponentTitle(componentId: string): string {
  return TITLE_MAP[componentId] ?? componentId;
}

function formatQuizType(type: string): string {
  return type === 'mcq' ? 'Multiple choice' : type === 'short' ? 'Short answer' : 'Mixed';
}

function formatDifficulty(diff: string): string {
  return diff.charAt(0).toUpperCase() + diff.slice(1);
}

export function QuizPreviewPage() {
  const [questions, setQuestions] = useState<BankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [packageData, setPackageData] = useState<PackageQuizData | null>(null);

  const packageDataStr = sessionStorage.getItem('previewQuizData');

  useEffect(() => {
    if (!packageDataStr) {
      setError('No quiz data found. Please go back to the adapt page.');
      setLoading(false);
      return;
    }

    const data: PackageQuizData = JSON.parse(packageDataStr);
    setPackageData(data);

    getApprovedBankItems()
      .then((allItems: any[]) => {
        const filtered = allItems.filter((item) => data.itemIds.includes(item.id));
        filtered.sort((a, b) => data.itemIds.indexOf(a.id) - data.itemIds.indexOf(b.id));
        setQuestions(filtered);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load quiz questions.');
        setLoading(false);
      });
  }, [packageDataStr]);

  const handlePrint = () => {
    window.print();
  };

  const handleReportIssue = () => {
    alert('Report an issue - not implemented yet');
  };

  const handleClose = () => {
    window.close();
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading quiz preview...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  const questionCount = questions.length;
  const typeLabel = packageData ? formatQuizType(packageData.quizType) : '';
  const diffLabel = packageData ? formatDifficulty(packageData.quizDifficulty) : '';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Knowledge check preview</h1>
          <p className={styles.subtitle}>
            {questionCount} {questionCount === 1 ? 'question' : 'questions'} · {typeLabel} · {diffLabel} · read-only
          </p>
        </div>
        <div className={styles.headerRight}>
          <label className={styles.showAnswersToggle}>
            <input
              type="checkbox"
              checked={showAnswers}
              onChange={(e) => setShowAnswers(e.target.checked)}
            />
            <span>Show answers</span>
          </label>
          <button className={styles.btnPrint} onClick={handlePrint}>
            <Printer size={16} aria-hidden="true" />
            Print
          </button>
          <button className={styles.btnIssue} onClick={handleReportIssue}>
            <Flag size={16} aria-hidden="true" />
            Report an issue
          </button>
          <button className={styles.btnClose} onClick={handleClose}>
            <X size={16} aria-hidden="true" />
            Close
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {questions.length === 0 ? (
          <p className={styles.noQuestions}>No questions in this quiz.</p>
        ) : (
          <ol className={styles.questionList}>
            {questions.map((q, idx) => (
              <li key={q.id} className={styles.questionCard}>
                <div className={styles.questionHeader}>
                  <span className={styles.questionNumber}>Q{idx + 1}</span>
                  <span className={styles.componentTag}>{getComponentTitle(q.component_id)}</span>
                </div>
                <p className={styles.questionText}>{q.question}</p>

                {q.qtype === 'short' ? (
                  <>
                    {showAnswers && q.answer && (
                      <div className={styles.modelAnswer}>
                        <strong>Model answer:</strong> {q.answer}
                      </div>
                    )}
                    {showAnswers && q.key_points && q.key_points.length > 0 && (
                      <div className={styles.keyPoints}>
                        <strong>Key points:</strong>
                        <ul>
                          {q.key_points.map((kp, i) => (
                            <li key={i}>{kp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {!showAnswers && (
                      <p className={styles.shortAnswerNote}>Answer will appear when "Show answers" is enabled.</p>
                    )}
                  </>
                ) : (
                  <div className={styles.options} role="radiogroup" aria-label={q.question}>
                    {(q.options ?? []).map((option, optIdx) => {
                      const isCorrect = showAnswers && q.correct_index === optIdx;
                      return (
                        <label
                          key={optIdx}
                          className={`${styles.optionRow} ${isCorrect ? styles.optionCorrect : ''}`}
                        >
                          <span className={styles.optionLetter}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className={styles.optionText}>{option}</span>
                          {isCorrect && (
                            <span className={styles.correctMark} aria-label="Correct answer">
                              <Check size={16} aria-hidden="true" />
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}