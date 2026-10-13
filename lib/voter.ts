import { randomUUID } from "crypto";
import { cookies } from "next/headers";

export const VOTER_COOKIE = "sgn_voter";

/** Anonymous visitor id kept in a cookie so each browser gets one vote per game. */
export async function getOrSetVoterId(): Promise<string> {
  const jar = await cookies();
  let id = jar.get(VOTER_COOKIE)?.value;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    id = randomUUID();
    jar.set(VOTER_COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365 * 2,
      path: "/",
    });
  }
  return id;
}
