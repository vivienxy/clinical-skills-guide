import { clearSession, send } from './_lib.js';

export default function handler(req, res) {
  clearSession(res);
  return send(res, 200, { ok: true });
}
