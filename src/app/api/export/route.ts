/* Full backup of the owner's data as one JSON file (RLS scopes every table to the signed-in user). */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const TABLES = ["settings", "clients", "client_prefs", "shoots", "payments", "expenses", "shoot_notes", "checklist_items", "shoot_tags", "blocked_days", "tax_payments"] as const;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const out: Record<string, unknown> = { exported_at: new Date().toISOString(), owner: user.email };
  for (const t of TABLES) { const { data, error } = await supabase.from(t).select("*"); out[t] = error ? { error: error.message } : data; }
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(out, null, 2), { headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="olga-cabinet-backup-${date}.json"`, "cache-control": "no-store" } });
}
