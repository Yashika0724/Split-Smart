async function request(method, path, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: {},
  };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(path, opts);
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || `request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body || {}),

  signup: (payload) => request('POST', '/api/auth/signup', payload),
  login: (payload) => request('POST', '/api/auth/login', payload),
  logout: () => request('POST', '/api/auth/logout', {}),
  me: () => request('GET', '/api/auth/me'),

  listGroups: () => request('GET', '/api/groups'),
  createGroup: (payload) => request('POST', '/api/groups', payload),
  getGroup: (id) => request('GET', `/api/groups/${id}`),
  getBalances: (id) => request('GET', `/api/groups/${id}/balances`),
  joinGroup: (token) => request('POST', '/api/groups/join', { token }),
  removeMember: (id, userId) =>
    request('DELETE', `/api/groups/${id}/members/${userId}`),

  listExpenses: (id) => request('GET', `/api/groups/${id}/expenses`),
  createExpense: (id, payload) => request('POST', `/api/groups/${id}/expenses`, payload),
  updateExpense: (id, expenseId, payload) =>
    request('PUT', `/api/groups/${id}/expenses/${expenseId}`, payload),
  deleteExpense: (id, expenseId) =>
    request('DELETE', `/api/groups/${id}/expenses/${expenseId}`),

  listSettlements: (id) => request('GET', `/api/groups/${id}/settlements`),
  createSettlement: (id, payload) =>
    request('POST', `/api/groups/${id}/settlements`, payload),

  listGroupReminders: (id) => request('GET', `/api/groups/${id}/reminders`),
  sendReminder: (payload) => request('POST', '/api/reminders', payload),
  inbox: () => request('GET', '/api/reminders/inbox'),
};
