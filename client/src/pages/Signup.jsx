import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import Wordmark from '../components/Wordmark.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import styles from './Login.module.css';

export default function Signup() {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handle(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    try {
      await signup(email, password, name);
      const pendingToken = sessionStorage.getItem('pending_join_token');
      if (pendingToken) {
        sessionStorage.removeItem('pending_join_token');
        navigate(`/join/${pendingToken}`, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'could not create account');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.cover}>
        <div className={styles.mark}><Wordmark size={28} /></div>
        <h1 className={styles.headline}>
          Four friends, one dinner.<br />
          <em className={styles.italic}>Zero spreadsheets.</em>
        </h1>
        <p className={styles.kicker}>
          Add a group, drop in an expense, and let the math disappear into the background.
        </p>
      </div>
      <div className={styles.formWrap}>
        <form className={styles.form} onSubmit={handle}>
          <h2 className={styles.formTitle}>Create account</h2>
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>
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
              autoComplete="new-password"
              required
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create account'}
          </button>
          <p className={styles.alt}>
            Already have one? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
