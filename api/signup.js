import { configProblem, redis, hashPassword, setSession, send, body, cleanName, validName, fixedAccount } from './_lib.js';

// Accounts: if SIGNUP_CODE is set, anyone who knows it can make an account.
// If it is not set, only the very first account can be created (yours).
export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Use POST.' });
  const problem = configProblem();
  if (problem) return send(res, 500, { error: problem });

  if (fixedAccount()) return send(res, 403, { error: 'Sign-up is turned off. Log in with the site’s username and password.' });
  const { username, password, code } = await body(req);
  const u = cleanName(username);
  if (!validName(u)) return send(res, 400, { error: 'Username must be 3–32 characters: letters, numbers, dots, dashes or underscores.' });
  if (typeof password !== 'string' || password.length < 8) return send(res, 400, { error: 'Password must be at least 8 characters.' });

  const signupCode = process.env.SIGNUP_CODE;
  if (signupCode) {
    if (code !== signupCode) return send(res, 403, { error: 'That sign-up code is not right.' });
  } else {
    const count = Number(await redis('SCARD', 'users')) || 0;
    if (count > 0) return send(res, 403, { error: 'Sign-up is closed: this site already has its account. Log in instead.' });
  }

  const created = await redis('SETNX', `user:${u}`, hashPassword(password));
  if (!created) return send(res, 409, { error: 'That username is taken.' });
  await redis('SADD', 'users', u);
  setSession(res, u);
  return send(res, 200, { username: u });
}
