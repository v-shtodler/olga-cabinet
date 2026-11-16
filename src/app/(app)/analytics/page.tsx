import Link from "next/link";
import { format, startOfMonth, subMonths, startOfQuarter, endOfQuarter, subQuarters } from "date-fns";
import { uk } from "date-fns/locale";
import { getShoots, getIncomeMonthly } from "@/lib/data";
import { nowKyiv, iso, todayISO, money, moneyK, plural, fmtShort, brandColor } from "@/lib/domain";
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
  const total12 = m12.reduce((a, m) => a + m.income, 0);
  const best12 = m12.reduce((a, m) => (m.income > a.income ? m : a), m12[0]);
  // Who the money comes from, in the chosen period (by money actually received)
  const inPeriod = shoots.filter((s) => s.status !== "cancelled" && s.date >= from && s.date <= to);
  const perClient = new Map<string, { name: string; hue: number; paid: number; shoots: number }>();
  for (const sh of inPeriod) {
    const e = perClient.get(sh.client_id) ?? { name: sh.client_name, hue: sh.client_hue, paid: 0, shoots: 0 };
    e.paid += Number(sh.paid); e.shoots += 1; perClient.set(sh.client_id, e);
  }
  const byMoney = [...perClient.values()].filter((c) => c.paid > 0).sort((a, b) => b.paid - a.paid);
  const topList = byMoney.slice(0, 6); const topMax = Math.max(...byMoney.map((c) => c.paid), 1);
  const paidAll = byMoney.reduce((a, c) => a + c.paid, 0);
  const top3Share = paidAll ? Math.round(byMoney.slice(0, 3).reduce((a, c) => a + c.paid, 0) / paidAll * 100) : 0;

  // Money earned but not received yet, oldest invoice first
  const owing = shoots.filter((sh) => sh.status !== "cancelled" && Number(sh.balance) > 0 && sh.date <= today)
    .sort((a, b) => (b.invoice_age_days ?? -1) - (a.invoice_age_days ?? -1));
  const owingTotal = owing.reduce((a, sh) => a + Number(sh.balance), 0);

  // What is already booked ahead, by month
  const ahead = new Map<string, { count: number; price: number; left: number }>();
  for (const sh of shoots.filter((x) => x.status !== "cancelled" && x.date > today)) {
    const k = sh.date.slice(0, 7); const e = ahead.get(k) ?? { count: 0, price: 0, left: 0 };
    e.count += 1; e.price += Number(sh.price); e.left += Number(sh.balance); ahead.set(k, e);
  }
  const aheadRows = [...ahead.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(0, 4);
  const aheadTotal = [...ahead.values()].reduce((a, e) => a + e.price, 0);

  const weakM = m12.filter((m) => m.income < max12 * 0.35).map((m) => m.label);
  const summary = done.length === 0
    ? "Поки замало даних — з’являться після перших завершених зйомок."
    : `Середній чек ${money(avg)} за ${done.length} ${plural(done.length, "зйомку", "зйомки", "зйомок")}.${delta != null ? ` Дохід ${delta >= 0 ? "виріс" : "просів"} на ${Math.abs(delta)}% до того ж періоду торік.` : ""}${weakM.length ? ` Найтихіші місяці: ${weakM.slice(0, 3).join(", ")} — місце для промо або відпустки.` : ""}`;
  const csv = [["№", "Дата", "Клієнт", "Локація", "Статус", "Ціна", "Отримано", "Віддати до"], ...shoots.map((s) => [s.no ?? "", s.date, s.client_name, s.location ?? "", s.status, s.price, s.paid, s.deadline ?? ""])].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");

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
      {/* the year's shape, with the assistant reading it from the side */}
      <div className="flex flex-wrap gap-3.5">
        <section className="card flex-[999_1_560px] min-w-0">
          <h2 className="text-[17px] font-semibold mb-3">Отримано по місяцях · 12 міс</h2>
          <div className="flex items-end gap-1.5 sm:gap-2 h-[190px]">
            {m12.map((m, i) => (
              <div key={i} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1.5">
                {m.income > 0 && <span className="text-[10px] sm:text-[11px] font-semibold num" style={{ color: i === 11 ? "var(--accent)" : "var(--muted)" }}>{moneyK(m.income)}</span>}
                <i className="block w-full rounded-t-[6px] rounded-b-[2px]" style={{ height: Math.max(4, Math.round(m.income / max12 * 150)), background: i === 11 ? "linear-gradient(180deg, var(--accent-2), var(--accent))" : "linear-gradient(180deg, color-mix(in srgb, var(--accent) 42%, transparent), color-mix(in srgb, var(--accent) 16%, transparent))" }} />
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 sm:gap-2 mt-1.5">{m12.map((m, i) => <span key={i} className="flex-1 text-center text-[10px] sm:text-[11px] font-medium min-w-0" style={{ color: i === 11 ? "var(--fg)" : "var(--muted)" }}>{m.label}</span>)}</div>
          <p className="text-[13px] text-muted mt-3.5">Усього за 12 місяців — <b className="num text-fg">{money(total12)}</b>{best12.income > 0 ? <> · найкращий місяць — <b className="text-fg">{best12.label}</b> (<span className="num">{money(best12.income)}</span>)</> : null}</p>
        </section>
        <aside className="flex-[1_1_300px] min-w-0"><Assistant items={[]} title="Помічник бачить у цифрах" empty={summary} /></aside>
      </div>
      <div className="grid gap-3.5 mt-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        {/* Хто приносить дохід — кольори ті самі, що в календарі */}
        <section className="card min-w-0">
          <h2 className="text-[17px] font-semibold mb-3">Хто приносить дохід</h2>
          {topList.length ? (
            <>
              <div className="flex flex-col gap-2.5">
                {topList.map((c) => (
                  <div key={c.name} className="min-w-0">
                    <div className="flex justify-between items-baseline gap-2 text-[13px] mb-1">
                      <span className="font-semibold truncate">{c.name}</span>
                      <span className="num shrink-0 text-muted">{money(c.paid)} · {Math.round(c.paid / paidAll * 100)}%</span>
                    </div>
                    <i className="block h-[8px] rounded-full" style={{ width: `${Math.max(3, Math.round(c.paid / topMax * 100))}%`, background: brandColor(c.hue) }} />
                  </div>
                ))}
              </div>
              <p className="text-[13px] text-muted mt-3">Топ-3 дають <b className="text-fg">{top3Share}%</b> доходу за період{byMoney.length > 6 ? ` · усього замовників: ${byMoney.length}` : ""}.{top3Share >= 70 ? " Варто розширювати базу — залежність висока." : ""}</p>
            </>
          ) : <div className="empty">За цей період оплат ще не було.</div>}
        </section>

        {/* Гроші в дорозі */}
        <section className="card min-w-0">
          <div className="flex justify-between items-baseline gap-2 mb-3"><h2 className="text-[17px] font-semibold">Гроші в дорозі</h2><span className="num font-bold text-[17px]" style={{ color: owingTotal ? "var(--warn)" : "var(--good)" }}>{money(owingTotal)}</span></div>
          {owing.length ? (
            <>
              <div className="flex flex-col gap-1.5">
                {owing.slice(0, 5).map((sh) => (
                  <Link key={sh.id} href={`/shoots/${sh.id}`} className="kv items-center gap-2">
                    <span className="min-w-0 flex items-center gap-2">
                      <i className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: brandColor(sh.client_hue) }} />
                      <span className="truncate">{sh.client_name}<span className="text-muted"> · {fmtShort(sh.date)}</span></span>
                    </span>
                    <span className="shrink-0 text-right">
                      <b className="num block">{money(Number(sh.balance))}</b>
                      <span className="text-[12px]" style={{ color: (sh.invoice_age_days ?? 0) > 14 ? "var(--warn)" : "var(--muted)" }}>{sh.invoice_age_days == null ? "рахунок не виставлено" : `рахунок ${sh.invoice_age_days} дн. тому`}</span>
                    </span>
                  </Link>
                ))}
              </div>
              {owing.length > 5 && <p className="text-[13px] text-muted mt-2">і ще {owing.length - 5} {plural(owing.length - 5, "зйомка", "зйомки", "зйомок")}.</p>}
              <p className="text-[13px] text-muted mt-3">Це вже відпрацьовані гроші. Вони впадуть у податки того кварталу, коли прийдуть.</p>
            </>
          ) : <div className="empty">Усе оплачено ✓</div>}
        </section>

        {/* Законтрактовано наперед */}
        <section className="card min-w-0">
          <div className="flex justify-between items-baseline gap-2 mb-3"><h2 className="text-[17px] font-semibold">Законтрактовано наперед</h2><span className="num font-bold text-[17px]">{money(aheadTotal)}</span></div>
          {aheadRows.length ? (
            <>
              <div className="flex flex-col gap-1.5">
                {aheadRows.map(([k, e]) => (
                  <div key={k} className="kv items-center">
                    <span className="capitalize">{format(new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, 1), "LLLL", { locale: uk })}<span className="text-muted"> · {e.count} {plural(e.count, "зйомка", "зйомки", "зйомок")}</span></span>
                    <span className="text-right shrink-0"><b className="num block">{money(e.price)}</b>{e.left > 0 && <span className="text-[12px] text-muted num">лишиться отримати {money(e.left)}</span>}</span>
                  </div>
                ))}
              </div>
              <p className="text-[13px] text-muted mt-3">Сума підтверджених і запитаних зйомок попереду — орієнтир для планування й податків.</p>
            </>
          ) : <div className="empty">Попереду поки нічого не заплановано.</div>}
        </section>
      </div>
    </>
  );
}
