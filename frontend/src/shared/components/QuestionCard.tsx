import { useState } from 'react';
import { Check } from 'lucide-react';
import styles from './QuestionCard.module.css';
import type { BankItem } from '../services/bankApi';

interface QuestionCardProps {
  item: BankItem;
  showAnswers?: boolean;
  showComponentTitle?: boolean;
  componentTitle?: string;
  questionNumber?: number;
  readOnly?: boolean;
  onAnswer?: (itemId: string, answer: number | string) => void;
  userAnswer?: number | string;
  showQuestionNumber?: boolean;
}

export function QuestionCard({
  item,
  showAnswers = false,
  showComponentTitle = true,
  componentTitle,
  questionNumber,
  readOnly = true,
  onAnswer,
  userAnswer,
  showQuestionNumber = true,
}: QuestionCardProps) {
  const [showAnswer, setShowAnswer] = useState(false);

  const handleOptionChange = (optIdx: number) => {
    if (!readOnly && onAnswer) {
      onAnswer(item.id, optIdx);
    }
  };

  const handleShortAnswerChange = (text: string) => {
    if (!readOnly && onAnswer) {
      onAnswer(item.id, text);
    }
  };

  const isCorrect = (optIdx: number) => showAnswers && item.correct_index === optIdx;
  const isUserAnswer = (optIdx: number) => userAnswer !== undefined && userAnswer === optIdx;

  return (
    <fieldset className={styles.questionCard} disabled={readOnly}>
      <legend className={styles.questionLegend}>
        {showQuestionNumber && questionNumber !== undefined && (
          <span className={styles.questionNumber}>Question {questionNumber}</span>
        )}
        {showComponentTitle && componentTitle && (
          <span className={styles.componentBadge}>{componentTitle}</span>
        )}
        {item.question}
        {showAnswers && (
          <button
            type="button"
            className={styles.toggleAnswersBtn}
            onClick={() => setShowAnswer(!showAnswer)}
            aria-expanded={showAnswer}
            aria-controls={`answer-${item.id}`}
          >
            {showAnswer ? 'Hide answer' : 'Show answer'}
            <Check size={14} aria-hidden="true" />
          </button>
        )}
      </legend>

      {showComponentTitle && componentTitle && (
        <div className={styles.componentTitle}>{componentTitle}</div>
      )}

      <div className={styles.questionText}>{item.question}</div>

      {item.qtype === 'short' ? (
        <div className={styles.shortAnswer}>
          <textarea
            name={item.id}
            value={userAnswer as string ?? ''}
            onChange={(e) => handleShortAnswerChange(e.target.value)}
            maxLength={1000}
            rows={4}
            className={styles.textarea}
            placeholder={readOnly ? '' : 'Your answer in 2-3 sentences'}
            readOnly={readOnly}
            aria-describedby={`${item.id}-counter`}
          />
          <div id={`${item.id}-counter`} className={styles.charCounter}>
            {(userAnswer as string ?? '').length}/1000
          </div>
          {showAnswers && item.answer && (
            <div className={styles.modelAnswer}>
              <strong>Model answer:</strong> {item.answer}
            </div>
          )}
          {showAnswers && item.key_points && item.key_points.length > 0 && (
            <div className={styles.keyPoints}>
              <strong>Key points:</strong>
              <ul>
                {item.key_points.map((kp, i) => (
                  <li key={i}>{kp}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.options} role="radiogroup" aria-label={item.question}>
          {(item.options ?? []).map((option, optIdx) => (
            <label key={optIdx} className={`${styles.optionLabel} ${isCorrect(optIdx) ? styles.optionCorrect : ''} ${isUserAnswer(optIdx) ? styles.optionUser : ''}`}>
              <input
                type="radio"
                name={item.id}
                value={optIdx}
                checked={userAnswer === optIdx}
                onChange={() => handleOptionChange(optIdx)}
                className={styles.optionInput}
                disabled={readOnly}
              />
              <span className={styles.optionText}>{option}</span>
              {isCorrect(optIdx) && (
                <span className={styles.correctMark} aria-label="Correct answer">
                  <Check size={14} aria-hidden="true" />
                </span>
              )}
              {isUserAnswer(optIdx) && !isCorrect(optIdx) && (
                <span className={styles.userMark} aria-label="Your answer" />
              )}
            </label>
          ))}
        </div>
      )}

      {showAnswers && (
        <div id={`answer-${item.id}`} className={styles.answerReveal} hidden={!showAnswer}>
          <div className={styles.answerContent}>
            {item.qtype === 'short' ? (
              <>
                {item.answer && <div className={styles.modelAnswer}><strong>Model answer:</strong> {item.answer}</div>}
                {item.key_points && item.key_points.length > 0 && (
                  <div className={styles.keyPoints}>
                    <strong>Key points:</strong>
                    <ul>
                      {item.key_points.map((kp, i) => (
                        <li key={i}>{kp}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className={styles.correctOption}>
                  Correct answer: {item.options?.[item.correct_index ?? 0] ?? 'N/A'}
                </div>
              </>
            )}
            {item.explanation && <div className={styles.explanation}>{item.explanation}</div>}
            {item.source_excerpt && <div className={styles.sourceExcerpt}>Source: "{item.source_excerpt}"</div>}
          </div>
        </div>
      )}
    </fieldset>
  );
}