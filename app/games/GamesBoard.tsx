"use client";

import { useMemo, useState } from "react";
import type { Game } from "@/lib/supabase";

type Filter = "all" | "curated" | "suggested" | string;

export default function GamesBoard({ initialGames, categories, enabled=true }: { initialGames: Game[]; categories: string[]; enabled?:boolean }) {
  const [games, setGames] = useState(initialGames);
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", players: "", category: "", description: "", suggested_by: "" });
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const shown = useMemo(() => {
    const list = games.filter((g) => {
      if (filter === "all") return true;
      if (filter === "curated") return g.curated;
      if (filter === "suggested") return !g.curated;
      return g.category === filter;
    });
    return [...list].sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
  }, [games, filter]);

  const usedCategories = categories.filter((c) => games.some((g) => g.category === c));

  async function vote(id: string) {
    setBusy(id);
    try {
      const res = await fetch("/api/games/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_id: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save the vote.");
      if (res.ok) {
        setGames((gs) => gs.map((g) => (g.id === id ? { ...g, voted: data.voted, votes: data.votes } : g)));
      }
    } catch(err) {setMsg({kind:"error",text:err instanceof Error?err.message:"Could not save your vote."});} finally {
      setBusy(null);
    }
  }

  async function suggest(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't add that game.");
      if(data.game)setGames((gs) => [...gs, data.game]);
      setForm({ name: "", players: "", category: "", description: "", suggested_by: form.suggested_by });
      setMsg({ kind: "ok", text: `Thanks! ${data.name || data.game?.name} has been sent to the organizers for review.` });
    } catch (err) {
      setMsg({ kind: "error", text: err instanceof Error ? err.message : "Couldn't add that game." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="games-layout" style={{ marginTop: 24 }}>
      <div>
        <div className="tabs" role="group" aria-label="Filter games">
          {[
            ["all", "All games"],
            ["curated", "Organizer picks"],
            ["suggested", "Guest suggestions"],
            ...usedCategories.map((c) => [c, c]),
          ].map(([v, l]) => (
            <button key={v} className="tab" aria-pressed={filter === v} onClick={() => setFilter(v)}>
              {l}
            </button>
          ))}
        </div>

        <div className="game-list">
          {shown.length === 0 && <div className="card muted">No games here yet. Be the first to suggest one!</div>}
          {shown.map((g) => (
            <article id={g.name} key={g.id} className="game">
              <button
                className="vote"
                aria-pressed={!!g.voted}
                aria-label={g.voted ? `Remove your vote for ${g.name}` : `Vote for ${g.name}`}
                disabled={!enabled || busy === g.id}
                onClick={() => vote(g.id)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 4 4 14h5v6h6v-6h5z" />
                </svg>
                <span className="count">{g.votes}</span>
                <span className="lbl">{g.voted ? "Voted" : "Vote"}</span>
              </button>
              <div>
                <h3>{g.name}</h3>
                {g.description && <p>{g.description}</p>}
                <div className="tags">
                  {g.curated ? <span className="tag tag-teal">Organizer pick</span> : <span className="tag">Suggested{g.suggested_by ? ` by ${g.suggested_by}` : ""}</span>}
                  {g.category && <span className="tag">{g.category}</span>}
                  {g.players && <span className="tag">{g.players} players</span>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <aside className="card sticky">
        <h3>Suggest a game</h3>
        <p className="muted" style={{ fontSize: "0.95rem" }}>Know a game people would love? Suggest it here. Organizers review suggestions before publishing.</p>
        <form className="form" onSubmit={suggest}>
          <div className="field">
            <label htmlFor="g-name">Game name</label>
            <input id="g-name" className="input" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="row-2">
            <div className="field">
              <label htmlFor="g-players">Players</label>
              <input id="g-players" className="input" placeholder="2-6" maxLength={20} value={form.players} onChange={(e) => setForm({ ...form, players: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="g-cat">Type</label>
              <select id="g-cat" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">Pick one</option>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="g-desc">Why it&apos;s fun <span className="hint">optional</span></label>
            <textarea id="g-desc" className="input" maxLength={240} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="g-by">Your first name <span className="hint">optional</span></label>
            <input id="g-by" className="input" maxLength={40} value={form.suggested_by} onChange={(e) => setForm({ ...form, suggested_by: e.target.value })} />
          </div>
          {msg && <div className={`alert ${msg.kind === "ok" ? "alert-ok" : "alert-error"}`}>{msg.text}</div>}
          <button className="btn" type="submit" disabled={!enabled || saving}>{saving ? "Adding..." : "Add game"}</button>
        </form>
      </aside>
    </div>
  );
}
