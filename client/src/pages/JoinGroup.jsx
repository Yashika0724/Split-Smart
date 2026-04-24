import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import styles from './JoinGroup.module.css';

export default function JoinGroup() {
  const { token } = useParams();
  const { status } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState('pending');
  const [error, setError] = useState('');
  const [group, setGroup] = useState(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'anonymous') {
      if (token) sessionStorage.setItem('pending_join_token', token);
      navigate('/signup', { replace: true });
      return;
    }
    (async () => {
      try {
        const { group: g } = await api.joinGroup(token);
        setGroup(g);
        setState('ok');
        setTimeout(() => navigate(`/groups/${g.id}`, { replace: true }), 600);
      } catch (err) {
        setError(err.message || 'could not join');
        setState('error');
      }
    })();
  }, [status, token, navigate]);

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {state === 'pending' && <p>joining…</p>}
        {state === 'ok' && group && (
          <>
            <div className={styles.emoji}>{group.emoji || '◐'}</div>
            <h2 className={styles.title}>You're in</h2>
            <p className={styles.sub}>Taking you to {group.name}…</p>
          </>
        )}
        {state === 'error' && (
          <>
            <h2 className={styles.title}>Couldn't join</h2>
            <p className={styles.err}>{error}</p>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
              Back to groups
            </button>
          </>
        )}
      </div>
    </div>
  );
}
