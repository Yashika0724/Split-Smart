export function fmtMoney(value, { sign = false } = {}) {
  const n = Number(value) || 0;
  const abs = Math.abs(n).toFixed(2);
  if (sign) {
    if (n > 0.009) return `+₹${abs}`;
    if (n < -0.009) return `-₹${abs}`;
    return `₹${abs}`;
  }
  return `₹${abs}`;
}

export function moneyClass(value) {
  const n = Number(value) || 0;
  if (n > 0.009) return 'money money-pos';
  if (n < -0.009) return 'money money-neg';
  return 'money money-zero';
}

export function fmtDate(ts) {
  if (!ts) return '';
  const d = new Date(Number(ts));
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function fmtRelative(ts) {
  if (!ts) return '';
  const diff = Date.now() - Number(ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

export function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0].toUpperCase()).join('');
}
