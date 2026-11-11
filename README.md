# Radius: validation experiment app

A Next.js app (on Vercel) backed by Supabase. Participants open the Figma prototype, click "I'm interested", leave their name and email, and answer a randomized question. A protected `/admin` page shows the live results.

It's built as the skeleton for the real app. It uses the same Supabase project, and the experiment data lives in its own `exp_*` / `experiment_responses` tables, so it stays separate from future real users.

## Participant flow

1. `/`: landing page. "Try the interactive demo" opens the embedded Figma prototype and a panel of sample nearby activities. Location comes from the browser and is resolved to a neighborhood **in the browser**, or from a neighborhood picker. Only the neighborhood name is stored.
2. "I'm interested" → name + email → saved to `exp_signups`.
3. **Experiment 2 (WTP)**: "Would you pay $X/month?" X is $5 or $10, assigned 50/50 in Postgres when the session is created. The session id is a cookie, so a refresh never re-rolls the price.
4. **Experiment 3 (commute)**: "Would you commute up to N minutes…?" N is 25 or 60, assigned the same way. It's **off by default**. Turn it on with the switch on `/admin`; no redeploy is needed.

Funnel events (`exp_events`): `visit` → `demo_opened` → `interest_clicked` → `form_submitted` → `wtp_answered` / `commute_answered`. The funnel counts distinct sessions at each step.

**Test traffic:** open the site with `?test=1` and that browser's session is flagged as a test. It's excluded from the admin numbers unless you click "Include test traffic".

## Deploy

1. **Supabase** → SQL Editor → paste all of `supabase/schema.sql` → Run. It's safe to re-run.
2. **Vercel** → import the repo. Set these environment variables:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Project Settings → Data API → Project URL |
| `SUPABASE_SECRET_KEY` | Project Settings → API Keys → **secret** key (`sb_secret_…`), or the legacy `service_role` key (env name `SUPABASE_SERVICE_ROLE_KEY` also works) |
| `ADMIN_ACCESS_CODE` | any code you choose; it's checked on the server only |
| `NEXT_PUBLIC_DEMO_EMBED_URL` | *(optional)* override the embed, e.g. a published `*.figma.site` URL |
| `NEXT_PUBLIC_DEMO_OPEN_URL` | *(optional)* where "Open prototype full screen" points |

3. Deploy. Visit `/admin` and enter the code.

## Security

- RLS is enabled on every experiment table, with **no policies**. The browser never talks to Supabase directly. All reads and writes go through server routes using the secret key, which is never sent to the client.
- The client can't choose or spoof a variant. `/api/answer` reads the price/minutes from the session row.
- Admin access is an httpOnly cookie derived from `ADMIN_ACCESS_CODE`. Changing the code logs everyone out.
- Emails are masked on the admin page by default (safe for a projector). "Show emails" or "Export CSV" gets the full list.

## Local dev

```bash
cp .env.example .env.local   # fill in Supabase URL + secret key + an admin code
npm install
npm run dev
```
TEST TEST
