import QRCode from "qrcode";
import { siteUrl } from "@/lib/siteUrl";

// GET /api/qr?format=png|svg  -> QR code that points to the RSVP page
export async function GET(req: Request) {
  const format = new URL(req.url).searchParams.get("format") === "svg" ? "svg" : "png";
  const fromRaw = new URL(req.url).searchParams.get("from") ?? "";
  const from = /^[a-z0-9_-]{1,40}$/.test(fromRaw) ? fromRaw : "";
  const target = `${await siteUrl()}/rsvp${from ? `?from=${from}` : ""}`;
  const opts = { margin: 2, errorCorrectionLevel: "M" as const, color: { dark: "#2a211c", light: "#ffffff" } };

  if (format === "svg") {
    const svg = await QRCode.toString(target, { ...opts, type: "svg" });
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=3600" } });
  }
  const png = await QRCode.toBuffer(target, { ...opts, width: 1200 });
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" } });
}
