import { useState } from 'react';
import styles from './ExpenseForm.module.css';

const CATEGORIES = [
  'food',
  'home',
  'transport',
  'travel',
  'coffee',
  'drinks',
  'fun',
  'utilities',
  'other',
];

function dateInput(ts) {
  const d = ts ? new Date(Number(ts)) : new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function ExpenseForm({
  members,
  currentUserId,
  onSubmit,
  submitting,
  initial,
  submitLabel,
}) {
  const [description, setDescription] = useState(initial?.description || '');
  const [amount, setAmount] = useState(
    initial?.amount !== undefined ? String(initial.amount) : ''
  );
  const [paidBy, setPaidBy] = useState(
    initial?.paid_by || currentUserId || (members[0] && members[0].id) || ''
  );
  const [category, setCategory] = useState(initial?.category || 'food');
  const [date, setDate] = useState(dateInput(initial?.date));
  const [error, setError] = useState('');

  async function handle(e) {
    e.preventDefault();
    setError('');
    const amt = Number(amount);
    if (!description.trim()) {
      setError('give it a short description');
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('amount must be greater than zero');
      return;
    }
    try {
      await onSubmit({
        description: description.trim(),
        amount: amt,
        paidBy,
        category,
        date: new Date(date).getTime(),
      });
      if (!initial) {
        setDescription('');
        setAmount('');
      }
    } catch (err) {
      setError(err.message || 'something went wrong');
    }
  }

  const buttonText = submitting
    ? initial ? 'Saving…' : 'Adding…'
    : submitLabel || (initial ? 'Save changes' : 'Add expense');

  return (
    <form className={styles.form} onSubmit={handle}>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className="label">What was it?</label>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Cabin rental, groceries, the good coffee"
          />
        </div>
        <div className={styles.fieldSmall}>
          <label className="label">Amount</label>
          <input
            className="input mono"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className="label">Paid by</label>
          <select
            className="select"
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className="label">Category</label>
          <select
            className="select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.fieldSmall}>
          <label className="label">Date</label>
          <input
            className="input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
      <div className={styles.splitHint}>
        Split equally across {members.length} {members.length === 1 ? 'member' : 'members'}.
      </div>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.actions}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {buttonText}
        </button>
      </div>
    </form>
  );
}
