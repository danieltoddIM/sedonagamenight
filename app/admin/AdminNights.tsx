"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { GameNight, SignupStatus } from "@/lib/supabase";

async function post(url: string, body: unknown) {
  try {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
  } catch {return {ok:false,data:{error:"Network error. Please try again."}};}
}

export function NightControls({ night, upcoming, waitlistCount }: { night: GameNight; upcoming: { id: string; label: string }[]; waitlistCount: number }) {
  const router = useRouter();
  const [capacity, setCapacity] = useState(night.capacity);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [inviteTo, setInviteTo] = useState(upcoming[0]?.id ?? "");

  async function update(patch: Record<string, unknown>) {
    setBusy(true);
    setMsg("");
    const { ok, data } = await post("/api/admin/nights", { action: "update", id: night.id, ...patch });
    setBusy(false);
    if (!ok) setMsg(data.error || "Couldn't save.");
    router.refresh();
  }

  return (
    <div className="form" style={{ gap: 12 }}>
      <div className="btn-row" style={{ alignItems: "center" }}>
        <label htmlFor="cap" style={{ fontWeight: 600 }}>Seat limit</label>
        <input id="cap" type="number" min={1} max={500} className="input" style={{ width: 90 }} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
        <button className="btn btn-small" disabled={busy || capacity === night.capacity} onClick={() => update({ capacity })}>Save</button>
        <span className="muted" style={{ fontSize: "0.85rem" }}>Raising it offers the new seats to the waitlist.</span>
      </div>
      <div className="btn-row" style={{ alignItems: "center" }}>
        <span style={{ fontWeight: 600 }}>RSVPs are</span>
        {(["open", "invite_only", "closed"] as const).map((s) => (
          <button key={s} className="tab" aria-pressed={night.status === s} disabled={busy} onClick={() => update({ status: s })}>
            {s === "open" ? "Open to everyone" : s === "invite_only" ? "Invite link only" : "Closed"}
          </button>
        ))}
      </div>
      {waitlistCount > 0 && upcoming.length > 0 && (
        <div className="btn-row" style={{ alignItems: "center" }}>
          <span style={{ fontWeight: 600 }}>Invite this waitlist to</span>
          <select className="input" style={{ width: "auto" }} value={inviteTo} onChange={(e) => setInviteTo(e.target.value)}>
            {upcoming.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
          <button
            className="btn btn-small btn-teal"
            disabled={busy || !inviteTo}
            onClick={async () => {
              setBusy(true);
              const { data } = await post("/api/admin/nights", { action: "invite", from: night.id, to: inviteTo });
              setBusy(false);
              setMsg(data.error || `Queued ${data.invited ?? 0} invitation${data.invited === 1 ? "" : "s"}. Text delivery depends on consent and Klaviyo setup.`);
            }}
          >
            Send invites
          </button>
        </div>
      )}
      <div className="btn-row">
        <button
          className="linklike"
          style={{ color: "#7a2b12" }}
          disabled={busy}
          onClick={async () => {
            if (!window.confirm("Delete this night and everyone's RSVPs for it? This can't be undone.")) return;
            const result=await post("/api/admin/nights", { action: "delete", id: night.id });
            if(!result.ok){setMsg(result.data.error||"Could not delete this night.");return;}
            router.push("/admin");
            router.refresh();
          }}
        >
          Delete this night
        </button>
      </div>
      {msg && <div className="alert alert-ok">{msg}</div>}
    </div>
  );
}

export function AddNightForm({
  suggestedDate,
  defaults,
  waitlistFrom,
}: {
  suggestedDate: string;
  defaults: { start: string; end: string; capacity: number };
  waitlistFrom: { id: string; label: string; count: number }[];
}) {
  const router = useRouter();
  const [date, setDate] = useState(suggestedDate);
  const [start, setStart] = useState(defaults.start);
  const [end, setEnd] = useState(defaults.end);
  const [capacity, setCapacity] = useState(defaults.capacity);
  const [inviteFrom, setInviteFrom] = useState("");
  const [status, setStatus] = useState("open");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <form
      className="card form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        const { ok, data } = await post("/api/admin/nights", {
          action: "add",
          date,
          start_time: start,
          end_time: end,
          capacity,
          status,
          invite_from: inviteFrom || undefined,
        });
        setBusy(false);
        if (!ok) return setMsg({ ok: false, text: data.error || "Couldn't add the night." });
        setMsg({ ok: true, text: `Added.${data.invited ? ` Invited ${data.invited} from the waitlist.` : ""}` });
        router.push(`/admin?night=${data.id}`);
        router.refresh();
      }}
    >
      <div className="row-2">
        <div className="field">
          <label htmlFor="nd">Date</label>
          <input id="nd" type="date" className="input" required value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="nc">Seat limit</label>
          <input id="nc" type="number" min={1} max={500} className="input" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
        </div>
      </div>
      <div className="row-2">
        <div className="field">
          <label htmlFor="ns">Starts</label>
          <input id="ns" type="time" className="input" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ne">Ends</label>
          <input id="ne" type="time" className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      {waitlistFrom.length > 0 && (
        <div className="field">
          <label htmlFor="nw">Give a waitlist first dibs? <span className="hint">they get a text with the link</span></label>
          <select
            id="nw"
            className="input"
            value={inviteFrom}
            onChange={(e) => {
              setInviteFrom(e.target.value);
              setStatus(e.target.value ? "invite_only" : "open");
            }}
          >
            <option value="">No</option>
            {waitlistFrom.map((w) => (
              <option key={w.id} value={w.id}>Yes, the {w.count} waiting for {w.label}</option>
            ))}
          </select>
        </div>
      )}
      <div className="field">
        <label htmlFor="nst">Who can RSVP</label>
        <select id="nst" className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="open">Everyone (shows on the website)</option>
          <option value="invite_only">Only people with the link (open it to everyone later)</option>
        </select>
      </div>
      {msg && <div className={`alert ${msg.ok ? "alert-ok" : "alert-error"}`}>{msg.text}</div>}
      <button className="btn" disabled={busy} style={{ justifySelf: "start" }}>{busy ? "Adding..." : "Add game night"}</button>
    </form>
  );
}

export function SignupActions({ id, status, checkedIn=false }: { id: string; status: SignupStatus; checkedIn?:boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error,setError]=useState("");
  const act = async (to: "confirmed" | "cancelled" | "waitlist" | "checkin" | "uncheckin") => {
    setBusy(true);
    setError("");
    const result=await post("/api/admin/signups", { id, status: to });
    if(!result.ok)setError(result.data.error||"Could not save.");
    setBusy(false);
    router.refresh();
  };
  return (
    <div className="btn-row" style={{ gap: 6, flexWrap: "nowrap" }}>
      {status === "confirmed" && <button className="btn btn-secondary btn-small" disabled={busy} onClick={()=>act(checkedIn?"uncheckin":"checkin")}>{checkedIn?"Undo check-in":"Check in"}</button>}
      {error&&<span role="alert">{error}</span>}
      {status !== "confirmed" && (
        <button className="btn btn-secondary btn-small" disabled={busy} onClick={() => window.confirm("Confirm this group? Organizer approval may exceed the seat limit.") && act("confirmed")}>Let in</button>
      )}
      {["confirmed", "offered", "waitlist"].includes(status) && (
        <button className="btn btn-secondary btn-small" disabled={busy} onClick={() => window.confirm("Cancel this RSVP?") && act("cancelled")}>Cancel</button>
      )}
    </div>
  );
}
