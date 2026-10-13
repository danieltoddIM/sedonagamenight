import {guardMutation} from "@/lib/http";
import { NextResponse } from "next/server";
import { db, isConfigured } from "@/lib/supabase";
import { gameCategories } from "@/lib/config";
import { getOrSetVoterId } from "@/lib/voter";

const clip = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

// Guest suggestions stay hidden until an organizer publishes them.
export async function POST(req: Request) {
  const blocked=await guardMutation(req,"games",30);if(blocked)return blocked;
  if (!isConfigured()) return NextResponse.json({ error: "The game list isn't set up yet." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const name = clip(body.name, 80);
  if (name.length < 2) return NextResponse.json({ error: "Please enter the game's name." }, { status: 400 });

  const { data: existing } = await db().from("games").select("id, name").ilike("name", name.replace(/[%_\\]/g, "\\$&")).limit(1);
  if (existing && existing.length > 0) {
    return NextResponse.json({ error: `${existing[0].name} is already on the list. Give it a vote!` }, { status: 409 });
  }

  const category = clip(body.category, 30);
  const row = {
    name,
    players: clip(body.players, 20) || null,
    category: gameCategories.includes(category) ? category : null,
    description: clip(body.description, 240) || null,
    suggested_by: clip(body.suggested_by, 40) || null,
    curated: false,
    hidden: true,
  };
  const { data, error } = await db().from("games").insert(row).select().single();
  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Couldn't add that game. Please try again." }, { status: 500 });
  }

  // The person who suggests it gets the first vote
  const voterId = await getOrSetVoterId();
  await db().from("game_votes").insert({ game_id: data.id, voter_id: voterId });

  return NextResponse.json({pending:true, name:data.name});
}
