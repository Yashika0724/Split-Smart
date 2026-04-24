import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import styles from './SettleUpModal.module.css';

export default function SettleUpModal({ open, onClose, members, currentUserId, suggested, onSubmit }) {
  const [fromUser, setFromUser] = useState(currentUserId || '');
  const [toUser, setToUser] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setSubmitting(false);
    if (suggested) {
      setFromUser(suggested.from || currentUserId || '');
      setToUser(suggested.to || '');
      setAmount(suggested.amount ? String(suggested.amount) : '');
    } else {
      setFromUser(currentUserId || '');
      setToUser('');
      setAmount('');
    }
  }, [open, suggested, currentUserId]);

  async function handle(e) {
    e.preventDefault();
    setError('');
    const amt = Number(amount);
    if (!fromUser || !toUser) {
      setError('pick both sides of the transfer');
      return;
    }
    if (fromUser === toUser) {
      setError("from and to can't be the same person");
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('amount must be greater than zero');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ fromUser, toUser, amount: amt });
      onClose();
    } catch (err) {
      setError(err.message || 'could not record settlement');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Settle up"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handle} disabled={submitting}>
            {submitting ? 'Recording…' : 'Record payment'}
          </button>
        </>
      }
    >
      <form className={styles.form} onSubmit={handle}>
        <div className={styles.row}>
          <div>
            <label className="label">From</label>
            <select className="select" value={fromUser} onChange={(e) => setFromUser(e.target.value)}>
              <option value="">pick one</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">To</label>
            <select className="select" value={toUser} onChange={(e) => setToUser(e.target.value)}>
              <option value="">pick one</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
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
        {error && <div className={styles.error}>{error}</div>}
      </form>
    </Modal>
  );
}
