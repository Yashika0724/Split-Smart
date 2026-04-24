import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import Wordmark from '../components/Wordmark.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import styles from './Login.module.css';

export default function Login() {
  const { login, status } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'authenticated') {
      navigate('/dashboard', { replace: true });
    }
  }, [status, navigate]);

  async function handle(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      const pendingToken = sessionStorage.getItem('pending_join_token');
      if (pendingToken) {
        sessionStorage.removeItem('pending_join_token');
        navigate(`/join/${pendingToken}`, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'could not sign in');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.cover}>
        <div className={styles.mark}><Wordmark size={28} /></div>
        <h1 className={styles.headline}>
          Split what matters.<br />
          <em className={styles.italic}>Keep what doesn't.</em>
        </h1>
        <p className={styles.kicker}>
          A quieter way to track who paid for the cabin, the coffee, and the late night dumplings.
        </p>
        <p className={styles.demo}>
          Try it with <span className="mono">demo1@example.com</span> / <span className="mono">demo1234</span>
        </p>
      </div>
      <div className={styles.formWrap}>
        <form className={styles.form} onSubmit={handle}>
          <h2 className={styles.formTitle}>Sign in</h2>
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
          <p className={styles.alt}>
            New here? <Link to="/signup">Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
