const { currentUser, publicUser } = require('../server/auth');
const { clearSession, json, method, safeError } = require('../server/http');

module.exports = async function handler(req, res) {
  if (!method(req, res, ['GET', 'POST'])) return;
  try {
    if (req.method === 'POST') {
      clearSession(res);
      return json(res, 200, { success: true });
    }
    const user = await currentUser(req);
    if (!user) {
      clearSession(res);
      return json(res, 401, { authenticated: false });
    }
    json(res, 200, { authenticated: true, user: publicUser(user) });
  } catch (error) {
    safeError(res, error, 'session');
  }
};
