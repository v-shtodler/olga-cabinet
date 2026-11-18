import Link from "next/link";
import { format, parseISO } from "date-fns";
import { uk } from "date-fns/locale";
import { getExpenses, getIncomeMonthly } from "@/lib/data";
import { nowKyiv, money, moneyK, fmtShort, expenseColor, brandText, brandInk, plural, type Expense } from "@/lib/domain";
import { PageHead, Kpi } from "@/components/ui";
import { deleteExpense } from "@/app/actions";
import { ExpenseForm } from "./expense-form";

export const metadata = { title: "Витрати" };

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const monthName = (m: string) => cap(format(parseISO(`${m}-01`), "LLLL yyyy", { locale: uk }));

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ y?: string }> }) {
  const [{ y: yParam }, rows, monthly] = await Promise.all([searchParams, getExpenses(), getIncomeMonthly()]);
  const now = nowKyiv();

  // Період: конкретний рік або весь час
  const years = [...new Set(rows.map((r) => r.spent_on.slice(0, 4)))].sort().reverse();
  const thisYear = String(now.getFullYear());
  const year = yParam === "all" ? null : years.includes(yParam ?? "") ? yParam! : years.includes(thisYear) ? thisYear : years[0] ?? thisYear;
  const inPeriod = year ? rows.filter((r) => r.spent_on.startsWith(year)) : rows;
  const label = year ?? "увесь час";

  const sum = (list: Expense[]) => list.reduce((a, r) => a + Number(r.amount), 0);
  const total = sum(inPeriod);
  const incomePeriod = monthly.filter((m) => !year || m.month.startsWith(year)).reduce((a, m) => a + m.income, 0);
  const share = incomePeriod ? Math.round(total / incomePeriod * 100) : 0;

  // По категоріях
  const byCat = [...new Map(inPeriod.map((r) => [r.category, 0])).keys()]
    .map((c) => ({ cat: c, amount: sum(inPeriod.filter((r) => r.category === c)), count: inPeriod.filter((r) => r.category === c).length }))
    .sort((a, b) => b.amount - a.amount);
  const catMax = Math.max(...byCat.map((c) => c.amount), 1);

  // По місяцях: або 12 місяців року, або всі місяці з витратами
  const monthsOfPeriod = year
    ? Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`)
    : [...new Set(inPeriod.map((r) => r.spent_on.slice(0, 7)))].sort();
  const bars = monthsOfPeriod.map((m) => ({ key: m, label: cap(format(parseISO(`${m}-01`), "LLL", { locale: uk }).replace(".", "")), amount: sum(inPeriod.filter((r) => r.spent_on.startsWith(m))) }));
  const barMax = Math.max(...bars.map((b) => b.amount), 1);
  const dense = bars.length > 12;

  const months = [...new Set(inPeriod.map((r) => r.spent_on.slice(0, 7)))].sort().reverse();
  const biggest = inPeriod.reduce<Expense | null>((a, r) => (!a || Number(r.amount) > Number(a.amount) ? r : a), null);

  return (
    <>
      <PageHead
        eyebrow={`${inPeriod.length} ${plural(inPeriod.length, "витрата", "витрати", "витрат")} · ${label}`}
        title="Витрати 🧾"
        actions={years.length > 0 ? (
          <div className="seg">
            {years.slice(0, 4).map((yy) => <Link key={yy} href={`/expenses?y=${yy}`} className={year === yy ? "on" : ""}>{yy}</Link>)}
            <Link href="/expenses?y=all" className={year === null ? "on" : ""}>Увесь час</Link>
          </div>
        ) : undefined}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-3.5">
        <Kpi label={`Витрати за ${label}`} value={money(total)} sub={incomePeriod ? `${share}% доходу за період` : "доходу ще немає"} subTone={share >= 40 ? "warn" : undefined} dot="var(--warn)" />
        <Kpi label="Лишилось після витрат" value={money(Math.max(0, incomePeriod - total))} sub={incomePeriod ? `з ${money(incomePeriod)} доходу` : "—"} dot="var(--good)" />
        <Kpi label="Найбільша покупка" value={biggest ? money(Number(biggest.amount)) : "—"} sub={biggest ? `${biggest.note ?? biggest.category} · ${fmtShort(biggest.spent_on)}` : "ще нічого не купували"} />
      </div>

      <div className="flex flex-wrap gap-3.5">
        <div className="flex-[999_1_520px] min-w-0 flex flex-col gap-3.5">
          {/* ---------- аналітика ---------- */}
          <section className="card">
            <h2 className="text-[17px] font-semibold mb-3">Витрати по місяцях · {label}</h2>
            {total > 0 ? (
              <>
                <div className={`flex items-end h-[150px] ${dense ? "gap-[3px]" : "gap-1.5 sm:gap-2"}`}>
                  {bars.map((b) => (
                    <div key={b.key} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1.5">
                      {b.amount > 0 && <span className="font-semibold num whitespace-nowrap text-muted text-[10px]">{dense ? moneyK(b.amount) : money(b.amount)}</span>}
                      <i className="block w-full rounded-t-[6px] rounded-b-[2px]" style={{ height: Math.max(3, Math.round(b.amount / barMax * 110)), background: "linear-gradient(180deg, color-mix(in srgb, var(--warn) 55%, transparent), color-mix(in srgb, var(--warn) 18%, transparent))" }} />
                    </div>
                  ))}
                </div>
                <div className={`flex mt-1.5 ${dense ? "gap-[3px]" : "gap-1.5 sm:gap-2"}`}>
                  {bars.map((b) => <span key={b.key} className={`flex-1 text-center font-medium text-muted min-w-0 leading-tight ${dense ? "text-[9px]" : "text-[10px] sm:text-[11px]"}`}>{b.label}{dense && b.key.endsWith("-01") ? <span className="block opacity-70">{b.key.slice(2, 4)}</span> : null}</span>)}
                </div>
              </>
            ) : <div className="empty">За цей період витрат немає.</div>}
          </section>

          {byCat.length > 0 && (
            <section className="card">
              <h2 className="text-[17px] font-semibold mb-3">На що саме</h2>
              <div className="flex flex-col gap-2.5">
                {byCat.map((c) => (
                  <div key={c.cat} className="min-w-0">
                    <div className="flex justify-between items-baseline gap-2 text-[13px] mb-1">
                      <span className="font-semibold truncate">{c.cat}<span className="text-muted font-medium"> · {c.count}</span></span>
                      <span className="num shrink-0 text-muted">{money(c.amount)} · {Math.round(c.amount / total * 100)}%</span>
                    </div>
                    <i className="block h-[8px] rounded-full" style={{ width: `${Math.max(3, Math.round(c.amount / catMax * 100))}%`, background: expenseColor(c.cat) }} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ---------- історія ---------- */}
          <section className="card">
            <h2 className="text-[17px] font-semibold mb-3">Історія</h2>
            {months.length ? (
              <div className="flex flex-col gap-3.5">
                {months.map((m) => {
                  const list = inPeriod.filter((r) => r.spent_on.startsWith(m));
                  return (
                    <div key={m} className="min-w-0">
                      <div className="flex justify-between items-baseline gap-2 mb-1.5">
                        <span className="font-semibold">{monthName(m)}</span>
                        <span className="text-[13px] text-muted num">{money(sum(list))}</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {list.map((r) => (
                          <div key={r.id} className="kv items-center" style={{ background: `color-mix(in srgb, ${expenseColor(r.category)} 14%, transparent)` }}>
                            <span className="min-w-0 flex items-center gap-2">
                              <span className="chip shrink-0" style={{ background: expenseColor(r.category), color: brandText(expenseColor(r.category)) }}>{r.category}</span>
                              <span className="truncate">{r.note ?? "—"}<span className="text-muted"> · {fmtShort(r.spent_on)}</span></span>
                            </span>
                            <span className="flex items-center gap-3 shrink-0">
                              <b className="num" style={{ color: brandInk(expenseColor(r.category)) }}>{money(Number(r.amount))}</b>
                              <form action={deleteExpense.bind(null, r.id)} data-op="deleteExpense" data-args={JSON.stringify([r.id])} data-label={`${money(Number(r.amount))} · ${r.category}`}>
                                <button className="text-muted text-xs" aria-label="Видалити" title="Видалити">×</button>
                              </form>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <div className="empty">{year ? `За ${year} витрат немає.` : "Ще нічого не додано. Перша витрата — праворуч."}</div>}
          </section>
        </div>

        <aside className="flex-[1_1_320px] min-w-0 flex flex-col gap-3.5">
          <section className="card">
            <h2 className="text-[17px] font-semibold mb-1">Додати витрату</h2>
            <p className="text-[13px] text-muted mb-3">Великі покупки й регулярні витрати: техніка, студія, підряд, софт. Категорія задає колір у списку й у розкладці «на що саме».</p>
            <ExpenseForm />
          </section>
        </aside>
      </div>
    </>
  );
}
