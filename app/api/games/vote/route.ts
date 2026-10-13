import {guardMutation} from "@/lib/http";
import { NextResponse } from "next/server";
import { db, isConfigured } from "@/lib/supabase";
import { getOrSetVoterId } from "@/lib/voter";

// Toggle this visitor's vote on a game.
export async function POST(req: Request) {
  const blocked=await guardMutation(req,"games/vote",30);if(blocked)return blocked;
  if (!isConfigured()) return NextResponse.json({ error: "Not set up yet." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const gameId = String(body.game_id ?? "");
  if (!/^[0-9a-f-]{36}$/.test(gameId)) return NextResponse.json({ error: "Invalid game." }, { status: 400 });

  const {data:game}=await db().from("games").select("id").eq("id",gameId).eq("hidden",false).maybeSingle();
  if(!game)return NextResponse.json({error:"Game not available."},{status:404});
  const voterId = await getOrSetVoterId();
  const { data: existing } = await db()
    .from("game_votes")
    .select("game_id")
    .eq("game_id", gameId)
    .eq("voter_id", voterId)
    .maybeSingle();

  let voted: boolean;
  if (existing) {
    await db().from("game_votes").delete().eq("game_id", gameId).eq("voter_id", voterId);
    voted = false;
  } else {
    const { error } = await db().from("game_votes").insert({ game_id: gameId, voter_id: voterId });
    if (error) return NextResponse.json({ error: "Couldn't save your vote." }, { status: 500 });
    voted = true;
  }

  const { count } = await db().from("game_votes").select("*", { count: "exact", head: true }).eq("game_id", gameId);
  return NextResponse.json({ voted, votes: count ?? 0 });
}
