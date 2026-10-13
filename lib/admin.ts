import "server-only";
import {cookies} from "next/headers";
import {equal,signSession,validSession} from "./session";
export const ADMIN_COOKIE="sgn_admin";
const secret=()=>process.env.ADMIN_SESSION_SECRET||process.env.ADMIN_PASSWORD||"";
export function passwordMatches(input:string){const pw=process.env.ADMIN_PASSWORD;return !!pw&&pw.length>=16&&equal(input,pw)}
export function adminCookieValue(){return signSession(secret())}
export async function isAdmin(){if(!process.env.ADMIN_PASSWORD||process.env.ADMIN_PASSWORD.length<16)return false;return validSession((await cookies()).get(ADMIN_COOKIE)?.value||"",secret())}
