"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {featuredGames} from "@/lib/featured";
import type {Signup} from "@/lib/supabase";

export type NightOption = {
  id: string;
  label: string;
  time: string;
  capacity: number;
  spotsLeft: number;
  isFull: boolean;
  waitlistCount: number;
  inviteOnly: boolean;
  calendarUrl: string;
};

type Result = { outcome: "confirmed" | "waitlist" | "updated"; status: string; position: number; manage_url: string };

const REMEMBER_KEY = "sgn_rsvp_details";

function Stepper({ value, onChange, min = 0, max = 20, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="stepper">
      <button type="button" aria-label={`Fewer ${label}`} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <output aria-live="polite">{value}</output>
      <button type="button" aria-label={`More ${label}`} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  );
}

function formatPhoneInput(v: string) {
  const d = v.replace(/\D/g, "").replace(/^1(?=\d{10})/, "").slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export default function RsvpForm({
  nights,
  defaultNight,
  churches,
  pizzaOptions,
  consentText,
  source,
  preview=false,
  smsEnabled=false,
  initial,
}: {
  nights: NightOption[];
  defaultNight: string;
  churches: string[];
  pizzaOptions: string[];
  consentText: string;
  source: string;
  preview?:boolean;
  smsEnabled?:boolean;
  initial?:Signup;
}) {
  const [nightId, setNightId] = useState(defaultNight);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [adults, setAdults] = useState(1);
  const [kids, setKids] = useState(0);
  const [kidAges, setKidAges] = useState("");
  const [pizza, setPizza] = useState<string[]>([]);
  const [needsGf, setNeedsGf] = useState(false);
  const [glutenFree, setGlutenFree] = useState(1);
  const [dietary, setDietary] = useState("");
  const [bringing, setBringing] = useState<string[]>([]);
  const [bringingDetail, setBringingDetail] = useState("");
  const [church, setChurch] = useState("");
  const [notes, setNotes] = useState("");
  const [sms, setSms] = useState(false);
  const [gamePreferences,setGamePreferences]=useState<string[]>(initial?.game_preferences||[]);
  const [learnGames,setLearnGames]=useState(initial?.learn_games||false);
  const [canTeach,setCanTeach]=useState(initial?.can_teach||false);
  const [remember,setRemember]=useState(false);
  const [manageToken,setManageToken]=useState(initial?.token||"");
  const [remembered, setRemembered] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const night = nights.find((n) => n.id === nightId) ?? nights[0];
  const groupSize = adults + kids;

  // Fill in details from last time on this phone
  useEffect(() => {
    if(preview)return;
    if(initial){setName(initial.name);setPhone(formatPhoneInput(initial.phone));setEmail(initial.email||"");setAdults(initial.adults);setKids(initial.kids);setKidAges(initial.kid_ages||"");setPizza(initial.pizza?.split(",")||[]);setChurch(initial.church||"");setSms(initial.sms_consent);setDietary(initial.dietary||"");setBringing(initial.bringing==="nothing"?[]:initial.bringing.split(","));setBringingDetail(initial.bringing_detail||"");setNotes(initial.notes||"");setNeedsGf(initial.gluten_free>0);setGlutenFree(initial.gluten_free||1);return;}
    try {
      const saved = JSON.parse(localStorage.getItem(REMEMBER_KEY) || "null");
      if (saved) {
        setName(saved.name ?? "");
        setPhone(saved.phone ?? "");
        setEmail(saved.email ?? "");
        setAdults(saved.adults ?? 1);
        setKids(saved.kids ?? 0);

        setPizza(saved.pizza ?? []);

        setRemember(true);
        setRemembered(true);
      }
    } catch {
      /* storage unavailable, that's fine */
    }
  }, [initial,preview]);

  function forget() {
    try { localStorage.removeItem(REMEMBER_KEY); } catch { /* ignore */ }
    setName(""); setPhone(""); setEmail(""); setAdults(1); setKids(0); setKidAges(""); setPizza([]); setChurch(""); setSms(false);
    setRemembered(false);setRemember(false);setManageToken("");
    try{for(const k of Object.keys(localStorage))if(k.startsWith("sgn_token_"))localStorage.removeItem(k);for(const k of Object.keys(sessionStorage))if(k.startsWith("sgn_token_"))sessionStorage.removeItem(k);}catch{}
  }

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!night) return;
    if(preview){setError("This is a design preview, not a real event. No RSVP was saved.");setStatus("error");return;}
    setStatus("saving");
    setError("");
    const website = String(new FormData(e.currentTarget).get("website") || "");
    try {
      let savedToken=manageToken;try{savedToken=savedToken||sessionStorage.getItem(`sgn_token_${night.id}`)||localStorage.getItem(`sgn_token_${night.id}`)||"";}catch{}
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: night.id,
          manage_token:savedToken,
          game_preferences:gamePreferences,
          learn_games:learnGames,
          can_teach:canTeach,
          name, phone, email, adults, kids,
          kid_ages: kidAges,
          pizza,
          gluten_free: needsGf ? glutenFree : 0,
          dietary,
          bringing: bringing.length ? bringing.join(",") : "nothing",
          bringing_detail: bringingDetail,
          church, notes,
          sms_consent: sms,
          source,
          website,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      try {
        sessionStorage.setItem(`sgn_token_${night.id}`,data.token);
        if(remember){localStorage.setItem(REMEMBER_KEY,JSON.stringify({name,phone,email,adults,kids,pizza}));localStorage.setItem(`sgn_token_${night.id}`,data.token);}
        else {localStorage.removeItem(REMEMBER_KEY);localStorage.removeItem(`sgn_token_${night.id}`);}
      } catch { /* ignore */ }
      setResult(data);
      setStatus("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (!night) return null;

  if (status === "done" && result) {
    const first = name.trim().split(/\s+/)[0];
    const onList = result.status === "waitlist";
    const offered = result.status === "offered";
    return (
      <div className="center" style={{ padding: "16px 0" }}>
        {onList ? (
          <>
            <div className="big-number">#{result.position}</div>
            <h2>You&apos;re on the waitlist, {first}</h2>
            <p className="muted">
              {night.label} is full right now. If a spot opens up we&apos;ll {sms && smsEnabled ? "queue a text update" : "show an offer on your private RSVP page"} and you&apos;ll have a limited time to claim it.
            </p>
          </>
        ) : offered ? (
          <>
            <h2>A spot is waiting for you, {first}</h2>
            <p className="muted">Tap below to claim it before it goes to the next person.</p>
          </>
        ) : (
          <>
            <h2>{result.outcome === "updated" ? `Updated, ${first}!` : `You're in, ${first}!`}</h2>
            <p className="muted">
              See you {night.label}, {night.time}.{sms && smsEnabled ? " Text updates are enabled. Save your private link below as well." : " Save your private RSVP link below; no text delivery is promised."}
            </p>
          </>
        )}
        <div className="btn-row" style={{ justifyContent: "center", marginTop: 16 }}>
          {!onList && !offered && (
            <a className="btn btn-teal" href={night.calendarUrl} target="_blank" rel="noreferrer">Add to calendar</a>
          )}
          <a className="btn btn-secondary" href={result.manage_url}>
            {offered ? "Claim my spot" : "View or cancel"}
          </a>
          <Link className="btn btn-secondary" href="/games">Vote on games</Link>
        </div>
        <p className="muted" style={{ fontSize: "0.85rem", marginTop: 20 }}>
          Save this page or bookmark the &ldquo;View or cancel&rdquo; link. If you can&apos;t make it, please cancel so someone on the waitlist can come.
        </p>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      {remembered && (
        <div className="alert alert-ok" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <span>Welcome back! We filled in your details from last time.</span>
          <button type="button" className="linklike" onClick={forget}>Not you?</button>
        </div>
      )}

      <div className="field">
        <label htmlFor="night">Which game night?</label>
        <select id="night" className="input" value={night.id} onChange={(e) => setNightId(e.target.value)}>
          {nights.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label}{n.isFull ? " (waitlist)" : ""}
            </option>
          ))}
        </select>
        <SpotsBar night={night} />
      </div>

      <p className="form-kicker">A few details help us welcome your group, plan the tables, and order enough pizza.</p>
      <div className="row-2">
        <div className="field">
          <label htmlFor="name">Your name</label>
          <input id="name" className="input" required maxLength={100} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="phone">Mobile number</label>
          <input
            id="phone"
            className="input"
            required
            type="tel"
            readOnly={!!initial}
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(928) 555-1234"
            value={phone}
            onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
          />
          {initial&&<small className="muted">Ask an organizer to change your mobile number.</small>}
        </div>
      </div>

      <div className="row-2">
        <div className="field">
          <label>Adults (including you)</label>
          <Stepper value={adults} onChange={setAdults} min={1} label="adults" />
        </div>
        <div className="field">
          <label>Kids (under 18)</label>
          <Stepper value={kids} onChange={setKids} label="kids" />
        </div>
      </div>

      {kids > 0 && (
        <div className="field">
          <label htmlFor="kid_ages">Kids&apos; ages <span className="hint">helps us pick games</span></label>
          <input id="kid_ages" className="input" placeholder="e.g. 7 and 11" maxLength={100} value={kidAges} onChange={(e) => setKidAges(e.target.value)} />
        </div>
      )}

      <fieldset className="field"><legend>What would you like to play? <span className="hint">pick any</span></legend><div className="chips">{featuredGames.map(g=><label className="chip" key={g.name}><input type="checkbox" checked={gamePreferences.includes(g.name)} onChange={()=>toggle(gamePreferences,setGamePreferences,g.name)}/>{g.name}</label>)}</div><label className="choice"><input type="checkbox" checked={learnGames} onChange={e=>setLearnGames(e.target.checked)}/>Surprise me. I am happy to learn.</label><label className="choice"><input type="checkbox" checked={canTeach} onChange={e=>setCanTeach(e.target.checked)}/>I can help teach one of my selected games.</label></fieldset>

      <fieldset className="field">
        <legend>What pizza does your group like? <span className="hint">pick any</span></legend>
        <div className="chips">
          {pizzaOptions.map((p) => (
            <label key={p} className="chip">
              <input type="checkbox" checked={pizza.includes(p)} onChange={() => toggle(pizza, setPizza, p)} />
              {p}
            </label>
          ))}
        </div>
        <label className="choice" style={{ marginTop: 6 }}>
          <input type="checkbox" checked={needsGf} onChange={(e) => setNeedsGf(e.target.checked)} />
          Someone in our group needs gluten-free
        </label>
        {needsGf && groupSize > 1 && (
          <div className="stepper-inline">
            <span>How many?</span>
            <Stepper value={Math.min(glutenFree, groupSize)} onChange={setGlutenFree} min={1} max={groupSize} label="gluten-free" />
          </div>
        )}
        <label htmlFor="dietary">Other allergies or dietary needs <span className="hint">optional</span></label>
        <input id="dietary" className="input" placeholder="Other allergies? (optional)" maxLength={200} value={dietary} onChange={(e) => setDietary(e.target.value)} />
      </fieldset>

      <fieldset className="field">
        <legend>Want to bring something? <span className="hint">totally optional</span></legend>
        <div className="choice-grid">
          <label className="choice">
            <input type="checkbox" checked={bringing.includes("game")} onChange={() => toggle(bringing, setBringing, "game")} />
            A game
          </label>
          <label className="choice">
            <input type="checkbox" checked={bringing.includes("food")} onChange={() => toggle(bringing, setBringing, "food")} />
            Dessert or drinks
          </label>
        </div>
        {bringing.length > 0 && (
          <input aria-label="What are you bringing?" className="input" placeholder="What are you bringing?" maxLength={200} value={bringingDetail} onChange={(e) => setBringingDetail(e.target.value)} />
        )}
      </fieldset>

      <details className="more"><summary>Optional community connection</summary><p className="muted">Everyone is welcome. This does not affect your RSVP.</p><fieldset className="field">
        <legend>Where do you go to church? <span className="hint">optional</span></legend>
        <div className="choice-grid">
          {churches.map((c) => (
            <label key={c} className="choice">
              <input type="radio" name="church" value={c} checked={church === c} onChange={() => setChurch(c)} />
              {c}
            </label>
          ))}
        </div>
      </fieldset></details>

      <details className="more">
        <summary>Add an email or a note (optional)</summary>
        <div className="form" style={{ marginTop: 12 }}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" className="input" maxLength={200} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="notes">Note for the organizers</label>
            <textarea id="notes" className="input" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Questions, accessibility needs, a game you're hoping to learn..." />
          </div>
        </div>
      </details>

      <label className="consent">
        <input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} />
        <span>{consentText} <Link href="/terms">Text terms</Link> and <Link href="/privacy">privacy notice</Link>. Consent is optional and is not required to attend.</span>
      </label>

      {!smsEnabled && <p className="muted" style={{fontSize:".82rem"}}>Automatic texts are not enabled yet. Your RSVP will still be saved. Bookmark your private link to check your status.</p>}
      <label className="choice"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/>Remember my contact details and private RSVP link on this device. Use only on a personal device.</label>
      <p className="muted" style={{fontSize:".8rem"}}>Your contact details and dietary information are visible only to the organizers, not to other guests.</p>
      {/* Honeypot field: hidden from people, bots tend to fill it in */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: "-9999px" }} aria-hidden="true" />

      {status === "error" && <div role="alert" className="alert alert-error">{error}</div>}

      <button className="btn" type="submit" disabled={status === "saving"}>
        {status === "saving" ? "Saving..." : preview ? "Preview RSVP" : night.isFull ? `Join the waitlist for ${night.label}` : initial ? "Save my changes" : `Save my seat for ${night.label}`}
      </button>
    </form>
  );
}

function SpotsBar({ night }: { night: NightOption }) {
  const taken = night.capacity - night.spotsLeft;
  const pct = Math.min(100, Math.round((taken / night.capacity) * 100));
  return (
    <div className="spots" aria-live="polite">
      <div className="spots-track"><div className="spots-fill" style={{ width: `${pct}%` }} /></div>
      <div className="spots-text">
        {night.time} ·{" "}
        {night.isFull ? (
          <strong className="full">Full. {night.waitlistCount > 0 ? `${night.waitlistCount} on the waitlist.` : "Join the waitlist."}</strong>
        ) : (
          <strong>{night.spotsLeft} of {night.capacity} spots left</strong>
        )}
      </div>
    </div>
  );
}
