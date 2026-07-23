const bcrypt = require('bcryptjs');
const { createUser, getUser } = require('../server/db');
const { body, json, method, safeError } = require('../server/http');

module.exports = async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  try {
    const data = body(req);
    const firstName = String(data.first_name || '').trim();
    const lastName = String(data.last_name || '').trim();
    const employeeId = String(data.employee_id || '').trim();
    const branch = String(data.branch || '').trim();
    const password = String(data.password || '');

    if (!firstName || !lastName || !employeeId || !branch || !password) {
      return json(res, 400, { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }
    if (!/^[A-Za-z0-9_-]{2,50}$/.test(employeeId)) {
      return json(res, 400, { error: 'รูปแบบรหัสพนักงานไม่ถูกต้อง' });
    }
    if (password.length < 12) {
      return json(res, 400, { error: 'รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร' });
    }
    if (await getUser(employeeId)) {
      return json(res, 409, { error: 'รหัสพนักงานนี้ถูกลงทะเบียนไว้แล้ว' });
    }

    await createUser({
      first_name: firstName.slice(0, 100),
      last_name: lastName.slice(0, 100),
      employee_id: employeeId,
      branch: branch.slice(0, 150),
      password_hash: await bcrypt.hash(password, 12),
      role: 'user',
      approved: false,
    });
    json(res, 201, { success: true, message: 'ลงทะเบียนสำเร็จ กรุณารอผู้ดูแลอนุมัติ' });
  } catch (error) {
    safeError(res, error, 'register');
  }
};
