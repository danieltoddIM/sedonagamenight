export const maxDuration=60;
import {flushNotifications} from "@/lib/notifications";
import { NextResponse } from "next/server";
import { runDailyJobs } from "@/lib/nights";
import { isConfigured } from "@/lib/supabase";

// Vercel calls this on the schedule in vercel.json.
// It expires unclaimed offers, offers open spots to the waitlist,
// and sends the day-of reminder on game night.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isConfigured()) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const result = await runDailyJobs();
  return NextResponse.json({ ok: true, ...result, notifications:await flushNotifications() });
}
