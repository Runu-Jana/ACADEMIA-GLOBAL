# Scheduled jobs (`/api/cron`)

The app has one maintenance endpoint that runs the daily background work:

- **Commission promotion** — moves partner commissions past their cool-off window to CLAIMABLE.
- **Re-engagement nudges** — in-app + email reminders to lapsed learners.
- **Directory catalogue sync** — re-scrapes each opted-in university's official programmes page and reconciles our directory listings (see `docs/OFFLINE-VIDEO.md` is unrelated; this is the sync from `/admin/directory/sync`).

It's a plain HTTP call, protected by a shared secret:

```
GET  https://<your-domain>/api/cron
POST https://<your-domain>/api/cron      # POST works too
Authorization: Bearer <CRON_SECRET>
```

Without `CRON_SECRET` set in the app's environment it refuses to run (503), so it can't be triggered anonymously. The catalogue sync additionally needs `ANTHROPIC_API_KEY` (extraction) — without it, that task no-ops.

## Recommended: GitHub Actions (committed)

`.github/workflows/daily-cron.yml` pings the endpoint every day at 01:30 UTC (07:00 IST).

**Setup (one-time):**
1. Repo → **Settings → Secrets and variables → Actions**
   - **Secret** `CRON_SECRET` = the same value set in the app's env
   - **Variable** `SITE_URL` = `https://academia-global-production.up.railway.app` (optional; the workflow defaults to this)
2. Make sure the app's environment (Railway → Variables) also has `CRON_SECRET` set to the same value.

> ⚠️ **GitHub only runs scheduled workflows from the default branch.** This workflow won't fire on a schedule while it lives only on `feat/ai-tutor` — it starts running once merged to `main`. You can still trigger it manually any time from the **Actions** tab (**Run workflow**).

## Alternative A: cron-job.org (no code, works immediately)

1. Create a free job at <https://cron-job.org>.
2. URL: `https://academia-global-production.up.railway.app/api/cron`
3. Method: POST (or GET). Add a header `Authorization: Bearer <CRON_SECRET>`.
4. Schedule: once a day.

This runs regardless of branch, so it's the quickest way to go live before the merge.

## Alternative B: Railway-native cron

Railway can run a **cron service** (a second service whose only job is to hit the endpoint on a schedule):
1. Add a new service in the same project (an empty/Alpine image or a shell service).
2. Set its **Cron Schedule** (e.g. `30 1 * * *`) in the service settings.
3. Set its start command to:
   ```
   curl -sS -X POST -H "Authorization: Bearer $CRON_SECRET" https://academia-global-production.up.railway.app/api/cron
   ```
4. Give that service the `CRON_SECRET` variable.

(Railway cron runs the service's command then exits, which is why it's a separate service, not the web app.)

## Test it manually

```bash
curl -sS -X POST -H "Authorization: Bearer <CRON_SECRET>" \
  https://academia-global-production.up.railway.app/api/cron
```

A healthy response looks like:
```json
{ "ok": true, "commissions": { "promoted": 0 }, "nudges": { ... }, "catalogSync": { ... } }
```
`"catalogSync": { "skipped": "ai_unconfigured" }` means the AI key isn't set yet — everything else still runs.
