// Shared helpers for the API routes. Files starting with "_" are not exposed as routes by Vercel.
import crypto from 'node:crypto';

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const SECRET = process.env.SESSION_SECRET || '';
export const COOKIE = 'csp_session';
const SESSION_DAYS = 60;

export function configProblem() {
  if (!REDIS_URL || !REDIS_TOKEN) return 'The database is not connected. In Vercel, add Upstash Redis under Storage and connect it to this project, then redeploy.';
  if (SECRET.length < 8) return 'SESSION_SECRET is missing or shorter than 8 characters. Add it under Settings → Environment Variables, then redeploy.';
  return null;
}

// Upstash Redis REST API: POST the command as a JSON array.
export async function redis(...cmd) {
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error('redis: ' + (j.error || r.status));
  return j.result;
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
export function checkPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64);
  const real = Buffer.from(hash, 'hex');
  return real.length === test.length && crypto.timingSafeEqual(real, test);
}

const b64u = (buf) => Buffer.from(buf).toString('base64url');
export function sign(payload) {
  const body = b64u(JSON.stringify(payload));
  const mac = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${mac}`;
}
export function verify(token) {
  if (!token || !SECRET) return null;
  const [body, mac] = String(token).split('.');
  if (!body || !mac) return null;
  const want = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (want.length !== mac.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(mac))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}

export function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function session(req) {
  return verify(readCookie(req, COOKIE));
}

export function setSession(res, username) {
  const token = sign({ u: username, exp: Date.now() + SESSION_DAYS * 864e5 });
  res.setHeader('Set-Cookie', `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`);
}
export function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

export function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

export async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  let s = '';
  for await (const chunk of req) s += chunk;
  try { return JSON.parse(s || '{}'); } catch { return {}; }
}

export const cleanName = (u) => String(u || '').trim().toLowerCase();
export const validName = (u) => /^[a-z0-9._-]{3,32}$/.test(u);

// Slow down password guessing: at most 10 failed tries per username per 15 minutes.
export async function tooManyAttempts(username) {
  const n = Number(await redis('GET', `fail:${username}`)) || 0;
  return n >= 10;
}
export async function recordFailure(username) {
  const n = await redis('INCR', `fail:${username}`);
  if (n === 1) await redis('EXPIRE', `fail:${username}`, 900);
}
