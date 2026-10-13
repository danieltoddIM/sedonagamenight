import Link from "next/link";
import RsvpForm from "@/app/rsvp/RsvpForm";
import {churchOptions,pizza,smsConsentText} from "@/lib/config";
export const metadata={title:"Form preview",robots:{index:false,follow:false}};
export default function Preview(){return <section className="section"><div className="container narrow"><div className="alert alert-warn">Design preview only. This example is not a scheduled event and cannot accept real RSVPs.</div><h1>A little planning.<br/>A great night together.</h1><p>Preview the RSVP form. <Link href="/rsvp">Go to live game nights</Link>.</p><div className="card"><RsvpForm preview nights={[{id:"preview",label:"Example game night",time:"6:30 PM to 9:00 PM",capacity:25,spotsLeft:9,isFull:false,waitlistCount:0,inviteOnly:false,calendarUrl:""}]} defaultNight="preview" churches={churchOptions} pizzaOptions={pizza.options} consentText={smsConsentText} source=""/></div></div></section>}
