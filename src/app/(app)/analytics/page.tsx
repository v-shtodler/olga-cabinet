import Link from "next/link";
import { format, startOfMonth, subMonths, startOfQuarter, endOfQuarter, subQuarters } from "date-fns";
import { uk } from "date-fns/locale";
import { getShoots, getIncomeMonthly, getSavings, getSettings, getTaxQuarters, getTaxPaid } from "@/lib/data";
import { nowKyiv, iso, todayISO, money, moneyK, plural, brandColor, brandText, taxTimeline, fmtDate, fx, CURRENCIES, CUR_COLOR } from "@/lib/domain";
import { Kpi } from "@/components/ui";
import { CsvButton } from "./csv-button";

export const metadata = { title: "Аналітика" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ p?: string; y?: string }> }) {
  const { p = "year" } = await searchParams;
  const now = nowKyiv(); const today = todayISO(); const y = now.getFullYear();
  const [shoots, monthly, savings, settings, quarters, taxPaid] = await Promise.all([getShoots(), getIncomeMonthly(), getSavings(), getSettings(), getTaxQuarters(), getTaxPaid()]);
  // Period: this quarter, one calendar year, or everything. "year" (the old link) means the current year.
  const years = [...new Set([...monthly.map((m) => m.month.slice(0, 4)), String(y)])].sort().reverse();
  const period = p === "quarter" || p === "all" ? p : years.includes(p) ? p : String(y);
  const periodYear = period === "quarter" || period === "all" ? null : period;
  // the ФОП band: this quarter's own numbers, plus anything unpaid from a closed quarter
  const tl = taxTimeline(quarters, taxPaid, settings);
  const qNo = Math.floor(now.getMonth() / 3) + 1;
  const qRow = quarters.find((x) => x.year === now.getFullYear() && x.quarter === qNo);
  const qIncome = Number(qRow?.income ?? 0); const qTax = Number(qRow?.ep ?? 0) + Number(qRow?.vz ?? 0);
  const esv = Number(settings.esv_monthly) * 3;
  const qDue = tl.find((t) => t.year === now.getFullYear() && t.quarter === qNo && t.kind === "tax")?.due ?? null;
  const overdue = tl.filter((t) => !t.paid && !t.ongoing && t.due < today);
  const yearIncome = monthly.filter((m) => m.month.startsWith(String(y))).reduce((acc, m) => acc + m.income, 0);
  const limitPct = Math.min(100, Math.round(yearIncome / Number(settings.income_limit) * 100));
  let from: string, to: string, prevFrom: string | null = null, prevTo = "", label: string;
  if (period === "quarter") { from = iso(startOfQuarter(now)); to = iso(endOfQuarter(now)); const pq = subQuarters(now, 1); prevFrom = iso(startOfQuarter(pq)); prevTo = iso(endOfQuarter(pq)); label = `${Math.floor(now.getMonth() / 3) + 1} квартал ${y}`; }
  else if (periodYear) {
    const n = Number(periodYear); const running = n === y;
    from = `${n}-01-01`; to = running ? `${n}-12-31` : `${n}-12-31`;
    prevFrom = `${n - 1}-01-01`; prevTo = running ? `${n - 1}-${today.slice(5)}` : `${n - 1}-12-31`;
    label = running ? `Рік ${n} (до сьогодні)` : `Рік ${n}`;
  }
  else { from = "2000-01-01"; to = "2100-01-01"; label = "Увесь час"; }
  const done = shoots.filter((s) => s.status !== "cancelled" && s.status !== "request" && s.date >= from && s.date <= to && s.date <= today);
  const incomeIn = (a: string, b: string) => monthly.filter((m) => m.month >= a.slice(0, 7) + "-01" && m.month <= b).reduce((x, m) => x + m.income, 0);
  const income = incomeIn(from, to); const prevIncome = prevFrom ? incomeIn(prevFrom, prevTo) : 0;
  const delta = prevIncome ? Math.round((income / prevIncome - 1) * 100) : null;
  const avg = done.length ? done.reduce((a, s) => a + s.price, 0) / done.length : 0;
  // Chart range: the rolling twelve months, or a calendar year picked in the header
  const chartYear = periodYear; // "Квартал" and "Увесь час" fall back to the rolling twelve months
  const m12 = Array.from({ length: 12 }, (_, i) => {
    const d = chartYear ? new Date(Number(chartYear), i, 1) : startOfMonth(subMonths(now, 11 - i));
    return { key: format(d, "yyyy-MM"), label: format(d, "LLL", { locale: uk }).replace(".", ""), income: monthly.find((m) => m.month.startsWith(format(d, "yyyy-MM")))?.income ?? 0 };
  });
  const chartNow = format(now, "yyyy-MM");
  const max12 = Math.max(...m12.map((m) => m.income), 1);
  const total12 = m12.reduce((a, m) => a + m.income, 0);
  const best12 = m12.reduce((a, m) => (m.income > a.income ? m : a), m12[0]);
  // Who the money comes from, in the chosen period (by money actually received)
  const inPeriod = shoots.filter((s) => s.status !== "cancelled" && s.date >= from && s.date <= to);
  const perClient = new Map<string, { id: string; name: string; hue: number; paid: number; shoots: number }>();
  for (const sh of inPeriod) {
    const e = perClient.get(sh.client_id) ?? { id: sh.client_id, name: sh.client_name, hue: sh.client_hue, paid: 0, shoots: 0 };
    e.paid += Number(sh.paid); e.shoots += 1; perClient.set(sh.client_id, e);
  }
  const byMoney = [...perClient.values()].filter((c) => c.paid > 0).sort((a, b) => b.paid - a.paid);
  const topList = byMoney.slice(0, 6); const topMax = Math.max(...byMoney.map((c) => c.paid), 1);
  const paidAll = byMoney.reduce((a, c) => a + c.paid, 0);
  const top3Share = paidAll ? Math.round(byMoney.slice(0, 3).reduce((a, c) => a + c.paid, 0) / paidAll * 100) : 0;

  // Відкладені за період: скільки з доходу лишилось у валюті
  const savedIn = savings.filter((r) => r.month >= from.slice(0, 7) + "-01" && r.month <= to);
  const savedUah = savedIn.reduce((a, r) => a + Number(r.uah), 0);
  const savedShare = income ? Math.round(savedUah / income * 100) : 0;
  const savedMonths = [...new Set(savedIn.map((r) => r.month))].sort().reverse();

  // What is already booked ahead, by month
  const ahead = new Map<string, { count: number; price: number; left: number }>();
  for (const sh of shoots.filter((x) => x.status !== "cancelled" && x.date > today)) {
    const k = sh.date.slice(0, 7); const e = ahead.get(k) ?? { count: 0, price: 0, left: 0 };
    e.count += 1; e.price += Number(sh.price); e.left += Number(sh.balance); ahead.set(k, e);
  }
  const aheadRows = [...ahead.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(0, 4);
  const aheadTotal = [...ahead.values()].reduce((a, e) => a + e.price, 0);

  const csv = [["№", "Дата", "Клієнт", "Локація", "Статус", "Ціна", "Отримано"], ...shoots.map((s) => [s.no ?? "", s.date, s.client_name, s.location ?? "", s.status, s.price, s.paid])].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");

  return (
    <>
      <div className="flex justify-between items-end gap-4 flex-wrap mb-4 px-1">
        <div><div className="text-[13px] text-muted font-medium mb-1.5">{label}</div><h1 className="text-[clamp(26px,4vw,38px)] font-bold tracking-[-0.01em]">Як іде рік 📈</h1></div>
        <div className="flex gap-2 flex-wrap"><div className="seg">
            <Link href="/analytics?p=quarter" className={period === "quarter" ? "on" : ""}>Квартал</Link>
            {years.slice(0, 4).map((yy) => <Link key={yy} href={`/analytics?p=${yy}`} className={period === yy ? "on" : ""}>{yy}</Link>)}
            <Link href="/analytics?p=all" className={period === "all" ? "on" : ""}>Увесь час</Link>
          </div><CsvButton csv={csv} filename={`shoots-${today}.csv`} /></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-3.5">
        <Kpi label="Отримано" value={money(income)} sub={delta == null ? "усі платежі" : `${delta >= 0 ? "↑ +" : "↓ "}${delta}% до того ж періоду`} subTone={delta == null ? undefined : delta >= 0 ? "good" : "warn"} />
        <Kpi label="Зйомок" value={done.length} sub={periodYear ? `≈ ${Math.round(done.length / (periodYear === String(y) ? now.getMonth() + 1 : 12) * 10) / 10} на місяць` : undefined} />
        <Kpi label="Середній чек" value={money(avg)} />
      </div>
      {/* the year's shape */}
      <div className="flex flex-wrap gap-3.5">
        <section className="card flex-1 min-w-0">
          <h2 className="text-[17px] font-semibold mb-3">Отримано по місяцях · {chartYear ?? "12 міс"}</h2>
          <div className="flex items-end gap-1.5 sm:gap-2 h-[190px]">
            {m12.map((m, i) => (
              <div key={i} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1.5">
                {m.income > 0 && (
                  <span className="font-semibold num whitespace-nowrap" style={{ color: m.key === chartNow ? "var(--accent)" : "var(--muted)" }}>
                    <span className="sm:hidden text-[10px]">{moneyK(m.income)}</span>
                    <span className="hidden sm:inline text-[10px] lg:text-[11px]">{money(m.income)}</span>
                  </span>
                )}
                <i className="block w-full rounded-t-[6px] rounded-b-[2px]" style={{ height: Math.max(4, Math.round(m.income / max12 * 150)), background: m.key === chartNow ? "linear-gradient(180deg, var(--accent-2), var(--accent))" : "linear-gradient(180deg, color-mix(in srgb, var(--accent) 42%, transparent), color-mix(in srgb, var(--accent) 16%, transparent))" }} />
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 sm:gap-2 mt-1.5">{m12.map((m, i) => <span key={i} className="flex-1 text-center text-[10px] sm:text-[11px] font-medium min-w-0" style={{ color: m.key === chartNow ? "var(--fg)" : "var(--muted)" }}>{m.label}</span>)}</div>
          <p className="text-[13px] text-muted mt-3.5">Усього за {chartYear ? `${chartYear} рік` : "12 місяців"} — <b className="num text-fg">{money(total12)}</b>{best12.income > 0 ? <> · найкращий місяць — <b className="text-fg">{best12.label}</b> (<span className="num">{money(best12.income)}</span>)</> : null}</p>
        </section>
      </div>
      <div className="grid gap-3.5 mt-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        {/* Хто приносить дохід — кольори ті самі, що в календарі */}
        <section className="card min-w-0">
          <h2 className="text-[17px] font-semibold mb-3">Хто приносить дохід</h2>
          {topList.length ? (
            <>
              <div className="flex flex-col gap-2.5">
                {topList.map((c) => (
                  <Link key={c.id} href={`/clients/${c.id}`} className="min-w-0 group">
                    <div className="flex justify-between items-baseline gap-2 text-[13px] mb-1">
                      <span className="font-semibold truncate group-hover:text-accent">{c.name}<span className="text-muted font-medium"> · {c.shoots} {plural(c.shoots, "зйомка", "зйомки", "зйомок")}</span></span>
                      <span className="num shrink-0 text-muted">{money(c.paid)} · {Math.round(c.paid / paidAll * 100)}%</span>
                    </div>
                    <i className="block h-[8px] rounded-full" style={{ width: `${Math.max(3, Math.round(c.paid / topMax * 100))}%`, background: brandColor(c.hue) }} />
                  </Link>
                ))}
              </div>
              <p className="text-[13px] text-muted mt-3">Топ-3 дають <b className="text-fg">{top3Share}%</b> доходу за період{byMoney.length > 6 ? ` · усього замовників: ${byMoney.length}` : ""}.{top3Share >= 70 ? " Варто розширювати базу — залежність висока." : ""}</p>
            </>
          ) : <div className="empty">За цей період оплат ще не було.</div>}
        </section>

        {/* Відкладені */}
        <section className="card min-w-0">
          <div className="flex justify-between items-baseline gap-2 mb-3">
            <h2 className="text-[17px] font-semibold">Відкладені</h2>
            <Link href="/savings" className="text-[13px] font-semibold text-accent shrink-0">Усі →</Link>
          </div>
          {savedIn.length ? (
            <>
              <div className="flex items-baseline gap-2.5 flex-wrap mb-3">
                <span className="text-[26px] font-bold tracking-[-0.01em] num leading-tight">{money(savedUah)}</span>
                <span className="text-[13px] font-semibold" style={{ color: savedShare >= 10 ? "var(--good)" : "var(--muted)" }}>{savedShare}% доходу за період</span>
              </div>
              <div className="flex gap-2 flex-wrap mb-3">
                {CURRENCIES.map((c) => {
                  const v = savedIn.filter((r) => r.currency === c).reduce((a, r) => a + Number(r.amount), 0);
                  return v > 0 ? <span key={c} className="chip" style={{ background: CUR_COLOR[c], color: brandText(CUR_COLOR[c]) }}>{fx(v, c)}</span> : null;
                })}
              </div>
              <div className="flex flex-col gap-1.5">
                {savedMonths.slice(0, 4).map((m) => {
                  const list = savedIn.filter((r) => r.month === m);
                  const uah = list.reduce((a, r) => a + Number(r.uah), 0);
                  const inc = monthly.filter((x) => x.month.startsWith(m.slice(0, 7))).reduce((a, x) => a + x.income, 0);
                  return (
                    <div key={m} className="kv items-center">
                      <span className="capitalize">{format(new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1), "LLLL", { locale: uk })}</span>
                      <span className="text-right shrink-0"><b className="num block">{money(uah)}</b>{inc > 0 && <span className="text-[12px] text-muted">{Math.round(uah / inc * 100)}% місяця</span>}</span>
                    </div>
                  );
                })}
              </div>
              {savedMonths.length > 4 && <p className="text-[13px] text-muted mt-2">і ще {savedMonths.length - 4} {plural(savedMonths.length - 4, "місяць", "місяці", "місяців")}.</p>}
            </>
          ) : <div className="empty">За цей період нічого не відкладено.</div>}
        </section>

        {/* Законтрактовано наперед */}
        <section className="card min-w-0">
          <h2 className="text-[17px] font-semibold mb-1">Законтрактовано наперед</h2>
          <div className="text-[26px] font-bold tracking-[-0.01em] num leading-tight mb-3">{money(aheadTotal)}</div>
          {aheadRows.length ? (
            <>
              <div className="flex flex-col gap-1.5">
                {aheadRows.map(([k, e]) => (
                  <div key={k} className="kv items-center">
                    <span className="capitalize min-w-0 truncate">{format(new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, 1), "LLLL", { locale: uk })}<span className="text-muted"> · {e.count} {plural(e.count, "зйомка", "зйомки", "зйомок")}</span></span>
                    <span className="text-right shrink-0 leading-tight"><b className="num block">{money(e.price)}</b>{e.left > 0 && <span className="text-[12px] text-muted num">ще {money(e.left)}</span>}</span>
                  </div>
                ))}
              </div>
              <p className="text-[13px] text-muted mt-3">Сума підтверджених і запитаних зйомок попереду — орієнтир для планування й податків.</p>
            </>
          ) : <div className="empty">Попереду поки нічого не заплановано.</div>}
        </section>
      </div>
      <section className="card mt-3.5 flex flex-wrap gap-5 items-center justify-between" style={{ background: "var(--accent-tint)" }}>
        <div className="flex-1 min-w-[260px]">
          <div className="text-[13px] font-semibold text-muted">ФОП 3 група · {qNo} квартал {now.getFullYear()}</div>
          <p className="text-[15px] mt-1">Отримано <b className="num">{money(qIncome)}</b> → ЄП {settings.ep_rate}% <b className="num">{money(Number(qRow?.ep ?? 0))}</b> + ВЗ {settings.vz_rate}% <b className="num">{money(Number(qRow?.vz ?? 0))}</b> = <b className="num">{money(qTax)}</b>. ЄСВ за квартал — <b className="num">{money(esv)}</b>{qDue ? <>, сплата до {fmtDate(qDue)}</> : null}.</p>
          {overdue.length > 0 && (
            <Link href="/taxes" className="text-[13px] font-semibold mt-1.5 inline-block" style={{ color: "var(--danger)" }}>
              Прострочено: {overdue.map((t) => t.label.replace(/ \d{4}/, "")).join(", ")} — {money(overdue.reduce((a, t) => a + t.amount, 0))} →
            </Link>
          )}
        </div>
        <div className="min-w-[180px]">
          <div className="flex justify-between text-[13px] font-semibold mb-1.5"><span className="text-muted">Ліміт року</span><span>{limitPct}%</span></div>
          <div className="bar" style={{ background: "var(--glass)" }}><i style={{ width: `${Math.max(1, limitPct)}%`, background: limitPct > 80 ? "var(--warn)" : "var(--accent)" }} /></div>
          <div className="text-[12px] text-muted mt-1.5 num">{money(yearIncome)} / {money(settings.income_limit)}</div>
        </div>
        <Link href="/taxes" className="btn btn-primary">Податковий модуль</Link>
      </section>
    </>
  );
}
