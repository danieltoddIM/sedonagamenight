import {starterGames} from "@/lib/featured";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import GamesBoard from "./GamesBoard";
import { gameCategories } from "@/lib/config";
import { getGames, isConfigured, type Game } from "@/lib/supabase";

export const metadata: Metadata = { title: "Games" };
export const dynamic = "force-dynamic";

export default async function GamesPage() {
  const voterId = (await cookies()).get("sgn_voter")?.value;
  let games: Game[] = [...starterGames];
  let loadError = false;
  if (isConfigured()) {
    try {
      games = await getGames({ voterId });
    } catch {
      loadError = true;
    }
  }

  return (
    <section className="section">
      <div className="container">
        <div className="eyebrow">The game list</div>
        <h1>What should we play?</h1>
        <p className="muted" style={{ maxWidth: 640 }}>
          Vote for the games you want on the table. Don&apos;t see your favorite? Suggest it and others can vote for it too.
        </p>
        {!isConfigured() && (
          <div className="alert alert-warn" style={{ margin: "16px 0" }}>
            Here is our starting lineup. Community voting and suggestions open when registration launches.
          </div>
        )}
        {loadError && <div className="alert alert-error" style={{ margin: "16px 0" }}>We couldn&apos;t load the games. Please refresh.</div>}
        <GamesBoard initialGames={games} categories={gameCategories} enabled={isConfigured() && !loadError} />
      </div>
    </section>
  );
}
