import { Routes, Route, Navigate, Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import GroupView from './pages/GroupView.jsx';
import JoinGroup from './pages/JoinGroup.jsx';
import Inbox from './pages/Inbox.jsx';
import Wordmark from './components/Wordmark.jsx';
import { Inbox as InboxIcon, LogOut } from 'lucide-react';
import styles from './App.module.css';

function RequireAuth({ children }) {
  const { status } = useAuth();
  if (status === 'loading') {
    return (
      <div className={styles.fullLoading}>
        <span>loading</span>
      </div>
    );
  }
  if (status === 'anonymous') return <Navigate to="/login" replace />;
  return children;
}

function Redirector() {
  const { status } = useAuth();
  if (status === 'loading') return null;
  return <Navigate to={status === 'authenticated' ? '/dashboard' : '/login'} replace />;
}

function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <header className={styles.topbar}>
      <div className={styles.topbarInner}>
        <Link to="/dashboard" className={styles.brand}>
          <Wordmark size={22} />
        </Link>
        <nav className={styles.nav}>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navActive : ''}`
            }
          >
            Groups
          </NavLink>
          <NavLink
            to="/inbox"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navActive : ''}`
            }
          >
            <InboxIcon size={16} /> Inbox
          </NavLink>
          <button
            className={styles.signout}
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
          >
            <LogOut size={15} /> Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div className={styles.shell}>
      <TopBar />
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<Redirector />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/join/:token" element={<JoinGroup />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/groups/:id"
            element={
              <RequireAuth>
                <GroupView />
              </RequireAuth>
            }
          />
          <Route
            path="/inbox"
            element={
              <RequireAuth>
                <Inbox />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
