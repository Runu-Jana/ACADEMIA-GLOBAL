# Deploying to Railway

This app is a **Next.js server** plus a **PostgreSQL database** — two services in one
Railway project. The repo already carries everything Railway needs to build and run it
(`railway.json`, a production start command, and a pinned Node version); the only manual
work is creating the database and pasting in the environment variables below.

---

## 1. Create the project + database

1. Railway → **New Project** → **Deploy from GitHub repo** → pick this repo.
2. In that same project → **New** → **Database** → **Add PostgreSQL**.

You now have two services side by side: the app and the Postgres database.

## 2. Point the app at the database

On the **app service** → **Variables** → add:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |

That `${{Postgres.DATABASE_URL}}` is a Railway *reference* — it plugs the database's own
connection string into the app automatically. (If you named the DB service something other
than "Postgres", use that name.)

## 3. Set the rest of the environment variables

Add these on the **app service → Variables** *before* the first deploy (the `NEXT_PUBLIC_*`
ones are baked in at build time, so setting them later means you must redeploy).

### Required — the app won't run correctly without these

| Variable | What to set it to |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (from step 2) |
| `AUTH_SECRET` | A long random string — it signs login cookies. Generate one with `openssl rand -base64 32`, or use Railway's "generate" button. Keep it secret. |
| `NEXT_PUBLIC_SITE_URL` | Your public URL, e.g. `https://your-app.up.railway.app` (or your custom domain). Used in emails, the sitemap, and certificate QR codes. |
| `NEXT_PUBLIC_APP_NAME` | `Shiksha Sarthi` |

> Tip: Railway gives the app a public URL only after you enable it (**Settings → Networking →
> Generate Domain**). Do that first, then paste that URL into `NEXT_PUBLIC_SITE_URL` and redeploy.

### Optional — features stay switched off (cleanly) until you add these

| Variable | Enables |
| --- | --- |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Real payments — course enrolment **and** the membership. Without them, production refuses to take money (no demo fallback in prod). |
| `ANTHROPIC_API_KEY` | The AI tutor / counsellor. |
| `OPENAI_API_KEY` | Semantic search for the tutor (optional upgrade); rerun `npm run ai:index` after adding. |
| `RESEND_API_KEY`, `ADMIN_EMAIL`, `EMAIL_FROM` | Transactional + admin-alert emails. |
| `CRON_SECRET` | The daily commission job at `/api/cron` (see step 6). |
| `JITSI_BASE_URL` | Your own Jitsi server for live classes (defaults to the public `meet.jit.si`). |

You do **not** need `TEST_DATABASE_URL` (tests only).

## 4. Deploy

Railway builds automatically. On boot, the app runs `prisma db push`, which **creates all the
tables on the fresh database the first time** — no manual migration step. (This is wired into
the `start:prod` command in `package.json`; `railway.json` tells Railway to use it.)

When the deploy goes green, open the generated domain — the site should load.

## 5. Make yourself an admin

The production build has **no seeded demo accounts** (by design — never seed the demo
`admin@…`/`Admin@123` logins into a live site). To get an admin:

1. Open your live site and **sign up** normally (this creates a regular student account).
2. In Railway → the **Postgres** service → **Data** (or **Query**) tab, run:
   ```sql
   UPDATE "User" SET role = 'ADMIN' WHERE email = 'you@example.com';
   ```
3. Log out and back in — you now have the `/admin` panel.

## 6. Post-deploy wiring (only if you set the matching keys)

- **Razorpay webhook** — in the Razorpay dashboard → Settings → Webhooks, point it at
  `https://<your-domain>/api/payments/webhook` for the events `payment.captured`,
  `order.paid`, `refund.processed`, and use the same secret you put in `RAZORPAY_WEBHOOK_SECRET`.
- **Daily cron** — point any scheduler (Railway Cron, cron-job.org, …) at
  `GET https://<your-domain>/api/cron` with header `Authorization: Bearer <CRON_SECRET>`.

---

## Important: uploaded files need a persistent disk

Course materials (PDFs, recordings) are written to `storage/uploads` on the app's local disk.
Railway's disk is **ephemeral** — it's wiped on every redeploy — so without a volume, uploaded
files disappear. Fix it with a **Railway Volume**:

- App service → **Settings → Volumes → Add Volume**, mount path `/app/storage`.

(Longer term, moving uploads to object storage like Cloudflare R2 or S3 is the more scalable
option, but a volume is enough to start.)

## Notes

- **Cost:** the app service and the Postgres service both run 24/7, so this project alone
  tends to use around the Hobby plan's included \$5 of usage, sometimes a little more.
- **`NEXT_PUBLIC_*` variables are baked in at build time.** If you change the domain or app
  name later, redeploy so the new value takes effect.
- **Build:** uses Turbopack (`next build --turbopack`), which builds cleanly today. If a future
  Railway build ever errors on Turbopack, the one-line fallback is to change `build` in
  `package.json` to `prisma generate && next build` (the classic webpack builder).
