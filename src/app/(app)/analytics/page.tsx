import Link from "next/link";
import { addDays, format, startOfMonth, subMonths, startOfQuarter, endOfQuarter, subQuarters } from "date-fns";
import { uk } from "date-fns/locale";
import { getShoots, getIncomeMonthly } from "@/lib/data";
import { nowKyiv, iso, todayISO, money, moneyK, plural } from "@/lib/domain";
import { Kpi } from "@/components/ui";
import { Assistant } from "@/components/assistant";
import { CsvButton } from "./csv-button";

export const metadata = { title: "Аналітика" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p = "year" } = await searchParams; const period = ["quarter", "year", "all"].includes(p) ? p : "year";
  const now = nowKyiv(); const today = todayISO(); const y = now.getFullYear();
  const [shoots, monthly] = await Promise.all([getShoots(), getIncomeMonthly()]);
  let from: string, to: string, prevFrom: string | null = null, prevTo = "", label: string;
  if (period === "quarter") { from = iso(startOfQuarter(now)); to = iso(endOfQuarter(now)); const pq = subQuarters(now, 1); prevFrom = iso(startOfQuarter(pq)); prevTo = iso(endOfQuarter(pq)); label = `${Math.floor(now.getMonth() / 3) + 1} квартал ${y}`; }
  else if (period === "year") { from = `${y}-01-01`; to = `${y}-12-31`; prevFrom = `${y - 1}-01-01`; prevTo = `${y - 1}-${today.slice(5)}`; label = `Рік ${y} (до сьогодні)`; }
  else { from = "2000-01-01"; to = "2100-01-01"; label = "Увесь час"; }
  const done = shoots.filter((s) => s.status !== "cancelled" && s.status !== "request" && s.date >= from && s.date <= to && s.date <= today);
  const incomeIn = (a: string, b: string) => monthly.filter((m) => m.month >= a.slice(0, 7) + "-01" && m.month <= b).reduce((x, m) => x + m.income, 0);
  const income = incomeIn(from, to); const prevIncome = prevFrom ? incomeIn(prevFrom, prevTo) : 0;
  const delta = prevIncome ? Math.round((income / prevIncome - 1) * 100) : null;
  const avg = done.length ? done.reduce((a, s) => a + s.price, 0) / done.length : 0;
  const m12 = Array.from({ length: 12 }, (_, i) => { const d = startOfMonth(subMonths(now, 11 - i)); return { label: format(d, "LLL", { locale: uk }).replace(".", ""), income: monthly.find((m) => m.month.startsWith(format(d, "yyyy-MM")))?.income ?? 0 }; });
  const max12 = Math.max(...m12.map((m) => m.income), 1);
  const qs = Array.from({ length: 8 }, (_, i) => { const d = subQuarters(now, 7 - i); const a = iso(startOfQuarter(d)), b = iso(endOfQuarter(d)); const l = shoots.filter((s) => s.status === "paid" && s.date >= a && s.date <= b); return { label: `${Math.floor(d.getMonth() / 3) + 1}кв ${String(d.getFullYear()).slice(2)}`, avg: l.length ? l.reduce((x, s) => x + s.price, 0) / l.length : null }; });
  const qv = qs.filter((q) => q.avg != null) as { label: string; avg: number }[]; const qmax = Math.max(...qv.map((q) => q.avg), 1), qmin = Math.min(...qv.map((q) => q.avg), qmax);
  const pts = qs.map((q, i) => q.avg != null ? [20 + i * (520 / 7), 160 - (q.avg - qmin) / Math.max(1, qmax - qmin) * 120] as [number, number] : null).filter((x): x is [number, number] => !!x);
  const poly = pts.map((pt) => pt.join(",")).join(" ");
  const heat = Array.from({ length: 52 }, (_, i) => { const w = 51 - i; const a = iso(addDays(now, -w * 7 - 6)), b = iso(addDays(now, -w * 7)); const h = shoots.filter((s) => s.status !== "cancelled" && s.status !== "request" && s.date >= a && s.date <= b).reduce((x, s) => x + s.total_hours, 0); return { h, label: `${a} – ${b}: ${Math.round(h)} год` }; });
  const weakM = m12.filter((m) => m.income < max12 * 0.35).map((m) => m.label);
  const summary = done.length === 0
    ? "Поки замало даних — з’являться після перших завершених зйомок."
    : `Середній чек ${money(avg)} за ${done.length} ${plural(done.length, "зйомку", "зйомки", "зйомок")}.${delta != null ? ` Дохід ${delta >= 0 ? "виріс" : "просів"} на ${Math.abs(delta)}% до того ж періоду торік.` : ""}${weakM.length ? ` Найтихіші місяці: ${weakM.slice(0, 3).join(", ")} — місце для промо або відпустки.` : ""}`;
  const csv = [["№", "Дата", "Клієнт", "Назва", "Статус", "Ціна", "Отримано", "Віддати до"], ...shoots.map((s) => [s.no ?? "", s.date, s.client_name, s.title, s.status, s.price, s.paid, s.deadline ?? ""])].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");

  return (
    <>
      <div className="flex justify-between items-end gap-4 flex-wrap mb-4 px-1">
        <div><div className="text-[13px] text-muted font-medium mb-1.5">{label}</div><h1 className="text-[clamp(26px,4vw,38px)] font-bold tracking-[-0.01em]">Як іде рік 📈</h1></div>
        <div className="flex gap-2 flex-wrap"><div className="seg">{[["quarter", "Квартал"], ["year", "Рік"], ["all", "Увесь час"]].map(([k, l]) => <Link key={k} href={`/analytics?p=${k}`} className={period === k ? "on" : ""}>{l}</Link>)}</div><CsvButton csv={csv} filename={`shoots-${today}.csv`} /></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-3.5">
        <Kpi label="Отримано" value={money(income)} sub={delta == null ? "усі платежі" : `${delta >= 0 ? "↑ +" : "↓ "}${delta}% до того ж періоду`} subTone={delta == null ? undefined : delta >= 0 ? "good" : "warn"} />
        <Kpi label="Зйомок" value={done.length} sub={period === "year" ? `≈ ${Math.round(done.length / (now.getMonth() + 1) * 10) / 10} на місяць` : undefined} />
        <Kpi label="Середній чек" value={money(avg)} />
      </div>
      <Assistant items={[]} title="Помічник бачить у цифрах" empty={summary} />
      <section className="card mt-3.5"><h2 className="text-[17px] font-semibold mb-3">Отримано по місяцях · 12 міс</h2><div className="flex items-end gap-2 h-[180px]">{m12.map((m, i) => <div key={i} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1.5"><span className="text-[10px] text-muted font-semibold num">{m.income ? moneyK(m.income) : ""}</span><i className="block w-full rounded-t-lg rounded-b" style={{ height: Math.max(4, Math.round(m.income / max12 * 140)), background: i === 11 ? "var(--accent)" : "var(--fill)" }} /></div>)}</div><div className="flex gap-2 mt-1.5">{m12.map((m, i) => <span key={i} className="flex-1 text-center text-[10px] font-semibold text-muted min-w-0">{m.label}</span>)}</div></section>
      <div className="grid gap-3.5 mt-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <section className="card min-w-0"><h2 className="text-[17px] font-semibold mb-3">Середній чек по кварталах</h2>{pts.length > 1 ? <><svg role="img" aria-label="Середній чек по кварталах" viewBox="0 0 560 190" className="w-full h-[170px] block"><defs><linearGradient id="gf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity=".35" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs><polygon fill="url(#gf)" points={`${poly} ${pts[pts.length - 1][0]},175 ${pts[0][0]},175`} /><polyline fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={poly} />{pts.map((pt, i) => <circle key={i} cx={pt[0]} cy={pt[1]} r={i === pts.length - 1 ? 6 : 3} fill={i === pts.length - 1 ? "#fff" : "var(--accent)"} stroke="var(--accent)" strokeWidth="3" />)}</svg><div className="flex gap-2">{qs.map((q, i) => <span key={i} className="flex-1 text-center text-[10px] font-semibold text-muted min-w-0">{q.label}</span>)}</div><p className="text-[13px] text-muted mt-2">{money(qv[0].avg)} → {money(qv[qv.length - 1].avg)} за {qv.length} {plural(qv.length, "квартал", "квартали", "кварталів")}.</p></> : <div className="empty">Потрібно хоча б два квартали з оплаченими зйомками.</div>}</section>
        <section className="card min-w-0"><h2 className="text-[17px] font-semibold mb-3">Завантаженість по тижнях · 52 тижні</h2><div className="grid gap-1" style={{ gridTemplateColumns: "repeat(13, minmax(0,1fr))" }}>{heat.map((c, i) => <i key={i} title={c.label} className="block rounded-[5px]" style={{ aspectRatio: "1/1", background: c.h === 0 ? "var(--fill-3)" : c.h < 12 ? "var(--accent-tint)" : c.h < 24 ? "var(--accent-2)" : "var(--accent)" }} />)}</div><div className="flex justify-between text-xs text-muted mt-2"><span>рік тому → цей тиждень</span><span>0 · &lt;12 · &lt;24 · 24+ год</span></div></section>
      </div>
    </>
  );
}
