# Clinical Skills Pocket: Vercel version with login

This is the same guide, with a login added. Your session notes are saved to your account, so they show up on your phone and your computer. The whole site, guide included, sits behind the login.

## What's in here

- `index.html`, `assets/`: the guide itself.
- `login.html`: the login and sign-up page.
- `middleware.js`: sends anyone who isn't logged in to the login page.
- `api/`: small server functions for sign-up, log-in, log-out and notes.
- `package.json`: one dependency (`@vercel/functions`), which Vercel installs for you.

## Setup (about 5 minutes)

1. **Add a database.** In your Vercel project, open **Storage**, choose **Upstash for Redis** from the Marketplace (the free plan is plenty), create it and connect it to this project. That adds the `KV_REST_API_URL` and `KV_REST_API_TOKEN` environment variables automatically.
2. **Add a secret.** In **Settings → Environment Variables**, add `SESSION_SECRET` and set it to a long random string of at least 32 characters. One way to make one is to run `openssl rand -hex 32` in a terminal. Keep it private.
3. **Optional: a sign-up code.** If you want classmates to be able to make their own accounts, also add `SIGNUP_CODE` and give them that code. If you leave it out, only the first account can ever be created, and that account is yours.
4. **Deploy.** Upload this folder the way you usually do, through GitHub or `vercel --prod`. Redeploy after adding environment variables so they take effect.
5. **Make your account.** Open the site. You'll land on the login page with "Create account" selected. Pick a username and a password of at least 8 characters. With no sign-up code set, sign-up closes after this.

After that, log in on your phone with the same username and password. Notes sync when you stop typing, when you switch back to the tab, and every 30 seconds.

## Good to know

- If two devices edit the same note, the most recent edit wins.
- Notes you typed in the old offline folder stay in that browser. To move them over, open **My notes** there, click **Back up (.json)**, then click **Restore backup** on the new site and pick that file.
- You stay logged in for 60 days per device. **Log out** is at the top of the page.
- After 10 wrong passwords in 15 minutes, that username is locked out for the rest of the 15 minutes.
- If the login page shows a setup error, an environment variable is missing. The message says which one.
