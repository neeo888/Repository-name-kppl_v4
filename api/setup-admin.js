const bcrypt = require('bcryptjs');
const { createMembership, createUser, getAccount, getUser, updateUser } = require('../server/db');
const { json, method, safeError } = require('../server/http');

module.exports = async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  try {
    const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const setupSecret = process.env.KPPL_SETUP_SECRET || '';
    if (!setupSecret || supplied !== setupSecret) return json(res, 401, { error: 'Unauthorized' });

    const employeeId = String(process.env.KPPL_ADMIN_EMPLOYEE_ID || '').trim();
    const password = String(process.env.KPPL_ADMIN_PASSWORD || '');
    if (!/^[A-Za-z0-9_-]{2,50}$/.test(employeeId) || password.length < 12) {
      throw new Error('Invalid KPPL_ADMIN_EMPLOYEE_ID or KPPL_ADMIN_PASSWORD');
    }
    const values = {
      first_name: String(process.env.KPPL_ADMIN_FIRST_NAME || 'ผู้ดูแลระบบ').slice(0, 100),
      last_name: String(process.env.KPPL_ADMIN_LAST_NAME || '-').slice(0, 100),
      branch: String(process.env.KPPL_ADMIN_BRANCH || 'กปภ.สาขาพิษณุโลก').slice(0, 150),
      password_hash: await bcrypt.hash(password, 12),
      role: 'admin',
      approved: true,
    };
    const existing = await getUser(employeeId);
    if (existing) {
      await updateUser(employeeId, values);
    } else {
      const account = await getAccount(employeeId);
      if (account) {
        await createMembership(account.id, 'admin', true);
        await updateUser(employeeId, values);
      } else {
        await createUser({ ...values, employee_id: employeeId });
      }
    }
    json(res, 200, { success: true, employee_id: employeeId });
  } catch (error) {
    safeError(res, error, 'setup-admin');
  }
};
