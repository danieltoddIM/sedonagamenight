export const maxDuration=60;
import {after} from "next/server";
import {flushNotifications} from "@/lib/notifications";
import {guardMutation} from "@/lib/http";
import { NextResponse } from "next/server";
import { cancelByToken, claimOffer, reconfirmByToken } from "@/lib/nights";
import { isConfigured } from "@/lib/supabase";

// POST /api/r/<token>  { action: "claim" | "cancel" }
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const blocked=await guardMutation(req,"manage",30);if(blocked)return blocked;
  if (!isConfigured()) return NextResponse.json({ error: "Not set up yet." }, { status: 503 });
  const { token } = await params;
  const { action } = await req.json().catch(() => ({ action: "" }));

  after(()=>flushNotifications().catch(()=>console.error("Notification dispatch deferred")));
  if(action==="reconfirm"){const ok=await reconfirmByToken(token);return NextResponse.json({result:ok?"reconfirmed":"invalid"},{status:ok?200:409});}
  if (action === "claim") {
    const result = await claimOffer(token);
    return NextResponse.json({ result }, { status: result === "invalid" ? 404 : 200 });
  }
  if (action === "cancel") {
    const ok = await cancelByToken(token);
    return NextResponse.json({ result: ok ? "cancelled" : "invalid" }, { status: ok ? 200 : 404 });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
