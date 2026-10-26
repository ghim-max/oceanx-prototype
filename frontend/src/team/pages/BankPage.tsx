import { useState, useEffect } from 'react';
import { getBankItems, patchBankItem } from '../../shared/services/bankApi';
import type { BankItem, BankPatch } from '../../shared/services/bankApi';
import styles from './BankPage.module.css';

const COMPONENT_LABELS: Record<string, string> = {
  game: 'Seagrass Stories game',
  'video-nada': 'Meet Nada — a seagrass scientist',
  'video-changi-point': 'Changi Point: a meadow in trouble',
  'create-activity': 'Map the chain: choice, consequence, change',
  'further-reading-unep': 'UNEP: Seagrass meadows',
  'learner-organiser': 'Learner organiser',
};

const COMPONENT_ORDER = [
  'game',
  'video-nada',
  'video-changi-point',
  'create-activity',
  'further-reading-unep',
];

function AutoBadge({ passed, notes }: { passed: boolean | null; notes: string | null }) {
  if (passed === null) {
    return <span className={`${styles.autoBadge} ${styles['autoBadge--pending']}`}>Unchecked</span>;
  }
  if (passed) {
    return <span className={`${styles.autoBadge} ${styles['autoBadge--ok']}`}>Checked</span>;
  }
  return (
    <span
      className={`${styles.autoBadge} ${styles['autoBadge--flagged']}`}
      title={notes ?? ''}
    >
      Flagged
    </span>
  );
}

function TypeBadge({ qtype }: { qtype: 'mcq' | 'short' }) {
  return (
    <span className={`${styles.badge} ${styles[`badge--${qtype}`]}`}>
      {qtype === 'mcq' ? 'MCQ' : 'Short'}
    </span>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: 'easy' | 'medium' | 'hard' }) {
  return (
    <span className={`${styles.badge} ${styles[`badge--${difficulty}`]}`}>
      {difficulty}
    </span>
  );
}

