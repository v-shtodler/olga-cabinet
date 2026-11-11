/* Domain types + pure helpers shared by server and client. No Supabase here. */
import { addDays, differenceInCalendarDays, format, parseISO, startOfQuarter, endOfQuarter, isWeekend } from "date-fns";
import { uk } from "date-fns/locale";

export type ShootType = "lookbook" | "product" | "campaign" | "portrait" | "other";
export type ShootStatus = "request" | "confirmed" | "shot" | "delivered" | "paid" | "cancelled";

export const STATUSES: ShootStatus[] = ["request", "confirmed", "shot", "delivered", "paid"];
export const STATUS_UA: Record<ShootStatus, string> = { request: "Запит", confirmed: "Підтверджено", shot: "Відзнято", delivered: "Віддано", paid: "Оплачено", cancelled: "Скасовано" };
export const STATUS_TONE: Record<ShootStatus, Tone> = { request: "neutral", confirmed: "info", shot: "warn", delivered: "purple", paid: "good", cancelled: "neutral" };
export const NEXT_STEP: Partial<Record<ShootStatus, string>> = { request: "Підтвердити (передоплата отримана)", confirmed: "Позначити «відзнято»", shot: "Позначити «віддано»", delivered: "Позначити «оплачено»" };
export const TYPE_TONE: Record<ShootType, Tone> = { lookbook: "good", product: "info", campaign: "warn", portrait: "purple", other: "sun" };

export type Tone = "good" | "warn" | "info" | "purple" | "sun" | "pink" | "neutral" | "dark";

export interface Settings { owner_id: string; display_name: string; ep_rate: number; vz_rate: number; esv_monthly: number; income_limit: number; rates_from: string; remind_days: number; month_capacity: number; }
export interface Preset { type: ShootType; label: string; price: number; photos: number; extra_photos: number; delivery_days: number; shoot_hours: number; retouch_hours: number; }
export interface Client { id: string; name: string; kind: string | null; contact_name: string | null; contact_email: string | null; contact_phone: string | null; since: string; default_deposit_pct: number; default_types: ShootType[]; avatar_hue: number; archived: boolean; }
export interface ClientPref { id: string; client_id: string; text: string; sort: number; }
export interface Shoot {
  id: string; client_id: string; no: string | null; title: string; type: ShootType; status: ShootStatus; date: string; start_time: string | null; end_time: string | null; location: string | null;
  price: number; deposit_pct: number; photos: number; extra_photos: number; photos_delivered: number | null; delivery_days: number; delivered_on: string | null; invoice_sent_on: string | null;
  shoot_hours: number; retouch_hours: number; prep_hours: number; rights: string | null; created_at: string;
}
export interface ShootView extends Shoot { client_name: string; paid: number; balance: number; deadline: string; total_hours: number; hourly_rate: number | null; delivery_actual_days: number | null; invoice_age_days: number | null; }
export interface Payment { id: string; shoot_id: string; amount: number; paid_on: string; kind: "deposit" | "balance" | "extra" | "refund"; method: "invoice" | "card" | "cash" | "other"; note: string | null; }
export interface Note { id: string; shoot_id: string; text: string; created_at: string; }
export interface ChecklistItem { id: string; shoot_id: string; text: string; done: boolean; sort: number; }
export interface TaxQuarter { year: number; quarter: number; income: number; ep: number; vz: number; esv: number; quarter_end: string; declaration_due: string; payment_due: string; }

/* ---------- formatting ---------- */
/** "Now" in Kyiv, regardless of server timezone (Vercel runs in UTC). */
export const TZ = "Europe/Kyiv";
export function nowKyiv(): Date {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
  return new Date(g("year"), g("month") - 1, g("day"), g("hour") === 24 ? 0 : g("hour"), g("minute"));
}
export const todayISO = () => format(nowKyiv(), "yyyy-MM-dd");
export const iso = (d: Date) => format(d, "yyyy-MM-dd");
export const money = (n: number) => Math.round(n).toLocaleString("uk-UA").replace(/,/g, " ") + " ₴";
export const moneyK = (n: number) => Math.round(n / 1000) + "k";
export const fmtDate = (s: string, withYear = false) => format(parseISO(s), withYear ? "d MMMM yyyy" : "d MMMM", { locale: uk });
export const fmtShort = (s: string) => format(parseISO(s), "d MMM", { locale: uk }).replace(".", "");
export const fmtWeekday = (s: string) => format(parseISO(s), "EEEE", { locale: uk });
export const daysBetween = (a: string, b: string) => differenceInCalendarDays(parseISO(b), parseISO(a));
export function relDays(n: number) { if (n === 0) return "сьогодні"; if (n === 1) return "завтра"; if (n === -1) return "вчора"; if (n < 0) return `${Math.abs(n)} дн. тому`; return `через ${n} дн.`; }
export function plural(n: number, one: string, few: string, many: string) { const m10 = n % 10, m100 = n % 100; if (m10 === 1 && m100 !== 11) return one; if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few; return many; }
export const statusIdx = (s: ShootStatus) => STATUSES.indexOf(s);
export const isWeekendISO = (s: string) => isWeekend(parseISO(s));
export const quarterOf = (d: Date) => ({ from: iso(startOfQuarter(d)), to: iso(endOfQuarter(d)) });

