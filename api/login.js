import { configProblem, redis, checkPassword, setSession, send, body, cleanName, tooManyAttempts, recordFailure } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST.' });
  const problem = configProblem();
  if (problem) return send(res, 500, { error: problem });

  const { username, password } = await body(req);
  const u = cleanName(username);
  if (!u || typeof password !== 'string') return send(res, 400, { error: 'Enter your username and password.' });
  if (await tooManyAttempts(u)) return send(res, 429, { error: 'Too many wrong tries. Wait 15 minutes and try again.' });

  const stored = await redis('GET', `user:${u}`);
  if (!stored || !checkPassword(password, stored)) {
    await recordFailure(u);
    return send(res, 401, { error: 'Username or password is wrong.' });
  }
  await redis('DEL', `fail:${u}`);
  setSession(res, u);
  return send(res, 200, { username: u });
}
