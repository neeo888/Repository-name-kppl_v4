const { getUser, publicUser } = require('./db');
const { readSession } = require('./http');

async function currentUser(req) {
  const session = readSession(req);
  if (!session) return null;
  const user = await getUser(session.sub);
  if (!user || Number(user.approved) !== 1) return null;
  return user;
}

async function requireUser(req) {
  const user = await currentUser(req);
  if (!user) {
    const error = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }
  return user;
}

async function requireAdmin(req) {
  const user = await requireUser(req);
  if (user.role !== 'admin') {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }
  return user;
}

module.exports = { currentUser, publicUser, requireAdmin, requireUser };
