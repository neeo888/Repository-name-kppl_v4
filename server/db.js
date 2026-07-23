const BASE_FIELDS = 'id,first_name,last_name,employee_id,branch,password_hash,role,approved,created_at';

function config() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return { url, key };
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

const employeeFilter = (employeeId) => `employee_id=eq.${encodeURIComponent(employeeId)}`;

async function getUser(employeeId) {
  const rows = await request(`users?select=${BASE_FIELDS}&${employeeFilter(employeeId)}&limit=1`);
  return rows[0] || null;
}

async function listUsers() {
  return request(`users?select=${BASE_FIELDS}&order=id.asc`);
}

async function createUser(user) {
  const rows = await request('users', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(user),
  });
  return rows[0] || null;
}

async function updateUser(employeeId, changes) {
  const rows = await request(`users?${employeeFilter(employeeId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(changes),
  });
  return rows[0] || null;
}

async function deleteUser(employeeId) {
  return request(`users?${employeeFilter(employeeId)}`, {
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

module.exports = { createUser, deleteUser, getUser, listUsers, publicUser, updateUser };
