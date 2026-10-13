"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="btn btn-secondary btn-small"
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST",headers:{"Content-Type":"application/json"},body:"{}" });
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
