import {guardMutation} from "@/lib/http";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { db, isConfigured } from "@/lib/supabase";
import { gameCategories } from "@/lib/config";

const clip = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

export async function POST(req: Request) {
  const blocked=await guardMutation(req,"admin/games",30);if(blocked)return blocked;
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isConfigured()) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const id = clip(body.id, 36);

  switch (body.action) {
    case "add": {
      const name = clip(body.name, 80);
      if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
      const category = clip(body.category, 30);
      const { error } = await db().from("games").insert({
        name,
        players: clip(body.players, 20) || null,
        category: gameCategories.includes(category) ? category : null,
        description: clip(body.description, 240) || null,
        curated: true,
        hidden: false,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      break;
    }
    case "update": {
      const patch: Record<string, boolean> = {};
      if (typeof body.curated === "boolean") patch.curated = body.curated;
      if (typeof body.hidden === "boolean") patch.hidden = body.hidden;
      const { error } = await db().from("games").update(patch).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      break;
    }
    case "delete": {
      const { error } = await db().from("games").delete().eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
