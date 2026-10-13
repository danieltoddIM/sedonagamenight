import type { Metadata } from "next";
import Link from "next/link";
import LoginForm from "./LoginForm";
import AdminGames from "./AdminGames";
import LogoutButton from "./LogoutButton";
import { AddNightForm, NightControls, SignupActions } from "./AdminNights";
import { isAdmin } from "@/lib/admin";
import { db, getGames, isConfigured, type GameNight, type Signup } from "@/lib/supabase";
import { formatInstant, formatLong, formatTime, suggestedDates, todayISO } from "@/lib/dates";
import { defaults, gameCategories } from "@/lib/config";
import { party, processNight, signupsFor, statsFrom, waitlistPosition } from "@/lib/nights";
import { pizzaOrder } from "@/lib/pizza";
import { formatPhone } from "@/lib/phone";
import { klaviyoEnabled } from "@/lib/klaviyo";

export const metadata: Metadata = { title: "Organizers", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Going",
  offered: "Offered",
  waitlist: "Waitlist",
  cancelled: "Cancelled",
  declined: "Declined",
  expired: "Offer expired",
};

function Message({ children }: { children: React.ReactNode }) {
  return <section className="section"><div className="container narrow"><h1>Organizers</h1>{children}</div></section>;
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ night?: string }> }) {
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length<16) {
    return <Message><div className="alert alert-warn">Set an ADMIN_PASSWORD of at least 16 characters to turn on this page.</div></Message>;
  }
  if (!(await isAdmin())) {
    return (
      <section className="section"><div className="container" style={{ maxWidth: 420 }}>
        <h1>Organizers</h1>
        <div className="card"><LoginForm /></div>
      </div></section>
    );
  }
  if (!isConfigured()) {
    return <Message><div className="alert alert-warn">Supabase isn&apos;t connected yet. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.</div></Message>;
  }

  const { night: nightParam } = await searchParams;
  const today = todayISO();

  // Upcoming nights plus the last few past ones
  const { data: upcomingRows } = await db().from("events").select("*").gte("date", today).order("date");
  const { data: pastRows } = await db().from("events").select("*").lt("date", today).order("date", { ascending: false }).limit(4);
  const upcoming = (upcomingRows ?? []) as GameNight[];
  const past = (pastRows ?? []) as GameNight[];
  const all = [...upcoming, ...past];
  const night = all.find((n) => n.id === nightParam) ?? upcoming[0] ?? past[0];

  // Waitlist counts for the "invite waitlist from" picker
  const waitlistFrom: { id: string; label: string; count: number }[] = [];
  for (const n of upcoming) {
    const { count } = await db().from("signups").select("*", { count: "exact", head: true }).eq("event_id", n.id).in("status", ["waitlist", "expired"]);
    if (count) waitlistFrom.push({ id: n.id, label: formatLong(n.date), count });
  }

  const lastDate = upcoming.length ? upcoming[upcoming.length - 1].date : today;
  const suggestion = suggestedDates(1, lastDate)[0];
  const games = await getGames({ includeHidden: true });

  let signups: Signup[] = [];
  if (night) {
    if (night.date >= today) await processNight(night);
    signups = await signupsFor(night.id);
  }
  const stats = night ? statsFrom(night, signups) : null;
  const going = signups.filter((s) => s.status === "confirmed");
  const offered = signups.filter((s) => s.status === "offered");
  const waiting = signups
    .filter((s) => s.status === "waitlist")
    .sort((a, b) => (a.waitlisted_at ?? "").localeCompare(b.waitlisted_at ?? ""));
  const notComing = signups.filter((s) => ["cancelled", "declined", "expired"].includes(s.status));
  const order = pizzaOrder(going);
  const positions = new Map<string, number>();
  for (const s of waiting) positions.set(s.id, await waitlistPosition(s));

  const tally = (key: "church" | "source") =>
    Object.entries(
      going.reduce<Record<string, number>>((acc, s) => {
        const k = s[key] || (key === "church" ? "Not given" : "Website");
        acc[k] = (acc[k] ?? 0) + party(s);
        return acc;
      }, {}),
    ).map(([k, v]) => `${k}: ${v}`).join(" · ");

  return (
    <section className="section">
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0 }}>Organizers</h1>
          <div className="btn-row"><Link href="/qr" className="btn btn-secondary btn-small">QR codes</Link><LogoutButton /></div>
        </div>
        {!klaviyoEnabled() && (
          <div className="alert alert-warn" style={{ marginTop: 16 }}>
            Klaviyo isn&apos;t connected, so no texts are going out yet. RSVPs and the waitlist still work. See KLAVIYO.md.
          </div>
        )}

        <h2 style={{ marginTop: 32 }}>Game nights</h2>
        {all.length === 0 ? (
          <p className="muted">No game nights yet. Add the first one below.</p>
        ) : (
          <div className="tabs">
            {all.map((n) => (
              <Link key={n.id} href={`/admin?night=${n.id}`} className="tab" aria-pressed={n.id === night?.id} style={{ textDecoration: "none", opacity: n.date < today ? 0.6 : 1 }}>
                {formatLong(n.date)}{n.status !== "open" ? ` (${n.status === "invite_only" ? "invite only" : "closed"})` : ""}
              </Link>
            ))}
          </div>
        )}

        {night && stats && (
          <div className="card" style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
              <h3 style={{ margin: 0, fontSize: "1.5rem" }}>{formatLong(night.date)}</h3>
              <span className="muted">{formatTime(night.start_time)} to {formatTime(night.end_time)}</span>
            </div>

            <div className="stats">
              <div className="stat"><div className="n">{stats.going}<span className="muted" style={{ fontSize: "1rem" }}> / {night.capacity}</span></div><div className="l">Going</div></div>
              <div className="stat"><div className="n">{stats.spotsLeft}</div><div className="l">Spots left{stats.held ? ` (${stats.held} offered)` : ""}</div></div>
              <div className="stat"><div className="n">{stats.waitlistPeople}</div><div className="l">On waitlist ({stats.waitlistCount} groups)</div></div>
              <div className="stat"><div className="n">{going.reduce((t, s) => t + s.kids, 0)}</div><div className="l">Kids</div></div>
            </div>

            <p className="muted">{going.filter(s=>s.reconfirmed_at).length} groups reconfirmed &middot; {going.filter(s=>s.checked_in_at).reduce((a,s)=>a+party(s),0)} people checked in</p>
            {stats.going+stats.held>night.capacity&&<div className="alert alert-warn">This night is above its target capacity. Family overflow or an organizer override has been used. Confirm the venue can safely accommodate everyone.</div>}
            <NightControls night={night} upcoming={upcoming.filter((n) => n.id !== night.id).map((n) => ({ id: n.id, label: formatLong(n.date) }))} waitlistCount={stats.waitlistCount} />

            <div className="grid-2" style={{ marginTop: 24 }}>
              <div className="card" style={{ background: "var(--cream)", boxShadow: "none" }}>
                <h3>Pizza order</h3>
                {order.people === 0 ? (
                  <p className="muted" style={{ margin: 0 }}>Nobody confirmed yet.</p>
                ) : (
                  <>
                    <p style={{ fontSize: "1.2rem", margin: "0 0 8px" }}><strong>{order.larges} large pizzas</strong> <span className="muted">for {order.people} people</span></p>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {order.byType.map((p) => <li key={p.type}>{p.count} {p.type}</li>)}
                      {order.glutenFreePizzas > 0 && <li>{order.glutenFreePizzas} small gluten-free ({order.glutenFreePeople} people)</li>}
                    </ul>
                    {going.some((s) => s.dietary) && (
                      <p className="muted" style={{ marginTop: 8, fontSize: "0.9rem" }}>
                        Allergies: {going.filter((s) => s.dietary).map((s) => `${s.name.split(" ")[0]} (${s.dietary})`).join(", ")}
                      </p>
                    )}
                  </>
                )}
              </div>
              <div className="card" style={{ background: "var(--cream)", boxShadow: "none" }}>
                <h3>Plan the tables</h3>
                <p className="muted"><strong>Games requested:</strong> {Object.entries(going.reduce<Record<string,number>>((a,s)=>{for(const g of s.game_preferences||[])a[g]=(a[g]||0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]).map(([g,n])=>`${g}: ${n} groups`).join("; ")||"None yet"}</p>
                <p className="muted"><strong>Happy to teach:</strong> {going.filter(s=>s.can_teach).map(s=>s.name).join(", ")||"None yet"}</p>
                <h3>Who&apos;s coming</h3>
                <p className="muted" style={{ margin: "0 0 6px" }}><strong>By church:</strong> {tally("church") || "None yet"}</p>
                <p className="muted" style={{ margin: "0 0 6px" }}><strong>Found us through:</strong> {tally("source") || "None yet"}</p>
                <p className="muted" style={{ margin: 0 }}><strong>Bringing a game:</strong> {going.filter((s) => s.bringing.includes("game")).map((s) => s.bringing_detail || s.name.split(" ")[0]).join(", ") || "Nobody yet"}</p>
                <div className="btn-row" style={{ marginTop: 12 }}>
                  <a className="btn btn-secondary btn-small" href={`/api/admin/export?event=${night.id}`}>Download CSV</a>
                </div>
              </div>
            </div>

            <SignupTable title={`Going (${going.length} groups)`} rows={going} />
            {offered.length > 0 && (
              <SignupTable
                title="Spot offered, waiting for them to claim"
                rows={offered}
                extra={(s) => (s.offer_expires_at ? `until ${formatInstant(new Date(s.offer_expires_at))}` : "")}
              />
            )}
            <SignupTable title={`Waitlist (${waiting.length})`} rows={waiting} extra={(s) => `#${positions.get(s.id)}`} empty="Nobody waiting." />
            {notComing.length > 0 && <SignupTable title="Not coming" rows={notComing} />}
          </div>
        )}

        <h2>Add a night</h2>
        <AddNightForm
          suggestedDate={suggestion}
          defaults={{ start: defaults.start24, end: defaults.end24, capacity: defaults.capacity }}
          waitlistFrom={waitlistFrom}
        />

        <h2 style={{ marginTop: 48 }}>Games</h2>
        <p className="muted">Add your own picks, promote a guest suggestion to an organizer pick, or hide anything that shouldn&apos;t be on the list.</p>
        <AdminGames games={games} categories={gameCategories} />
      </div>
    </section>
  );
}

