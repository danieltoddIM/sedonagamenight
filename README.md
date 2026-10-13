# Sedona Game Night

**Good games. Great company.**

A community-first game-night site: meet your neighbors, find a friendly table and leave a little more connected. The original Claude project remains the functional foundation. The design uses a real Thunder Mountain photograph, warm cream/rust/forest-green colors, readable type and the seven games selected for the community.

Start with [START-HERE.md](START-HERE.md). Open [preview.html](preview.html) locally for a self-contained design preview. The preview is not a live booking service.

## What is included

| Area | Behavior |
| --- | --- |
| Homepage | Actual Thunder Mountain photograph, community purpose, next published event, selected games and newcomer FAQs. No invented registrations, testimonials or sample live date. |
| RSVP | One reservation per mobile number per event; adults, children, optional child ages, pizza and dietary preferences, optional contributions and notes. |
| Game preferences | Rummikub, Scrabble, Yahtzee, Skip-Bo, Sorry!, The Game of Life and Clue; optional interest in learning or helping teach. |
| Private reservation page | A high-entropy private link to edit, reconfirm, cancel or claim a waitlist offer. Entering somebody's phone number is not sufficient to read or overwrite their reservation. |
| Waitlist | FIFO group allocation, expiring offers, group-size accounting, configurable soft/hard capacity and organizer override. Allocation is serialized by a database event-row lock. |
| Organizers | Password login, create/open/close events, capacity controls, attendance reconfirmations, arrival check-in, game-demand counts, contribution notes, pizza estimate and CSV export. |
| Games | Per-browser voting, category filtering, guest suggestions and organizer review before suggestions are public. No mahjong or bridge is in the featured collection. |
| QR | Printable and downloadable PNG/SVG codes with source labels such as mailer, church or flyer. |
| SMS | Optional Klaviyo subscription and event integration using a durable notification queue. Off by default. The application never equates API acceptance with phone delivery. |
| Safeguards | Server-only database access, signed expiring organizer sessions, same-origin mutation checks, rate limits, protected exports, private-link indexing/referrer protections and no public guest directory. |

## Technology and requirements

Next.js App Router, React, TypeScript, Supabase/Postgres and optional Klaviyo SMS. Dependency versions and lockfile come from the supplied project; they were not opportunistically upgraded. Use Node 22 and npm. `package-lock.json` fixes the dependency tree for reproducible installation.

The server-side application needs a runtime such as Vercel. GitHub hosts the source code; GitHub Pages alone cannot execute these API routes or safely hold a privileged database key.

## Run locally

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

With no database settings, the homepage and game collection render in prelaunch mode. The site does not pretend that RSVPs, suggestions or votes were saved. `/launch-preview` displays an explicitly non-bookable example form.

For live local behavior, fill in `.env.local` and run the database installation below. Keep `NEXT_PUBLIC_SITE_URL=http://localhost:3000` while testing locally and `SMS_ENABLED=false` until messaging has been configured.

```bash
npm run check:syntax  # Parsing/transpilation, not type checking
npm test             # 30 focused pure-logic tests
npm run typecheck    # Full TypeScript check with installed dependencies
npm run build        # Next.js production build
npm start            # Serve the production build
```

## Database installation / upgrade

Create a Supabase project, open SQL Editor and run [supabase/INSTALL.sql](supabase/INSTALL.sql). It contains the baseline schema and migration 002 in order. Do not run just `schema.sql`: the application also needs the migration's functions and columns.

For an existing v1 project: take a backup first, use the same Supabase project, run `INSTALL.sql`, then deploy this code. Existing event/RSVP records and private links are retained. Existing game choices are not deleted: hide any unneeded old choices in `/admin`. Running the script twice does not duplicate the seven seed games.

The tables have Row Level Security enabled. No public table-access policies are created. RPC execution is restricted to the server-side `service_role`, not public browser roles. Never expose the privileged key in browser code, a GitHub issue, a screenshot or a committed environment file.

After installation, run [supabase/VERIFY.sql](supabase/VERIFY.sql) in a **staging project**. It creates temporary test reservations inside a transaction and rolls back. It checks key allocation and private-link invariants; it is not a load/concurrency test.

