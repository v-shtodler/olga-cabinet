import Link from "next/link";
import { addDays, addMonths, format, startOfMonth, endOfMonth, parseISO, isWeekend, isValid } from "date-fns";
import { uk } from "date-fns/locale";
import { getShoots, getBlockedDays, getSettings } from "@/lib/data";
import { groupByDay, deadlinesByDay, freeDays, iso, todayISO, money, plural, fmtDate, TYPE_TONE } from "@/lib/domain";
import { ShootRow, Chip, Bar, TONE_BG, TONE_FG } from "@/components/ui";
import { AssistantInline } from "@/components/assistant";
import { toggleBlockedDay } from "@/app/actions";
import * as I from "@/components/icons";

export const metadata = { title: "Календар" };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string; d?: string }> }) {
  const sp = await searchParams; const today = todayISO();
  const sel = sp.d && isValid(parseISO(sp.d)) ? sp.d : today;
  const monthStart = sp.m && isValid(parseISO(sp.m + "-01")) ? parseISO(sp.m + "-01") : startOfMonth(parseISO(sel));
  const mKey = format(monthStart, "yyyy-MM");
  const gridStart = addDays(monthStart, -((monthStart.getDay() + 6) % 7));
  const from = iso(addDays(gridStart, -40)), to = iso(addDays(gridStart, 60));
  const [shoots, blocked, settings] = await Promise.all([getShoots({ from, to }), getBlockedDays(), getSettings()]);
  const active = shoots.filter((s) => s.status !== "cancelled");
  const byDay = groupByDay(active); const dlByDay = deadlinesByDay(active);
  const prev = format(addMonths(monthStart, -1), "yyyy-MM"), next = format(addMonths(monthStart, 1), "yyyy-MM");
  const mEnd = endOfMonth(monthStart);
  const inMonth = active.filter((s) => s.date >= iso(monthStart) && s.date <= iso(mEnd));
  const hours = inMonth.reduce((a, s) => a + s.total_hours, 0); const planned = inMonth.reduce((a, s) => a + s.price, 0);
  const pct = Math.min(100, Math.round(inMonth.length / settings.month_capacity * 100));
  const freeFrom = new Date(Math.max(monthStart.getTime(), parseISO(today).getTime()));
  const freeM = freeFrom <= mEnd ? freeDays(byDay, blocked, freeFrom, Math.round((mEnd.getTime() - freeFrom.getTime()) / 86400000) + 1) : [];
  const selShoots = byDay.get(sel) ?? []; const selDl = dlByDay.get(sel) ?? []; const selD = parseISO(sel);
  const selBlocked = blocked.has(sel); const selWe = isWeekend(selD);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)).filter((d, i) => i < 35 || d.getMonth() === monthStart.getMonth());

  return (
    <>
      <div className="flex justify-between items-center gap-4 flex-wrap mb-4 px-1">
        <div className="flex items-center gap-3">
          <Link href={`/calendar?m=${prev}&d=${sel}`} className="icon-btn" aria-label="Попередній місяць"><I.Back size={14} /></Link>
          <h1 className="text-[clamp(26px,4vw,38px)] font-extrabold tracking-tighter">{format(monthStart, "LLLL", { locale: uk })[0].toUpperCase() + format(monthStart, "LLLL", { locale: uk }).slice(1)} <span className="text-muted font-semibold">{format(monthStart, "yyyy")}</span></h1>
          <Link href={`/calendar?m=${next}&d=${sel}`} className="icon-btn" aria-label="Наступний місяць"><I.Right /></Link>
        </div>
        <div className="flex gap-2 flex-wrap"><Link href={`/calendar?d=${today}`} className="btn">Сьогодні</Link><Link href={`/shoots/new?date=${sel}`} className="btn btn-primary">+ Зйомка на {format(selD, "d MMM", { locale: uk }).replace(".", "")}</Link></div>
      </div>

      <div className="flex flex-wrap gap-3.5">
        <section className="card flex-[999_1_640px] min-w-0">
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map((w) => <div key={w} className="text-[11px] font-bold text-muted px-1.5 pb-1">{w}</div>)}
            {cells.map((d) => {
              const k = iso(d); const out = d.getMonth() !== monthStart.getMonth(); const ev = byDay.get(k) ?? []; const dl = dlByDay.get(k) ?? [];
              const isSel = k === sel; const isToday = k === today; const isFree = !out && !isWeekend(d) && ev.length === 0 && !blocked.has(k) && k >= today;
              return (
                <Link key={k} href={`/calendar?m=${mKey}&d=${k}`} className="min-h-[56px] sm:min-h-[92px] p-1.5 sm:p-2 rounded-[10px] sm:rounded-[14px] border flex flex-col gap-1 text-left" style={{ background: blocked.has(k) ? "var(--hair)" : isFree ? "var(--good-bg)" : "var(--glass-2)", borderColor: isSel ? "var(--accent)" : "var(--line)", boxShadow: isSel ? "0 0 0 2px rgba(29,111,242,.2)" : undefined, opacity: out ? 0.45 : 1 }}>
                  <span className="w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold" style={isToday ? { background: "var(--accent)", color: "#fff" } : undefined}>{d.getDate()}</span>
                  <span className="hidden sm:flex flex-col gap-1">{ev.slice(0, 3).map((s) => <span key={s.id} className="text-[10px] font-bold px-1.5 py-0.5 rounded-[7px] truncate" style={{ background: TONE_BG[TYPE_TONE[s.type]], color: TONE_FG[TYPE_TONE[s.type]] }}>{s.status === "request" ? "? " : ""}{s.client_name}</span>)}{dl.slice(0, 1).map((s) => <span key={"d" + s.id} className="text-[10px] font-bold px-1.5 py-0.5 rounded-[7px] truncate bg-fg text-bg">⏱ {s.client_name}</span>)}{ev.length > 3 && <span className="text-[10px] text-muted">+{ev.length - 3}</span>}</span>
                  <span className="flex sm:hidden gap-[3px]">{ev.map((s) => <i key={s.id} className="w-[5px] h-[5px] rounded-full" style={{ background: TONE_FG[TYPE_TONE[s.type]] }} />)}{dl.map((s) => <i key={"d" + s.id} className="w-[5px] h-[5px] rounded-full bg-fg" />)}</span>
                </Link>
              );
            })}
          </div>
          <div className="flex gap-3.5 flex-wrap text-xs text-muted font-medium mt-3">
            {(["lookbook", "product", "campaign", "portrait"] as const).map((t) => <span key={t} className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px] inline-block" style={{ background: TONE_BG[TYPE_TONE[t]], border: `1px solid ${TONE_FG[TYPE_TONE[t]]}` }} />{{ lookbook: "Lookbook", product: "Предметка", campaign: "Кампанія", portrait: "Портрети" }[t]}</span>)}
            <span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px] inline-block bg-fg" />Дедлайн</span><span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px] inline-block" style={{ background: "var(--good-bg)" }} />Вільно</span><span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px] inline-block" style={{ background: "var(--hair)" }} />Закрито</span>
          </div>
        </section>

        <aside className="flex-[1_1_300px] min-w-0 flex flex-col gap-3.5">
          <section className="card">
            <div className="flex justify-between items-baseline mb-3 gap-2"><h2 className="text-lg font-bold">{fmtDate(sel)}</h2><Chip tone={selBlocked ? "neutral" : selWe ? "neutral" : selShoots.length ? "info" : "good"}>{selBlocked ? "особистий блок" : selWe ? "вихідний" : selShoots.length ? `${selShoots.length} ${plural(selShoots.length, "зйомка", "зйомки", "зйомок")}` : "вільно"}</Chip></div>
            <div className="flex flex-col gap-2">
              {selShoots.map((s) => <ShootRow key={s.id} s={s} />)}
              {selDl.map((s) => <Link key={"dl" + s.id} href={`/shoots/${s.id}`} className="srow bg-fg text-bg"><div className="w-12 h-12 shrink-0 rounded-[14px] flex items-center justify-center" style={{ background: "rgba(255,255,255,.15)" }}><I.Clock /></div><div className="flex-1 min-w-0"><div className="font-semibold truncate">Віддати: {s.title}</div><div className="text-xs opacity-80 truncate">{s.client_name} · {s.photos} фото{s.extra_photos ? ` + ${s.extra_photos}` : ""}</div></div></Link>)}
              {!selShoots.length && !selDl.length && <div className="empty">{selBlocked ? "День закритий для зйомок." : "Нічого не заплановано."}</div>}
            </div>
            {sel >= today && <form action={toggleBlockedDay.bind(null, sel)} data-op="toggleBlockedDay" data-args={JSON.stringify([sel])} data-label={sel} className="mt-3"><button className="btn btn-sm">{selBlocked ? "Відкрити день" : "Закрити день (особисте)"}</button></form>}
          </section>
          <section className="card">
            <h2 className="text-lg font-bold mb-3">{format(monthStart, "LLLL", { locale: uk })[0].toUpperCase() + format(monthStart, "LLLL", { locale: uk }).slice(1)} у цифрах</h2>
            <div className="grid grid-cols-2 gap-3">{[["Зйомок", inMonth.length], ["Годин роботи", `~${Math.round(hours)}`], ["Заплановано", money(planned)], ["Вільних днів", freeM.length]].map(([k, v]) => <div key={String(k)}><div className="text-xs text-muted font-semibold">{k}</div><div className="text-2xl font-extrabold tracking-tight num">{v}</div></div>)}</div>
            <div className="mt-3.5"><div className="flex justify-between text-xs font-bold"><span className="text-muted">Завантаженість</span><span style={{ color: pct >= 90 ? "var(--warn)" : "var(--fg)" }}>{pct}%</span></div><div className="mt-1.5"><Bar pct={pct} color={pct >= 90 ? "linear-gradient(90deg,#fb923c,#f0552b)" : undefined} /></div><p className="text-xs text-muted mt-2">100% ≈ {settings.month_capacity} зйомок на місяць (налаштовується). Вище 90% — ретуш починає зʼїдати вихідні.</p></div>
          </section>
          <AssistantInline>Клацніть день — побачите, що там, і зможете додати зйомку на цю дату. «Закрити день» прибирає його з вільних вікон, які пропонує помічник.</AssistantInline>
        </aside>
      </div>
    </>
  );
}
