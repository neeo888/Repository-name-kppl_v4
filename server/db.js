const ACCOUNT_FIELDS = 'id,first_name,last_name,employee_id,branch,password_hash,created_at';
const MEMBERSHIP_FIELDS = 'id,account_id,app_id,role,approved,created_at';

function config() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return { url, key };
}

function appId() {
  return process.env.KPPL_APP_ID || 'kppl-v4';
}

async function request(path, options = {}) {
  const { url, key } = config();
  const authorization = key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {};
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      ...authorization,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(data?.message || data?.details || `Database request failed (${response.status})`);
    error.status = response.status === 404 ? 404 : 500;
    throw error;
  }
  return data;
}

const eq = (column, value) => `${column}=eq.${encodeURIComponent(value)}`;

async function getAccount(employeeId) {
  const rows = await request(`shared_accounts?select=${ACCOUNT_FIELDS}&${eq('employee_id', employeeId)}&limit=1`);
  return rows[0] || null;
}

async function getMembership(accountId) {
  const rows = await request(
    `app_memberships?select=${MEMBERSHIP_FIELDS}&${eq('account_id', accountId)}&${eq('app_id', appId())}&limit=1`,
  );
  return rows[0] || null;
}

async function getUser(employeeId) {
  const account = await getAccount(employeeId);
  if (!account) return null;
  const membership = await getMembership(account.id);
  if (!membership) return null;
  return { ...account, ...membership, id: account.id, membership_id: membership.id };
}

async function listUsers() {
  const memberships = await request(
    `app_memberships?select=${MEMBERSHIP_FIELDS}&${eq('app_id', appId())}&order=id.asc`,
  );
  if (!memberships.length) return [];
  const accounts = await request(`shared_accounts?select=${ACCOUNT_FIELDS}&order=id.asc`);
  const byId = new Map(accounts.map((account) => [String(account.id), account]));
  return memberships.map((membership) => {
    const account = byId.get(String(membership.account_id));
    return account ? { ...account, ...membership, id: account.id, membership_id: membership.id } : null;
  }).filter(Boolean);
}

async function insert(table, value) {
  const rows = await request(table, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(value),
  });
  return rows[0] || null;
}

async function createMembership(accountId, role = 'user', approved = false) {
  return insert('app_memberships', {
    account_id: accountId,
    app_id: appId(),
    role,
    approved,
  });
}

async function createUser(user) {
  const { role = 'user', approved = false, ...accountValues } = user;
  const account = await insert('shared_accounts', accountValues);
  const membership = await createMembership(account.id, role, approved);
  return { ...account, ...membership, id: account.id, membership_id: membership.id };
}

async function patch(table, filter, changes) {
  const rows = await request(`${table}?${filter}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(changes),
  });
  return rows[0] || null;
}

async function updateUser(employeeId, changes) {
  const user = await getUser(employeeId);
  if (!user) return null;
  const accountKeys = ['first_name', 'last_name', 'branch', 'password_hash'];
  const accountChanges = Object.fromEntries(Object.entries(changes).filter(([key]) => accountKeys.includes(key)));
  const membershipChanges = Object.fromEntries(
    Object.entries(changes).filter(([key]) => ['role', 'approved'].includes(key)),
  );
  if (Object.keys(accountChanges).length) {
    await patch('shared_accounts', eq('id', user.id), accountChanges);
  }
  if (Object.keys(membershipChanges).length) {
    await patch('app_memberships', eq('id', user.membership_id), membershipChanges);
  }
  return getUser(employeeId);
}

async function deleteUser(employeeId) {
  const user = await getUser(employeeId);
  if (!user) return null;
  // Delete only this application's membership. The shared account remains for other apps.
  return request(`app_memberships?${eq('id', user.membership_id)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=representation' },
  });
}

function publicUser(user) {
  return {
    first_name: String(user.first_name || ''),
    last_name: String(user.last_name || ''),
    employee_id: String(user.employee_id || ''),
    branch: String(user.branch || ''),
    role: String(user.role || 'user'),
  };
}

module.exports = {
  createMembership, createUser, deleteUser, getAccount, getMembership, getUser, listUsers, publicUser, updateUser,
};