function SignupTable({ title, rows, extra, empty }: { title: string; rows: Signup[]; extra?: (s: Signup) => string; empty?: string }) {
  return (
    <>
      <h3 style={{ marginTop: 28 }}>{title}</h3>
      {rows.length === 0 ? (
        <p className="muted">{empty ?? "None."}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Phone</th><th>Group</th><th>Pizza</th><th>Bringing</th><th>Church</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                    {s.game_preferences?.length>0&&<div className="muted" style={{fontSize:".75rem"}}>{s.game_preferences.join(", ")}{s.can_teach?" - can teach":""}</div>}
                    {s.notes && <div className="muted" style={{ fontSize: "0.85rem" }}>{s.notes}</div>}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <a href={`sms:${s.phone}`}>{formatPhone(s.phone)}</a>
                    {!s.sms_consent && <div className="muted" style={{ fontSize: "0.75rem" }}>no texts</div>}
                  </td>
                  <td>{s.adults} adult{s.adults === 1 ? "" : "s"}{s.kids ? `, ${s.kids} kid${s.kids === 1 ? "" : "s"}` : ""}{s.kid_ages ? ` (${s.kid_ages})` : ""}</td>
                  <td>{(s.pizza ?? "Anything").replace(/,/g, ", ")}{s.gluten_free ? ` · ${s.gluten_free} GF` : ""}</td>
                  <td>{s.bringing === "nothing" ? "" : s.bringing_detail || s.bringing}</td>
                  <td>{s.church ?? ""}</td>
                  <td>
                    <span className={`pill pill-${s.status}`}>{STATUS_LABEL[s.status]}</span>
                    {s.reconfirmed_at&&<div style={{fontSize:".75rem"}}>Reconfirmed</div>}{s.checked_in_at&&<div style={{fontSize:".75rem"}}>Checked in</div>}
                    {extra && <div className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>{extra(s)}</div>}
                  </td>
                  <td><SignupActions id={s.id} status={s.status} checkedIn={!!s.checked_in_at} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
