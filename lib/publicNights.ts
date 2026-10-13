import {after} from "next/server";
import {flushNotifications} from "@/lib/notifications";
import { formatLong, formatShort, formatTime } from "./dates";
import { nightStats, processNight, upcomingNights, type NightStats } from "./nights";
import { isConfigured, type GameNight } from "./supabase";

export type PublicNight = GameNight & NightStats & {
  label: string;
  time: string;
  badge: { month: string; day: number; weekday: string };
};

/** Upcoming open nights with spots-left info. Never throws, so pages still render. */
export async function publicNights(limit = 4): Promise<PublicNight[]> {
  if (!isConfigured()) return [];
  try {
    const nights = (await upcomingNights()).slice(0, limit);
    const out: PublicNight[] = [];
    for (const n of nights) {
      await processNight(n);
      out.push({
        ...n,
        ...(await nightStats(n)),
        label: formatLong(n.date),
        time: `${formatTime(n.start_time)} to ${formatTime(n.end_time)}`,
        badge: formatShort(n.date),
      });
    }
    after(()=>flushNotifications().catch(()=>console.error("Notification dispatch deferred")));
    return out;
  } catch (e) {
    console.error(e);
    return [];
  }
}
