import { defaults, location, site } from "./config";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const pad = (n: number) => String(n).padStart(2, "0");

/** Today's date (YYYY-MM-DD) in Arizona. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: defaults.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** A date + 24h time in Arizona, as a real instant. */
export function arizonaInstant(date: string, time24: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time24.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, h + defaults.utcOffsetHours, min));
}

/** "6:30 PM" from "18:30" */
export function formatTime(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${pad(m)} ${h < 12 ? "AM" : "PM"}`;
}

export function formatLong(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DAYS[dow]}, ${MONTHS[m - 1]} ${d}`;
}

/** "Thu Oct 15" style, good for text messages */
export function formatCompact(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DAYS[dow].slice(0, 3)} ${MONTHS[m - 1].slice(0, 3)} ${d}`;
}

export function formatShort(date: string): { month: string; day: number; weekday: string } {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { month: MONTHS[m - 1].slice(0, 3), day: d, weekday: DAYS[dow] };
}

/** Readable Arizona time for an instant, e.g. "Wed Oct 14 at 7:00 PM" */
export function formatInstant(t: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: defaults.timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).formatToParts(t);
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? "";
  return `${get("weekday")} ${get("month")} ${get("day")} at ${get("hour")}:${get("minute")} ${get("dayPeriod")}`;
}

/** Suggested next date for a new night, based on defaults (e.g. third Thursday). */
export function suggestedDates(count = 3, after?: string): string[] {
  const start = after ?? todayISO();
  let [y, m] = start.split("-").map(Number);
  m -= 1;
  const out: string[] = [];
  while (out.length < count) {
    const day = dayInMonth(y, m);
    const iso = `${y}-${pad(m + 1)}-${pad(day)}`;
    if (iso > start) out.push(iso);
    m += 1;
    if (m > 11) { m = 0; y += 1; }
  }
  return out;
}

function dayInMonth(year: number, month: number): number {
  const { weekOfMonth, dayOfWeek } = defaults;
  if (weekOfMonth === -1) {
    const last = new Date(Date.UTC(year, month + 1, 0));
    return last.getUTCDate() - ((last.getUTCDay() - dayOfWeek + 7) % 7);
  }
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return 1 + ((dayOfWeek - first + 7) % 7) + (weekOfMonth - 1) * 7;
}

export function scheduleSentence(): string {
  const words = ["", "first", "second", "third", "fourth"];
  const which = defaults.weekOfMonth === -1 ? "last" : words[defaults.weekOfMonth];
  return `Usually the ${which} ${DAYS[defaults.dayOfWeek]} of the month, ${formatTime(defaults.start24)} to ${formatTime(defaults.end24)}`;
}

/** Google Calendar "add event" link. */
export function googleCalendarUrl(date: string, start24: string, end24: string): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: site.name,
    dates: `${fmt(arizonaInstant(date, start24))}/${fmt(arizonaInstant(date, end24))}`,
    details: site.description,
    location: `${location.name}, ${location.address}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
