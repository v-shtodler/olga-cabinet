/* Keep-alive for the free Supabase tier (projects pause after ~7 idle days): a Vercel cron calls this daily
   and it makes one real database request through the API. Protected by CRON_SECRET when that env var is set. */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = await createClient();
  const { error, status } = await supabase.from("settings").select("id").limit(1); // RLS: anonymous sees 0 rows, but the query runs
  return NextResponse.json({ ok: !error, status, at: new Date().toISOString() });
}
