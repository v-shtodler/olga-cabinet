import Link from "next/link";
import { addDays, format, isWeekend, subMonths, startOfMonth } from "date-fns";
import { uk } from "date-fns/locale";
import { getShoots, getClients, getClientPrefs, getSettings, getDismissed, getBlockedDays, getTaxQuarters, getTaxPaid, getIncomeMonthly } from "@/lib/data";
import { nowKyiv, buildInsights, taxTimeline, groupByDay, deadlinesByDay, freeDays, todayISO, iso, money, moneyK, plural, relDays, daysBetween, fmtShort, TYPE_TONE, quarterOf } from "@/lib/domain";
import { Assistant } from "@/components/assistant";
import { Kpi, ShootRow, TONE_BG, TONE_FG } from "@/components/ui";

export default async function HomePage() {
  const today = todayISO(); const now = nowKyiv();
  const [shoots, clients, prefs, settings, dismissed, blocked, quarters, taxPaid, monthly] = await Promise.all([
    getShoots({ from: iso(subMonths(now, 13)) }), getClients(), getClientPrefs(), getSettings(), getDismissed(), getBlockedDays(), getTaxQuarters(), getTaxPaid(), getIncomeMonthly(),
  ]);
  const tl = taxTimeline(quarters, taxPaid, settings);
  const taxNext = tl.find((t) => !t.paid && !t.ongoing) ?? null;
  const insights = buildInsights({ shoots, clients, prefs, settings, dismissed, blocked, scope: { type: "home" }, taxNext: taxNext ? { key: taxNext.key, label: taxNext.label, amount: taxNext.amount, due: taxNext.due } : null });

  const active = shoots.filter((s) => s.status !== "cancelled");
  const upcoming = active.filter((s) => s.date >= today && s.status !== "request");
  const requests = active.filter((s) => s.status === "request");
  const inWork = active.filter((s) => s.status === "shot");
  const owed = active.filter((s) => s.status === "delivered" && s.balance > 0);
  const owedSum = owed.reduce((a, s) => a + s.balance, 0);
  const byDay = groupByDay(active); const dlByDay = deadlinesByDay(active);
  const free = freeDays(byDay, blocked, now, 14);
  const wk = upcoming.filter((s) => daysBetween(today, s.date) < 7).length;
  const h = now.getHours(); const greet = h < 12 ? "Доброго ранку" : h < 18 ? "Добрий день" : "Добрий вечір";

  // 12-month income
  const m12 = Array.from({ length: 12 }, (_, i) => { const d = startOfMonth(subMonths(now, 11 - i)); const k = format(d, "yyyy-MM"); return { d, label: format(d, "LLL", { locale: uk }).replace(".", ""), income: monthly.find((m) => m.month.startsWith(k))?.income ?? 0 }; });
  const max12 = Math.max(...m12.map((m) => m.income), 1);
  const cur = m12[11], prev = m12[10]; const delta = prev.income ? Math.round((cur.income / prev.income - 1) * 100) : null;
  const q = quarterOf(now); const qInc = quarters.filter((x) => `${x.year}` === q.from.slice(0, 4) && x.quarter === Math.floor(now.getMonth() / 3) + 1).reduce((a, x) => a + Number(x.income), 0);
  const qTax = qInc * (settings.ep_rate + settings.vz_rate) / 100;

  return (
    <>
      <div className="flex justify-between items-end gap-4 flex-wrap mb-5 px-1">
        <div>
          <div className="text-[13px] text-muted font-medium mb-1.5">{format(now, "EEEE, d MMMM yyyy", { locale: uk })}</div>
          <h1 className="text-[clamp(26px,4vw,38px)] font-extrabold leading-[1.08] tracking-tighter">{greet}, {settings.display_name} ☀️</h1>
          <p className="text-muted mt-1.5">Цього тижня {wk} {plural(wk, "зйомка", "зйомки", "зйомок")}, {inWork.length} {plural(inWork.length, "віддача", "віддачі", "віддач")} в роботі{owed.length ? `, ${owed.length} ${plural(owed.length, "рахунок", "рахунки", "рахунків")} чекає оплати` : ""}.</p>
        </div>
        <Link href="/shoots/new" className="btn btn-primary">+ Нова зйомка</Link>
      </div>

      <div className="flex flex-col gap-4">
        {/* 14-day strip */}
        <section className="card">
          <div className="flex justify-between items-baseline gap-3 mb-3.5 flex-wrap"><h2 className="text-lg font-bold">Найближчі 14 днів</h2><Link href="/calendar" className="text-[13px] font-semibold text-accent">Повний календар →</Link></div>
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {Array.from({ length: 14 }, (_, i) => {
              const d = addDays(now, i); const k = iso(d); const we = isWeekend(d); const ev = byDay.get(k) ?? []; const dl = dlByDay.get(k) ?? [];
              const isFree = !we && ev.length === 0 && !blocked.has(k);
              return (
                <Link key={k} href={`/calendar?d=${k}`} className="rounded-[10px] sm:rounded-[14px] p-1.5 sm:p-2 min-h-[74px] sm:min-h-[86px] flex flex-col gap-1 border text-left" style={{ background: isFree ? "var(--good-bg)" : blocked.has(k) ? "var(--hair)" : "var(--glass-2)", borderColor: i === 0 ? "var(--accent)" : isFree ? "transparent" : "var(--line)", boxShadow: i === 0 ? "0 0 0 2px rgba(29,111,242,.2)" : undefined, opacity: we && !ev.length ? 0.8 : 1 }}>
                  <div className="flex justify-between items-baseline text-xs font-bold"><span>{d.getDate()}</span><small className="font-medium text-muted text-[10px] uppercase">{format(d, "EEEEEE", { locale: uk })}</small></div>
                  {ev.map((s) => <span key={s.id} className="text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded-[7px] truncate" style={{ background: TONE_BG[TYPE_TONE[s.type]], color: TONE_FG[TYPE_TONE[s.type]] }}>{s.status === "request" ? "? " : ""}{s.client_name}</span>)}
                  {dl.map((s) => <span key={"dl" + s.id} className="text-[9px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded-[7px] truncate bg-fg text-bg">⏱ {s.client_name}</span>)}
                  {isFree && <span className="text-[10px] font-bold mt-auto" style={{ color: "var(--good)" }}>вільно</span>}
                </Link>
              );
            })}
          </div>
          <div className="flex gap-3.5 flex-wrap text-xs text-muted font-medium mt-3">
            {(["lookbook", "product", "campaign", "portrait"] as const).map((t) => <span key={t} className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px] inline-block" style={{ background: TONE_BG[TYPE_TONE[t]], border: `1px solid ${TONE_FG[TYPE_TONE[t]]}` }} />{{ lookbook: "Lookbook", product: "Предметка", campaign: "Кампанія", portrait: "Портрети" }[t]}</span>)}
            <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px] inline-block bg-fg" />Дедлайн віддачі</span>
            <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px] inline-block" style={{ background: "var(--good-bg)" }} />Вільний день</span>
            <span>? — запит без передоплати</span>
          </div>
        </section>

        <Assistant items={insights} />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <Kpi label="Заброньовано · 14 днів" dot="var(--accent)" value={upcoming.filter((s) => daysBetween(today, s.date) < 14).length} sub={`${requests.length} ${plural(requests.length, "запит", "запити", "запитів")} без передоплати`} />
          <Kpi label="Вільних днів · 14 днів" dot="var(--good)" value={free.length} sub={free.length ? `найближчий — ${fmtShort(free[0])}` : "усе зайнято"} />
          <Kpi label="Дедлайнів у роботі" dot="var(--warn)" value={inWork.length} sub={inWork.length ? `найближчий ${relDays(Math.min(...inWork.map((s) => daysBetween(today, s.deadline))))}` : "нічого не висить"} />
          <Kpi label="Очікую оплату" dot="var(--purple)" value={money(owedSum)} sub={`${owed.length} ${plural(owed.length, "рахунок", "рахунки", "рахунків")}`} subTone={owed.length ? "warn" : undefined} />
        </div>

        <div className="flex flex-wrap gap-3.5">
          <div className="flex-[999_1_560px] min-w-0 flex flex-col gap-3.5">
            <section className="card">
              <div className="flex justify-between items-baseline mb-3.5"><h2 className="text-lg font-bold">Найближчі зйомки</h2><Link href="/shoots" className="text-[13px] font-semibold text-accent">Усі зйомки →</Link></div>
              <div className="flex flex-col gap-2">{upcoming.length ? upcoming.slice(0, 5).map((s) => <ShootRow key={s.id} s={s} rel />) : <div className="empty">Запланованих зйомок нема — час писати клієнтам 🙂</div>}</div>
            </section>
            <section className="card">
              <div className="flex justify-between items-baseline mb-3.5"><h2 className="text-lg font-bold">Отримано за 12 місяців</h2><Link href="/analytics" className="text-[13px] font-semibold text-accent">Аналітика →</Link></div>
              <div className="flex items-end gap-2 h-[180px]">
                {m12.map((m, i) => <div key={i} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1.5"><div className="text-[10px] text-muted font-semibold num whitespace-nowrap">{m.income ? moneyK(m.income) : ""}</div><i className="block w-full rounded-t-lg rounded-b" style={{ height: Math.max(4, Math.round(m.income / max12 * 140)), background: i === 11 ? "linear-gradient(180deg,var(--accent-2),var(--accent))" : "linear-gradient(180deg,rgba(79,155,255,.5),rgba(29,111,242,.35))", boxShadow: i === 11 ? "0 6px 16px rgba(29,111,242,.3)" : undefined }} /></div>)}
              </div>
              <div className="flex gap-2 mt-1.5">{m12.map((m, i) => <span key={i} className="flex-1 text-center text-[10px] font-semibold text-muted min-w-0">{m.label}</span>)}</div>
              <p className="text-xs text-muted mt-3">{format(cur.d, "LLLL", { locale: uk })}: <b className="num text-fg">{money(cur.income)}</b>{delta != null && <> <span className="font-bold" style={{ color: delta >= 0 ? "var(--good)" : "var(--warn)" }}>{delta >= 0 ? "↑ +" : "↓ "}{delta}%</span> до {format(prev.d, "LLLL", { locale: uk }).toLowerCase()}</>}</p>
            </section>
          </div>
          <div className="flex-[1_1_300px] min-w-0 flex flex-col gap-3.5">
            <section className="card">
              <h2 className="text-lg font-bold mb-3.5">В роботі зараз</h2>
              <div className="flex flex-col gap-2">{inWork.length ? inWork.map((s) => <ShootRow key={s.id} s={s} />) : <div className="empty">Нічого не висить — усе віддано ✨</div>}</div>
            </section>
            <section className="rounded-[22px] p-5 text-white flex flex-wrap gap-4 items-center justify-between" style={{ background: "linear-gradient(135deg,#1d6ff2,#4f9bff)", boxShadow: "0 14px 36px rgba(29,111,242,.3)" }}>
              <div className="flex-1 min-w-[200px]"><div className="text-xs font-semibold opacity-85">ФОП 3 група · поточний квартал</div><div className="text-2xl font-extrabold tracking-tight num">{money(qTax)}</div><div className="text-xs opacity-90">ЄП {settings.ep_rate}% + ВЗ {settings.vz_rate}% з отриманих {money(qInc)}</div></div>
              <Link href="/taxes" className="btn bg-white border-0" style={{ color: "#1d4ed8" }}>Податковий модуль</Link>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
