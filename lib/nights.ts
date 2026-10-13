// Game nights, RSVPs, and the waitlist.
//
// How the cap works:
// - Everyone counts toward the cap, kids included.
// - People who are "confirmed" or have an open "offered" spot hold seats.
// - If any seat is open and nobody is waiting, a new RSVP is confirmed, even if
//   their group is bigger than the seats left (we'd rather go a little over than
//   split up a family).
// - Otherwise they go on the waitlist. When seats open, the next person in line
//   receives a private-page offer and an optional queued text, with a claim deadline.

import { location, waitlist } from "./config";
import { arizonaInstant, formatCompact, formatInstant, formatLong, formatTime, todayISO } from "./dates";

import { db, type GameNight, type Signup } from "./supabase";

export const HOLDS_SEAT = ["confirmed", "offered"] as const;
export const party = (s: Pick<Signup, "adults" | "kids">) => s.adults + s.kids;

export function siteBase(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
export const manageUrl = (token: string) => `${siteBase()}/r/${token}`;

/** Details about the night, included in every Klaviyo event so texts can use them. */
export function nightProps(n: GameNight) {
  return {
    event_id: n.id,
    event_date: n.date,
    event_date_text: formatLong(n.date),
    event_date_short: formatCompact(n.date),
    start_time: formatTime(n.start_time),
    end_time: formatTime(n.end_time),
    location_name: location.name,
    location_address: location.address,
  };
}

// ---------- reading ----------

export async function getNight(id: string): Promise<GameNight | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await db().from("events").select("*").eq("id", id).maybeSingle();
  return (data as GameNight) ?? null;
}

export async function upcomingNights(opts: { includeHidden?: boolean } = {}): Promise<GameNight[]> {
  let q = db().from("events").select("*").gte("date", todayISO()).order("date", { ascending: true });
  if (!opts.includeHidden) q = q.eq("status", "open");
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as GameNight[]).filter(n=>arizonaInstant(n.date,n.start_time).getTime()>Date.now());
}

export async function signupsFor(eventId: string): Promise<Signup[]> {
  const { data, error } = await db().from("signups").select("*").eq("event_id", eventId).order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Signup[];
}

export type NightStats = {
  going: number; // people confirmed
  held: number; // people with an open offer
  spotsLeft: number;
  waitlistPeople: number;
  waitlistCount: number; // groups waiting
  isFull: boolean;
};

export function statsFrom(night: GameNight, signups: Signup[]): NightStats {
  const sum = (st: string[]) => signups.filter((s) => st.includes(s.status)).reduce((t, s) => t + party(s), 0);
  const going = sum(["confirmed"]);
  const held = sum(["offered"]);
  const waiting = signups.filter((s) => s.status === "waitlist");
  const spotsLeft = Math.max(0, night.capacity - going - held);
  return {
    going,
    held,
    spotsLeft,
    waitlistPeople: waiting.reduce((t, s) => t + party(s), 0),
    waitlistCount: waiting.length,
    isFull: spotsLeft === 0 || waiting.length > 0,
  };
}

export async function nightStats(night: GameNight): Promise<NightStats> {
  return statsFrom(night, await signupsFor(night.id));
}

export async function waitlistPosition(s: Signup): Promise<number> {
  if (s.status !== "waitlist" || !s.waitlisted_at) return 0;
  const { count } = await db()
    .from("signups")
    .select("*", { count: "exact", head: true })
    .eq("event_id", s.event_id)
    .eq("status", "waitlist")
    .lt("waitlisted_at", s.waitlisted_at);
  return (count ?? 0) + 1;
}

// ---------- transactional mutations ----------
const policy=()=>({p_overflow:waitlist.allowFamilyOverflow,p_offer_hours:waitlist.offerHours,p_stop_hours:waitlist.stopOffersHoursBefore});
export async function processNight(night:GameNight){const {error}=await db().rpc("sgn_process_night",{p_event_id:night.id,...policy()});if(error)throw error;}
export type SignupInput=Omit<Signup,"id"|"status"|"waitlisted_at"|"offer_expires_at"|"reminder_sent_at"|"token"|"created_at"|"updated_at"|"reconfirmed_at"|"checked_in_at">;
export type RsvpOutcome="confirmed"|"waitlist"|"updated";
export async function rsvp(night:GameNight,input:SignupInput,manageToken?:string){
 const {data,error}=await db().rpc("sgn_rsvp",{p_input:{...input,event_id:night.id},p_manage_token:manageToken||null,...policy()});
 if(error)throw error;const result=data as {signup:Signup;outcome:RsvpOutcome};return {...result,position:await waitlistPosition(result.signup)};
}
export async function bySignupToken(token:string):Promise<{signup:Signup;night:GameNight}|null>{
 if(!/^[0-9a-f]{32}$/.test(token))return null;
 const {data,error}=await db().from("signups").select("*").eq("token",token).maybeSingle();if(error)throw error;if(!data)return null;
 const night=await getNight(data.event_id);return night?{signup:data as Signup,night}:null;
}
async function act(token:string|null,action:string,id?:string){const {data,error}=await db().rpc("sgn_signup_action",{p_token:token,p_action:action,p_id:id||null,...policy()});if(error)throw error;return data as string;}
export async function claimOffer(token:string){return await act(token,"claim") as "confirmed"|"expired"|"invalid";}
export async function cancelByToken(token:string){return await act(token,"cancel")!=="invalid";}
export async function reconfirmByToken(token:string){return await act(token,"reconfirm")!=="invalid";}
export async function setStatus(id:string,status:"confirmed"|"cancelled"|"waitlist"|"checkin"|"uncheckin"){const result=await act(null,status,id);if(result==="invalid")throw new Error("Invalid signup action");}
export async function runDailyJobs(){const nights=await upcomingNights({includeHidden:true});let reminders=0;for(const n of nights){await processNight(n);const {data,error}=await db().rpc("sgn_queue_reminders",{p_event_id:n.id});if(error)throw error;reminders+=Number(data||0);}return {nights:nights.length,reminders};}
export async function inviteWaitlist(fromNight:GameNight,toNight:GameNight){
 const waiting=(await signupsFor(fromNight.id)).filter(s=>["waitlist","expired"].includes(s.status)&&s.sms_consent);
 const existing=new Set((await signupsFor(toNight.id)).map(s=>s.phone));let count=0;
 for(const s of waiting){if(existing.has(s.phone))continue;const {error}=await db().rpc("sgn_queue",{p_signup:s.id,p_metric:"Game Night New Date Invite",p_key:`invite-${s.id}-${toNight.id}`,p_properties:{...nightProps(toNight),rsvp_url:`${siteBase()}/rsvp?event=${toNight.id}`,original_date_text:formatLong(fromNight.date)}});if(error)throw error;count++;}return count;
}
