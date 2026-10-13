export const maxDuration=60;
import {after} from "next/server";
import {flushNotifications} from "@/lib/notifications";
import {guardMutation} from "@/lib/http";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { db, isConfigured, type GameNight } from "@/lib/supabase";
import { getNight, inviteWaitlist, processNight } from "@/lib/nights";

const isDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v+"T12:00:00Z").toISOString().slice(0,10)===v;
const isTime = (v: unknown) => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const STATUSES = ["open", "invite_only", "closed"];

export async function POST(req: Request) {
  const blocked=await guardMutation(req,"admin/nights",30);if(blocked)return blocked;
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  after(()=>flushNotifications().catch(()=>console.error("Notification dispatch deferred")));
  const b = await req.json().catch(() => ({}));

  switch (b.action) {
    case "add": {
      if (!isDate(b.date) || !isTime(b.start_time) || !isTime(b.end_time) || b.end_time<=b.start_time) {
        return NextResponse.json({ error: "Please give a date and start/end times." }, { status: 400 });
      }
      const capacity = Math.max(1, Math.min(500, Math.round(Number(b.capacity) || 25)));
      const status = STATUSES.includes(b.status) ? b.status : "open";
      const { data, error } = await db()
        .from("events")
        .insert({ date: b.date, start_time: b.start_time, end_time: b.end_time, capacity, status, note: String(b.note ?? "").slice(0, 200) || null })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      let invited = 0;
      if (b.invite_from) {
        const from = await getNight(String(b.invite_from));
        if (from) invited = await inviteWaitlist(from, data as GameNight);
      }
      return NextResponse.json({ ok: true, id: data.id, invited });
    }
    case "update": {
      const night = await getNight(String(b.id));
      if (!night) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const patch: Partial<GameNight> = {};
      if (b.capacity !== undefined && !Number.isFinite(Number(b.capacity))) return NextResponse.json({error:"Invalid capacity."},{status:400});
      if (b.capacity !== undefined) patch.capacity = Math.max(1, Math.min(500, Math.round(Number(b.capacity))));
      if (STATUSES.includes(b.status)) patch.status = b.status;
      const { data, error } = await db().from("events").update(patch).eq("id", night.id).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      await processNight(data as GameNight); // more seats may have opened
      return NextResponse.json({ ok: true });
    }
    case "invite": {
      const from = await getNight(String(b.from));
      const to = await getNight(String(b.to));
      if (!from || !to) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const invited = await inviteWaitlist(from, to);
      return NextResponse.json({ ok: true, invited });
    }
    case "delete": {
      const { error } = await db().from("events").delete().eq("id", String(b.id));
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
