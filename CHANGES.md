# Revision 0.2.0

## Design

Replaced the generic illustrated homepage with a responsive community-first design and the actual supplied Thunder Mountain sunset photo. Lead message: "Good games. Great company." The design emphasizes belonging, meeting neighbors, welcoming newcomers and sharing a table, rather than a specialist gaming club. Added the seven selected familiar games, original tile/dice/card illustrations, a live-event panel, newcomer guidance and FAQs. Removed invented event dates and attendance statistics from the public design.

## Preserved from the Claude project

Family RSVPs, children/pizza/dietary preferences, bring-a-game/food notes, optional church connection, event creation, original family-friendly soft-cap behavior, FIFO offers, waitlist invites to later dates, private links, QR source labels, game voting, organizer moderation, pizza estimates and CSV export. The optional SMS provider remains Klaviyo, the database remains Supabase and the deployment target remains Vercel.

## Added

Game choices inside RSVP, willingness to learn/teach, organizer game-demand counts, guest reconfirmation, organizer arrival check-in/undo, authenticated private editing, explicit device-memory opt-in, clear prelaunch states, moderate-before-publish game suggestions, self-contained clickable preview, deployment notes, a database invariant smoke-test script and a GitHub validation workflow.

## Corrected before launch

A phone number alone no longer returns an existing private link or updates somebody else's RSVP. Admission, offer claims and cancellation now share a database event-row lock. Capacity behavior is explicit and configurable. Organizer cookies are signed and expire; mutation endpoints require same-origin requests and rate limits. CSV cells guard against formula interpretation. Private URLs use no-referrer/noindex/no-store protections. Token recovery remains organizer-assisted rather than insecure phone-only access.

RSVP persistence is separate from SMS. Durable queued jobs have deduplication, leases, bounded parallel processing, retries and stale-message checks. SMS is explicitly disabled unless configured. UI language distinguishes reservation status, queued notifications and actual delivery. A failed SMS integration must not invalidate a successfully saved RSVP.

## Still needs operational confirmation

Full build/typecheck with installed dependencies; live database and simultaneous-reservation tests; provider sender and flows; double opt-in/STOP/HELP; scheduler cadence; a real event; correct venue/address; privacy contact and retention policy. The shared organizer password and browser-level votes are deliberate initial-version limits, not an enterprise identity system.

## October 13, 2026 — CC0 landscape replacement

Replaced the signed Thunder Mountain reference with the original CC0 Wikimedia Commons photograph by Eddiewexler. Updated the homepage, community-banner CSS, alt text, and both embedded images in the standalone preview. Removed the previous photo file and updated asset/license documentation. Preserved the previously confirmed venue address, 390 Dry Creek Rd, Sedona, AZ 86336, in the configuration and preview.
