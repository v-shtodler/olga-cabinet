/* iCalendar feed for the phone (subscribe via webcal://…). Public URL guarded by the per-owner secret token;
   data comes from the security-definer function ical_feed (supabase/migrations/0005_ical.sql). */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
type Row = { id: string; date: string; start_time: string | null; location: string | null; status: string; client_name: string; deadline: string | null; delivered_on: string | null };

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const d8 = (iso: string) => iso.replace(/-/g, "");
const dt = (iso: string, t: string) => `${d8(iso)}T${t.slice(0, 5).replace(":", "")}00`;
const STATUS: Record<string, string> = { request: "запит", confirmed: "підтверджено", shot: "відзнято", delivered: "віддано", paid: "оплачено" };

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{48}$/.test(token)) return new NextResponse("not found", { status: 404 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc("ical_feed", { p_token: token });
  if (error) return new NextResponse(`feed unavailable: ${error.message}`, { status: 503 });
  const rows = (data ?? []) as Row[];
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//olgavoychik.space//cabinet//UK", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Зйомки", "X-WR-TIMEZONE:Europe/Kyiv", "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H"];
  for (const r of rows) {
    const summary = `${r.status === "request" ? "? " : ""}📸 ${r.client_name}${r.location ? ` · ${r.location}` : ""}`;
    lines.push("BEGIN:VEVENT", `UID:shoot-${r.id}@olgavoychik.space`, `DTSTAMP:${stamp}`, `SUMMARY:${esc(summary)}`);
    if (r.start_time) { lines.push(`DTSTART;TZID=Europe/Kyiv:${dt(r.date, r.start_time)}`, `DTEND;TZID=Europe/Kyiv:${dt(r.date, r.start_time)}`); }
    else { lines.push(`DTSTART;VALUE=DATE:${d8(r.date)}`, `DTEND;VALUE=DATE:${d8(r.date)}`); }
    if (r.location) lines.push(`LOCATION:${esc(r.location)}`);
    lines.push(`DESCRIPTION:${esc(`Статус: ${STATUS[r.status] ?? r.status}${r.deadline ? `\nВіддати до: ${r.deadline}` : ""}`)}`, `URL:https://app.olgavoychik.space/shoots/${r.id}`, "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", `DESCRIPTION:${esc(`Завтра зйомка: ${r.client_name}`)}`, "END:VALARM", "END:VEVENT");
    if (r.deadline && !r.delivered_on && (r.status === "shot" || r.status === "confirmed")) {
      lines.push("BEGIN:VEVENT", `UID:deadline-${r.id}@olgavoychik.space`, `DTSTAMP:${stamp}`, `SUMMARY:${esc(`⏱ Віддати · ${r.client_name}`)}`, `DTSTART;VALUE=DATE:${d8(r.deadline)}`, `DTEND;VALUE=DATE:${d8(r.deadline)}`, `URL:https://app.olgavoychik.space/shoots/${r.id}`, "END:VEVENT");
    }
  }
  lines.push("END:VCALENDAR");
  const body = lines.map((l) => l.length > 73 ? l.match(/.{1,73}/g)!.join("\r\n ") : l).join("\r\n") + "\r\n";
  return new NextResponse(body, { headers: { "content-type": "text/calendar; charset=utf-8", "content-disposition": 'inline; filename="shoots.ics"', "cache-control": "private, max-age=300" } });
}
