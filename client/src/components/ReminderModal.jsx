import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import styles from './ReminderModal.module.css';

const TONES = [
  { id: 'gentle', label: 'Gentle', blurb: 'low-key, kind' },
  { id: 'casual', label: 'Casual', blurb: 'friendly nudge' },
  { id: 'direct', label: 'Direct', blurb: 'please settle soon' },
];

function template(tone, name, amount, context) {
  const amt = Number(amount).toFixed(2);
  const ctx = context || 'our recent expenses';
  if (tone === 'gentle') {
    return `hey ${name}! no rush at all, but whenever you have a sec, there's ₹${amt} floating around from ${ctx}. ♡`;
  }
  if (tone === 'direct') {
    return `hi ${name}, could you settle up the ₹${amt} for ${ctx} this week? thanks!`;
  }
  return `${name}, tiny reminder about the ₹${amt} for ${ctx}. cheers!`;
}

export default function ReminderModal({ open, onClose, target, context, onSubmit }) {
  const [tone, setTone] = useState('casual');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !target) return;
    setTone('casual');
    setError('');
    setSubmitting(false);
    setNote(template('casual', target.name, target.amount, context));
  }, [open, target, context]);

  function switchTone(t) {
    setTone(t);
    if (target) setNote(template(t, target.name, target.amount, context));
  }

  async function handle(e) {
    e?.preventDefault?.();
    if (!target) return;
    setError('');
    setSubmitting(true);
    try {
      await onSubmit({ tone, note: note.trim() });
      onClose();
    } catch (err) {
      setError(err.message || 'could not send reminder');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={target ? `Nudge ${target.name}` : 'Send reminder'}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button className="btn btn-accent" onClick={handle} disabled={submitting}>
            {submitting ? 'Sending…' : 'Send nudge'}
          </button>
        </>
      }
    >
      {target ? (
        <div className={styles.form}>
          <div className={styles.toneRow}>
            {TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`${styles.tone} ${tone === t.id ? styles.toneActive : ''}`}
                onClick={() => switchTone(t.id)}
              >
                <span className={styles.toneLabel}>{t.label}</span>
                <span className={styles.toneBlurb}>{t.blurb}</span>
              </button>
            ))}
          </div>
          <div>
            <label className="label">Message</label>
            <textarea
              className="textarea"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
        </div>
      ) : null}
    </Modal>
  );
}
