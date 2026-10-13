import {guardMutation} from "@/lib/http";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin";

export async function POST(req:Request) {
 const blocked=await guardMutation(req,"logout",30);if(blocked)return blocked;
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
