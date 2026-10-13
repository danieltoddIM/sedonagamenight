# Optional SMS setup

SMS is off by default. The live website can save RSVPs, display private links, offer waitlist seats and track attendance without sending a text. No messages, list changes or account configuration have been performed by this delivery.

Use a dedicated Sedona Game Night SMS program rather than attaching event guests to an unrelated business marketing list. Adding a private key alone does not enable sending: `SMS_ENABLED` must also be `true`.

## Before enabling

Confirm your sender and geographic eligibility in Klaviyo; complete the required sender/program setup in that account. Review your dedicated list's opt-in settings and the application checkbox/privacy/terms with whoever is responsible for the program. The application requests both SMS marketing and transactional consent because the stated scope includes new-night invitations as well as booking updates. It does not request email marketing consent.

The checkbox is optional and initially unchecked for a new RSVP. Attending is not conditional on SMS. Keep an accurate estimate of message frequency and provide a monitored HELP/contact path. The copy is not a legal-compliance certification. Test double opt-in, STOP and HELP using a phone you control, and do not override suppression just to make a test pass.

Klaviyo subscription processing is asynchronous, and opt-in requirements depend on account/list configuration. A subscription API acceptance is not evidence that someone is currently SMS-eligible. A separate event acceptance is not evidence that a message reached a phone.

## Configuration

Set a server-only private API key with the minimum scopes required for profile subscriptions, list membership when used, and event creation. Check the current endpoint documentation for the exact scopes offered by your account. Do not put the key in a public environment variable or a GitHub file.

```
SMS_ENABLED=true
KLAVIYO_PRIVATE_KEY=YOUR_SERVER_ONLY_KEY
KLAVIYO_LIST_ID=YOUR_DEDICATED_LIST_ID
KLAVIYO_REVISION=2026-07-15
```

The list ID is optional in the API but recommended for separating this program. When absent, the provider's account-default opt-in settings apply. A fresh explicit subscription request can change an earlier consent/suppression state; do not use this API to bulk re-subscribe historical guests. The dispatcher skips subscription jobs older than 15 minutes instead of silently replaying stale opt-in instructions after an outage. Older unprocessed subscriptions need a deliberate recovery plan with current consent, not a replay job.

## Flow triggers and useful properties

The app records these exact metric names. Create and test a matching flow for each message type you choose to use. Initially leave flows in a non-sending review mode.

| Metric | Purpose | Properties |
| --- | --- | --- |
| `Game Night RSVP Confirmed` | Seat confirmed after booking, claim or explicit organizer admission | `event_date_text`, `start_time`, `location_name`, `party_size`, `manage_url` |
| `Game Night Waitlisted` | Group is waiting, not booked | `event_date_text`, `position`, `manage_url` |
| `Game Night Spot Offered` | Limited-time seat offer | `claim_url`, `expires_text`, `expires_at`, `party_size` |
| `Game Night Offer Expired` | Unclaimed offer expired | `event_date_text`, `manage_url` |
| `Game Night Cancelled` | Guest cancellation/decline | `event_date_text`, `manage_url` |
| `Game Night Reminder` | Same-day reminder | `event_date_text`, `start_time`, `location_name`, `manage_url` |
| `Game Night New Date Invite` | Organizer invites consented waitlisted guests to another date | `event_date_text`, `original_date_text`, `rsvp_url` |

`Subscribe SMS` is an internal queue job, not a Klaviyo metric or a message flow.

The app also supplies `event_id`, `event_date`, `event_date_short`, `end_time`, `location_address`, `pizza`, and a private management link. The optional profile email is not an email subscription. Do not include dietary notes, child ages or church affiliation in message templates; they are not added to these events.

Use the template editor's actual event-property selector to insert these fields. Verify a real captured event before activating a template. A failed reference must not send a broken claim URL to guests.

## Message drafts to review in the provider

These are starting wording, not provider template syntax. Insert properties through Klaviyo's editor.