## Environment settings

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Your project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only privileged key; retains the original project's variable name. A legacy `service_role` key is supported. Never use a `NEXT_PUBLIC_` prefix. |
| `ADMIN_PASSWORD` | Unique organizer password, at least 16 characters. |
| `ADMIN_SESSION_SECRET` | Separate random signing secret. Changing it invalidates all organizer sessions. Without it, signing falls back to the password. |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin, including `https://` in production. Used for private RSVP, calendar and QR links. Update it before printing QR codes. |
| `CRON_SECRET` | Random secret authorizing `/api/cron`. |
| `SMS_ENABLED` | Exactly `true` to enable configured SMS; defaults to off. |
| `KLAVIYO_PRIVATE_KEY` | Optional server-side Klaviyo API key. See `KLAVIYO.md`. |
| `KLAVIYO_LIST_ID` | Optional dedicated consent list; recommended for separating this program. |
| `KLAVIYO_REVISION` | Defaults to `2026-07-15`; review provider compatibility before changes. |

Generate distinct session and cron secrets, for example:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use Vercel environment variables for deployment. Do not add real secrets to the GitHub workflow. Use separate Supabase projects and messaging settings for Preview and Production so test deployments cannot alter your real guest list.

## GitHub and Vercel

Create a private repository and add the extracted project contents at its root. Do not upload the ZIP as the website. The hidden `.github` folder contains CI; `.env.example` contains blanks, not credentials. GitHub Desktop is the simplest way to include dotfiles.

Alternatively, after creating an empty remote repository:

