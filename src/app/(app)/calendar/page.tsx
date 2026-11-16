import Link from "next/link";
import { addDays, addMonths, addYears, format, startOfMonth, endOfMonth, parseISO, isWeekend, isValid } from "date-fns";
import { uk } from "date-fns/locale";
import { getShoots, getBlockedDays, getSettings } from "@/lib/data";
import { groupByDay, deadlinesByDay, freeDays, iso, todayISO, money, plural, fmtDate, TYPE_TONE, type ShootView } from "@/lib/domain";
import { ShootRow, Chip, Bar, TONE_BG, TONE_FG } from "@/components/ui";
import { AssistantInline } from "@/components/assistant";
import { toggleBlockedDay } from "@/app/actions";
import * as I from "@/components/icons";

export const metadata = { title: "Календар" };

type View = "year" | "month" | "week";
const VIEWS: [View, string][] = [["year", "Рік"], ["month", "Місяць"], ["week", "Тиждень"]];
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const monthName = (d: Date) => cap(format(d, "LLLL", { locale: uk }));
/** Monday-based start of the week containing d. */
const weekStart = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string; d?: string; v?: string }> }) {
  const sp = await searchParams; const today = todayISO();
  const view: View = sp.v === "year" || sp.v === "week" ? sp.v : "month";
  const sel = sp.d && isValid(parseISO(sp.d)) ? sp.d : today;
  const selD = parseISO(sel);
  const monthStart = sp.m && isValid(parseISO(sp.m + "-01")) ? parseISO(sp.m + "-01") : startOfMonth(selD);
  const mKey = format(monthStart, "yyyy-MM");
  const wStart = weekStart(selD), wEnd = addDays(wStart, 6);
  const yearStart = new Date(monthStart.getFullYear(), 0, 1);

  // Fetch exactly the span the chosen view draws (plus the grid overhang).
  const span = view === "year"
    ? { from: iso(yearStart), to: iso(new Date(monthStart.getFullYear(), 11, 31)) }
    : view === "week"
      ? { from: iso(addDays(wStart, -7)), to: iso(addDays(wEnd, 7)) }
      : { from: iso(addDays(addDays(monthStart, -((monthStart.getDay() + 6) % 7)), -40)), to: iso(addDays(monthStart, 60)) };
  const [shoots, blocked, settings] = await Promise.all([getShoots(span), getBlockedDays(), getSettings()]);
  const active = shoots.filter((s) => s.status !== "cancelled");
  const byDay = groupByDay(active); const dlByDay = deadlinesByDay(active);

  // Header: title and arrows step by the chosen view
  const href = (o: { v?: View; m?: string; d?: string }) => `/calendar?v=${o.v ?? view}&m=${o.m ?? mKey}&d=${o.d ?? sel}`;
  const title = view === "year" ? String(monthStart.getFullYear())
    : view === "week" ? `${format(wStart, "d")}–${format(wEnd, "d MMMM", { locale: uk })}`
      : monthName(monthStart);
  const sub = view === "year" ? "" : format(monthStart, "yyyy");
  const prevHref = view === "year" ? href({ m: format(addYears(monthStart, -1), "yyyy-MM"), d: iso(addYears(selD, -1)) })
    : view === "week" ? href({ d: iso(addDays(wStart, -7)), m: format(startOfMonth(addDays(wStart, -7)), "yyyy-MM") })
      : href({ m: format(addMonths(monthStart, -1), "yyyy-MM") });
  const nextHref = view === "year" ? href({ m: format(addYears(monthStart, 1), "yyyy-MM"), d: iso(addYears(selD, 1)) })
    : view === "week" ? href({ d: iso(addDays(wStart, 7)), m: format(startOfMonth(addDays(wStart, 7)), "yyyy-MM") })
      : href({ m: format(addMonths(monthStart, 1), "yyyy-MM") });

  const mEnd = endOfMonth(monthStart);
  const inMonth = active.filter((s) => s.date >= iso(monthStart) && s.date <= iso(mEnd));
  const hours = inMonth.reduce((a, s) => a + s.total_hours, 0); const planned = inMonth.reduce((a, s) => a + s.price, 0);
  const pct = Math.min(100, Math.round(inMonth.length / settings.month_capacity * 100));
  const freeFrom = new Date(Math.max(monthStart.getTime(), parseISO(today).getTime()));
  const freeM = freeFrom <= mEnd ? freeDays(byDay, blocked, freeFrom, Math.round((mEnd.getTime() - freeFrom.getTime()) / 86400000) + 1) : [];
  const selShoots = byDay.get(sel) ?? []; const selDl = dlByDay.get(sel) ?? [];
  const selBlocked = blocked.has(sel); const selWe = isWeekend(selD);
  const cells = (() => { const g = addDays(monthStart, -((monthStart.getDay() + 6) % 7)); return Array.from({ length: 42 }, (_, i) => addDays(g, i)).filter((d, i) => i < 35 || d.getMonth() === monthStart.getMonth()); })();
  const inYear = active.filter((s) => s.date.startsWith(String(monthStart.getFullYear())));

  const dayLink = (d: Date, v: View = "month") => href({ v, d: iso(d), m: format(startOfMonth(d), "yyyy-MM") });

  return (
    <>
      <div className="flex justify-between items-center gap-3 flex-wrap mb-4 px-1">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link href={prevHref} className="icon-btn" aria-label="Назад"><I.Back size={14} /></Link>
          <h1 className="text-[clamp(24px,4vw,34px)] font-bold tracking-[-0.01em] truncate">{cap(title)} {sub && <span className="text-muted font-semibold">{sub}</span>}</h1>
          <Link href={nextHref} className="icon-btn" aria-label="Вперед"><I.Right /></Link>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <div className="seg">{VIEWS.map(([v, label]) => <Link key={v} href={href({ v })} className={v === view ? "on" : ""}>{label}</Link>)}</div>
          <Link href={`/calendar?v=${view}&d=${today}`} className="btn btn-sm">Сьогодні</Link>
          {view !== "year" && <Link href={`/shoots/new?date=${sel}`} className="btn btn-sm btn-primary">+ Зйомка</Link>}
        </div>
      </div>

      <div className="flex flex-wrap gap-3.5">
        <section className="card flex-[999_1_640px] min-w-0">
          {/* ---------- MONTH ---------- */}
          {view === "month" && (
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {WEEKDAYS.map((w) => <div key={w} className="text-[12px] font-medium text-muted px-1.5 pb-1">{w}</div>)}
              {cells.map((d) => {
                const k = iso(d); const out = d.getMonth() !== monthStart.getMonth(); const ev = byDay.get(k) ?? []; const dl = dlByDay.get(k) ?? [];
                const isSel = k === sel; const isToday = k === today; const isFree = !out && !isWeekend(d) && ev.length === 0 && !blocked.has(k) && k >= today;
                return (
                  <Link key={k} href={dayLink(d)} className="min-h-[56px] sm:min-h-[92px] p-1.5 sm:p-2 rounded-[12px] border flex flex-col gap-1 text-left" style={{ background: blocked.has(k) ? "var(--fill-2)" : isFree ? "var(--good-bg)" : "var(--glass-2)", borderColor: isSel ? "var(--accent)" : "var(--line)", boxShadow: isSel ? "0 0 0 2px var(--accent-tint)" : undefined, opacity: out ? 0.45 : 1 }}>
                    <span className="w-[26px] h-[26px] rounded-full inline-flex items-center justify-center text-[13px] font-semibold" style={isToday ? { background: "var(--accent)", color: "#fff" } : undefined}>{d.getDate()}</span>
                    <span className="hidden sm:flex flex-col gap-1">{ev.slice(0, 3).map((s) => <span key={s.id} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[6px] truncate" style={{ background: TONE_BG[TYPE_TONE[s.type]], color: TONE_FG[TYPE_TONE[s.type]] }}>{s.status === "request" ? "? " : ""}{s.client_name}</span>)}{dl.slice(0, 1).map((s) => <span key={"d" + s.id} className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[6px] truncate" style={{ background: "var(--sun-bg)", color: "var(--sun)" }}>⏱ {s.client_name}</span>)}{ev.length > 3 && <span className="text-[10px] text-muted">+{ev.length - 3}</span>}</span>
                    <span className="flex sm:hidden gap-[3px]">{ev.map((s) => <i key={s.id} className="w-[5px] h-[5px] rounded-full" style={{ background: TONE_FG[TYPE_TONE[s.type]] }} />)}{dl.map((s) => <i key={"d" + s.id} className="w-[5px] h-[5px] rounded-full" style={{ background: "var(--sun)" }} />)}</span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* ---------- WEEK: a column per day, shoots with times ---------- */}
          {view === "week" && (
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-1.5">
              {Array.from({ length: 7 }, (_, i) => addDays(wStart, i)).map((d) => {
                const k = iso(d); const ev = byDay.get(k) ?? []; const dl = dlByDay.get(k) ?? [];
                const isSel = k === sel; const isToday = k === today; const isFree = !isWeekend(d) && ev.length === 0 && !blocked.has(k) && k >= today;
                return (
                  <Link key={k} href={href({ d: k })} className="rounded-[12px] border p-2 flex sm:flex-col gap-2 sm:min-h-[260px] text-left" style={{ background: blocked.has(k) ? "var(--fill-2)" : isFree ? "var(--good-bg)" : "var(--glass-2)", borderColor: isSel ? "var(--accent)" : "var(--line)", boxShadow: isSel ? "0 0 0 2px var(--accent-tint)" : undefined }}>
                    <div className="flex sm:flex-col items-center sm:items-start gap-2 sm:gap-0.5 shrink-0 w-[64px] sm:w-auto">
                      <span className="text-[12px] font-medium text-muted uppercase">{format(d, "EEEEEE", { locale: uk })}</span>
                      <span className="w-[26px] h-[26px] rounded-full inline-flex items-center justify-center text-[15px] font-semibold" style={isToday ? { background: "var(--accent)", color: "#fff" } : undefined}>{d.getDate()}</span>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                      {ev.map((s) => (
                        <span key={s.id} className="block px-2 py-1.5 rounded-[8px] text-[11px] leading-tight" style={{ background: TONE_BG[TYPE_TONE[s.type]], color: TONE_FG[TYPE_TONE[s.type]] }}>
                          {s.start_time && <b className="block num">{s.start_time.slice(0, 5)}{s.end_time ? `–${s.end_time.slice(0, 5)}` : ""}</b>}
                          <span className="block font-semibold truncate">{s.status === "request" ? "? " : ""}{s.client_name}</span>
                          <span className="block truncate opacity-80">{s.title}</span>
                        </span>
                      ))}
                      {dl.map((s) => <span key={"d" + s.id} className="block px-2 py-1.5 rounded-[8px] text-[11px] font-semibold truncate" style={{ background: "var(--sun-bg)", color: "var(--sun)" }}>⏱ Віддати · {s.client_name}</span>)}
                      {!ev.length && !dl.length && <span className="text-[11px] text-muted">{blocked.has(k) ? "закрито" : isFree ? "вільно" : "—"}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* ---------- YEAR: twelve mini-months ---------- */}
          {view === "year" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }, (_, m) => {
                const first = new Date(monthStart.getFullYear(), m, 1);
                const gStart = weekStart(first);
                const mDays = Array.from({ length: 42 }, (_, i) => addDays(gStart, i)).filter((d, i) => i < 35 || d.getMonth() === m);
                const count = active.filter((s) => s.date.startsWith(format(first, "yyyy-MM"))).length;
                return (
                  <div key={m} className="min-w-0">
                    <Link href={href({ v: "month", m: format(first, "yyyy-MM"), d: iso(first) })} className="flex items-baseline justify-between gap-2 mb-1.5 px-0.5">
                      <span className="text-[15px] font-semibold" style={{ color: m === parseISO(today).getMonth() && first.getFullYear() === parseISO(today).getFullYear() ? "var(--accent)" : "var(--fg)" }}>{monthName(first)}</span>
                      {count > 0 && <span className="text-[11px] font-semibold num" style={{ color: "var(--muted)" }}>{count}</span>}
                    </Link>
                    <div className="grid grid-cols-7 gap-[2px]">
                      {WEEKDAYS.map((w) => <span key={w} className="text-[9px] text-center" style={{ color: "var(--muted-2)" }}>{w[0]}</span>)}
                      {mDays.map((d) => {
                        const k = iso(d); const out = d.getMonth() !== m; const ev = byDay.get(k) ?? []; const dl = dlByDay.get(k) ?? [];
                        const isToday = k === today;
                        const bg = out ? "transparent" : ev.length ? TONE_BG[TYPE_TONE[ev[0].type]] : dl.length ? "var(--sun-bg)" : blocked.has(k) ? "var(--fill-2)" : "transparent";
                        const fg = out ? "var(--muted-2)" : ev.length ? TONE_FG[TYPE_TONE[ev[0].type]] : dl.length ? "var(--sun)" : "var(--fg)";
                        return (
                          <Link key={k} href={dayLink(d)} aria-label={k} className="aspect-square rounded-[5px] flex items-center justify-center text-[10px] font-medium" style={isToday ? { background: "var(--accent)", color: "#fff", fontWeight: 600 } : { background: bg, color: fg, opacity: out ? 0.4 : 1 }}>{d.getDate()}</Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-3.5 flex-wrap text-[13px] text-muted font-medium mt-3">
            {(["lookbook", "product", "campaign", "portrait"] as const).map((t) => <span key={t} className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px] inline-block" style={{ background: TONE_BG[TYPE_TONE[t]], border: `1px solid ${TONE_FG[TYPE_TONE[t]]}` }} />{{ lookbook: "Lookbook", product: "Предметка", campaign: "Кампанія", portrait: "Портрети" }[t]}</span>)}
            <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px] inline-block" style={{ background: "var(--sun)" }} />Дедлайн</span><span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px] inline-block" style={{ background: "var(--good-bg)" }} />Вільно</span><span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px] inline-block" style={{ background: "var(--fill-2)" }} />Закрито</span>
          </div>
        </section>

        <aside className="flex-[1_1_300px] min-w-0 flex flex-col gap-3.5">
          {view !== "year" && (
            <section className="card">
              <div className="flex justify-between items-baseline mb-3 gap-2"><h2 className="text-[17px] font-semibold">{fmtDate(sel)}</h2><Chip tone={selBlocked ? "neutral" : selWe ? "neutral" : selShoots.length ? "info" : "good"}>{selBlocked ? "особистий блок" : selWe ? "вихідний" : selShoots.length ? `${selShoots.length} ${plural(selShoots.length, "зйомка", "зйомки", "зйомок")}` : "вільно"}</Chip></div>
              <div className="flex flex-col gap-2">
                {selShoots.map((s: ShootView) => <ShootRow key={s.id} s={s} />)}
                {selDl.map((s: ShootView) => <Link key={"dl" + s.id} href={`/shoots/${s.id}`} className="srow" style={{ background: "var(--sun-bg)" }}><div className="w-12 h-12 shrink-0 rounded-[12px] flex items-center justify-center" style={{ background: "var(--glass)" }}><I.Clock /></div><div className="flex-1 min-w-0"><div className="font-semibold truncate">Віддати: {s.title}</div><div className="text-[13px] text-muted truncate">{s.client_name} · {s.photos} фото{s.extra_photos ? ` + ${s.extra_photos}` : ""}</div></div></Link>)}
                {!selShoots.length && !selDl.length && <div className="empty">{selBlocked ? "День закритий для зйомок." : "Нічого не заплановано."}</div>}
              </div>
              {sel >= today && <form action={toggleBlockedDay.bind(null, sel)} data-op="toggleBlockedDay" data-args={JSON.stringify([sel])} data-label={sel} className="mt-3"><button className="btn btn-sm">{selBlocked ? "Відкрити день" : "Закрити день (особисте)"}</button></form>}
            </section>
          )}
          {view === "year" ? (
            <section className="card">
              <h2 className="text-[17px] font-semibold mb-3">{monthStart.getFullYear()} у цифрах</h2>
              <div className="grid grid-cols-2 gap-3">{[["Зйомок", inYear.length], ["Годин роботи", `~${Math.round(inYear.reduce((a, s) => a + s.total_hours, 0))}`], ["Сума", money(inYear.reduce((a, s) => a + s.price, 0))], ["Місяців із зйомками", new Set(inYear.map((s) => s.date.slice(0, 7))).size]].map(([k, v]) => <div key={String(k)}><div className="text-[13px] text-muted font-semibold">{k}</div><div className="text-2xl font-bold tracking-[-0.01em] num">{v}</div></div>)}</div>
              <p className="text-[13px] text-muted mt-3">Клацніть місяць — відкриється сітка місяця; клацніть день — відкриється той день.</p>
            </section>
          ) : (
            <section className="card">
              <h2 className="text-[17px] font-semibold mb-3">{monthName(monthStart)} у цифрах</h2>
              <div className="grid grid-cols-2 gap-3">{[["Зйомок", inMonth.length], ["Годин роботи", `~${Math.round(hours)}`], ["Заплановано", money(planned)], ["Вільних днів", freeM.length]].map(([k, v]) => <div key={String(k)}><div className="text-[13px] text-muted font-semibold">{k}</div><div className="text-2xl font-bold tracking-[-0.01em] num">{v}</div></div>)}</div>
              <div className="mt-3.5"><div className="flex justify-between text-[13px] font-semibold"><span className="text-muted">Завантаженість</span><span style={{ color: pct >= 90 ? "var(--warn)" : "var(--fg)" }}>{pct}%</span></div><div className="mt-1.5"><Bar pct={pct} color={pct >= 90 ? "var(--warn)" : undefined} /></div><p className="text-[13px] text-muted mt-2">100% ≈ {settings.month_capacity} зйомок на місяць (налаштовується). Вище 90% — ретуш починає зʼїдати вихідні.</p></div>
            </section>
          )}
          <AssistantInline>{view === "year" ? "Рік показує, де густо, а де вільно: кольорові дні — зйомки, жовті — дедлайни віддачі." : "Клацніть день — побачите, що там, і зможете додати зйомку на цю дату. «Закрити день» прибирає його з вільних вікон, які пропонує помічник."}</AssistantInline>
        </aside>
      </div>
    </>
  );
}
