export const maxDuration=60;
import {after} from "next/server";
import {flushNotifications} from "@/lib/notifications";
import {guardMutation} from "@/lib/http";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { isConfigured } from "@/lib/supabase";
import { setStatus } from "@/lib/nights";

// Organizer moves someone: confirm them, put them back on the waitlist, or cancel them.
export async function POST(req: Request) {
  const blocked=await guardMutation(req,"admin/signups",30);if(blocked)return blocked;
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  after(()=>flushNotifications().catch(()=>console.error("Notification dispatch deferred")));
  const { id, status } = await req.json().catch(() => ({}));
  if (!/^[0-9a-f-]{36}$/i.test(String(id)) || !["confirmed", "cancelled", "waitlist", "checkin", "uncheckin"].includes(status)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  await setStatus(id, status);
  return NextResponse.json({ ok: true });
}