```bash
git init
git add .
git commit -m "Build community-focused Sedona Game Night website"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Replace the one placeholder with your real repository URL. Confirm the GitHub checks pass. Import the repository into Vercel as a Next.js project, select Node 22 and set the environment variables. Deploy without SMS first. Add the domain only after testing, then set the canonical origin and redeploy.

The bundled GitHub workflow installs dependencies, checks syntax, runs tests, checks types and builds without production secrets. It does not deploy or run SQL automatically. No external deployment has already been made for you.

## Organizing the first real night

Edit `lib/config.ts` to confirm the venue name, street address, room, hosts and capacity policy. The street address is deliberately unconfirmed. Set `addressConfirmed: true` only after entering a verified address. Confirm the promises of free admission and pizza, and whether families are invited.

Use `/admin` to add a real date, Arizona start/end time, capacity and note. Suggested dates are just defaults; the public site does not promise a recurring schedule. An `open` event is public; `invite_only` is unlisted but anyone with the event link can use it. It is not identity-verified access. `closed` stops new registrations and offers; closing does not automatically cancel existing RSVPs or send a cancellation campaign.

The original capacity rule is retained: when at least one seat is free, a whole group can be admitted even if it goes over the target. For a hard room limit, change `waitlist.allowFamilyOverflow` to `false`. Strict mode keeps FIFO order, so a large group at the front may hold up smaller groups. A direct organizer override can still exceed the cap and should be used deliberately.

Guests save their private link on the confirmation screen. There is no self-service phone-only recovery: organizers help after verifying the request. This avoids leaking a reservation to somebody who merely knows a phone number. The phone number cannot be changed through the guest edit form. Individual organizer accounts, audit logs and verified contact recovery would be worthwhile later additions; the initial version uses a shared organizer password.

## Waitlist and cron

Confirmed and offered groups both hold seats. Cancellation or offer expiration frees seats. The next waiting group receives an offer on its private page with a deadline of the earlier of 24 hours or three hours before the night starts. In strict mode there must be enough seats for the entire next group. The event row is locked in every allocation function to serialize competing changes. Manual administrative overrides remain explicit exceptions.

The checked-in flag records arrival; the separate reconfirmed flag means the guest has said they still plan to attend. Neither a vote nor a reconfirmation creates an extra booking.

`vercel.json` includes one daily cron at `0 16 * * *` UTC (9 AM Arizona), retained for a low-frequency starting configuration. It processes offers, queues same-day reminders and dispatches pending notifications. Public event reads and reservation changes also process the relevant waitlist. This does **not** guarantee prompt handling when nobody visits. For launch with time-sensitive automated offers, use a supported more-frequent schedule (for example, every 10 minutes on an appropriate plan) and confirm Vercel's current plan limits.

The dispatcher takes short leases, runs up to five jobs in parallel and works through at most 100 jobs or a roughly 40-second pass. Provider calls have timeouts and failed jobs back off. API acceptance is not delivery. Subscription jobs are handled before dependent events, but subscription processing and double opt-in remain asynchronous at the provider. Old or no-longer-applicable jobs are skipped. Inspect the `notification_jobs` table and platform logs for failures. No monitoring service is preconfigured.

## Live smoke-test checklist

Use a staging Supabase project and fake test events; send SMS only to a number you own and have explicitly opted in.

1. Run CI, production build and `supabase/VERIFY.sql`. Verify unauthenticated `/admin` access and exports are denied; test login/logout. Browser mutation requests should include their normal Origin header.
2. Create a future event with capacity 2 and strict capacity mode. In separate private browser windows submit two one-person RSVPs, then a third. Confirm the third is waitlisted and the database holds only two seats. Also submit simultaneous registrations for the final seat and verify the result.
3. Submit an existing attendee's phone from another browser without the private link. Expect a safe conflict and no existing token/details in the response. Use the genuine private link to change game/pizza choices and reconfirm attendance.
4. Cancel one reservation. Confirm the next group receives an expiring offer and must claim it. Exercise claim, decline, expiration, and a cancelled guest signing up again. Check the strict versus soft cap policy, especially family-sized groups and edited group sizes.
5. Check people in and undo check-in. Confirm the organizer's totals, pizza estimate and CSV. Do not distribute exported contact or dietary information publicly.
6. Vote on a game and undo the vote; reload and verify persistence. Suggest a game and confirm it is private until an organizer unhides it. Per-browser votes are a preference signal, not verified-person ballots.
7. Test the cron with its authorization secret in staging. Confirm no duplicate reminder job on a second run. With SMS enabled, inspect the provider event, flow and actual receiving phone, including double opt-in, STOP and HELP. Test a failed provider request and a retry.
8. Test the deployed site on your actual iPhone/Android phone, keyboard-only navigation, zoomed text and a private browsing window. Scan a real printed QR code and verify the live canonical domain and source label.

## Scope and launch responsibilities

No payments, public attendee directory, email delivery, newsletter, account signup, per-user organizer authentication or visitor tracking service is included. Optional email addresses are stored only as entered; they are not emailed or subscribed. Reconfirming attendance is a guest action, not an automatically delivered reconfirmation request campaign.

Before accepting real guests, supply a monitored contact method and a data retention/deletion policy, review the privacy and participation notices, confirm the venue and its accessibility, and verify photo permission. The notices are editable operating copy, not a certification of legal compliance. Dietary and optional church information remain private; avoid collecting detail you do not need.

## Verification performed during preparation

Passed: 30 pure-logic tests for phone normalization, Arizona dates/calendar links, expiring signed sessions, pizza estimates and the selected game lineup. Syntax/transpilation passed for all 54 TypeScript source modules. The standalone preview was exercised in Chromium at 1440px desktop and 390px phone widths: navigation, RSVP example, number steppers, voting/filtering and FAQ interaction passed, with no observed overflow or JavaScript errors.

Not run here: npm dependency installation, full dependency-backed type checking, Next.js production build, live Supabase migration/RPC execution, cross-user persistence, live cron or real Klaviyo sending. The preparation environment could not reach the npm registry. The included CI and smoke tests exist to verify those before real launch; do not treat the static preview or unit tests as proof that a deployed backend is already verified.

## Where to edit

`lib/config.ts`: venue/hosts/defaults/pizza/capacity/SMS copy. `lib/featured.ts`: game lineup. `app/page.tsx` and `app/globals.css`: homepage and styling. `app/rsvp/RsvpForm.tsx`: guest form. `app/admin/`: organizer tools. `lib/nights.ts` and `supabase/migrations/002_community_and_safety.sql`: allocation. `lib/notifications.ts` and `lib/klaviyo.ts`: messaging. `app/privacy/page.tsx` and `app/terms/page.tsx`: notices. `public/images/`: landscape asset.

`preview.html` is a snapshot and is not generated by the application build. Changes to the React source do not automatically update that standalone file. Review future iterations through `npm run dev` instead.

## Official setup references

- Next.js installation and supported runtime: https://nextjs.org/docs/app/getting-started/installation
- Vercel Git integration: https://vercel.com/docs/git/vercel-for-github
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Vercel cron behavior and limits: https://vercel.com/docs/cron-jobs/manage-cron-jobs
- Supabase API-key security: https://supabase.com/docs/guides/getting-started/api-keys
- Supabase database functions: https://supabase.com/docs/guides/database/functions
- Klaviyo SMS consent: https://developers.klaviyo.com/en/docs/collect_email_and_sms_consent_via_api

See [ASSETS.md](ASSETS.md), [KLAVIYO.md](KLAVIYO.md) and [CHANGES.md](CHANGES.md) for provenance and operational details.
