import Link from "next/link";
import { addDays, format, startOfMonth, subMonths, startOfQuarter, endOfQuarter, subQuarters } from "date-fns";
import { uk } from "date-fns/locale";
import { getShoots, getIncomeMonthly, getPresets } from "@/lib/data";
import { nowKyiv, iso, todayISO, money, moneyK, plural, TYPE_TONE, type ShootType } from "@/lib/domain";
import { Kpi } from "@/components/ui";
import { TONE_FG } from "@/components/ui";
import { Assistant } from "@/components/assistant";
import { CsvButton } from "./csv-button";

export const metadata = { title: "Аналітика" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p = "year" } = await searchParams; const period = ["quarter", "year", "all"].includes(p) ? p : "year";
  const now = nowKyiv(); const today = todayISO(); const y = now.getFullYear();
  const [shoots, monthly, presets] = await Promise.all([getShoots(), getIncomeMonthly(), getPresets()]);
  const labelOf = (t: ShootType) => presets.find((x) => x.type === t)?.label ?? t;
  let from: string, to: string, prevFrom: string | null = null, prevTo = "", label: string;
  if (period === "quarter") { from = iso(startOfQuarter(now)); to = iso(endOfQuarter(now)); const pq = subQuarters(now, 1); prevFrom = iso(startOfQuarter(pq)); prevTo = iso(endOfQuarter(pq)); label = `${Math.floor(now.getMonth() / 3) + 1} квартал ${y}`; }
  else if (period === "year") { from = `${y}-01-01`; to = `${y}-12-31`; prevFrom = `${y - 1}-01-01`; prevTo = `${y - 1}-${today.slice(5)}`; label = `Рік ${y} (до сьогодні)`; }
  else { from = "2000-01-01"; to = "2100-01-01"; label = "Увесь час"; }
  const done = shoots.filter((s) => s.status !== "cancelled" && s.status !== "request" && s.date >= from && s.date <= to && s.date <= today);
  const incomeIn = (a: string, b: string) => monthly.filter((m) => m.month >= a.slice(0, 7) + "-01" && m.month <= b).reduce((x, m) => x + m.income, 0);
  const income = incomeIn(from, to); const prevIncome = prevFrom ? incomeIn(prevFrom, prevTo) : 0;
  const delta = prevIncome ? Math.round((income / prevIncome - 1) * 100) : null;
  const avg = done.length ? done.reduce((a, s) => a + s.price, 0) / done.length : 0;
  const hours = done.reduce((a, s) => a + s.total_hours, 0); const rate = hours ? Math.round(done.reduce((a, s) => a + s.price, 0) / hours) : 0;
  const m12 = Array.from({ length: 12 }, (_, i) => { const d = startOfMonth(subMonths(now, 11 - i)); return { label: format(d, "LLL", { locale: uk }).replace(".", ""), income: monthly.find((m) => m.month.startsWith(format(d, "yyyy-MM")))?.income ?? 0 }; });
  const max12 = Math.max(...m12.map((m) => m.income), 1);
  const byType = (Object.keys(TYPE_TONE) as ShootType[]).map((k) => { const l = done.filter((s) => s.type === k); return { k, n: l.length, sum: l.reduce((a, s) => a + s.price, 0), rate: l.length ? Math.round(l.reduce((a, s) => a + (s.hourly_rate ?? 0), 0) / l.length) : 0 }; }).filter((x) => x.n).sort((a, b) => b.sum - a.sum);
  const maxT = byType[0]?.sum ?? 1;
  const qs = Array.from({ length: 8 }, (_, i) => { const d = subQuarters(now, 7 - i); const a = iso(startOfQuarter(d)), b = iso(endOfQuarter(d)); const l = shoots.filter((s) => s.status === "paid" && s.date >= a && s.date <= b); return { label: `${Math.floor(d.getMonth() / 3) + 1}кв ${String(d.getFullYear()).slice(2)}`, avg: l.length ? l.reduce((x, s) => x + s.price, 0) / l.length : null }; });
  const qv = qs.filter((q) => q.avg != null) as { label: string; avg: number }[]; const qmax = Math.max(...qv.map((q) => q.avg), 1), qmin = Math.min(...qv.map((q) => q.avg), qmax);
  const pts = qs.map((q, i) => q.avg != null ? [20 + i * (520 / 7), 160 - (q.avg - qmin) / Math.max(1, qmax - qmin) * 120] as [number, number] : null).filter((x): x is [number, number] => !!x);
  const poly = pts.map((pt) => pt.join(",")).join(" ");
  const delivery = (Object.keys(TYPE_TONE) as ShootType[]).map((k) => { const l = shoots.filter((s) => s.type === k && s.delivery_actual_days != null); if (!l.length) return null; const act = l.reduce((a, s) => a + (s.delivery_actual_days ?? 0), 0) / l.length; const promised = l.reduce((a, s) => a + s.delivery_days, 0) / l.length; return { k, promised, actual: act, late: l.filter((s) => (s.delivery_actual_days ?? 0) > s.delivery_days).length, n: l.length }; }).filter((x): x is NonNullable<typeof x> => !!x);
  const heat = Array.from({ length: 52 }, (_, i) => { const w = 51 - i; const a = iso(addDays(now, -w * 7 - 6)), b = iso(addDays(now, -w * 7)); const h = shoots.filter((s) => s.status !== "cancelled" && s.status !== "request" && s.date >= a && s.date <= b).reduce((x, s) => x + s.total_hours, 0); return { h, label: `${a} – ${b}: ${Math.round(h)} год` }; });
  const top = byType[0]; const bestRate = byType.slice().sort((a, b) => b.rate - a.rate)[0];
  const weakM = m12.filter((m) => m.income < max12 * 0.35).map((m) => m.label);
  const lateType = delivery.find((d) => d.actual > d.promised);
  const summary = done.length === 0 ? "Поки замало даних — з'являться після перших завершених зйомок." : `${top ? `«${labelOf(top.k)}» дає найбільше грошей (${money(top.sum)} за ${top.n} ${plural(top.n, "зйомку", "зйомки", "зйомок")})` : ""}${bestRate && top && bestRate.k !== top.k ? `, а найкраща ставка за годину — у «${labelOf(bestRate.k)}» (${bestRate.rate} ₴/год)` : ""}. ${weakM.length ? `Слабкі місяці: ${weakM.join(", ")} — місце для промо або відпустки. ` : ""}${lateType ? `По «${labelOf(lateType.k)}» фактична віддача довша за обіцяну — варто закладати більше днів у договір.` : delivery.length ? "Віддача по всіх типах у межах обіцяного." : ""}`;
  const csv = [["№", "Дата", "Клієнт", "Назва", "Тип", "Статус", "Ціна", "Отримано", "Фото", "Дедлайн"], ...shoots.map((s) => [s.no ?? "", s.date, s.client_name, s.title, labelOf(s.type), s.status, s.price, s.paid, s.photos, s.deadline])].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");

  return (
    <>
      <div className="flex justify-between items-end gap-4 flex-wrap mb-4 px-1">
        <div><div className="text-[13px] text-muted font-medium mb-1.5">{label}</div><h1 className="text-[clamp(26px,4vw,38px)] font-extrabold tracking-tighter">Як іде рік 📈</h1></div>
        <div className="flex gap-2 flex-wrap"><div className="seg">{[["quarter", "Квартал"], ["year", "Рік"], ["all", "Увесь час"]].map(([k, l]) => <Link key={k} href={`/analytics?p=${k}`} className={period === k ? "on" : ""}>{l}</Link>)}</div><CsvButton csv={csv} filename={`shoots-${today}.csv`} /></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-3.5">
        <Kpi label="Отримано" value={money(income)} sub={delta == null ? "усі платежі" : `${delta >= 0 ? "↑ +" : "↓ "}${delta}% до того ж періоду`} subTone={delta == null ? undefined : delta >= 0 ? "good" : "warn"} />
        <Kpi label="Зйомок" value={done.length} sub={period === "year" ? `≈ ${Math.round(done.length / (now.getMonth() + 1) * 10) / 10} на місяць` : undefined} />
        <Kpi label="Середній чек" value={money(avg)} />
        <Kpi label="Ефективна ставка" value={`${rate} ₴/год`} sub="зйомка + ретуш + підготовка" />
      </div>
      <Assistant items={[]} title="Помічник бачить у цифрах" empty={summary} />
      <section className="card mt-3.5"><h2 className="text-lg font-bold mb-3">Отримано по місяцях · 12 міс</h2><div className="flex items-end gap-2 h-[180px]">{m12.map((m, i) => <div key={i} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1.5"><span className="text-[10px] text-muted font-semibold num">{m.income ? moneyK(m.income) : ""}</span><i className="block w-full rounded-t-lg rounded-b" style={{ height: Math.max(4, Math.round(m.income / max12 * 140)), background: i === 11 ? "linear-gradient(180deg,var(--accent-2),var(--accent))" : "linear-gradient(180deg,rgba(79,155,255,.5),rgba(29,111,242,.35))" }} /></div>)}</div><div className="flex gap-2 mt-1.5">{m12.map((m, i) => <span key={i} className="flex-1 text-center text-[10px] font-semibold text-muted min-w-0">{m.label}</span>)}</div></section>
      <div className="grid gap-3.5 mt-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <section className="card min-w-0"><h2 className="text-lg font-bold mb-3">За типами зйомок</h2>{byType.length ? <div className="flex flex-col gap-3">{byType.map((x) => <div key={x.k}><div className="flex justify-between text-[13px]"><span className="font-semibold">{labelOf(x.k)} <span className="text-muted font-medium">· {x.n} · {x.rate} ₴/год</span></span><b className="num">{money(x.sum)}</b></div><div className="bar mt-1.5"><i style={{ width: `${Math.round(x.sum / maxT * 100)}%`, background: TONE_FG[TYPE_TONE[x.k]] }} /></div></div>)}</div> : <div className="empty">Поки без даних.</div>}</section>
        <section className="card min-w-0"><h2 className="text-lg font-bold mb-3">Середній чек по кварталах</h2>{pts.length > 1 ? <><svg role="img" aria-label="Середній чек по кварталах" viewBox="0 0 560 190" className="w-full h-[170px] block"><defs><linearGradient id="gf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1d6ff2" stopOpacity=".35" /><stop offset="1" stopColor="#1d6ff2" stopOpacity="0" /></linearGradient></defs><polygon fill="url(#gf)" points={`${poly} ${pts[pts.length - 1][0]},175 ${pts[0][0]},175`} /><polyline fill="none" stroke="#1d6ff2" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={poly} />{pts.map((pt, i) => <circle key={i} cx={pt[0]} cy={pt[1]} r={i === pts.length - 1 ? 6 : 3} fill={i === pts.length - 1 ? "#fff" : "#1d6ff2"} stroke="#1d6ff2" strokeWidth="3" />)}</svg><div className="flex gap-2">{qs.map((q, i) => <span key={i} className="flex-1 text-center text-[10px] font-semibold text-muted min-w-0">{q.label}</span>)}</div><p className="text-xs text-muted mt-2">{money(qv[0].avg)} → {money(qv[qv.length - 1].avg)} за {qv.length} {plural(qv.length, "квартал", "квартали", "кварталів")}.</p></> : <div className="empty">Потрібно хоча б два квартали з оплаченими зйомками.</div>}</section>
        <section className="card min-w-0"><h2 className="text-lg font-bold mb-3">Завантаженість по тижнях · 52 тижні</h2><div className="grid gap-1" style={{ gridTemplateColumns: "repeat(13, minmax(0,1fr))" }}>{heat.map((c, i) => <i key={i} title={c.label} className="block rounded-[5px]" style={{ aspectRatio: "1/1", background: c.h === 0 ? "var(--hair)" : c.h < 12 ? "rgba(29,111,242,.3)" : c.h < 24 ? "rgba(29,111,242,.6)" : "var(--accent)" }} />)}</div><div className="flex justify-between text-xs text-muted mt-2"><span>рік тому → цей тиждень</span><span>0 · &lt;12 · &lt;24 · 24+ год</span></div></section>
        <section className="card min-w-0"><h2 className="text-lg font-bold mb-3">Від зйомки до віддачі</h2>{delivery.length ? <div className="flex flex-col gap-2">{delivery.map((d) => { const late = d.actual > d.promised; return <div key={d.k} className="kv" style={{ background: late ? "var(--warn-bg)" : "var(--good-bg)" }}><span className="font-semibold">{labelOf(d.k)} <span className="text-muted text-xs font-medium">· обіцяно {Math.round(d.promised)} дн</span></span><b className="num" style={{ color: late ? "var(--warn)" : "var(--good)" }}>факт {Math.round(d.actual * 10) / 10} дн{d.late ? ` · ${d.late} із ${d.n} пізно` : ""}</b></div>; })}</div> : <div className="empty">З’явиться після перших віддач.</div>}</section>
      </div>
    </>
  );
}
