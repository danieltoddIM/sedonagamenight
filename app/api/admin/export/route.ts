import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { isConfigured, type Signup } from "@/lib/supabase";
import { getNight, signupsFor } from "@/lib/nights";
import { formatPhone } from "@/lib/phone";

const csvCell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[\s]*[=+\-@]/.test(s)) s = `'${s}`; // keep spreadsheets from treating it as a formula
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// GET /api/admin/export?event=<id>  -> CSV of everyone for that night
export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const night = await getNight(new URL(req.url).searchParams.get("event") ?? "");
  if (!night) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await signupsFor(night.id);
  const cols: (keyof Signup)[] = ["status", "name", "phone", "email", "adults", "kids", "kid_ages", "pizza", "gluten_free", "dietary", "bringing", "bringing_detail", "church", "notes", "source", "sms_consent", "game_preferences", "learn_games", "can_teach", "reconfirmed_at", "checked_in_at", "created_at"];
  const lines = [
    cols.join(","),
    ...rows.map((r) => cols.map((c) => csvCell(c === "phone" ? formatPhone(r.phone) : r[c])).join(",")),
  ];
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="game-night-${night.date}.csv"`,
    },
  });
}
