const crypto = require('node:crypto');

const COOKIE_NAME = 'kppl_session';
const SESSION_SECONDS = 8 * 60 * 60;

function json(res, status, data) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.status(status).json(data);
}

function method(req, res, allowed) {
  if (allowed.includes(req.method)) return true;
  res.setHeader('Allow', allowed.join(', '));
  json(res, 405, { error: 'Method not allowed' });
  return false;
}

function body(req) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    const error = new Error('Invalid JSON input');
    error.status = 400;
    throw error;
  }
  return req.body;
}

function cookieMap(header = '') {
  return Object.fromEntries(header.split(';').map((part) => {
    const index = part.indexOf('=');
    if (index < 0) return ['', ''];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

function secret() {
  const value = process.env.KPPL_SESSION_SECRET || '';
  if (value.length < 32) throw new Error('KPPL_SESSION_SECRET must contain at least 32 characters');
  return value;
}

function signature(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

function createSession(employeeId) {
  const encoded = Buffer.from(JSON.stringify({
    sub: employeeId,
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  })).toString('base64url');
  return `${encoded}.${signature(encoded)}`;
}

function readSession(req) {
  const token = cookieMap(req.headers.cookie)[COOKIE_NAME];
  if (!token) return null;
  const [encoded, supplied] = token.split('.');
  if (!encoded || !supplied) return null;
  const expected = signature(encoded);
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const value = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!value.sub || !value.exp || value.exp <= Math.floor(Date.now() / 1000)) return null;
    return value;
  } catch {
    return null;
  }
}

function setSession(res, employeeId) {
  res.setHeader('Set-Cookie', [
    `${COOKIE_NAME}=${encodeURIComponent(createSession(employeeId))}`,
    'Path=/',
    `Max-Age=${SESSION_SECONDS}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ].join('; '));
}

function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`);
}

function safeError(res, error, context) {
  console.error(`[KPPL] ${context}:`, error);
  json(res, error.status || 500, {
    error: error.status && error.status < 500 ? error.message : 'Internal server error',
  });
}

module.exports = {
  body, clearSession, json, method, readSession, safeError, setSession,
};
