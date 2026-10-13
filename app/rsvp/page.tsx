export const maxDuration=60;
import {after} from "next/server";
import {flushNotifications} from "@/lib/notifications";
import Link from "next/link";
import {klaviyoEnabled} from "@/lib/klaviyo";
import type { Metadata } from "next";
import RsvpForm, { type NightOption } from "./RsvpForm";
import { churchOptions, location, pizza, smsConsentText } from "@/lib/config";
import { formatLong, formatTime, googleCalendarUrl, todayISO } from "@/lib/dates";
import { getNight, nightStats, processNight, upcomingNights } from "@/lib/nights";
import { isConfigured, type GameNight } from "@/lib/supabase";

export const metadata: Metadata = { title: "RSVP" };
export const dynamic = "force-dynamic";

export default async function RsvpPage({ searchParams }: { searchParams: Promise<{ event?: string; from?: string }> }) {
  const { event, from } = await searchParams;

  let nights: NightOption[] = [];
  let loadError = false;
  if (isConfigured()) {
    try {
      const list: GameNight[] = await upcomingNights();
      // An invite-only night is reachable through its link
      if (event && !list.some((n) => n.id === event)) {
        const n = await getNight(event);
        if (n && n.status !== "closed" && n.date >= todayISO()) list.unshift(n);
      }
      for (const n of list) {
        await processNight(n);
        const st = await nightStats(n);
        nights.push({
          id: n.id,
          label: formatLong(n.date),
          time: `${formatTime(n.start_time)} to ${formatTime(n.end_time)}`,
          capacity: n.capacity,
          spotsLeft: st.spotsLeft,
          isFull: st.isFull,
          waitlistCount: st.waitlistCount,
          inviteOnly: n.status === "invite_only",
          calendarUrl: googleCalendarUrl(n.date, n.start_time, n.end_time),
        });
      }
    } catch (e) {
      console.error(e);
      loadError = true;
    }
  }
  if(isConfigured())after(()=>flushNotifications().catch(()=>console.error("Notification dispatch deferred")));
  const selected = nights.find((n) => n.id === event)?.id ?? nights[0]?.id ?? "";

  return (
    <section className="section">
      <div className="container narrow">
        <div className="eyebrow">RSVP</div>
        <h1>Save your seat</h1>
        <p className="muted">
          At {location.name}. Seats are limited so we know how many tables to set up and how much pizza to order.
        </p>
        {!isConfigured() && (
          <div className="alert alert-warn" style={{ marginBottom: 20 }}>
            Registration is not open yet. The next game night will be announced here. <Link href="/launch-preview">Preview the RSVP form</Link>.
          </div>
        )}
        {loadError && <div className="alert alert-error" style={{ marginBottom: 20 }}>We couldn&apos;t load the game nights. Please refresh.</div>}
        {isConfigured() && !loadError && nights.length === 0 ? (
          <div className="card">
            <h3>The next date is coming soon</h3>
            <p className="muted" style={{ margin: 0 }}>Check back soon. Everyone in the community is welcome.</p>
          </div>
        ) : (
          <div className="card">
            <RsvpForm
              smsEnabled={klaviyoEnabled()}
              nights={nights}
              defaultNight={selected}
              churches={churchOptions}
              pizzaOptions={pizza.options}
              consentText={smsConsentText}
              source={(from ?? "").slice(0, 40)}
            />
          </div>
        )}
      </div>
    </section>
  );
}
