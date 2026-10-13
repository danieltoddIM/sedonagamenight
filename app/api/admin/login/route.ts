import {guardMutation} from "@/lib/http";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminCookieValue, passwordMatches } from "@/lib/admin";

export async function POST(req: Request) {
  const blocked=await guardMutation(req,"admin/login",8);if(blocked)return blocked;
  const { password } = (await req.json().catch(() => null)) || {};
  if (!passwordMatches(String(password ?? ""))) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, adminCookieValue(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
