export const maxDuration=60;
import {after} from "next/server";
import {flushNotifications} from "@/lib/notifications";
import {klaviyoEnabled} from "@/lib/klaviyo";
import {featuredGames} from "@/lib/featured";
import {guardMutation} from "@/lib/http";
import { NextResponse } from "next/server";
import { churchOptions, pizza } from "@/lib/config";
import { todayISO } from "@/lib/dates";
import { getNight, manageUrl, rsvp } from "@/lib/nights";
import { normalizeUsPhone } from "@/lib/phone";
import { isConfigured } from "@/lib/supabase";

const clip = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const int = (v: unknown, min: number, max: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};

export async function POST(req: Request) {
  const blocked=await guardMutation(req,"rsvp",30);if(blocked)return blocked;
  if (!isConfigured()) {
    return NextResponse.json({ error: "RSVPs aren't open yet. Please check back soon." }, { status: 503 });
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  // Honeypot: reject automated submissions without creating a reservation.
  if (clip(body.website, 200)) return NextResponse.json({ error: "Please try again." }, {status:400});

  const night = await getNight(clip(body.event_id, 36));
  if (!night || night.date < todayISO() || night.status === "closed") {
    return NextResponse.json({ error: "That game night isn't taking RSVPs. Please pick another date." }, { status: 400 });
  }

  const name = clip(body.name, 100);
  if (!name) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  const phone = normalizeUsPhone(clip(body.phone, 30));
  if (!phone) return NextResponse.json({ error: "Please enter a 10-digit US mobile number." }, { status: 400 });
  const email = clip(body.email, 200).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "That email doesn't look right. You can also leave it blank." }, { status: 400 });
  }

  const adults = int(body.adults, 1, 20);
  const kids = int(body.kids, 0, 20);
  const picks = (Array.isArray(body.pizza) ? body.pizza : []).map((p) => String(p)).filter((p) => pizza.options.includes(p));
  const church = clip(body.church, 100);
  const source = clip(body.source, 40).toLowerCase().replace(/[^a-z0-9_-]/g, "");

  try {
    const { signup, outcome, position } = await rsvp(night, {
      event_id: night.id,
      name,
      phone,
      email: email || null,
      adults,
      kids,
      kid_ages: clip(body.kid_ages, 100) || null,
      pizza: picks.join(",") || null,
      gluten_free: int(body.gluten_free, 0, adults + kids),
      dietary: clip(body.dietary, 200) || null,
      bringing: clip(body.bringing, 40) || "nothing",
      bringing_detail: clip(body.bringing_detail, 200) || null,
      church: churchOptions.includes(church) ? church : null,
      notes: clip(body.notes, 500) || null,
      source: source || null,
      sms_consent: klaviyoEnabled() && body.sms_consent === true,
      game_preferences: (Array.isArray(body.game_preferences)?body.game_preferences:[]).map(String).filter(x=>featuredGames.some(g=>g.name===x)).slice(0,7),
      learn_games: body.learn_games === true,
      can_teach: body.can_teach === true,
    }, clip(body.manage_token,32));
    after(()=>flushNotifications().catch(()=>console.error("Notification dispatch deferred")));
    return NextResponse.json({
      outcome,
      status: signup.status,
      position,
      manage_url: manageUrl(signup.token),
      token: signup.token,
    });
  } catch (err) {
    const message=String((err as {message?:string})?.message||"");
    if(message.includes("PRIVATE_LINK_REQUIRED"))return NextResponse.json({error:"An RSVP already exists for this number. Use your saved private RSVP link or ask an organizer to help. Your existing reservation has not been changed."},{status:409});
    if(message.includes("EVENT_CLOSED"))return NextResponse.json({error:"This event is no longer accepting RSVPs."},{status:409});
    if(message.includes("GROUP_TOO_LARGE"))return NextResponse.json({error:"There are not enough seats for that larger group. Your existing RSVP is unchanged; please contact the organizer."},{status:409});
    console.error("RSVP save failed");
    return NextResponse.json({ error: "We couldn't save your RSVP. Please try again." }, { status: 500 });
  }
}