**Confirmation:** "Sedona Game Night: you're in for [event date] at [start time]. We're glad you're joining us! View your RSVP or cancel: [manage link]. Reply STOP to opt out."

**Waitlist:** "You're on the list for Sedona Game Night on [event date]. We'll offer a spot when one opens. Check your status here: [manage link]. Reply STOP to opt out."

**Seat offer:** "A spot opened for your group at Sedona Game Night! Claim it by [deadline]: [claim link]. It is not reserved until you claim. Reply STOP to opt out."

**Reminder:** "Looking forward to seeing you at Sedona Game Night today at [time], [venue]. Please confirm you're still coming or cancel here: [manage link]. Reply STOP to opt out."

**New date:** "Another Sedona Game Night is opening on [event date]. Since you were waiting last time, here's an early invitation: [RSVP link]. Reply STOP to opt out."

Keep private links out of public channels. They grant access to a reservation.

## Consent and timing in flows

Add SMS-eligibility checks and respect STOP, quiet hours and sending requirements. Do not turn off safety settings globally to force operational texts through. Evaluate provider smart-sending and quiet-hours behavior per flow so an expiring offer cannot arrive after its deadline; expired offers must be suppressed at send time. An application queue's stale check occurs before event submission and cannot prevent a flow from delaying a message afterward.

Subscription requests are submitted before their dependent events, but asynchronous processing and double opt-in can still mean a guest is not eligible when the event arrives. Configure the flow's timing/consent checks accordingly and prove the intended behavior on a test phone. Immediate text delivery is not a guarantee; the confirmation screen always presents the usable private link.

Unchecking SMS on an RSVP prevents this application's future queued messages for that reservation. It is not a general unsubscribe API for an existing provider profile or other lists/flows. STOP remains the provider-level opt-out mechanism. Independent provider campaigns must honor their own current consent filters and must not use this RSVP record as permanent consent.

## Queue, retries and cron

`notification_jobs` holds a durable outbox. Each row has an event/job name, unique dedupe key, attempts, lease, availability time and completion marker. No phone number is duplicated into the queue. The dispatcher loads only the fields needed for the current send.

A pass claims up to five jobs at a time with two-minute leases, processes them in parallel, and loops within a roughly 40-second/100-job budget. Failed requests receive an exponential delay up to one hour. A completed row means skipped or accepted by the provider API, not delivered. Review `last_error`, the provider's event activity, flow analytics and the receiving device.

Event requests use `unique_id` for deduplication. Subscription job acceptance is asynchronous and is not covered by that event deduplication key. Verify retry and double-opt-in behavior under provider errors before launch.

The included schedule is daily at 16:00 UTC (9 AM Arizona). Website visits and reservation actions also dispatch jobs, but visitors should not be required for timely offers. Choose a supported more-frequent production schedule and verify your plan limits. Vercel does not provide guaranteed real-time execution or automatic retry of failed cron invocations; the application queue retains jobs for the next successful pass.

## End-to-end launch test

Use a separate staging database and approved test phone. Submit an opted-in RSVP, complete any double opt-in, inspect subscription eligibility, inspect the event properties, and verify the actual message. Test no-consent, cancellation, a full event, a seat offer/claim/expiry, re-confirmation from the reminder, and an invitation to a later night. Send nothing to existing business lists as part of these tests. Test STOP/HELP and a simulated temporary provider error. Verify repeated cron calls do not create duplicate reminder jobs.

Only after these checks should you enable production SMS and promote the site. The preparation environment did not perform any live provider test.

## Official references

- Consent collection and asynchronous processing: https://developers.klaviyo.com/en/docs/collect_email_and_sms_consent_via_api
- Subscription endpoint: https://developers.klaviyo.com/en/reference/bulk_subscribe_profiles
- Event creation: https://developers.klaviyo.com/en/reference/create_event
- Cron operations/limitations: https://vercel.com/docs/cron-jobs/manage-cron-jobs
