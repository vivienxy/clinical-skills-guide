import { configProblem, redis, session, send, fixedAccount } from './_lib.js';

// Who is signed in, plus whether sign-up is still open (used by the login page).
export default async function handler(req, res) {
  const problem = configProblem();
  if (problem) return send(res, 500, { error: problem });
  const s = session(req);
  const signupOpen = !fixedAccount() && (!!process.env.SIGNUP_CODE || (Number(await redis('SCARD', 'users')) || 0) === 0);
  return send(res, 200, { username: s ? s.u : null, signupOpen, needsCode: !!process.env.SIGNUP_CODE });
}
