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
  client_id: z.string().min(1), new_client_name: z.string().max(120).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), start_time: z.string().optional(), location: z.string().max(200).optional(),
  price: z.coerce.number().min(0), deposit_pct: z.coerce.number().min(0).max(100),
  deadline_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  note: z.string().max(2000).optional(), deposit_received: z.coerce.boolean().optional(), deposit_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
});
export async function createShoot(formData: FormData) {
  const { supabase } = await db();
  const raw = Object.fromEntries(formData.entries()); raw.deposit_received = formData.get("deposit_received") === "on" ? "true" : "";
  const p = ShootInput.parse(raw);
  let clientId = p.client_id;
  if (clientId === "__new") {
    const name = (p.new_client_name ?? "").trim(); if (!name) throw new Error("Вкажіть назву нового замовника");
    const { data: c, error: ce } = await supabase.from("clients").insert({ name, default_deposit_pct: p.deposit_pct }).select("id").single();
    if (ce || !c) throw new Error(ce?.message ?? "client insert failed");
    clientId = c.id;
  }
  const status: ShootStatus = p.deposit_received ? "confirmed" : "request";
  const { data: shoot, error } = await supabase.from("shoots").insert({
    client_id: clientId, status, date: p.date, start_time: p.start_time || null, location: p.location || null,
    price: p.price, deposit_pct: p.deposit_pct, deadline_on: p.deadline_on || null,
  }).select("id").single();
  if (error || !shoot) throw new Error(error?.message ?? "insert failed");
  if (p.note) await supabase.from("shoot_notes").insert({ shoot_id: shoot.id, text: p.note });
  if (status === "confirmed" && p.deposit_pct > 0) await supabase.from("payments").insert({ shoot_id: shoot.id, amount: Math.round(p.price * p.deposit_pct / 100), paid_on: p.deposit_on || todayISO(), kind: "deposit", method: "invoice" });
  all(); redirect(`/shoots/${shoot.id}`);
}
/** Full edit of a shoot's terms (the same form as creation; status, payments and notes are untouched). */
export async function updateShoot(id: string, formData: FormData) {
  const { supabase } = await db();
  const p = ShootInput.parse(Object.fromEntries(formData.entries()));
  const { error } = await supabase.from("shoots").update({
    client_id: p.client_id, date: p.date, start_time: p.start_time || null, location: p.location || null,
    price: p.price, deposit_pct: p.deposit_pct, deadline_on: p.deadline_on || null,
  }).eq("id", id);
  if (error) throw new Error(error.message);
  all();
}
export async function advanceShoot(id: string) {
  const { supabase } = await db();
  const { data: s } = await supabase.from("v_shoots").select("*").eq("id", id).single();
  if (!s) return;
  const i = STATUSES.indexOf(s.status); if (i < 0 || i >= STATUSES.length - 1) return;
  const next = STATUSES[i + 1]; const patch: Record<string, unknown> = { status: next };
  // A shoot entered after the fact is dated by the shoot, not by the day someone clicked the button:
  // otherwise months of past work pile up on today and the income chart and the quarter are wrong.
  // The date stays editable in the shoot card.
  const today = todayISO();
  const on = (d?: string | null) => (d && d < today ? d : today);
  if (next === "confirmed" && Number(s.paid) === 0 && s.deposit_pct > 0) await supabase.from("payments").insert({ shoot_id: id, amount: Math.round(Number(s.price) * s.deposit_pct / 100), paid_on: on(s.date), kind: "deposit", method: "invoice" });
  if (next === "delivered") { patch.delivered_on = on(s.deadline ?? s.date); if (Number(s.balance) > 0) patch.invoice_sent_on = on(s.deadline ?? s.date); }
  if (next === "paid" && Number(s.balance) > 0) await supabase.from("payments").insert({ shoot_id: id, amount: Number(s.balance), paid_on: on(s.delivered_on ?? s.date), kind: "balance", method: "invoice" });
  await supabase.from("shoots").update(patch).eq("id", id);
  all();
}
/** Permanent delete — only for cancelled shoots (payments, notes, checklist go with it by cascade). */
export async function deleteShoot(id: string) {
  const { supabase } = await db();
  const { data: s } = await supabase.from("shoots").select("status").eq("id", id).single();
  if (!s) return;
  if (s.status !== "cancelled") throw new Error("Спочатку скасуйте зйомку — видалити можна лише скасовану.");
  const { error } = await supabase.from("shoots").delete().eq("id", id);
  if (error) throw new Error(error.message);
  all(); redirect("/shoots");
}
/** Delete a client that has no shoots (the database refuses otherwise). */
/** Delete a client. With shoots, the caller must pass withShoots — the shoots (and their payments,
    notes and checklists, by cascade) go too, which also changes the income and tax figures. */
