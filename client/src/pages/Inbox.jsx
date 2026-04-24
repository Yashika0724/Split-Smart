import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { api } from '../lib/api.js';
import Avatar from '../components/Avatar.jsx';
import { fmtMoney, fmtRelative } from '../lib/format.js';
import styles from './Inbox.module.css';

export default function Inbox() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { reminders } = await api.inbox();
        setItems(reminders);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>nudges sent your way</p>
        <h1 className={styles.title}>Inbox</h1>
      </header>

      {loading ? (
        <div className={styles.loading}>loading</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          <Bell size={24} />
          <h3>No reminders</h3>
          <p>When someone nudges you about a shared expense, it'll land here.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {items.map((r) => (
            <li key={r.id} className={styles.row}>
              <Avatar userId={r.from_id} name={r.from_name} size={40} />
              <div className={styles.main}>
                <div className={styles.head}>
                  <span className={styles.name}>{r.from_name}</span>
                  <span className={styles.meta}>
                    {r.group_emoji || '◐'} {r.group_name}
                  </span>
                  <span className={styles.meta}>• {fmtRelative(r.sent_at)}</span>
                  <span className={`${styles.tone} ${styles[`tone_${r.tone}`]}`}>{r.tone}</span>
                </div>
                <div className={styles.note}>{r.note || '(no message)'}</div>
                <div className={styles.footer}>
                  <span className="money money-neg">{fmtMoney(r.amount)}</span>
                  <Link to={`/groups/${r.group_id}`} className={styles.link}>
                    Open group
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
