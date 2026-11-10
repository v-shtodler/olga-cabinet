"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { nowKyiv, STATUSES, type ShootStatus, todayISO } from "@/lib/domain";
import { addDays, format } from "date-fns";

async function db() { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/login"); return { supabase, uid: user.id }; }
function all() { revalidatePath("/", "layout"); }

/* ---------- assistant ---------- */
export async function dismissInsight(key: string) {
  const { supabase } = await db();
  await supabase.from("dismissed_insights").upsert({ key, until: format(addDays(nowKyiv(), 7), "yyyy-MM-dd") });
  all();
}
export async function markTaxPaid(periodKey: string) {
  const { supabase } = await db();
  await supabase.from("tax_payments").upsert({ period_key: periodKey, paid_on: todayISO() });
  all();
}

/* ---------- calendar ---------- */
export async function toggleBlockedDay(day: string) {
  const { supabase } = await db();
  const { data } = await supabase.from("blocked_days").select("day").eq("day", day).maybeSingle();
  if (data) await supabase.from("blocked_days").delete().eq("day", day); else await supabase.from("blocked_days").insert({ day });
  all();
}

/* ---------- shoots ---------- */
const ShootInput = z.object({
  client_id: z.string().uuid(), type: z.enum(["lookbook", "product", "campaign", "portrait", "other"]), title: z.string().min(1).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), start_time: z.string().optional(), end_time: z.string().optional(), location: z.string().max(200).optional(),
  price: z.coerce.number().min(0), deposit_pct: z.coerce.number().min(0).max(100), photos: z.coerce.number().min(0), extra_photos: z.coerce.number().min(0),
  delivery_days: z.coerce.number().min(0), shoot_hours: z.coerce.number().min(0), retouch_hours: z.coerce.number().min(0), rights: z.string().max(200).optional(),
  note: z.string().max(2000).optional(), deposit_received: z.coerce.boolean().optional(),
});
export async function createShoot(formData: FormData) {
  const { supabase } = await db();
  const raw = Object.fromEntries(formData.entries()); raw.deposit_received = formData.get("deposit_received") === "on" ? "true" : "";
  const p = ShootInput.parse(raw);
  const status: ShootStatus = p.deposit_received ? "confirmed" : "request";
  const { data: shoot, error } = await supabase.from("shoots").insert({
    client_id: p.client_id, type: p.type, title: p.title, status, date: p.date, start_time: p.start_time || null, end_time: p.end_time || null, location: p.location || null,
    price: p.price, deposit_pct: p.deposit_pct, photos: p.photos, extra_photos: p.extra_photos, delivery_days: p.delivery_days, shoot_hours: p.shoot_hours, retouch_hours: p.retouch_hours, rights: p.rights || null,
  }).select("id").single();
  if (error || !shoot) throw new Error(error?.message ?? "insert failed");
  if (p.note) await supabase.from("shoot_notes").insert({ shoot_id: shoot.id, text: p.note });
  if (status === "confirmed" && p.deposit_pct > 0) await supabase.from("payments").insert({ shoot_id: shoot.id, amount: Math.round(p.price * p.deposit_pct / 100), paid_on: todayISO(), kind: "deposit", method: "invoice" });
  all(); redirect(`/shoots/${shoot.id}`);
}
export async function updateShootField(id: string, field: "title" | "location" | "rights" | "price" | "photos_delivered", value: string) {
  const { supabase } = await db();
  const v = field === "price" || field === "photos_delivered" ? Number(value) : value;
  await supabase.from("shoots").update({ [field]: v }).eq("id", id);
  all();
}
export async function advanceShoot(id: string) {
  const { supabase } = await db();
  const { data: s } = await supabase.from("v_shoots").select("*").eq("id", id).single();
  if (!s) return;
  const i = STATUSES.indexOf(s.status); if (i < 0 || i >= STATUSES.length - 1) return;
  const next = STATUSES[i + 1]; const patch: Record<string, unknown> = { status: next };
  if (next === "confirmed" && Number(s.paid) === 0 && s.deposit_pct > 0) await supabase.from("payments").insert({ shoot_id: id, amount: Math.round(Number(s.price) * s.deposit_pct / 100), paid_on: todayISO(), kind: "deposit", method: "invoice" });
  if (next === "delivered") { patch.delivered_on = todayISO(); if (Number(s.balance) > 0) patch.invoice_sent_on = todayISO(); }
  if (next === "paid" && Number(s.balance) > 0) await supabase.from("payments").insert({ shoot_id: id, amount: Number(s.balance), paid_on: todayISO(), kind: "balance", method: "invoice" });
  await supabase.from("shoots").update(patch).eq("id", id);
  all();
}
export async function cancelShoot(id: string) {
  const { supabase } = await db();
  await supabase.from("shoots").update({ status: "cancelled" }).eq("id", id);
  all(); redirect("/shoots");
}
export async function markInvoiceSent(id: string) {
  const { supabase } = await db();
  await supabase.from("shoots").update({ invoice_sent_on: todayISO() }).eq("id", id);
  all();
}

