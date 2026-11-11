/* Keep-alive for the free Supabase tier (projects pause after ~7 idle days): a Vercel cron calls this daily
   and it makes one real database request through the API. Protected by CRON_SECRET when that env var is set. */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ error: "no supabase env" }, { status: 500 });
  const r = await fetch(`${url}/rest/v1/settings?select=id&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });
  return NextResponse.json({ ok: r.ok, status: r.status, at: new Date().toISOString() });
}
