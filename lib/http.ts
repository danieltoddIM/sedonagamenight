import "server-only";
import {createHash} from "node:crypto";
import {NextResponse} from "next/server";
import {db,isConfigured} from "./supabase";
const buckets=new Map<string,{until:number;count:number}>();
/** CSRF checks plus a distributed fixed-window limiter when the database is connected. */
export async function guardMutation(req:Request,scope:string,limit=30){
 const origin=req.headers.get("origin");const allowed=new Set([new URL(req.url).origin]);
 if(process.env.NEXT_PUBLIC_SITE_URL){try{allowed.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).origin)}catch{}}
 if(!origin||!allowed.has(origin)||req.headers.get("sec-fetch-site")==="cross-site")return NextResponse.json({error:"Please submit this form from the website."},{status:403});
 if(!req.headers.get("content-type")?.includes("application/json"))return NextResponse.json({error:"JSON request required."},{status:415});
 if(Number(req.headers.get("content-length")||0)>32768)return NextResponse.json({error:"Request is too large."},{status:413});
 // x-forwarded-for must be set/overwritten by the trusted hosting reverse proxy.
 const ip=(req.headers.get("x-forwarded-for")||"local").split(",")[0].trim();
 const key=createHash("sha256").update(`${scope}:${ip}`).digest("hex");
 let ok=true;
 if(isConfigured()){
  const {data,error}=await db().rpc("sgn_rate_limit",{p_key:key,p_limit:limit,p_seconds:600});
  if(error){console.error("Rate limit unavailable",error.code);return NextResponse.json({error:"The service is temporarily unavailable. Please try again."},{status:503})}ok=!!data;
 }else{const now=Date.now();if(buckets.size>10000){for(const [k,v] of buckets)if(v.until<now)buckets.delete(k)}const b=buckets.get(key);if(!b||b.until<now)buckets.set(key,{until:now+600000,count:1});else ok=++b.count<=limit;}
 return ok?null:NextResponse.json({error:"Please wait a few minutes before trying again."},{status:429,headers:{"Retry-After":"600"}});
}