/* ---------- derived ---------- */
export function freeDays(shootsByDay: Map<string, ShootView[]>, blocked: Set<string>, from: Date, n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) { const d = addDays(from, i); const k = iso(d); if (isWeekend(d) || blocked.has(k)) continue; if (!(shootsByDay.get(k)?.length)) out.push(k); }
  return out;
}
export function groupByDay(shoots: ShootView[]) { const m = new Map<string, ShootView[]>(); for (const s of shoots) { if (s.status === "cancelled") continue; const a = m.get(s.date) ?? []; a.push(s); m.set(s.date, a); } return m; }
export function deadlinesByDay(shoots: ShootView[]) { const m = new Map<string, ShootView[]>(); for (const s of shoots) { if (s.status !== "shot" && s.status !== "confirmed") continue; const a = m.get(s.deadline) ?? []; a.push(s); m.set(s.deadline, a); } return m; }

/* ---------- assistant: one voice, rule-based ---------- */
export type InsightKind = "deadline" | "payment" | "request" | "prep" | "load" | "tax" | "price";
export interface Insight { key: string; kind: InsightKind; sev: "high" | "mid" | "low"; tag: string; text: string; action?: { label: string; href?: string; taxKey?: string }; }

export interface InsightInput {
  shoots: ShootView[]; clients: Client[]; prefs: ClientPref[]; settings: Settings; dismissed: Set<string>; blocked: Set<string>;
  taxNext?: { key: string; label: string; amount: number; due: string } | null;
  scope: { type: "home" } | { type: "shoot"; id: string } | { type: "client"; id: string } | { type: "taxes"; yearIncome: number };
}

