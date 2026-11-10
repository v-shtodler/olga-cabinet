/* Seed demo data for one user. Run once after creating the user in Supabase Auth.
   Usage: SUPABASE_SERVICE_ROLE_KEY=... SEED_USER_EMAIL=olga@... npm run seed
   Never ship the service role key to the browser. */
import { createClient } from "@supabase/supabase-js";
import { addDays, format, isSunday } from "date-fns";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!, key = process.env.SUPABASE_SERVICE_ROLE_KEY!, email = process.env.SEED_USER_EMAIL!;
if (!url || !key || !email) { console.error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_USER_EMAIL"); process.exit(1); }
const sb = createClient(url, key, { auth: { persistSession: false } });
const iso = (d: Date) => format(d, "yyyy-MM-dd");
const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
let seed = 20261110; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

const PRESET: Record<string, { price: number; photos: number; extra: number; dd: number; h: number; r: number; title: string }> = {
  lookbook: { price: 30000, photos: 40, extra: 180, dd: 7, h: 7, r: 12, title: "Lookbook" },
  product: { price: 18000, photos: 60, extra: 0, dd: 5, h: 5, r: 6, title: "Предметка" },
  campaign: { price: 44000, photos: 25, extra: 60, dd: 7, h: 9, r: 16, title: "Кампанія" },
  portrait: { price: 18000, photos: 15, extra: 40, dd: 10, h: 2, r: 5, title: "Портрети команди" },
};
const CLIENTS = [
  { name: "Modna Kasha", kind: "Бренд одягу", contact: "Марія Коваль", dep: 50, types: ["campaign", "lookbook"], delay: 14, prefs: ["Теплі тони, багато повітря", "Затверджують відбір на 2-й день", "Платять після рахунку, часто з затримкою"] },
  { name: "Ateliér Lina", kind: "Бренд одягу", contact: "Ліна Горобець", dep: 50, types: ["lookbook", "product"], delay: 4, prefs: ["Холодний баланс білого, матова шкіра", "Віддача через WeTransfer + Google Drive", "Затверджує відбір наступного дня"] },
  { name: "Glass Art Stories", kind: "Декор · e-commerce", contact: "Олена Руденко", dep: 50, types: ["product"], delay: 3, prefs: ["Білий фон, 3 ракурси на SKU", "Файли під Shopify 2048px"] },
  { name: "Cats Mode", kind: "E-commerce", contact: "Ігор Семенюк", dep: 50, types: ["product", "lookbook"], delay: 5, prefs: ["Каталог раз на сезон", "Любить швидкі прев’ю в день зйомки"] },
  { name: "Hiddo", kind: "IT-компанія", contact: "Анна Литвин", dep: 100, types: ["portrait"], delay: 0, prefs: ["Передоплата 100%", "Єдиний стиль для всієї команди"] },
  { name: "Awesometik", kind: "Бренд аксесуарів", contact: "Дарина Мельник", dep: 50, types: ["product", "portrait"], delay: 12, prefs: ["Малі бюджети, часті зйомки", "Просять знижки — тримати рамку"] },
  { name: "Enjoy The Wood", kind: "Декор", contact: "Руслана Бойко", dep: 50, types: ["product"], delay: 2, prefs: ["Інтер’єрні сцени з реальним світлом"] },
  { name: "Bloom Room", kind: "Квіти · доставка", contact: "Andrei Popescu", dep: 50, types: ["product"], delay: 6, prefs: ["Зйомка зранку, поки квіти свіжі"] },
];
const LOC = ["Студія «Світло»", "Студія «Лофт 12»", "Локація клієнта", "Студія «Білий зал»", "Офіс клієнта"];

async function main() {
  const { data: users } = await sb.auth.admin.listUsers();
  const user = users.users.find((u) => u.email === email);
  if (!user) { console.error(`User ${email} not found. Create it in Supabase → Authentication first.`); process.exit(1); }
  const uid = user.id;
  const { count } = await sb.from("shoots").select("*", { count: "exact", head: true }).eq("owner_id", uid);
  if (count) { console.log(`User already has ${count} shoots — skipping seed.`); return; }

  const clientIds: Record<string, string> = {}; const clientMeta: Record<string, typeof CLIENTS[number]> = {};
  for (const [i, c] of CLIENTS.entries()) {
    const { data } = await sb.from("clients").insert({ owner_id: uid, name: c.name, kind: c.kind, contact_name: c.contact, since: iso(addDays(TODAY, -400 + i * 40)), default_deposit_pct: c.dep, default_types: c.types, avatar_hue: i }).select("id").single();
    clientIds[c.name] = data!.id; clientMeta[c.name] = c;
    await sb.from("client_prefs").insert(c.prefs.map((text, sort) => ({ owner_id: uid, client_id: data!.id, text, sort })));
  }

  type S = { client: string; type: string; off: number; status: string; title?: string; notes?: string[]; checklist?: [string, boolean][] };
  const plan: S[] = [];
  for (let d = -365; d < -14; d++) { if (rnd() > 0.19) continue; const dt = addDays(TODAY, d); if (isSunday(dt)) continue; const c = pick(CLIENTS); plan.push({ client: c.name, type: pick(c.types), off: d, status: "paid" }); }
  plan.push({ client: "Modna Kasha", type: "campaign", off: -13, status: "delivered" }, { client: "Awesometik", type: "product", off: -10, status: "delivered" });
  plan.push({ client: "Ateliér Lina", type: "lookbook", off: -6, status: "shot", title: "Lookbook FW26", notes: ["Клієнтка просить холодний баланс білого і менше контрасту, ніж у SS-серії. Референси — у Pinterest-дошці.", "Візажистка — Оксана, стилістка — від клієнта. Обід на локації за рахунок клієнта."], checklist: [["Передоплата отримана", true], ["Референси й мудборд узгоджено", true], ["RAW скопійовано на 2 диски", true], ["Відбір надіслано на затвердження", false], ["Ретуш віддано", false], ["Фінальний рахунок виставлено", false]] });
  plan.push({ client: "Glass Art Stories", type: "product", off: -3, status: "shot" }, { client: "Cats Mode", type: "product", off: -1, status: "shot" });
  plan.push({ client: "Bloom Room", type: "product", off: 1, status: "confirmed" }, { client: "Modna Kasha", type: "campaign", off: 2, status: "confirmed", title: "Кампанія · зима" }, { client: "Hiddo", type: "portrait", off: 4, status: "confirmed" }, { client: "Ateliér Lina", type: "lookbook", off: 6, status: "request", title: "Lookbook · аксесуари" }, { client: "Enjoy The Wood", type: "product", off: 9, status: "confirmed" }, { client: "Glass Art Stories", type: "product", off: 11, status: "confirmed" }, { client: "Awesometik", type: "portrait", off: 13, status: "request" }, { client: "Cats Mode", type: "lookbook", off: 16, status: "confirmed" }, { client: "Modna Kasha", type: "lookbook", off: 20, status: "confirmed" }, { client: "Bloom Room", type: "product", off: 24, status: "request" }, { client: "Ateliér Lina", type: "product", off: 27, status: "confirmed" }, { client: "Glass Art Stories", type: "product", off: 33, status: "confirmed" });
  plan.sort((a, b) => a.off - b.off);

  for (const p of plan) {
    const t = PRESET[p.type]; const c = clientMeta[p.client]; const date = addDays(TODAY, p.off);
    const price = Math.round(t.price * (1 + p.off / 365 * 0.18) * (0.85 + rnd() * 0.3) / 500) * 500;
    const startH = p.type === "portrait" ? 12 : rnd() < 0.5 ? 9 : 10;
    const deliveredOn = p.status === "delivered" || p.status === "paid" ? addDays(date, t.dd + (rnd() < 0.3 ? 2 : -1)) : null;
    const depositPct = c.dep; const dep = Math.round(price * depositPct / 100);
    const { data: s } = await sb.from("shoots").insert({
      owner_id: uid, client_id: clientIds[p.client], type: p.type, status: p.status, title: p.title ?? t.title + (p.type === "lookbook" ? (rnd() < 0.5 ? " FW" : " SS") : ""),
      date: iso(date), start_time: `${String(startH).padStart(2, "0")}:00`, end_time: `${String(startH + t.h).padStart(2, "0")}:00`, location: pick(LOC), price, deposit_pct: depositPct,
      photos: t.photos, extra_photos: t.extra, delivery_days: t.dd, shoot_hours: t.h, retouch_hours: t.r, rights: "Сайт, соцмережі, 2 роки",
      delivered_on: deliveredOn ? iso(deliveredOn) : null, invoice_sent_on: p.status === "delivered" && dep < price ? iso(deliveredOn!) : null, created_at: addDays(date, -20).toISOString(),
    }).select("id").single();
    const sid = s!.id;
    if (p.status !== "request" && dep > 0) await sb.from("payments").insert({ owner_id: uid, shoot_id: sid, amount: dep, paid_on: iso(addDays(date, -7)), kind: "deposit", method: "invoice" });
    if (p.status === "paid" && dep < price) await sb.from("payments").insert({ owner_id: uid, shoot_id: sid, amount: price - dep, paid_on: iso(addDays(deliveredOn!, c.delay)), kind: "balance", method: "invoice" });
    if (p.notes) await sb.from("shoot_notes").insert(p.notes.map((text, i) => ({ owner_id: uid, shoot_id: sid, text, created_at: addDays(date, -12 + i * 3).toISOString() })));
    if (p.checklist) await sb.from("checklist_items").insert(p.checklist.map(([text, done], sort) => ({ owner_id: uid, shoot_id: sid, text, done, sort })));
  }
  console.log(`Seeded ${CLIENTS.length} clients and ${plan.length} shoots for ${email}.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
