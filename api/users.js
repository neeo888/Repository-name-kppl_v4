const bcrypt = require('bcryptjs');
const { requireAdmin } = require('../server/auth');
const { createUser, deleteUser, getUser, listUsers, updateUser } = require('../server/db');
const { body, json, method, safeError } = require('../server/http');

const validId = (value) => /^[A-Za-z0-9_-]{2,50}$/.test(value);

module.exports = async function handler(req, res) {
  if (!method(req, res, ['GET', 'POST'])) return;
  try {
    const admin = await requireAdmin(req);
    if (req.method === 'GET') {
      const users = (await listUsers()).map((user) => ({
        id: user.id,
        user: user.employee_id,
        pass: '******',
        role: user.role,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        first_name: user.first_name,
        last_name: user.last_name,
        branch: user.branch,
        approved: Number(user.approved) === 1,
        createdAt: user.created_at,
      }));
      return json(res, 200, { success: true, users });
    }

    const data = body(req);
    const employeeId = String(data.employee_id || '').trim();
    const action = String(req.query.action || '');
    if (!validId(employeeId)) return json(res, 400, { error: 'รหัสพนักงานไม่ถูกต้อง' });

    if (action === 'create') {
      const password = String(data.password || '');
      const role = String(data.role || 'user');
      if (password.length < 12) return json(res, 400, { error: 'รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร' });
      if (!['admin', 'user', 'contractor'].includes(role)) return json(res, 400, { error: 'สิทธิ์ไม่ถูกต้อง' });
      if (await getUser(employeeId)) return json(res, 409, { error: 'รหัสพนักงานนี้มีอยู่แล้ว' });
      await createUser({
        first_name: String(data.first_name || employeeId).trim().slice(0, 100),
        last_name: String(data.last_name || '-').trim().slice(0, 100),
        employee_id: employeeId,
        branch: String(data.branch || '').trim().slice(0, 150),
        password_hash: await bcrypt.hash(password, 12),
        role,
        approved: true,
      });
      return json(res, 201, { success: true });
    }

    const target = await getUser(employeeId);
    if (!target) return json(res, 404, { error: 'ไม่พบบัญชีผู้ใช้' });

    if (action === 'toggle_approve') {
      if (target.employee_id === admin.employee_id && !Number(data.approved)) {
        return json(res, 400, { error: 'ไม่สามารถระงับบัญชีที่กำลังใช้งานอยู่' });
      }
      await updateUser(employeeId, { approved: Boolean(Number(data.approved)) });
      return json(res, 200, { success: true });
    }
    if (action === 'change_role') {
      const role = String(data.role || '');
      if (!['admin', 'user', 'contractor'].includes(role)) return json(res, 400, { error: 'สิทธิ์ไม่ถูกต้อง' });
      if (target.employee_id === admin.employee_id && role !== 'admin') {
        return json(res, 400, { error: 'ไม่สามารถลดสิทธิ์บัญชีที่กำลังใช้งานอยู่' });
      }
      await updateUser(employeeId, { role });
      return json(res, 200, { success: true });
    }
    if (action === 'reset_password') {
      const password = String(data.password || '');
      if (password.length < 12) return json(res, 400, { error: 'รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร' });
      await updateUser(employeeId, { password_hash: await bcrypt.hash(password, 12) });
      return json(res, 200, { success: true });
    }
    if (action === 'delete') {
      if (target.employee_id === admin.employee_id) {
        return json(res, 400, { error: 'ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่' });
      }
      await deleteUser(employeeId);
      return json(res, 200, { success: true });
    }
    json(res, 404, { error: 'ไม่พบคำสั่ง' });
  } catch (error) {
    safeError(res, error, 'users');
  }
};
