# Sedona Game Night: start here

This is the updated website source, not just an image. It combines the community-first design with the RSVP, family, pizza, waitlist, QR and organizer functionality in your Claude project.

## Look at it first

Open `preview.html` in a browser. The top bar switches between the homepage, RSVP form and game voting. It is a standalone design preview: it does not reserve seats, save votes to a database or send messages. Do not publish it as the booking website.

The actual application is in `app/`, `components/` and `lib/`.

## Get the source onto GitHub

Create a **private** repository to start. Upload the contents of this folder, not the ZIP file itself. `package.json`, `app`, `lib`, `public`, `supabase` and the other project files should be at the repository root. Include the hidden `.github` directory and `.env.example`, but never a filled-in `.env.local` file. GitHub Desktop is convenient for retaining hidden files.

The workflow in `.github/workflows/ci.yml` runs syntax checks, the 30 unit tests, TypeScript checking and a production build. It has no production secrets and makes no live bookings or sends.

## Put the application online

Use GitHub to hold the source, Vercel to run the Next.js application, and Supabase to hold shared RSVPs and game votes. This application is not a GitHub Pages static site.

1. Create a Supabase project. In its SQL Editor, run `supabase/INSTALL.sql`. With an existing Claude-project database, back up first; this script adds fields/functions and missing games without deleting existing RSVPs.
2. Import the GitHub repository into Vercel as a Next.js project. Keep the project root where `package.json` lives, and select Node 22.
3. Add the environment variables from `.env.example` to Vercel. The database URL, server-only privileged key, a unique 16+ character organizer password, session secret and cron secret are required for the complete operating site. Set `NEXT_PUBLIC_SITE_URL` to the actual deployed origin. Keep `SMS_ENABLED=false` initially.
4. Deploy. Visit `/admin`, sign in and create your first real game night. A date is not published until you create an open event. The default capacity is 25 **people**, including children.
5. Complete the live smoke tests in `README.md` before promoting the site. Then add your domain to the Vercel project and update `NEXT_PUBLIC_SITE_URL` to match it.

The precise screens and available plans may change; links to the official setup documentation are in `README.md`.

## Confirm before launch

**Venue and hosting promises.** The original project names Rock of Ages Church as the venue and Summit Life Church / Rock of Ages Church as hosts. Those are preserved, not independently verified. Set the full address and room in `lib/config.ts`, then set `addressConfirmed: true`. Confirm free admission, free pizza and children attending with a responsible adult.

**Capacity.** The original project deliberately allows a whole family to exceed the stated capacity when some seats remain. That behavior is retained and shown to organizers. For a hard room limit, set `waitlist.allowFamilyOverflow` to `false` in `lib/config.ts` before accepting registrations.

**Homepage photo.** The homepage and community banner use the CC0 Wikimedia Commons Thunder Mountain sunset photograph by Eddiewexler. The original signed image has been removed. Source and license are documented in `ASSETS.md`.

**Messaging.** SMS is optional and off by default. Adding a key alone will not send texts. Configure the sender, consent settings and event-triggered flows described in `KLAVIYO.md`, and test on a phone you control. This site does not send email.

**Privacy.** Add a monitored organizer contact to the privacy/terms pages, decide a retention period and review the notices before collecting real information. Only the primary adult's name is requested; child names are not needed.

## Verification status

The standalone preview was exercised in Chromium at desktop and phone widths; the tested pages had no horizontal overflow or JavaScript errors. All 30 core-logic tests and syntax/transpilation checks passed.

The preparation environment could not install npm dependencies, so a full Next.js production build and dependency-backed TypeScript check were **not** run here. Supabase functions, live RSVP persistence, cron execution and Klaviyo delivery were **not** exercised against your accounts. Run the included GitHub checks and live smoke tests before taking real registrations. No GitHub repository was created, no site was deployed and no account data was modified as part of this delivery.
