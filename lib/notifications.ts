import "server-only";
import {db,isConfigured,type Signup} from "./supabase";
import {klaviyoEnabled,subscribeSms,trackEvent,type KlaviyoMetric} from "./klaviyo";
import {getNight,manageUrl,nightProps,party,siteBase,waitlistPosition} from "./nights";
import {formatInstant,arizonaInstant} from "./dates";
type NotificationJob = {id:string;signup_id:string;metric:string;properties:Record<string,unknown>;dedupe_key:string;created_at:string;attempts:number};
/** Durable outbox. API acceptance is not a delivery receipt; Klaviyo flows must be configured separately. */
export async function flushNotifications(){
 if(!isConfigured()||!klaviyoEnabled())return {accepted:0,failed:0,disabled:true};
 let accepted=0,failed=0,processed=0;const deadline=Date.now()+40000;
 while(Date.now()<deadline&&processed<100){
 const {data:jobs,error}=await db().rpc("sgn_claim_notifications",{p_limit:5});if(error)throw error;
 const batch=(jobs??[]) as NotificationJob[];if(!batch.length)break;processed+=batch.length;
 await Promise.all(batch.map(async (job)=>{try{
  const {data,error:readError}=await db().from("signups").select("*").eq("id",job.signup_id).maybeSingle();if(readError)throw readError;
  const s=data as Signup|null;const n=s?await getNight(s.event_id):null;
  const targetDate=String(job.properties?.event_date||n?.date||"2000-01-01");
  const expectedStates:Record<string,string[]>={"Game Night Waitlisted":["waitlist"],"Game Night Offer Expired":["expired"],"Game Night Cancelled":["cancelled","declined"]};
  const superseded=!!s&&!!expectedStates[job.metric]&&!expectedStates[job.metric].includes(s.status);
  const stale=superseded||!s||!n||!s.sms_consent||arizonaInstant(targetDate,job.metric==="Game Night New Date Invite"?"23:59":n.end_time).getTime()<Date.now()||(job.metric==="Subscribe SMS"&&Date.now()-Date.parse(job.created_at)>15*60*1000)||(job.metric==="Game Night Spot Offered"&&(s.status!=="offered"||!s.offer_expires_at||Date.parse(s.offer_expires_at)<=Date.now()))||(["Game Night RSVP Confirmed","Game Night Reminder"].includes(job.metric)&&s.status!=="confirmed");
  if(!stale&&s&&n){
   if(job.metric==="Subscribe SMS")await subscribeSms({phone:s.phone,email:s.email,source:s.source});
   else await trackEvent(job.metric as KlaviyoMetric,s,{...nightProps(n),party_size:party(s),pizza:s.pizza,position:await waitlistPosition(s),manage_url:manageUrl(s.token),claim_url:manageUrl(s.token),rsvp_url:`${siteBase()}/rsvp?event=${n.id}`,...(s.offer_expires_at?{expires_at:s.offer_expires_at,expires_text:formatInstant(new Date(s.offer_expires_at))}:{}),...job.properties},job.dedupe_key);
   accepted++;
  }
  const {error:doneError}=await db().from("notification_jobs").update({completed_at:new Date().toISOString(),locked_until:null,last_error:stale?"Skipped: no current consent or event no longer applicable":null}).eq("id",job.id);if(doneError)throw doneError;
 }catch(err){failed++;console.error("Notification job failed",job.id);await db().from("notification_jobs").update({locked_until:null,last_error:"Provider request failed; scheduled for retry",available_at:new Date(Date.now()+Math.min(3600000,30000*2**Math.min(job.attempts,7))).toISOString()}).eq("id",job.id);}}));
 }
 return {accepted,failed,processed,disabled:false};
}
