import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Coffee,
  UtensilsCrossed,
  Home as HomeIcon,
  Car,
  Plane,
  Wine,
  PartyPopper,
  Lightbulb,
  Tag,
  ArrowLeft,
  Plus,
  Receipt,
  HandCoins,
  Bell,
  Users,
  QrCode,
  Pencil,
  Trash2,
  LogOut,
  UserMinus,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import Avatar from '../components/Avatar.jsx';
import ExpenseForm from '../components/ExpenseForm.jsx';
import QRInvite from '../components/QRInvite.jsx';
import Modal from '../components/Modal.jsx';
import SettleUpModal from '../components/SettleUpModal.jsx';
import ReminderModal from '../components/ReminderModal.jsx';
import { fmtMoney, moneyClass, fmtDate, fmtRelative } from '../lib/format.js';
import styles from './GroupView.module.css';

const CAT_ICON = {
  food: UtensilsCrossed,
  home: HomeIcon,
  transport: Car,
  travel: Plane,
  coffee: Coffee,
  drinks: Wine,
  fun: PartyPopper,
  utilities: Lightbulb,
  other: Tag,
};

export default function GroupView() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState({});
  const [payments, setPayments] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [submittingExpense, setSubmittingExpense] = useState(false);

  const [editExpense, setEditExpense] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const [removeMember, setRemoveMember] = useState(null);
  const [submittingRemove, setSubmittingRemove] = useState(false);

  const [settleOpen, setSettleOpen] = useState(false);
  const [settleSuggested, setSettleSuggested] = useState(null);

  const [remindOpen, setRemindOpen] = useState(false);
  const [remindTarget, setRemindTarget] = useState(null);

  const memberMap = useMemo(() => {
    const m = {};
    for (const mb of members) m[mb.id] = mb;
    return m;
  }, [members]);

  const load = useCallback(async () => {
    setError('');
    try {
      const [g, ex, bal, rems] = await Promise.all([
        api.getGroup(id),
        api.listExpenses(id),
        api.getBalances(id),
        api.listGroupReminders(id),
      ]);
      setGroup(g.group);
      setMembers(g.members);
      setExpenses(ex.expenses);
      setBalances(bal.balances);
      setPayments(bal.payments);
      setReminders(rems.reminders);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  async function addExpense(payload) {
    setSubmittingExpense(true);
    try {
      await api.createExpense(id, payload);
      setShowAdd(false);
      await load();
    } finally {
      setSubmittingExpense(false);
    }
  }

  async function saveEditExpense(payload) {
    if (!editExpense) return;
    setSubmittingExpense(true);
    try {
      await api.updateExpense(id, editExpense.id, payload);
      setEditExpense(null);
      await load();
    } finally {
      setSubmittingExpense(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSubmittingDelete(true);
    try {
      await api.deleteExpense(id, deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } finally {
      setSubmittingDelete(false);
    }
  }

  async function confirmRemove() {
    if (!removeMember) return;
    setSubmittingRemove(true);
    try {
      await api.removeMember(id, removeMember.id);
      const leavingSelf = removeMember.id === user.id;
      setRemoveMember(null);
      if (leavingSelf) {
        navigate('/dashboard', { replace: true });
      } else {
        await load();
      }
    } catch (err) {
      setRemoveMember({ ...removeMember, error: err.message });
    } finally {
      setSubmittingRemove(false);
    }
  }

  async function recordSettlement(payload) {
    await api.createSettlement(id, payload);
    await load();
  }

  const myBalance = user ? balances[user.id] || 0 : 0;

  const myOwed = useMemo(() => {
    if (!user) return [];
    return payments
      .filter((p) => p.to === user.id)
      .map((p) => ({ ...p, counterpart: memberMap[p.from] }));
  }, [payments, user, memberMap]);

  const iOwe = useMemo(() => {
    if (!user) return [];
    return payments
      .filter((p) => p.from === user.id)
      .map((p) => ({ ...p, counterpart: memberMap[p.to] }));
  }, [payments, user, memberMap]);

  function lastReminderFor(toUserId) {
    if (!user) return null;
    const r = reminders.find(
      (x) => x.from_user === user.id && x.to_user === toUserId
    );
    return r ? r.sent_at : null;
  }

  function openRemind(counterpart, amount) {
    setRemindTarget({ ...counterpart, amount });
    setRemindOpen(true);
  }

  async function sendReminder({ tone, note }) {
    if (!remindTarget) return;
    await api.sendReminder({
      groupId: id,
      toUser: remindTarget.id,
      amount: remindTarget.amount,
      tone,
      note,
    });
    const rems = await api.listGroupReminders(id);
    setReminders(rems.reminders);
  }

  function openSettleFromPayment(p) {
    setSettleSuggested({ from: p.from, to: p.to, amount: p.amount });
    setSettleOpen(true);
  }

  if (loading) {
    return <div className={styles.loading}>loading group</div>;
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorBanner}>{error}</div>
        <Link to="/dashboard" className="btn btn-ghost">
          <ArrowLeft size={16} /> Back to groups
        </Link>
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className={styles.page}>
      <Link to="/dashboard" className={styles.backLink}>
        <ArrowLeft size={14} /> Groups
      </Link>

      <header className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.heroEmoji}>{group.emoji || '◐'}</div>
          <div>
            <h1 className={styles.heroTitle}>{group.name}</h1>
            <div className={styles.heroMeta}>
              <Users size={14} />
              <span>{members.length} {members.length === 1 ? 'member' : 'members'}</span>
              <span className={styles.dot}>•</span>
              <span>since {fmtDate(group.created_at)}</span>
            </div>
          </div>
        </div>
        <div className={styles.heroActions}>
          <button className="btn btn-ghost" onClick={() => setShowInvite(true)}>
            <QrCode size={16} /> Invite
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setSettleSuggested(null);
              setSettleOpen(true);
            }}
          >
            <HandCoins size={16} /> Settle up
          </button>
          <button className="btn btn-accent" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add expense
          </button>
        </div>
      </header>

      <section className={styles.summary}>
        <div className={styles.summaryCard}>
          <div className="label">Your balance</div>
          <div className={`${moneyClass(myBalance)} ${styles.bigMoney}`}>
            {fmtMoney(myBalance, { sign: true })}
          </div>
          <div className={styles.summaryHint}>
            {Math.abs(myBalance) < 0.01
              ? 'all settled up'
              : myBalance > 0
              ? 'owed to you'
              : 'you owe'}
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className="label">They owe you</div>
          {myOwed.length === 0 ? (
            <div className={styles.emptyMini}>nothing outstanding</div>
          ) : (
            <ul className={styles.payList}>
              {myOwed.map((p) => {
                const last = lastReminderFor(p.counterpart?.id);
                return (
                  <li key={`owe-${p.from}`} className={styles.payRow}>
                    <div className={styles.payWho}>
                      <Avatar userId={p.counterpart?.id} name={p.counterpart?.name} size={28} />
                      <div>
                        <div className={styles.payName}>{p.counterpart?.name}</div>
                        {last && (
                          <div className={styles.payHint}>last nudged {fmtRelative(last)}</div>
                        )}
                      </div>
                    </div>
                    <div className={styles.payRight}>
                      <span className={`${moneyClass(p.amount)} ${styles.payAmt}`}>
                        {fmtMoney(p.amount)}
                      </span>
                      <button
                        className={styles.nudge}
                        onClick={() => openRemind(p.counterpart, p.amount)}
                      >
                        <Bell size={13} /> Nudge
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className={styles.summaryCard}>
          <div className="label">You owe</div>
          {iOwe.length === 0 ? (
            <div className={styles.emptyMini}>you're clear</div>
          ) : (
            <ul className={styles.payList}>
              {iOwe.map((p) => (
                <li key={`ow-${p.to}`} className={styles.payRow}>
                  <div className={styles.payWho}>
                    <Avatar userId={p.counterpart?.id} name={p.counterpart?.name} size={28} />
                    <div className={styles.payName}>{p.counterpart?.name}</div>
                  </div>
                  <div className={styles.payRight}>
                    <span className={`money money-neg ${styles.payAmt}`}>
                      {fmtMoney(p.amount)}
                    </span>
                    <button
                      className={styles.settleBtn}
                      onClick={() => openSettleFromPayment(p)}
                    >
                      Settle
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className={styles.sectionGrid}>
        <div>
          <h2 className={styles.sectionTitle}>
            <Receipt size={18} /> Expenses
          </h2>
          {expenses.length === 0 ? (
            <div className={styles.emptyPanel}>
              <p>No expenses yet.</p>
              <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                <Plus size={16} /> Add the first one
              </button>
            </div>
          ) : (
            <ul className={styles.expenseList}>
              {expenses.map((e) => {
                const Icon = CAT_ICON[e.category] || Tag;
                const payer = memberMap[e.paid_by];
                return (
                  <li key={e.id} className={styles.expenseRow}>
                    <div className={styles.catIcon}>
                      <Icon size={18} />
                    </div>
                    <div className={styles.expMain}>
                      <div className={styles.expDesc}>{e.description}</div>
                      <div className={styles.expSub}>
                        <span>{payer?.name || e.paid_by_name || 'someone'} paid</span>
                        <span className={styles.dot}>•</span>
                        <span>{fmtDate(e.date)}</span>
                        <span className={styles.dot}>•</span>
                        <span className={styles.tag}>{e.category}</span>
                      </div>
                    </div>
                    <div className={`money ${styles.expAmt}`}>{fmtMoney(e.amount)}</div>
                    <div className={styles.expActions}>
                      <button
                        className={styles.iconBtn}
                        onClick={() => setEditExpense(e)}
                        aria-label="edit expense"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        onClick={() => setDeleteTarget(e)}
                        aria-label="delete expense"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside className={styles.sidebar}>
          <h2 className={styles.sectionTitleSmall}>
            <Users size={16} /> Members
          </h2>
          <ul className={styles.memberList}>
            {members.map((m) => {
              const bal = balances[m.id] || 0;
              const isSelf = m.id === user?.id;
              const canRemove = isSelf || user?.id === group.created_by;
              return (
                <li key={m.id} className={styles.memberRow}>
                  <Avatar userId={m.id} name={m.name} size={32} />
                  <div className={styles.memberMeta}>
                    <div className={styles.memberName}>
                      {m.name}
                      {isSelf && <span className={styles.you}> you</span>}
                    </div>
                    <div className={styles.memberEmail}>{m.email}</div>
                  </div>
                  <div className={styles.memberRight}>
                    <div className={`${moneyClass(bal)} ${styles.memberBal}`}>
                      {fmtMoney(bal, { sign: true })}
                    </div>
                    {canRemove && members.length > 1 && (
                      <button
                        className={styles.memberAction}
                        onClick={() => setRemoveMember(m)}
                        aria-label={isSelf ? 'leave group' : 'remove member'}
                        title={isSelf ? 'Leave group' : 'Remove'}
                      >
                        {isSelf ? <LogOut size={14} /> : <UserMinus size={14} />}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>
      </section>

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add expense"
        wide
      >
        <ExpenseForm
          members={members}
          currentUserId={user?.id}
          onSubmit={addExpense}
          submitting={submittingExpense}
        />
      </Modal>

      <Modal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        title="Invite to group"
        wide
      >
        <QRInvite token={group.join_token} />
      </Modal>

      <SettleUpModal
        open={settleOpen}
        onClose={() => setSettleOpen(false)}
        members={members}
        currentUserId={user?.id}
        suggested={settleSuggested}
        onSubmit={recordSettlement}
      />

      <ReminderModal
        open={remindOpen}
        onClose={() => setRemindOpen(false)}
        target={remindTarget}
        context={group.name}
        onSubmit={sendReminder}
      />

      <Modal
        open={!!editExpense}
        onClose={() => setEditExpense(null)}
        title="Edit expense"
        wide
      >
        {editExpense && (
          <ExpenseForm
            members={members}
            currentUserId={user?.id}
            initial={editExpense}
            onSubmit={saveEditExpense}
            submitting={submittingExpense}
          />
        )}
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete expense"
        footer={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={submittingDelete}
            >
              Cancel
            </button>
            <button
              className="btn btn-accent"
              onClick={confirmDelete}
              disabled={submittingDelete}
            >
              {submittingDelete ? 'Deleting…' : 'Delete'}
            </button>
          </>
        }
      >
        {deleteTarget && (
          <p className={styles.confirmText}>
            Delete <strong>{deleteTarget.description}</strong> for{' '}
            <span className="money">{fmtMoney(deleteTarget.amount)}</span>? Balances
            will recompute.
          </p>
        )}
      </Modal>

      <Modal
        open={!!removeMember}
        onClose={() => setRemoveMember(null)}
        title={removeMember?.id === user?.id ? 'Leave group' : 'Remove member'}
        footer={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => setRemoveMember(null)}
              disabled={submittingRemove}
            >
              Cancel
            </button>
            <button
              className="btn btn-accent"
              onClick={confirmRemove}
              disabled={submittingRemove}
            >
              {submittingRemove
                ? 'Working…'
                : removeMember?.id === user?.id
                ? 'Leave'
                : 'Remove'}
            </button>
          </>
        }
      >
        {removeMember && (
          <div className={styles.confirmText}>
            {removeMember.id === user?.id ? (
              <p>
                Leave <strong>{group.name}</strong>? You can rejoin later via the
                invite link.
              </p>
            ) : (
              <p>
                Remove <strong>{removeMember.name}</strong> from{' '}
                <strong>{group.name}</strong>?
              </p>
            )}
            {removeMember.error && (
              <p className={styles.confirmError}>{removeMember.error}</p>
            )}
            {!removeMember.error &&
              Math.abs(balances[removeMember.id] || 0) > 0.01 && (
                <p className={styles.confirmError}>
                  Outstanding balance of{' '}
                  <span className="money">
                    {fmtMoney(balances[removeMember.id], { sign: true })}
                  </span>
                  . Settle up first.
                </p>
              )}
          </div>
        )}
      </Modal>
    </div>
  );
}
