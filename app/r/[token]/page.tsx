export const maxDuration=60;
import {after} from "next/server";
import {flushNotifications} from "@/lib/notifications";
import RsvpForm from "@/app/rsvp/RsvpForm";
import {klaviyoEnabled} from "@/lib/klaviyo";
import {nightStats} from "@/lib/nights";
import type { Metadata } from "next";
import Link from "next/link";
import ManageActions from "./ManageActions";
import { location,churchOptions,pizza,smsConsentText } from "@/lib/config";
import { formatInstant, formatLong, formatTime, googleCalendarUrl } from "@/lib/dates";
import { bySignupToken, party, processNight, waitlistPosition } from "@/lib/nights";
import { isConfigured } from "@/lib/supabase";

export const metadata: Metadata = { title: "Your RSVP", robots: { index: false,follow:false } };
export const dynamic = "force-dynamic";

export default async function ManagePage({ params,searchParams }: { params: Promise<{ token: string }>;searchParams:Promise<{edit?:string}> }) {
  const { token } = await params;
  if (!isConfigured()) return <Shell><p>Not set up yet.</p></Shell>;

  let found = await bySignupToken(token);
  if (!found) {
    return (
      <Shell>
        <h1>We couldn&apos;t find that RSVP</h1>
        <p className="muted">The link may be incomplete. Please check your saved link or ask an organizer for help. <Link href="/rsvp">See upcoming dates</Link>.</p>
      </Shell>
    );
  }
  after(()=>flushNotifications().catch(()=>console.error("Notification dispatch deferred")));
  await processNight(found.night); // make sure offers and expirations are current
  found = (await bySignupToken(token))!;
  const { signup: s, night } = found;
  const first = s.name.split(/\s+/)[0];
  const when = `${formatLong(night.date)}, ${formatTime(night.start_time)} to ${formatTime(night.end_time)}`;
  const size = party(s);
  const position = await waitlistPosition(s);
  if((await searchParams).edit==="1"){
    const st=await nightStats(night);
    return <Shell><h1>Update your RSVP</h1><RsvpForm initial={s} smsEnabled={klaviyoEnabled()} nights={[{id:night.id,label:formatLong(night.date),time:`${formatTime(night.start_time)} to ${formatTime(night.end_time)}`,capacity:night.capacity,spotsLeft:st.spotsLeft,isFull:st.isFull,waitlistCount:st.waitlistCount,inviteOnly:night.status==="invite_only",calendarUrl:googleCalendarUrl(night.date,night.start_time,night.end_time)}]} defaultNight={night.id} churches={churchOptions} pizzaOptions={pizza.options} consentText={smsConsentText} source={s.source||""}/></Shell>;
  }

  return (
    <Shell>
      <div className="eyebrow">Your RSVP</div>
      {s.status === "confirmed" && (
        <>
          <h1>You&apos;re in, {first}!</h1>
          <p>{when}<br />{location.name}, {location.address}</p>
          <p className="muted">Party of {size}{s.pizza ? ` · Pizza: ${s.pizza.replace(/,/g, ", ")}` : ""}</p>
          <div className="btn-row">
            <a className="btn btn-teal" href={googleCalendarUrl(night.date, night.start_time, night.end_time)} target="_blank" rel="noreferrer">Add to calendar</a>
            <Link className="btn btn-secondary" href={`/r/${token}?edit=1`}>Change details</Link>
          </div>
          <div style={{marginTop:24}}>{s.reconfirmed_at?<p className="alert alert-ok">Thanks! You have confirmed you are still coming.</p>:<ManageActions token={token} mode="reconfirm" label="Yes, I am still coming"/>}</div>
          {s.game_preferences?.length>0&&<p className="muted" style={{marginTop:18}}>Your games: {s.game_preferences.join(", ")}</p>}
          <hr />
          <p className="muted">Can&apos;t make it? Please let us know so someone on the waitlist can come.</p>
          <ManageActions token={token} mode="cancel" label="I can't make it" />
        </>
      )}

      {s.status === "offered" && (
        <>
          <h1>A spot opened up, {first}!</h1>
          <p>{when}<br />{location.name}</p>
          <p>
            We&apos;re holding {size === 1 ? "a seat" : `${size} seats`} for you until{" "}
            <strong>{s.offer_expires_at ? formatInstant(new Date(s.offer_expires_at)) : "soon"}</strong>. After that it goes to the next person on the list.
          </p>
          <ManageActions token={token} mode="claim" label="Yes, I'll be there" />
          <div style={{ marginTop: 12 }}>
            <ManageActions token={token} mode="cancel" label="No thanks, give it to someone else" secondary />
          </div>
        </>
      )}

      {s.status === "waitlist" && (
        <>
          <div className="big-number">#{position}</div>
          <h1>You&apos;re on the waitlist</h1>
          <p>{when}</p>
          <p className="muted">
            If a spot opens up, we&apos;ll {s.sms_consent && klaviyoEnabled() ? "queue a text update and show it here" : "show it here"} and hold it for a limited time so you can claim it.
          </p>
          <hr />
          <ManageActions token={token} mode="cancel" label="Take me off the waitlist" secondary />
        </>
      )}

      {s.status === "expired" && (
        <>
          <h1>That spot has been passed along</h1>
          <p className="muted">The time to claim it ran out, so it went to the next person in line. Sorry we missed you!</p>
          <Link className="btn" href="/rsvp">See other dates</Link>
        </>
      )}

      {(s.status === "cancelled" || s.status === "declined") && (
        <>
          <h1>Thanks for letting us know</h1>
          <p className="muted">You&apos;re not on the list for {formatLong(night.date)}. Hope to see you at the next one!</p>
          <Link className="btn" href="/rsvp">RSVP for another night</Link>
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="card">{children}</div>
      </div>
    </section>
  );
}
