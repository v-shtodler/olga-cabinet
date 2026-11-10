import Link from "next/link";
import { getSettings, getTaxQuarters, getTaxPaid, getDismissed, getIncomeMonthly, getClients } from "@/lib/data";
import { taxTimeline, buildInsights, money, fmtDate, fmtShort, relDays, daysBetween, todayISO } from "@/lib/domain";
import { Chip } from "@/components/ui";
import { Assistant } from "@/components/assistant";
import { markTaxPaid } from "@/app/actions";
import { uk } from "date-fns/locale";
import { format } from "date-fns";

export const metadata = { title: "Податки" };

export default async function TaxesPage({ searchParams }: { searchParams: Promise<{ y?: string }> }) {
  const { y } = await searchParams; const today = todayISO(); const curY = new Date().getFullYear();
  const year = y && /^\d{4}$/.test(y) ? Number(y) : curY;
  const [settings, quarters, paid, dismissed, monthly, clients] = await Promise.all([getSettings(), getTaxQuarters(), getTaxPaid(), getDismissed(), getIncomeMonthly(), getClients()]);
  const tl = taxTimeline(quarters, paid, settings);
  const next = tl.find((t) => !t.paid && !t.ongoing);
  const yearItems = tl.filter((t) => t.year === year);
  const qs = [1, 2, 3, 4].map((q) => ({ q, tax: yearItems.find((t) => t.quarter === q && t.kind === "tax"), esv: yearItems.find((t) => t.quarter === q && t.kind === "esv") })).filter((x) => x.tax);
  const yIncome = quarters.filter((q) => q.year === year).reduce((a, q) => a + Number(q.income), 0);
  const ep = yIncome * settings.ep_rate / 100, vz = yIncome * settings.vz_rate / 100, esvY = qs.length * settings.esv_monthly * 3;
  const insights = buildInsights({ shoots: [], clients, prefs: [], settings, dismissed, blocked: new Set(), scope: { type: "taxes", yearIncome: quarters.filter((q) => q.year === curY).reduce((a, q) => a + Number(q.income), 0) } });
  tl.filter((t) => !t.paid && !t.ongoing && daysBetween(today, t.due) <= 30 && !dismissed.has(`tax-${t.key}`)).forEach((t) => { const d = daysBetween(today, t.due); insights.push({ key: `tax-${t.key}`, kind: "tax", sev: d < 0 ? "high" : d <= 7 ? "mid" : "low", tag: d < 0 ? `Прострочено · ${relDays(d)}` : relDays(d), text: `${t.label} — ${money(t.amount)}, строк ${fmtDate(t.due)}.`, action: { label: "Позначити сплаченим", taxKey: t.key } }); });
  const m12 = Array.from({ length: 12 }, (_, m) => ({ l: format(new Date(year, m, 1), "LLL", { locale: uk }).replace(".", ""), inc: monthly.find((x) => x.month.startsWith(`${year}-${String(m + 1).padStart(2, "0")}`))?.income ?? 0 }));
  const maxM = Math.max(...m12.map((x) => x.inc), 1);
  const stChip = (it: { paid: boolean; ongoing: boolean; due: string }) => it.paid ? <Chip tone="good">✓ сплачено</Chip> : it.ongoing ? <Chip tone="info">триває</Chip> : <Chip tone={daysBetween(today, it.due) < 0 ? "warn" : "sun"}>до {fmtShort(it.due)}</Chip>;

  return (
    <>
      <div className="flex justify-between items-end gap-4 flex-wrap mb-4 px-1">
        <div><div className="text-[13px] text-muted font-medium mb-1.5">ФОП · 3 група · {settings.ep_rate}% без ПДВ · ставки діють з {fmtDate(settings.rates_from, true)}</div><h1 className="text-[clamp(26px,4vw,38px)] font-extrabold tracking-tighter">Податки {year}</h1><p className="text-muted mt-1.5 max-w-[62ch]">Рахується за фактично отриманими платежами. Це помічник для планування, а не заміна бухгалтера чи звітності в кабінеті платника.</p></div>
        <div className="flex gap-2"><div className="seg">{[curY - 1, curY].map((v) => <Link key={v} href={`/taxes?y=${v}`} className={year === v ? "on" : ""}>{v}</Link>)}</div><Link href="/settings" className="btn">Ставки</Link></div>
      </div>
      <div className="flex flex-wrap gap-3.5">
        <div className="flex-[999_1_600px] min-w-0 flex flex-col gap-3.5">
          {next && <section className="rounded-[22px] p-6 text-white flex flex-wrap gap-6 items-start" style={{ background: daysBetween(today, next.due) < 0 ? "linear-gradient(135deg,#f0552b,#fb923c)" : "linear-gradient(135deg,#1d6ff2,#4f9bff)", boxShadow: "0 14px 36px rgba(29,111,242,.3)" }}>
            <div className="flex-1 min-w-[220px]"><div className="text-xs font-bold opacity-90">⏱ Найближче · {daysBetween(today, next.due) < 0 ? "прострочено " : ""}{relDays(daysBetween(today, next.due))}</div><div className="text-3xl font-extrabold tracking-tighter num">{money(next.amount)}</div><div className="text-xs opacity-90">{next.label}{next.kind === "tax" ? ` · з доходу ${money(next.income ?? 0)}` : ""}</div></div>
            <div className="flex-1 min-w-[220px] text-[13px] flex flex-col gap-1.5">{next.kind === "tax" && next.declDue && <div className="flex justify-between px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,.18)" }}><span>Декларація</span><b>до {fmtDate(next.declDue)}</b></div>}<div className="flex justify-between px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,.18)" }}><span>Сплата</span><b>до {fmtDate(next.due)}</b></div></div>
            <form action={markTaxPaid.bind(null, next.key)}><button className="btn bg-white border-0" style={{ color: daysBetween(today, next.due) < 0 ? "#c2410c" : "#1d4ed8" }}>Позначити сплаченим</button></form>
          </section>}
          <Assistant items={insights} title="Помічник про податки" empty="Строки не горять, ліміт далеко." />
          <section className="card">
            <h2 className="text-lg font-bold mb-3">По кварталах</h2>
            {qs.length === 0 ? <div className="empty">За {year} рік платежів ще нема.</div> : (
              <div className="overflow-x-auto"><table className="w-full text-[13px]" style={{ borderCollapse: "separate", borderSpacing: "0 6px" }}>
                <thead><tr className="text-xs text-muted">{["Квартал", "Отримано", `ЄП ${settings.ep_rate}%`, `ВЗ ${settings.vz_rate}%`, "ЄСВ", "Разом", "ЄП + ВЗ", "ЄСВ"].map((h, i) => <th key={h + i} className={`font-semibold px-2.5 py-0.5 ${i >= 1 && i <= 5 ? "text-right" : "text-left"}`}>{h}</th>)}</tr></thead>
                <tbody>{qs.map(({ q, tax, esv }) => <tr key={q}><td className="px-2.5 py-2.5 bg-glass-2 rounded-l-xl font-bold whitespace-nowrap">{q} квартал{tax!.ongoing ? " · триває" : ""}</td><td className="px-2.5 py-2.5 bg-glass-2 text-right num whitespace-nowrap">{money(tax!.income ?? 0)}</td><td className="px-2.5 py-2.5 bg-glass-2 text-right num whitespace-nowrap">{money(tax!.ep ?? 0)}</td><td className="px-2.5 py-2.5 bg-glass-2 text-right num whitespace-nowrap">{money(tax!.vz ?? 0)}</td><td className="px-2.5 py-2.5 bg-glass-2 text-right num whitespace-nowrap">{money(esv!.amount)}</td><td className="px-2.5 py-2.5 bg-glass-2 text-right num font-bold whitespace-nowrap">{money(tax!.amount + esv!.amount)}</td><td className="px-2.5 py-2.5 bg-glass-2 whitespace-nowrap">{stChip(tax!)}{!tax!.paid && !tax!.ongoing && <form action={markTaxPaid.bind(null, tax!.key)} className="inline ml-1.5"><button className="text-accent text-xs font-semibold">сплатити</button></form>}</td><td className="px-2.5 py-2.5 bg-glass-2 rounded-r-xl whitespace-nowrap">{stChip(esv!)}{!esv!.paid && !esv!.ongoing && <form action={markTaxPaid.bind(null, esv!.key)} className="inline ml-1.5"><button className="text-accent text-xs font-semibold">сплатити</button></form>}</td></tr>)}
                <tr><td className="px-2.5 pt-2 font-bold">Рік, факт</td><td className="px-2.5 pt-2 text-right num font-bold">{money(yIncome)}</td><td className="px-2.5 pt-2 text-right num font-bold">{money(ep)}</td><td className="px-2.5 pt-2 text-right num font-bold">{money(vz)}</td><td className="px-2.5 pt-2 text-right num font-bold">{money(esvY)}</td><td className="px-2.5 pt-2 text-right num font-extrabold">{money(ep + vz + esvY)}</td><td colSpan={2} className="px-2.5 pt-2 text-muted">{yIncome ? `${Math.round((ep + vz + esvY) / yIncome * 1000) / 10}% від доходу` : ""}</td></tr></tbody>
              </table></div>)}
          </section>
          <section className="card">
            <div className="flex justify-between items-baseline mb-3 flex-wrap gap-2"><h2 className="text-lg font-bold">Дохід і податки по місяцях</h2><span className="flex gap-3.5 text-xs text-muted font-semibold"><span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px]" style={{ background: "linear-gradient(180deg,#fb923c,#f0552b)" }} />ЄП + ВЗ</span><span className="inline-flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[3px]" style={{ background: "rgba(29,111,242,.4)" }} />залишається</span></span></div>
            <div className="flex items-end gap-2 h-[150px]">{m12.map((x, i) => { const h = Math.round(x.inc / maxM * 120); const t = Math.round(h * (settings.ep_rate + settings.vz_rate) / 100); return <div key={i} className="flex-1 min-w-0 flex flex-col justify-end h-full gap-0.5"><i className="block rounded-t-md" style={{ height: t, background: "linear-gradient(180deg,#fb923c,#f0552b)" }} /><i className="block rounded-b-md" style={{ height: Math.max(0, h - t), background: "rgba(29,111,242,.4)" }} /></div>; })}</div>
            <div className="flex gap-2 mt-1.5">{m12.map((x, i) => <span key={i} className="flex-1 text-center text-[10px] font-semibold text-muted min-w-0">{x.l}</span>)}</div>
          </section>
        </div>
        <aside className="flex-[1_1_300px] min-w-0 flex flex-col gap-3.5">
          <section className="rounded-[22px] p-5 text-white flex flex-col gap-2.5" style={{ background: "linear-gradient(160deg,rgba(21,160,90,.92),rgba(53,199,119,.9))", boxShadow: "0 14px 36px rgba(21,160,90,.28)" }}><div className="text-xs font-bold opacity-90">Ліміт 3 групи у {year}</div><div className="text-3xl font-extrabold tracking-tighter num">{Math.round(yIncome / settings.income_limit * 1000) / 10}%</div><div className="text-xs opacity-90">{money(yIncome)} з {money(settings.income_limit)}</div><div className="bar" style={{ background: "rgba(255,255,255,.3)" }}><i style={{ width: `${Math.min(100, Math.max(1, yIncome / settings.income_limit * 100))}%`, background: "#fff" }} /></div></section>
          <section className="card"><div className="flex justify-between items-center mb-3"><h2 className="text-lg font-bold">Ставки</h2><Link href="/settings" className="text-xs font-semibold text-accent">Змінити</Link></div><div className="flex flex-col gap-1.5"><div className="kv"><span className="text-muted">Єдиний податок</span><b>{settings.ep_rate}% від доходу</b></div><div className="kv"><span className="text-muted">Військовий збір</span><b>{settings.vz_rate}% від доходу</b></div><div className="kv"><span className="text-muted">ЄСВ</span><b className="num">{Number(settings.esv_monthly).toLocaleString("uk-UA")} ₴/міс</b></div><div className="kv"><span className="text-muted">Валютні платежі</span><b>курс НБУ на дату</b></div></div></section>
          <section className="card"><h2 className="text-lg font-bold mb-2">Строки · як рахуємо</h2><ul className="m-0 pl-[18px] text-[13px] leading-relaxed text-muted"><li>Декларація — 40 днів після кінця кварталу</li><li>Сплата ЄП + ВЗ — 10 днів після строку декларації</li><li>ЄСВ — до 20-го числа місяця після кварталу</li><li>Нагадування — за {settings.remind_days} дн.</li></ul></section>
        </aside>
      </div>
    </>
  );
}