export async function deleteClient(id: string, withShoots = false) {
  const { supabase } = await db();
  const { count } = await supabase.from("shoots").select("*", { count: "exact", head: true }).eq("client_id", id);
  if ((count ?? 0) > 0) {
    if (!withShoots) throw new Error(`У замовника ${count} ${count === 1 ? "зйомка" : "зйомок"} — підтвердьте видалення разом із ними.`);
    const { error: se } = await supabase.from("shoots").delete().eq("client_id", id);
    if (se) throw new Error(se.message);
  }
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw new Error(error.message);
  all(); redirect("/clients");
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
export async function deleteNote(id: string) { const { supabase } = await db(); await supabase.from("shoot_notes").delete().eq("id", id); all(); }
export async function deleteChecklistItem(id: string) { const { supabase } = await db(); await supabase.from("checklist_items").delete().eq("id", id); all(); }
export async function toggleChecklist(id: string, done: boolean) { const { supabase } = await db(); await supabase.from("checklist_items").update({ done }).eq("id", id); all(); }

/* ---------- clients ---------- */
const ClientInput = z.object({ name: z.string().min(1).max(120), kind: z.string().max(80).optional(), contact_name: z.string().max(120).optional(), contact_email: z.string().max(120).optional(), contact_phone: z.string().max(40).optional(), default_deposit_pct: z.coerce.number().min(0).max(100), pref: z.string().max(300).optional() });
export async function updateClient(id: string, formData: FormData) {
  const { supabase } = await db();
  const p = ClientInput.omit({ pref: true }).parse(Object.fromEntries(formData.entries()));
  const { error } = await supabase.from("clients").update({ name: p.name, kind: p.kind || null, contact_name: p.contact_name || null, contact_email: p.contact_email || null, contact_phone: p.contact_phone || null, default_deposit_pct: p.default_deposit_pct }).eq("id", id);
  if (error) throw new Error(error.message);
  all();
}
export async function createClient_(formData: FormData) {
  const { supabase } = await db();
  const p = ClientInput.parse(Object.fromEntries(formData.entries()));
  const { count } = await supabase.from("clients").select("*", { count: "exact", head: true });
  const { data: c, error } = await supabase.from("clients").insert({ name: p.name, kind: p.kind || null, contact_name: p.contact_name || null, contact_email: p.contact_email || null, contact_phone: p.contact_phone || null, default_deposit_pct: p.default_deposit_pct, avatar_hue: (count ?? 0) % 8 }).select("id").single();
  if (error || !c) throw new Error(error?.message ?? "insert failed");
  if (p.pref) await supabase.from("client_prefs").insert({ client_id: c.id, text: p.pref });
  all(); redirect(`/clients/${c.id}`);
}
/** Brand look of a client: the colour its events get in the calendar, and an optional 1:1 photo. */
export async function saveClientLook(id: string, patch: { avatar_hue?: number; avatar_url?: string | null }) {
  const { supabase } = await db();
  const row: { avatar_hue?: number; avatar_url?: string | null } = {};
  if (patch.avatar_hue !== undefined) {
    const h = Math.trunc(Number(patch.avatar_hue));
    if (!Number.isFinite(h) || h < 0 || h > 7) throw new Error("Невідомий колір.");
    row.avatar_hue = h;
  }
  if (patch.avatar_url !== undefined) {
    const u = patch.avatar_url;
    if (u !== null) {
      if (!/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(u)) throw new Error("Непідтримуваний формат зображення.");
      if (u.length > 180_000) throw new Error("Фото завелике — спробуйте інше.");
    }
    row.avatar_url = u;
  }
  if (!Object.keys(row).length) return;
  const { error } = await supabase.from("clients").update(row).eq("id", id);
  if (error) throw new Error(error.code === "42703" ? "Спочатку застосуйте міграцію 0011_client_look.sql у Supabase → SQL Editor." : error.message);
  all();
}
export async function addClientPref(clientId: string, formData: FormData) {
  const text = String(formData.get("text") ?? "").trim(); if (!text) return;
  const { supabase } = await db(); await supabase.from("client_prefs").insert({ client_id: clientId, text }); all();
}
export async function deleteClientPref(id: string) { const { supabase } = await db(); await supabase.from("client_prefs").delete().eq("id", id); all(); }

/* ---------- settings ---------- */
const SettingsInput = z.object({ display_name: z.string().min(1).max(60), fop_name: z.string().max(160).optional(), ipn: z.string().max(20).optional(), iban: z.string().max(40).optional(), bank_name: z.string().max(120).optional(), legal_address: z.string().max(240).optional(), invoice_note: z.string().max(240).optional(), ep_rate: z.coerce.number().min(0).max(30), vz_rate: z.coerce.number().min(0).max(10), esv_monthly: z.coerce.number().min(0), income_limit: z.coerce.number().min(0), rates_from: z.string(), remind_days: z.coerce.number().min(1).max(14), month_capacity: z.coerce.number().min(1).max(60) });
export async function saveSettings(formData: FormData) {
  const { supabase, uid } = await db();
  const p = SettingsInput.parse(Object.fromEntries(formData.entries()));
  const req = { fop_name: p.fop_name, ipn: p.ipn, iban: p.iban?.replace(/\s+/g, "").toUpperCase(), bank_name: p.bank_name, legal_address: p.legal_address, invoice_note: p.invoice_note };
  const clean = Object.fromEntries(Object.entries(req).filter(([, v]) => v !== undefined).map(([k, v]) => [k, v || null]));
  const base = { display_name: p.display_name, ep_rate: p.ep_rate, vz_rate: p.vz_rate, esv_monthly: p.esv_monthly, income_limit: p.income_limit, rates_from: p.rates_from, remind_days: p.remind_days, month_capacity: p.month_capacity };
  const { error } = await supabase.from("settings").update({ ...base, ...clean }).eq("owner_id", uid);
  if (error?.code === "42703") { // requisite columns not migrated yet (supabase/migrations/0004) — keep the base settings working
    await supabase.from("settings").update(base).eq("owner_id", uid); all();
    if (Object.keys(clean).length) throw new Error("Реквізити не збережено: спочатку застосуйте міграцію 0004_invoice_profile.sql у Supabase → SQL Editor.");
    return;
  }
  if (error) throw new Error(error.message);
  all();
}
/** New secret link for the phone-calendar feed (the old link stops working). */
/** Profile photo: a data URL produced in the browser (resized, ≤128 KB), or null to remove it. */
export async function saveAvatar(dataUrl: string | null) {
  const { supabase, uid } = await db();
  if (dataUrl !== null) {
    if (!/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(dataUrl)) throw new Error("Непідтримуваний формат зображення.");
    if (dataUrl.length > 180_000) throw new Error("Фото завелике — спробуйте інше.");
  }
  const { error } = await supabase.from("settings").update({ avatar_url: dataUrl }).eq("owner_id", uid);
  if (error) throw new Error(error.code === "42703" ? "Спочатку застосуйте міграцію 0006_avatar.sql у Supabase → SQL Editor." : error.message);
  all();
}
export async function rotateIcalToken() {
  const { supabase, uid } = await db();
  const bytes = new Uint8Array(24); crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const { error } = await supabase.from("settings").update({ ical_token: token }).eq("owner_id", uid);
  if (error) throw new Error(error.code === "42703" ? "Спочатку застосуйте міграцію 0005_ical.sql у Supabase → SQL Editor." : error.message);
  all();
}
