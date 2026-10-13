"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Game } from "@/lib/supabase";

export default function AdminGames({ games, categories }: { games: Game[]; categories: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", players: "", category: "", description: "" });

  async function act(payload: Record<string, unknown>) {
    setBusy(true);
    await fetch("/api/admin/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      <form
        className="card form"
        style={{ marginBottom: 16 }}
        onSubmit={async (e) => {
          e.preventDefault();
          await act({ action: "add", ...form });
          setForm({ name: "", players: "", category: "", description: "" });
        }}
      >
        <h3 style={{ margin: 0 }}>Add an organizer pick</h3>
        <div className="row-2">
          <input className="input" placeholder="Game name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="row-2">
            <input className="input" placeholder="Players (2-6)" value={form.players} onChange={(e) => setForm({ ...form, players: e.target.value })} />
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">Type</option>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <input className="input" placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button className="btn btn-small" disabled={busy} style={{ justifySelf: "start" }}>Add game</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Game</th><th>Votes</th><th>Type</th><th>Source</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {games.map((g) => (
              <tr key={g.id} style={g.hidden ? { opacity: 0.5 } : undefined}>
                <td><strong>{g.name}</strong>{g.players ? <span className="muted"> · {g.players}</span> : null}</td>
                <td>{g.votes}</td>
                <td>{g.category ?? ""}</td>
                <td>{g.curated ? "Organizer pick" : `Guest${g.suggested_by ? ` (${g.suggested_by})` : ""}`}</td>
                <td>{g.hidden ? "Hidden" : "Visible"}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <div className="btn-row" style={{ gap: 6, flexWrap: "nowrap" }}>
                    <button className="btn btn-secondary btn-small" disabled={busy} onClick={() => act({ action: "update", id: g.id, curated: !g.curated })}>
                      {g.curated ? "Unpick" : "Make pick"}
                    </button>
                    <button className="btn btn-secondary btn-small" disabled={busy} onClick={() => act({ action: "update", id: g.id, hidden: !g.hidden })}>
                      {g.hidden ? "Show" : "Hide"}
                    </button>
                    <button
                      className="btn btn-secondary btn-small"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`Delete ${g.name} and its votes?`)) act({ action: "delete", id: g.id });
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
