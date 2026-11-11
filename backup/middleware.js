// Locks the whole site: anyone without a valid login cookie is sent to the login page.
// Runs on Vercel's edge before every request (Vercel Routing Middleware).
import { next } from '@vercel/functions';

export const config = {
  matcher: ['/((?!login\\.html|api/|favicon\\.ico).*)'],
};

const enc = new TextEncoder();
const b64u = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function valid(token, secret) {
  if (!token || !secret) return false;
  const pass = process.env.SITE_PASSWORD || '';
  const user = String(process.env.SITE_USERNAME || '').trim().toLowerCase();
  if (pass) secret = `${secret}|${pass}`;
  const [body, mac] = token.split('.');
  if (!body || !mac) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const want = b64u(await crypto.subtle.sign('HMAC', key, enc.encode(body)));
  if (want !== mac) return false;
  try {
    const json = atob(body.replace(/-/g, '+').replace(/_/g, '/'));
    const p = JSON.parse(json);
    if (user && pass && p.u !== user) return false;
    return p.exp > Date.now();
  } catch { return false; }
}

export default async function middleware(request) {
  const cookie = request.headers.get('cookie') || '';
  const m = cookie.match(/(?:^|;\s*)csp_session=([^;]+)/);
  const ok = await valid(m ? decodeURIComponent(m[1]) : null, process.env.SESSION_SECRET);
  if (ok) return next();
  const url = new URL('/login.html', request.url);
  return Response.redirect(url, 302);
}