/* ---------- payments ---------- */
const PaymentInput = z.object({ shoot_id: z.string().uuid(), amount: z.coerce.number().positive(), paid_on: z.string(), kind: z.enum(["deposit", "balance", "extra", "refund"]), method: z.enum(["invoice", "card", "cash", "other"]) });
export async function addPayment(formData: FormData) {
  const { supabase } = await db();
  const p = PaymentInput.parse(Object.fromEntries(formData.entries()));
  await supabase.from("payments").insert(p);
  const { data: s } = await supabase.from("v_shoots").select("status, balance").eq("id", p.shoot_id).single();
  if (s?.status === "delivered" && Number(s.balance) <= 0) await supabase.from("shoots").update({ status: "paid" }).eq("id", p.shoot_id);
  if (s?.status === "request") await supabase.from("shoots").update({ status: "confirmed" }).eq("id", p.shoot_id);
  all();
}
export async function deletePayment(id: string) { const { supabase } = await db(); await supabase.from("payments").delete().eq("id", id); all(); }

/* ---------- notes / checklist ---------- */
export async function addNote(shootId: string, formData: FormData) {
  const text = String(formData.get("text") ?? "").trim(); if (!text) return;
  const { supabase } = await db(); await supabase.from("shoot_notes").insert({ shoot_id: shootId, text }); all();
}
export async function addChecklistItem(shootId: string, formData: FormData) {
  const text = String(formData.get("text") ?? "").trim(); if (!text) return;
  const { supabase } = await db(); const { count } = await supabase.from("checklist_items").select("*", { count: "exact", head: true }).eq("shoot_id", shootId);
  await supabase.from("checklist_items").insert({ shoot_id: shootId, text, sort: (count ?? 0) + 1 }); all();
}
export async function addDefaultChecklist(shootId: string) {
  const { supabase } = await db();
  const items = ["Передоплата отримана", "Референси й мудборд узгоджено", "RAW скопійовано на 2 диски", "Відбір надіслано на затвердження", "Ретуш віддано", "Фінальний рахунок виставлено"];
  await supabase.from("checklist_items").insert(items.map((text, sort) => ({ shoot_id: shootId, text, sort }))); all();
}
export async function toggleChecklist(id: string, done: boolean) { const { supabase } = await db(); await supabase.from("checklist_items").update({ done }).eq("id", id); all(); }

/* ---------- clients ---------- */
const ClientInput = z.object({ name: z.string().min(1).max(120), kind: z.string().max(80).optional(), contact_name: z.string().max(120).optional(), contact_email: z.string().max(120).optional(), contact_phone: z.string().max(40).optional(), default_deposit_pct: z.coerce.number().min(0).max(100), pref: z.string().max(300).optional() });
export async function createClient_(formData: FormData) {
  const { supabase } = await db();
  const p = ClientInput.parse(Object.fromEntries(formData.entries()));
  const { count } = await supabase.from("clients").select("*", { count: "exact", head: true });
  const { data: c, error } = await supabase.from("clients").insert({ name: p.name, kind: p.kind || null, contact_name: p.contact_name || null, contact_email: p.contact_email || null, contact_phone: p.contact_phone || null, default_deposit_pct: p.default_deposit_pct, avatar_hue: (count ?? 0) % 8 }).select("id").single();
  if (error || !c) throw new Error(error?.message ?? "insert failed");
  if (p.pref) await supabase.from("client_prefs").insert({ client_id: c.id, text: p.pref });
  all(); redirect(`/clients/${c.id}`);
}
export async function addClientPref(clientId: string, formData: FormData) {
  const text = String(formData.get("text") ?? "").trim(); if (!text) return;
  const { supabase } = await db(); await supabase.from("client_prefs").insert({ client_id: clientId, text }); all();
}
export async function deleteClientPref(id: string) { const { supabase } = await db(); await supabase.from("client_prefs").delete().eq("id", id); all(); }

/* ---------- settings ---------- */
const SettingsInput = z.object({ display_name: z.string().min(1).max(60), ep_rate: z.coerce.number().min(0).max(30), vz_rate: z.coerce.number().min(0).max(10), esv_monthly: z.coerce.number().min(0), income_limit: z.coerce.number().min(0), rates_from: z.string(), remind_days: z.coerce.number().min(1).max(14), month_capacity: z.coerce.number().min(1).max(60) });
export async function saveSettings(formData: FormData) {
  const { supabase, uid } = await db();
  const p = SettingsInput.parse(Object.fromEntries(formData.entries()));
  await supabase.from("settings").update(p).eq("owner_id", uid); all();
}
export async function savePreset(formData: FormData) {
  const { supabase } = await db();
  const type = String(formData.get("type"));
  await supabase.from("shoot_type_presets").update({ price: Number(formData.get("price")), photos: Number(formData.get("photos")), extra_photos: Number(formData.get("extra_photos")), delivery_days: Number(formData.get("delivery_days")), shoot_hours: Number(formData.get("shoot_hours")), retouch_hours: Number(formData.get("retouch_hours")) }).eq("type", type);
  all();
}