export function buildInsights(inp: InsightInput): Insight[] {
  const out: Insight[] = []; const today = todayISO();
  const push = (i: Insight) => { if (!inp.dismissed.has(i.key)) out.push(i); };
  const clientOf = (id: string) => inp.clients.find((c) => c.id === id);
  const prefsOf = (id: string) => inp.prefs.filter((p) => p.client_id === id).sort((a, b) => a.sort - b.sort).map((p) => p.text);
  const payDelay = (c?: Client) => c?.default_deposit_pct === 100 ? 0 : 7; // refined later from v_client_stats
  const list = inp.shoots.filter((s) => s.status !== "cancelled" && (inp.scope.type !== "shoot" || s.id === inp.scope.id) && (inp.scope.type !== "client" || s.client_id === inp.scope.id));

  if (inp.scope.type !== "taxes") for (const s of list) {
    const c = clientOf(s.client_id); const cname = c?.name ?? s.client_name;
    if (s.status === "shot") {
      const d = daysBetween(today, s.deadline);
      if (d <= inp.settings.remind_days) push({ key: `dl-${s.id}`, kind: "deadline", sev: d < 0 ? "high" : "mid", tag: d < 0 ? "Дедлайн прострочено" : `Дедлайн · ${relDays(d)}`, text: `${s.title} — ${cname} ще у статусі «відзнято». За умовами — ${s.photos} ретушованих фото до ${fmtDate(s.deadline)}.`, action: { label: "Відкрити зйомку", href: `/shoots/${s.id}` } });
    }
    if (s.status === "delivered" && s.balance > 0) {
      const age = s.invoice_age_days ?? 0; const late = age > Math.max(7, payDelay(c));
      push({ key: `pay-${s.id}`, kind: "payment", sev: late ? "high" : "mid", tag: late ? "Оплата · прострочено" : "Оплата · очікую", text: `${cname} винні ${money(s.balance)} за «${s.title}».${s.invoice_sent_on ? ` Рахунок виставлено ${relDays(-age)}.` : " Рахунок ще не виставлено."}`, action: { label: late ? "Нагадати клієнту" : "Деталі", href: `/shoots/${s.id}` } });
    }
    if (s.status === "request") {
      const age = daysBetween(s.created_at.slice(0, 10), today); const until = daysBetween(today, s.date);
      if (age >= 3 || until <= 7) push({ key: `req-${s.id}`, kind: "request", sev: until <= 3 ? "high" : "mid", tag: `Без передоплати · ${relDays(until)}`, text: `«${s.title}» для ${cname} досі не підтверджено. Дата тримається без передоплати ${age} ${plural(age, "день", "дні", "днів")}.`, action: { label: "Запросити передоплату", href: `/shoots/${s.id}` } });
    }
    if (s.status === "confirmed" && inp.scope.type !== "client") {
      const d = daysBetween(today, s.date);
      // the shoot date has passed but the status is still "confirmed": deadlines and payments depend on marking it as shot
      if (d < 0) push({ key: `past-${s.id}`, kind: "deadline", sev: d <= -3 ? "high" : "mid", tag: `Зйомка минула · ${relDays(d)}`, text: `«${s.title}» для ${cname} була ${fmtShort(s.date)}, але ще не позначена як відзнята — дедлайн віддачі не рахується.`, action: { href: `/shoots/${s.id}`, label: "Позначити відзнятою" } });
      if (d >= 0 && d <= 1) { const p = prefsOf(s.client_id).slice(0, 2).join("; "); push({ key: `prep-${s.id}`, kind: "prep", sev: "low", tag: `${relDays(d)} · підготовка`, text: `Зйомка «${s.title}» для ${cname}.${p ? ` Що важливо для цього клієнта: ${p}.` : ""}`, action: { label: "Картка зйомки", href: `/shoots/${s.id}` } }); }
    }
  }

  if (inp.scope.type === "home") {
    const free = freeDays(groupByDay(inp.shoots), inp.blocked, nowKyiv(), 14);
    const nm = nowKyiv(); nm.setMonth(nm.getMonth() + 1, 1); const nmKey = format(nm, "yyyy-MM");
    const nmCount = inp.shoots.filter((s) => s.status !== "cancelled" && s.date.startsWith(nmKey)).length;
    const pct = Math.min(100, Math.round(nmCount / inp.settings.month_capacity * 100));
    if (free.length) push({ key: `free-${today}`, kind: "load", sev: "low", tag: "Вільні вікна · 14 днів", text: `Вільні робочі дні: ${free.slice(0, 5).map(fmtShort).join(", ")}${free.length > 5 ? ` і ще ${free.length - 5}` : ""}. ${format(nm, "LLLL", { locale: uk })} заповнений на ${pct}% (${nmCount} із ~${inp.settings.month_capacity}).`, action: { label: "Календар", href: "/calendar" } });
    if (inp.taxNext) { const d = daysBetween(today, inp.taxNext.due); if (d <= 14) push({ key: `tax-${inp.taxNext.key}`, kind: "tax", sev: d < 0 ? "high" : d <= 3 ? "high" : "mid", tag: `Податки · ${relDays(d)}`, text: `${inp.taxNext.label}: ${money(inp.taxNext.amount)} до ${fmtDate(inp.taxNext.due)}.`, action: { label: "Податковий модуль", href: "/taxes" } }); }
  }
  if (inp.scope.type === "taxes") {
    const pct = inp.scope.yearIncome / inp.settings.income_limit; const y = nowKyiv().getFullYear();
    const dayOfYear = daysBetween(`${y}-01-01`, today) + 1; const pace = inp.scope.yearIncome / dayOfYear * 365;
    push({ key: `limit-${y}`, kind: "tax", sev: pct > 0.7 ? "high" : "low", tag: `Ліміт 3 групи · ${Math.round(pct * 100)}%`, text: `Отримано ${money(inp.scope.yearIncome)} з ${money(inp.settings.income_limit)}. За поточним темпом рік закриється на ~${money(Math.round(pace / 10000) * 10000)}${pct > 0.7 ? " — ризик перевищення, порадьтесь із бухгалтером." : " — запас великий."}` });
  }
  const sev = { high: 0, mid: 1, low: 2 }; const kind = { deadline: 0, payment: 1, request: 2, prep: 3, tax: 4, price: 5, load: 6 };
  return out.sort((a, b) => sev[a.sev] - sev[b.sev] || kind[a.kind] - kind[b.kind]);
}

/* ---------- taxes ---------- */
export interface TaxItem { key: string; year: number; quarter: number; kind: "tax" | "esv"; label: string; amount: number; due: string; declDue?: string; income?: number; ep?: number; vz?: number; ongoing: boolean; paid: boolean; }
export function taxTimeline(quarters: TaxQuarter[], paidKeys: Set<string>, settings: Settings): TaxItem[] {
  const today = todayISO(); const out: TaxItem[] = [];
  for (const q of quarters) {
    const base = `${q.year}q${q.quarter}`; const ongoing = q.quarter_end >= today;
    const esvDue = iso(new Date(q.year, (q.quarter - 1) * 3 + 3, 20));
    out.push({ key: `${base}-tax`, year: q.year, quarter: q.quarter, kind: "tax", label: `${q.quarter} кв. ${q.year} — ЄП + ВЗ`, amount: Number(q.ep) + Number(q.vz), due: q.payment_due, declDue: q.declaration_due, income: Number(q.income), ep: Number(q.ep), vz: Number(q.vz), ongoing, paid: paidKeys.has(`${base}-tax`) });
    out.push({ key: `${base}-esv`, year: q.year, quarter: q.quarter, kind: "esv", label: `${q.quarter} кв. ${q.year} — ЄСВ`, amount: Number(settings.esv_monthly) * 3, due: esvDue, ongoing, paid: paidKeys.has(`${base}-esv`) });
  }
  return out.sort((a, b) => (a.due < b.due ? -1 : 1));
}
