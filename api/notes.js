import { configProblem, redis, session, send, body } from './_lib.js';

// Notes live in one Redis hash per user: field = note key, value = {"text","at"} JSON.
// An emptied note is stored with text "" so other devices know to drop it.
export default async function handler(req, res) {
  const problem = configProblem();
  if (problem) return send(res, 500, { error: problem });
  const s = session(req);
  if (!s) return send(res, 401, { error: 'Log in first.' });
  const key = `notes:${s.u}`;

  if (req.method === 'GET') {
    const flat = (await redis('HGETALL', key)) || [];
    const notes = {};
    for (let i = 0; i < flat.length; i += 2) {
      try { notes[flat[i]] = JSON.parse(flat[i + 1]); } catch {}
    }
    return send(res, 200, { notes });
  }

  if (req.method === 'PUT') {
    const { k, text, at } = await body(req);
    if (typeof k !== 'string' || !/^[a-z0-9:_-]{1,80}$/i.test(k)) return send(res, 400, { error: 'Bad note key.' });
    if (typeof text !== 'string' || text.length > 100000) return send(res, 400, { error: 'Note is too long (100,000 characters max).' });
    const when = Number(at) || Date.now();
    // keep whichever edit is newer, so an old device can't overwrite a newer note
    const prev = await redis('HGET', key, k);
    if (prev) { try { if (JSON.parse(prev).at > when) return send(res, 200, { kept: 'newer' }); } catch {} }
    await redis('HSET', key, k, JSON.stringify({ text, at: when }));
    return send(res, 200, { ok: true });
  }

  return send(res, 405, { error: 'Use GET or PUT.' });
}
