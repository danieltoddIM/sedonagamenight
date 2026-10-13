"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ManageActions({ token, mode, label, secondary }: { token: string; mode: "claim" | "cancel" | "reconfirm"; label: string; secondary?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/r/${token}`, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:mode})});
      const data=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(data.error||"We could not save that change. Please try again.");
      if(data.result==="expired")setError("The time to claim this spot has expired.");
      router.refresh();
    }catch(err){setError(err instanceof Error?err.message:"Please try again.");}finally{setBusy(false);}

  }

  // Cancelling asks once more, so a stray tap doesn't give away a seat
  if (mode === "cancel" && !confirming) {
    return (
      <button className={`btn ${secondary ? "btn-secondary" : "btn-secondary"}`} onClick={() => setConfirming(true)}>
        {label}
      </button>
    );
  }

  return (
    <div>
      {mode === "cancel" && <p style={{ marginBottom: 8 }}>Are you sure?</p>}
      <div className="btn-row">
        <button className={`btn ${mode === "claim" ? "" : "btn-secondary"}`} onClick={go} disabled={busy}>
          {busy ? "One sec..." : mode === "cancel" ? "Yes, cancel" : label}
        </button>
        {mode === "cancel" && (
          <button className="btn btn-secondary" onClick={() => setConfirming(false)} disabled={busy}>Never mind</button>
        )}
      </div>
      {error && <div className="alert alert-error" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}
