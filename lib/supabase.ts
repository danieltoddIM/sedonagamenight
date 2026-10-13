import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-only client. The service role key never reaches the browser:
// every read and write goes through this app's own server code.
let client: SupabaseClient | null = null;

export function isConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function db(): SupabaseClient {
  if (!isConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return client;
}

export type Game = {
  id: string;
  name: string;
  description: string | null;
  players: string | null;
  category: string | null;
  curated: boolean;
  suggested_by: string | null;
  hidden: boolean;
  created_at: string;
  votes: number;
  voted?: boolean;
};

export type GameNight = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  status: "open" | "invite_only" | "closed";
  note: string | null;
  created_at: string;
};

export type SignupStatus = "confirmed" | "waitlist" | "offered" | "cancelled" | "declined" | "expired";

export type Signup = {
  id: string;
  event_id: string;
  name: string;
  phone: string;
  email: string | null;
  adults: number;
  kids: number;
  kid_ages: string | null;
  pizza: string | null;
  gluten_free: number;
  dietary: string | null;
  bringing: string;
  bringing_detail: string | null;
  church: string | null;
  notes: string | null;
  source: string | null;
  sms_consent: boolean;
  game_preferences: string[];
  learn_games: boolean;
  can_teach: boolean;
  reconfirmed_at: string | null;
  checked_in_at: string | null;
  status: SignupStatus;
  waitlisted_at: string | null;
  offer_expires_at: string | null;
  reminder_sent_at: string | null;
  token: string;
  created_at: string;
  updated_at: string;
};

/** Games with vote counts. Pass a voter id to mark which ones this visitor voted for. */
export async function getGames(opts: { includeHidden?: boolean; voterId?: string } = {}): Promise<Game[]> {
  let q = db().from("games").select("*").order("created_at", { ascending: true });
  if (!opts.includeHidden) q = q.eq("hidden", false);
  const { data: games, error } = await q;
  if (error) throw error;

  const { data: votes, error: vErr } = await db().from("game_votes").select("game_id, voter_id");
  if (vErr) throw vErr;

  const counts = new Map<string, number>();
  const mine = new Set<string>();
  for (const v of votes ?? []) {
    counts.set(v.game_id, (counts.get(v.game_id) ?? 0) + 1);
    if (opts.voterId && v.voter_id === opts.voterId) mine.add(v.game_id);
  }
  return (games ?? [])
    .map((g) => ({ ...g, votes: counts.get(g.id) ?? 0, voted: mine.has(g.id) }))
    .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
}
