import "server-only";
// Sends people and events to Klaviyo. Klaviyo flows (set up in your Klaviyo
// account, see KLAVIYO.md) turn these events into text messages.
//
// SMS is disabled unless SMS_ENABLED=true and KLAVIYO_PRIVATE_KEY is set.

const API = process.env.KLAVIYO_API_BASE || "https://a.klaviyo.com/api";
const REVISION = process.env.KLAVIYO_REVISION || "2026-07-15";

export function klaviyoEnabled(): boolean {
  return process.env.SMS_ENABLED === "true" && Boolean(process.env.KLAVIYO_PRIVATE_KEY);
}

async function call(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Klaviyo-API-Key ${process.env.KLAVIYO_PRIVATE_KEY}`,
      revision: REVISION,
      accept: "application/vnd.api+json",
      "content-type": "application/vnd.api+json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Klaviyo ${path} failed: ${res.status} ${text.slice(0, 500)}`);
  }
}

/** Add someone to the Game Night list with text-message consent. */
export async function subscribeSms(opts: { phone: string; email?: string | null; source?: string | null }) {
  if (!klaviyoEnabled()) return;
  const listId = process.env.KLAVIYO_LIST_ID;
  const profile: Record<string, unknown> = {
    phone_number: opts.phone,
    subscriptions: {
      sms: {
        marketing: { consent: "SUBSCRIBED" },
        transactional: { consent: "SUBSCRIBED" },
      },
    },
  };
  await call("/profile-subscription-bulk-create-jobs", {
    data: {
      type: "profile-subscription-bulk-create-job",
      attributes: {
        custom_source: `Sedona Game Night RSVP${opts.source ? ` (${opts.source})` : ""}`,
        profiles: { data: [{ type: "profile", attributes: profile }] },
        historical_import: false,
      },
      ...(listId ? { relationships: { list: { data: { type: "list", id: listId } } } } : {}),
    },
  });
}

export type KlaviyoMetric =
  | "Game Night RSVP Confirmed"
  | "Game Night Waitlisted"
  | "Game Night Spot Offered"
  | "Game Night Offer Expired"
  | "Game Night Cancelled"
  | "Game Night Reminder"
  | "Game Night New Date Invite";

/** Record an event on a person's Klaviyo profile. Flows trigger on these. */
export async function trackEvent(
  metric: KlaviyoMetric,
  person: { phone: string; name: string; email?: string | null },
  properties: Record<string, unknown>,
  uniqueId?: string,
) {
  if (!klaviyoEnabled()) return;
  const [first, ...rest] = person.name.trim().split(/\s+/);
  await call("/events", {
    data: {
      type: "event",
      attributes: {
        properties,
        metric: { data: { type: "metric", attributes: { name: metric } } },
        profile: {
          data: {
            type: "profile",
            attributes: {
              phone_number: person.phone,
              first_name: first,
              ...(rest.length ? { last_name: rest.join(" ") } : {}),
              ...(person.email ? { email: person.email } : {}),
            },
          },
        },
        ...(uniqueId ? { unique_id: uniqueId } : {}),
      },
    },
  });
}

/** Never let a Klaviyo hiccup break an RSVP. */
export async function safely(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    console.error("[klaviyo]", err);
  }
}
