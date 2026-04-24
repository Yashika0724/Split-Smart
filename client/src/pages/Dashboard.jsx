import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import Modal from '../components/Modal.jsx';
import { fmtDate } from '../lib/format.js';
import styles from './Dashboard.module.css';

const EMOJI_OPTIONS = ['🏔️', '🍜', '🏡', '✈️', '🎉', '☕', '🎬', '🚗', '💡', '🏖️'];

export default function Dashboard() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { groups: gs } = await api.listGroups();
      setGroups(gs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>hey, {user?.name?.split(' ')[0] || 'friend'}</p>
          <h1 className={styles.title}>Your groups</h1>
        </div>
        <button className="btn btn-accent" onClick={() => setOpen(true)}>
          <Plus size={16} /> New group
        </button>
      </header>

      {loading ? (
        <div className={styles.loading}>loading your groups</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : groups.length === 0 ? (
        <div className={styles.emptyCard}>
          <h3>No groups yet</h3>
          <p>Start one for the trip, the apartment, or the standing Friday dinner.</p>
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            <Plus size={16} /> Create your first group
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {groups.map((g) => (
            <Link to={`/groups/${g.id}`} key={g.id} className={styles.groupCard}>
              <div className={styles.emoji}>{g.emoji || '◐'}</div>
              <div className={styles.groupMeta}>
                <div className={styles.groupName}>{g.name}</div>
                <div className={styles.groupSub}>since {fmtDate(g.created_at)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <NewGroupModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={async () => {
          setOpen(false);
          await load();
        }}
      />
    </div>
  );
}

function NewGroupModal({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setEmoji(EMOJI_OPTIONS[0]);
    setError('');
    setSubmitting(false);
  }, [open]);

  async function handle(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('give it a name');
      return;
    }
    setSubmitting(true);
    try {
      await api.createGroup({ name: name.trim(), emoji });
      await onCreated();
    } catch (err) {
      setError(err.message || 'could not create group');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New group"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handle} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create group'}
          </button>
        </>
      }
    >
      <form className={styles.form} onSubmit={handle}>
        <div>
          <label className="label">Name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Roommates, Thailand '26, Friday dinners"
            autoFocus
          />
        </div>
        <div>
          <label className="label">Emoji</label>
          <div className={styles.emojiRow}>
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                type="button"
                className={`${styles.emojiBtn} ${emoji === e ? styles.emojiActive : ''}`}
                onClick={() => setEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        {error && <div className={styles.formError}>{error}</div>}
      </form>
    </Modal>
  );
}
