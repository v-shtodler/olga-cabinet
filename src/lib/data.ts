/* Server-side data access. Every function runs with the user's session; RLS does the filtering. */
import { createClient } from "@/lib/supabase/server";
import type { Client, ClientPref, Settings, ShootView, TaxQuarter, Preset, Payment, Note, ChecklistItem } from "./domain";

export async function getSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function getSettings(): Promise<Settings> {
  const { supabase } = await getSession();
  const { data } = await supabase.from("settings").select("*").single();
  return data as Settings;
}
export async function getPresets(): Promise<Preset[]> {
  const { supabase } = await getSession();
  const { data } = await supabase.from("shoot_type_presets").select("*").order("sort");
  return (data ?? []) as Preset[];
}
export async function getClients(): Promise<Client[]> {
  const { supabase } = await getSession();
  const { data } = await supabase.from("clients").select("*").eq("archived", false).order("name");
  return (data ?? []) as Client[];
}
export async function getClientPrefs(clientId?: string): Promise<ClientPref[]> {
  const { supabase } = await getSession();
  let q = supabase.from("client_prefs").select("*").order("sort");
  if (clientId) q = q.eq("client_id", clientId);
  const { data } = await q;
  return (data ?? []) as ClientPref[];
}
export async function getShoots(opts: { from?: string; to?: string; clientId?: string } = {}): Promise<ShootView[]> {
  const { supabase } = await getSession();
  let q = supabase.from("v_shoots").select("*").order("date");
  if (opts.from) q = q.gte("date", opts.from);
  if (opts.to) q = q.lte("date", opts.to);
  if (opts.clientId) q = q.eq("client_id", opts.clientId);
  const { data } = await q;
  return (data ?? []).map(num) as ShootView[];
}
export async function getShoot(id: string) {
  const { supabase } = await getSession();
  const [{ data: shoot }, { data: payments }, { data: notes }, { data: checklist }] = await Promise.all([
    supabase.from("v_shoots").select("*").eq("id", id).single(),
    supabase.from("payments").select("*").eq("shoot_id", id).order("paid_on"),
    supabase.from("shoot_notes").select("*").eq("shoot_id", id).order("created_at", { ascending: false }),
    supabase.from("checklist_items").select("*").eq("shoot_id", id).order("sort"),
  ]);
  if (!shoot) return null;
  return { shoot: num(shoot) as ShootView, payments: (payments ?? []) as Payment[], notes: (notes ?? []) as Note[], checklist: (checklist ?? []) as ChecklistItem[] };
}
export async function getBlockedDays(): Promise<Set<string>> {
  const { supabase } = await getSession();
  const { data } = await supabase.from("blocked_days").select("day");
  return new Set((data ?? []).map((r) => r.day as string));
}
export async function getDismissed(): Promise<Set<string>> {
  const { supabase } = await getSession();
  const { data } = await supabase.from("dismissed_insights").select("key").gte("until", new Date().toISOString().slice(0, 10));
  return new Set((data ?? []).map((r) => r.key as string));
}
export async function getTaxQuarters(): Promise<TaxQuarter[]> {
  const { supabase } = await getSession();
  const { data } = await supabase.from("v_tax_quarters").select("*").order("year").order("quarter");
  return (data ?? []) as TaxQuarter[];
}
export async function getTaxPaid(): Promise<Set<string>> {
  const { supabase } = await getSession();
  const { data } = await supabase.from("tax_payments").select("period_key");
  return new Set((data ?? []).map((r) => r.period_key as string));
}
export async function getIncomeMonthly(): Promise<{ month: string; income: number }[]> {
  const { supabase } = await getSession();
  const { data } = await supabase.from("v_income_monthly").select("month, income").order("month");
  return (data ?? []).map((r) => ({ month: r.month as string, income: Number(r.income) }));
}
export async function getClientStats() {
  const { supabase } = await getSession();
  const { data } = await supabase.from("v_client_stats").select("*");
  return (data ?? []).map((r) => ({ ...r, shoots: Number(r.shoots), total: Number(r.total), avg_check: Number(r.avg_check), open_balance: Number(r.open_balance), avg_pay_delay_days: r.avg_pay_delay_days == null ? null : Number(r.avg_pay_delay_days) }));
}

/* numeric columns come back as strings from PostgREST for numeric(…) */
function num<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = { ...row };
  for (const k of ["price", "paid", "balance", "total_hours", "hourly_rate", "shoot_hours", "retouch_hours", "prep_hours"]) if (out[k] != null) out[k] = Number(out[k]);
  return out as T;
}
