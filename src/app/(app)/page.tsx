import Link from "next/link";
import { format, subMonths, startOfMonth, startOfQuarter, endOfQuarter, endOfMonth } from "date-fns";
import { uk } from "date-fns/locale";
import { getShoots, getSettings, getTaxQuarters, getTaxPaid, getIncomeMonthly } from "@/lib/data";
import { nowKyiv, taxTimeline, todayISO, iso, money, moneyK, fmtDate, brandColor, STATUS_UA, STATUS_TONE } from "@/lib/domain";
import { Kpi, Chip, DateBox } from "@/components/ui";

type Period = "month" | "quarter" | "year";
const PERIODS: [Period, string][] = [["month", "Місяць"], ["quarter", "Квартал"], ["year", "Рік"]];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export default async function HomePage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const sp = await searchParams;
  const period: Period = sp.p === "quarter" || sp.p === "year" ? sp.p : "month";
  const today = todayISO(); const now = nowKyiv();
  const [shoots, settings, quarters, taxPaid, monthly] = await Promise.all([
    getShoots({ from: iso(subMonths(now, 13)) }), getSettings(), getTaxQuarters(), getTaxPaid(), getIncomeMonthly(),
  ]);
  const tl = taxTimeline(quarters, taxPaid, settings);
  // the band talks about THIS quarter, so it carries this quarter's own deadline;
  // anything unpaid from a quarter that already closed gets its own line below it
  const overdue = tl.filter((t) => !t.paid && !t.ongoing && t.due < today);

  const active = shoots.filter((s) => s.status !== "cancelled");
  const upcoming = active.filter((s) => s.date >= today && s.status !== "cancelled").slice(0, 5);
  const h = now.getHours(); const greet = h < 12 ? "Доброго ранку" : h < 18 ? "Добрий день" : "Добрий вечір";

  // The period controls the three numbers at the top.
  const range = period === "month" ? { from: iso(startOfMonth(now)), to: iso(endOfMonth(now)), label: cap(format(now, "LLLL", { locale: uk })) }
    : period === "quarter" ? { from: iso(startOfQuarter(now)), to: iso(endOfQuarter(now)), label: `${Math.floor(now.getMonth() / 3) + 1} кв.` }
      : { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31`, label: String(now.getFullYear()) };
  const incomeIn = (a: string, b: string) => monthly.filter((m) => m.month >= a.slice(0, 7) + "-01" && m.month <= b).reduce((x, m) => x + m.income, 0);
  const income = incomeIn(range.from, range.to);
  const prevStart = period === "month" ? iso(startOfMonth(subMonths(now, 1))) : period === "quarter" ? iso(startOfQuarter(subMonths(now, 3))) : `${now.getFullYear() - 1}-01-01`;
  const prevEnd = period === "month" ? iso(endOfMonth(subMonths(now, 1))) : period === "quarter" ? iso(endOfQuarter(subMonths(now, 3))) : `${now.getFullYear() - 1}-12-31`;
  const prevIncome = incomeIn(prevStart, prevEnd);
  const delta = prevIncome ? Math.round((income / prevIncome - 1) * 100) : null;
  const inRange = active.filter((s) => s.date >= range.from && s.date <= range.to);
  const avgCheque = inRange.length ? Math.round(inRange.reduce((a, s) => a + s.price, 0) / inRange.length) : 0;

  // Taxes of the quarter the period falls into
  const qNo = Math.floor(now.getMonth() / 3) + 1;
  const qRow = quarters.find((x) => x.year === now.getFullYear() && x.quarter === qNo);
  const qIncome = Number(qRow?.income ?? 0);
  const qTax = Number(qRow?.ep ?? 0) + Number(qRow?.vz ?? 0);
  const esv = Number(settings.esv_monthly) * 3;
  const qDue = tl.find((t) => t.year === now.getFullYear() && t.quarter === qNo && t.kind === "tax")?.due ?? null;

  const m12 = Array.from({ length: 12 }, (_, i) => {
    const d = startOfMonth(subMonths(now, 11 - i)); const k = format(d, "yyyy-MM");
    return { d, label: format(d, "LLL", { locale: uk }).replace(".", ""), income: monthly.filter((m) => m.month.startsWith(k)).reduce((a, m) => a + m.income, 0) };
  });
  const max12 = Math.max(...m12.map((m) => m.income), 1);
  const total12 = m12.reduce((a, m) => a + m.income, 0);
  const best = m12.slice().sort((a, b) => b.income - a.income)[0];
  const yearIncome = incomeIn(`${now.getFullYear()}-01-01`, `${now.getFullYear()}-12-31`);
  const limitPct = Math.min(100, Math.round(yearIncome / settings.income_limit * 100));

  return (
    <>
      <div className="flex justify-between items-end gap-4 flex-wrap mb-5 px-1">
        <div>
          <div className="text-[13px] text-muted font-medium mb-1">{cap(format(now, "EEEE, d MMMM yyyy", { locale: uk }))}</div>
          <h1 className="text-[34px] md:text-[32px] font-bold leading-[1.1] tracking-[-0.01em]">{greet}, {settings.display_name}</h1>
          <p className="text-muted mt-1">{upcoming.length ? `Найближча зйомка — ${fmtDate(upcoming[0].date)}, ${upcoming[0].client_name}.` : "Попереду поки нічого не заплановано."}</p>
        </div>
        <div className="seg">{PERIODS.map(([k, l]) => <Link key={k} href={`/?p=${k}`} className={k === period ? "on" : ""}>{l}</Link>)}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Kpi label={`Дохід · ${range.label}`} dot="var(--good)" value={money(income)}
          sub={delta == null ? "усі платежі" : `${delta >= 0 ? "↑ +" : "↓ "}${delta}% до попереднього періоду`} subTone={delta != null && delta < 0 ? "warn" : "good"} />
        <Kpi label={`Зйомок · ${range.label}`} dot="var(--accent)" value={inRange.length}
          sub={inRange.length ? `середній чек ${money(avgCheque)}` : "поки порожньо"} />
        <Kpi label={`Податки за ${qNo} кв.`} dot="var(--purple)" value={money(qTax)}
          sub={`ЄП ${settings.ep_rate}% + ВЗ ${settings.vz_rate}% з ${money(qIncome)}`} />
      </div>

      <div className="flex flex-wrap gap-3.5 mt-3.5">
        <section className="card flex-[999_1_520px] min-w-0">
          <div className="flex justify-between items-baseline mb-4 gap-3">
            <h2 className="text-[17px] font-semibold">Дохід за 12 місяців</h2>
            <Link href="/analytics" className="text-[15px] font-medium text-accent">Уся аналітика →</Link>
          </div>
          <div className="flex items-end gap-1.5 sm:gap-2 h-[190px]">
            {m12.map((m, i) => (
              <div key={i} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1.5">
                {m.income > 0 && <span className="text-[10px] sm:text-[11px] font-semibold num" style={{ color: i === 11 ? "var(--accent)" : "var(--muted)" }}>{moneyK(m.income)}</span>}
                <i className="block w-full rounded-t-[6px] rounded-b-[2px]" style={{ height: Math.max(4, Math.round(m.income / max12 * 150)), background: i === 11 ? "linear-gradient(180deg, var(--accent-2), var(--accent))" : "linear-gradient(180deg, color-mix(in srgb, var(--accent) 42%, transparent), color-mix(in srgb, var(--accent) 16%, transparent))" }} />
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 sm:gap-2 mt-1.5">{m12.map((m, i) => <span key={i} className="flex-1 text-center text-[10px] sm:text-[11px] font-medium" style={{ color: i === 11 ? "var(--fg)" : "var(--muted)" }}>{m.label}</span>)}</div>
          <p className="text-[13px] text-muted mt-3.5">Усього за 12 місяців — <b className="num text-fg">{money(total12)}</b>{best.income > 0 ? <> · найкращий місяць — {format(best.d, "LLLL", { locale: uk })} ({money(best.income)})</> : null}</p>
        </section>

        <section className="card flex-[1_1_320px] min-w-0">
          <div className="flex justify-between items-baseline mb-3.5 gap-3">
            <h2 className="text-[17px] font-semibold">Найближчі зйомки</h2>
            <Link href="/calendar" className="text-[15px] font-medium text-accent">Календар →</Link>
          </div>
          <div className="flex flex-col gap-2">
            {upcoming.length ? upcoming.map((s) => (
              <Link key={s.id} href={`/shoots/${s.id}`} className="srow">
                <DateBox date={s.date} tone="neutral" accent={brandColor(s.client_hue)} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{s.client_name}</div>
                  <div className="text-[13px] text-muted truncate">{s.location ?? "—"}{s.start_time ? `, ${s.start_time.slice(0, 5)}` : ""}</div>
                </div>
                <Chip tone={STATUS_TONE[s.status]}>{STATUS_UA[s.status]}</Chip>
              </Link>
            )) : <div className="empty">Нових зйомок поки немає.</div>}
          </div>
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