function ItemContent({ item }: { item: BankItem }) {
  if (item.qtype === 'mcq' && item.options) {
    return (
      <div className={styles.itemContent}>
        <ul className={styles.mcqOptions}>
          {item.options.map((opt, i) => {
            const isCorrect = i === item.correct_index;
            return (
              <li
                key={i}
                className={`${styles.mcqOption} ${isCorrect ? styles['mcqOption--correct'] : ''}`}
              >
                {isCorrect ? (
                  <span className={styles.mcqCorrectMark}>✓</span>
                ) : (
                  <span className={styles.mcqBlankMark} />
                )}
                {opt}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (item.qtype === 'short') {
    return (
      <div className={styles.itemContent}>
        {item.answer && (
          <>
            <div className={styles.shortAnswerLabel}>Model answer</div>
            <p className={styles.shortAnswer}>{item.answer}</p>
          </>
        )}
        {item.key_points && item.key_points.length > 0 && (
          <>
            <div className={styles.keyPointsLabel}>Key points</div>
            <ul className={styles.keyPoints}>
              {item.key_points.map((kp, i) => (
                <li key={i} className={styles.keyPoint}>{kp}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    );
  }

  return null;
}

interface EditState {
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
  options: [string, string, string, string];
  correctIndex: number;
  answer: string;
  keyPoints: [string, string, string];
}

function itemToEditState(item: BankItem): EditState {
  const opts = item.options ?? ['', '', '', ''];
  const kp = item.key_points ?? ['', ''];
  return {
    question: item.question,
    difficulty: item.difficulty,
    options: [opts[0] ?? '', opts[1] ?? '', opts[2] ?? '', opts[3] ?? ''],
    correctIndex: item.correct_index ?? 0,
    answer: item.answer ?? '',
    keyPoints: [kp[0] ?? '', kp[1] ?? '', kp[2] ?? ''],
  };
}

function EditForm({
  item,
  onSave,
  onCancel,
  saving,
}: {
  item: BankItem;
  onSave: (patch: BankPatch) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [state, setState] = useState<EditState>(() => itemToEditState(item));

  const update = (partial: Partial<EditState>) =>
    setState((prev) => ({ ...prev, ...partial }));

  const handleSave = () => {
    const patch: BankPatch = {
      question: state.question,
      difficulty: state.difficulty,
    };
    if (item.qtype === 'mcq') {
      patch.options = [...state.options];
      patch.correct_index = state.correctIndex;
    } else {
      patch.answer = state.answer;
      patch.key_points = state.keyPoints.filter((k) => k.trim());
    }
    onSave(patch);
  };

  return (
    <div className={styles.editForm}>
      {/* Question */}
      <div className={styles.editField} style={{ minWidth: '100%' }}>
        <label className={styles.editLabel}>Question</label>
        <textarea
          className={styles.editTextarea}
          value={state.question}
          onChange={(e) => update({ question: e.target.value })}
          rows={2}
        />
      </div>

      {/* Difficulty */}
      <div className={styles.editRow}>
        <div className={styles.editField}>
          <label className={styles.editLabel}>Difficulty</label>
          <select
            className={styles.editSelect}
            value={state.difficulty}
            onChange={(e) =>
              update({ difficulty: e.target.value as 'easy' | 'medium' | 'hard' })
            }
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* MCQ fields */}
      {item.qtype === 'mcq' && (
        <>
          <div className={styles.editRow}>
            {state.options.map((opt, i) => (
              <div key={i} className={styles.editField}>
                <label className={styles.editLabel}>
                  Option {i} {i === state.correctIndex ? '✓' : ''}
                </label>
                <input
                  className={styles.editInput}
                  value={opt}
                  onChange={(e) => {
                    const next = [...state.options] as [string, string, string, string];
                    next[i] = e.target.value;
                    update({ options: next });
                  }}
                />
              </div>
            ))}
          </div>
          <div className={styles.editField}>
            <label className={styles.editLabel}>Correct option (0–3)</label>
            <select
              className={styles.editSelect}
              value={state.correctIndex}
              onChange={(e) => update({ correctIndex: Number(e.target.value) })}
              style={{ maxWidth: 140 }}
            >
              {[0, 1, 2, 3].map((i) => (
                <option key={i} value={i}>
                  {i} — {state.options[i] ? state.options[i].slice(0, 30) : '(empty)'}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Short fields */}
      {item.qtype === 'short' && (
        <>
          <div className={styles.editField} style={{ minWidth: '100%' }}>
            <label className={styles.editLabel}>Model answer</label>
            <textarea
              className={styles.editTextarea}
              value={state.answer}
              onChange={(e) => update({ answer: e.target.value })}
              rows={3}
            />
          </div>
          <div className={styles.editRow}>
            {state.keyPoints.map((kp, i) => (
              <div key={i} className={styles.editField}>
                <label className={styles.editLabel}>Key point {i + 1}</label>
                <input
                  className={styles.editInput}
                  value={kp}
                  placeholder={i < 2 ? 'Required' : 'Optional'}
                  onChange={(e) => {
                    const next = [...state.keyPoints] as [string, string, string];
                    next[i] = e.target.value;
                    update({ keyPoints: next });
                  }}
                />
              </div>
            ))}
          </div>
        </>
      )}

      <div className={styles.editFormActions}>
        <button className={`${styles.btn} ${styles['btn--cancel']}`} onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button className={`${styles.btn} ${styles['btn--save']}`} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function ItemRow({
  item,
  onPatch,
  savingId,
}: {
  item: BankItem;
  onPatch: (id: string, patch: BankPatch) => void;
  savingId: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const isSaving = savingId === item.id;

  return (
    <div className={`${styles.item} ${styles[`item--${item.status}`]}`}>
      <div className={styles.itemMain}>
        <div className={styles.itemTop}>
          <div className={styles.itemBody}>
            <div className={styles.itemMeta}>
              <TypeBadge qtype={item.qtype} />
              <DifficultyBadge difficulty={item.difficulty} />
              <AutoBadge passed={item.auto_check_passed} notes={item.auto_check_notes} />
            </div>
            <p className={styles.itemQuestion}>{item.question}</p>
            <ItemContent item={item} />
            <p className={styles.itemExcerpt}>"{item.source_excerpt}"</p>
            {item.auto_check_passed === false && item.auto_check_notes && (
              <p className={styles.autoNoteText}>{item.auto_check_notes}</p>
            )}
          </div>
        </div>

        {/* Actions: single right-aligned row */}
        <div className={styles.itemActions}>
          <button
            className={`${styles.btn} ${styles['btn--edit']}`}
            disabled={isSaving}
            onClick={() => setEditing((prev) => !prev)}
          >
            {editing ? 'Close' : 'Edit'}
          </button>
          <button
            className={`${styles.btn} ${styles['btn--reject']}`}
            disabled={isSaving || item.status === 'rejected'}
            onClick={() => onPatch(item.id, { status: 'rejected' })}
          >
            Reject
          </button>
          <button
            className={`${styles.btn} ${styles['btn--approve']}`}
            disabled={isSaving || item.status === 'approved'}
            onClick={() => onPatch(item.id, { status: 'approved' })}
          >
            Approve
          </button>
        </div>
      </div>

      {editing && (
        <EditForm
          item={item}
          saving={isSaving}
          onCancel={() => setEditing(false)}
          onSave={(patch) => {
            onPatch(item.id, patch);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

export function BankPage() {
  const [items, setItems] = useState<BankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    getBankItems()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handlePatch = async (id: string, patch: BankPatch) => {
    setSavingId(id);
    try {
      const result = await patchBankItem(id, patch);
      if (result.item) {
        setItems((prev) => prev.map((item) => (item.id === id ? result.item : item)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingId(null);
    }
  };

  const drafted = items.filter((i) => i.status === 'draft').length;
  const approved = items.filter((i) => i.status === 'approved').length;
  const rejected = items.filter((i) => i.status === 'rejected').length;
  const flagged = items.filter((i) => i.auto_check_passed === false).length;

  const grouped: Record<string, BankItem[]> = {};
  for (const id of COMPONENT_ORDER) {
    grouped[id] = items.filter((i) => i.component_id === id);
  }
  for (const item of items) {
    if (!COMPONENT_ORDER.includes(item.component_id)) {
      grouped[item.component_id] ??= [];
      grouped[item.component_id].push(item);
    }
  }

  const STAT_COLS = [
    { label: 'Total', value: items.length },
    { label: 'Drafted', value: drafted },
    { label: 'Approved', value: approved },
    { label: 'Rejected', value: rejected },
    { label: 'Flagged', value: flagged },
  ];

  return (
    <article className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.h1}>Question bank</h1>
          <p className={styles.subtitle}>
            Sample bank for prototype. OceanX sets the real bank.
          </p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {!loading && (
          <div className={styles.statsStrip}>
            {STAT_COLS.map(({ label, value }) => (
              <div key={label} className={styles.statColumn}>
                <div className={styles.statColumnInner}>
                  <div className={styles.statLabelRow}>
                    <span className={styles.accentSquare} />
                    <span className={styles.statLabelText}>{label}</span>
                  </div>
                  <div className={styles.statBigNumber}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && <p className={styles.empty}>Loading…</p>}

        {!loading &&
          Object.entries(grouped).map(([componentId, compItems]) => {
            if (compItems.length === 0) return null;
            const label = COMPONENT_LABELS[componentId] ?? componentId;
            return (
              <section key={componentId} className={styles.group}>
                <div className={styles.groupHeader}>
                  <h2 className={styles.groupTitle}>{label}</h2>
                  <span className={styles.groupCount}>{compItems.length} items</span>
                </div>
                {compItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onPatch={handlePatch}
                    savingId={savingId}
                  />
                ))}
              </section>
            );
          })}

        {!loading && items.length === 0 && !error && (
          <p className={styles.empty}>
            No items yet. Fill in the source files, then POST /bank/draft from the backend.
          </p>
        )}
      </div>
    </article>
  );
}
