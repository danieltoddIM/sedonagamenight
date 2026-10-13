import type { Metadata } from "next";
import QRCode from "qrcode";
import { Logo } from "@/components/Art";
import PrintButton from "./PrintButton";
import Link from "next/link";
import { location, site, hosts } from "@/lib/config";
import { scheduleSentence } from "@/lib/dates";
import { publicNights } from "@/lib/publicNights";
import { siteUrl } from "@/lib/siteUrl";

export const metadata: Metadata = { title: "QR Code" };
export const dynamic = "force-dynamic";

const SOURCES = [
  ["mailer", "Mailer"],
  ["church", "Church bulletin"],
  ["flyer", "Flyer"],
] as const;

export default async function QrPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from: fromParam } = await searchParams;
  const from = SOURCES.some(([k]) => k === fromParam) ? fromParam! : "mailer";
  const base = await siteUrl();
  const target = `${base}/rsvp?from=${from}`;
  const next = (await publicNights(1))[0];
  const svg = await QRCode.toString(target, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#2a211c", light: "#ffffff" },
  });

  return (
    <section className="section">
      <div className="container">
        <div className="center no-print" style={{ marginBottom: 24 }}>
          <div className="eyebrow">Share it</div>
          <h1>RSVP QR code</h1>
          <p className="muted">
            Print this flyer for the church bulletin board, or download the code for slides and handouts.
          </p>
          <p className="muted" style={{ fontSize: "0.9rem" }}>
            Each version is tagged so the organizer page shows where RSVPs came from.
          </p>
          <div className="tabs" style={{ justifyContent: "center" }}>
            {SOURCES.map(([k, l]) => (
              <Link key={k} href={`/qr?from=${k}`} className="tab" aria-pressed={k === from} style={{ textDecoration: "none" }}>{l}</Link>
            ))}
          </div>
          <div className="btn-row" style={{ justifyContent: "center" }}>
            <PrintButton />
            <a className="btn btn-secondary" href={`/api/qr?format=png&from=${from}`} download={`sedona-game-night-qr-${from}.png`}>Download PNG</a>
            <a className="btn btn-secondary" href={`/api/qr?format=svg&from=${from}`} download={`sedona-game-night-qr-${from}.svg`}>Download SVG</a>
          </div>
        </div>

        <div className="flyer">
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
            <Logo size={40} />
            <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem" }}>{site.name}</strong>
          </div>
          <h2 style={{ marginTop: 16 }}>Come play with us!</h2>
          <p style={{ fontSize: "1.15rem", margin: 0 }}>{next?`${next.label}, ${next.time}`:"Our next date will be announced on the website."}</p>
          {next && <p className="muted" style={{ margin: "4px 0 0" }}>Next one: {next.label}, {next.time}</p>}
          <p style={{ margin: "8px 0 0", fontWeight: 600 }}>Free pizza · Limited seats, RSVP to save yours</p>
          <div className="qr" dangerouslySetInnerHTML={{ __html: svg }} />
          <p style={{ fontWeight: 700, fontSize: "1.2rem", margin: 0 }}>Scan to RSVP</p>
          <p className="muted" style={{ margin: "4px 0 16px" }}>{`${base}/rsvp`.replace(/^https?:\/\//, "")}</p>
          <p style={{ margin: 0 }}>
            <strong>{location.name}</strong> · {location.address}
          </p>
          <p className="muted" style={{ marginTop: 8, fontSize: "0.9rem" }}>Free · All ages · Hosted by {hosts.join(" and ")}</p>
        </div>
      </div>
    </section>
  );
}
