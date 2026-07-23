const bcrypt = require('bcryptjs');
const { getUser, publicUser } = require('../server/db');
const { body, json, method, safeError, setSession } = require('../server/http');

// Keeps unknown-user and wrong-password checks on approximately the same code path.
const DUMMY_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Ttx6HfR8AIVwU6NwG4x5fD1rN7yK';

module.exports = async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  try {
    const data = body(req);
    const employeeId = String(data.employee_id || '').trim();
    const password = String(data.password || '');
    if (!employeeId || !password) return json(res, 400, { error: 'กรุณากรอกรหัสพนักงานและรหัสผ่าน' });

    const user = await getUser(employeeId);
    const valid = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH);
    if (!valid) return json(res, 401, { error: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง' });
    if (Number(user.approved) !== 1) {
      return json(res, 403, { error: 'บัญชีผู้ใช้ยังไม่ได้รับการอนุมัติ หรือถูกระงับการใช้งาน' });
    }

    setSession(res, user.employee_id);
    json(res, 200, { success: true, user: publicUser(user) });
  } catch (error) {
    safeError(res, error, 'login');
  }
};
