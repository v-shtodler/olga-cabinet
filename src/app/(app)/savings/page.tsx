import { format, parseISO } from "date-fns";
import { uk } from "date-fns/locale";
import { getSavings, getIncomeMonthly } from "@/lib/data";
import { nowKyiv, money, fx, CUR_SIGN, type Currency, type Saving } from "@/lib/domain";
import { PageHead, Kpi } from "@/components/ui";
import { AssistantInline } from "@/components/assistant";
import { deleteSaving } from "@/app/actions";
import { SavingForm } from "./saving-form";

export const metadata = { title: "Відкладені" };

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const monthName = (m: string) => cap(format(parseISO(m), "LLLL yyyy", { locale: uk }));

export default async function SavingsPage() {
  const [rows, monthly] = await Promise.all([getSavings(), getIncomeMonthly()]);
  const now = nowKyiv(); const year = String(now.getFullYear());

  const sum = (list: Saving[], c?: Currency) => list.filter((r) => !c || r.currency === c).reduce((a, r) => a + Number(c ? r.amount : r.uah), 0);
  const thisYear = rows.filter((r) => r.month.startsWith(year));
  const incomeYear = monthly.filter((m) => m.month.startsWith(year)).reduce((a, m) => a + m.income, 0);
  const share = incomeYear ? Math.round(sum(thisYear) / incomeYear * 100) : 0;
  const months = [...new Set(rows.map((r) => r.month))];
  const perMonth = months.length ? Math.round(sum(rows) / months.length) : 0;

  // last rate used for each currency — the form starts from it
  const lastRate: Partial<Record<Currency, number>> = {};
  for (const r of rows) if (lastRate[r.currency] === undefined) lastRate[r.currency] = Number(r.rate);

  return (
    <>
      <PageHead eyebrow={`${months.length} ${months.length === 1 ? "місяць" : months.length < 5 ? "місяці" : "місяців"} із відкладеннями`} title="Відкладені 🏦" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-3.5">
        <Kpi label={`Відкладено за ${year}`} value={money(sum(thisYear))} sub={incomeYear ? `${share}% доходу року` : "доходу ще немає"} subTone={share >= 10 ? "good" : undefined} dot="var(--good)" />
        <Kpi label="Усього в євро" value={fx(sum(rows, "EUR"), "EUR")} sub="за весь час" />
        <Kpi label="Усього в доларах" value={fx(sum(rows, "USD"), "USD")} sub="за весь час" />
        <Kpi label="У середньому на місяць" value={money(perMonth)} sub={months.length ? `за ${months.length} ${months.length === 1 ? "місяць" : months.length < 5 ? "місяці" : "місяців"}` : "—"} />
      </div>

      <div className="flex flex-wrap gap-3.5">
        <section className="card flex-[999_1_520px] min-w-0">
          <h2 className="text-[17px] font-semibold mb-3">Історія</h2>
          {months.length ? (
            <div className="flex flex-col gap-3.5">
              {months.map((m) => {
                const list = rows.filter((r) => r.month === m);
                const inc = monthly.filter((x) => x.month.startsWith(m.slice(0, 7))).reduce((a, x) => a + x.income, 0);
                const pct = inc ? Math.round(sum(list) / inc * 100) : null;
                return (
                  <div key={m} className="min-w-0">
                    <div className="flex justify-between items-baseline gap-2 mb-1.5">
                      <span className="font-semibold">{monthName(m)}</span>
                      <span className="text-[13px] text-muted num">{money(sum(list))}{pct != null ? ` · ${pct}% доходу` : ""}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {list.map((r) => (
                        <div key={r.id} className="kv items-center">
                          <span className="min-w-0">
                            <b className="num">{fx(Number(r.amount), r.currency)}</b>
                            <span className="text-muted"> · курс {Number(r.rate).toLocaleString("uk-UA")} ₴{r.note ? ` · ${r.note}` : ""}</span>
                          </span>
                          <span className="flex items-center gap-3 shrink-0">
                            <b className="num">{money(Number(r.uah))}</b>
                            <form action={deleteSaving.bind(null, r.id)} data-op="deleteSaving" data-args={JSON.stringify([r.id])} data-label={`${fx(Number(r.amount), r.currency)} · ${monthName(m)}`}>
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
          ) : <div className="empty">Ще нічого не відкладено. Додайте перший місяць праворуч.</div>}
        </section>

        <aside className="flex-[1_1_320px] min-w-0 flex flex-col gap-3.5">
          <section className="card">
            <h2 className="text-[17px] font-semibold mb-1">Відкласти</h2>
            <p className="text-[13px] text-muted mb-3">Сума у валюті та курс, за яким купували. Гривневий еквівалент зберігається — саме його видно у частці від доходу.</p>
            <SavingForm lastRate={lastRate} />
          </section>
          <AssistantInline>Відкладені гроші не зменшують дохід для податків: ЄП і ВЗ рахуються з усіх надходжень. Тут вони лише показують, скільки з доходу ви залишили собі.</AssistantInline>
          <AssistantInline>Курс беріть той, за яким реально купували валюту — тоді частка від доходу буде чесною. {CUR_SIGN.EUR} і {CUR_SIGN.USD} зберігаються окремо, тож видно, у чому саме ви тримаєте гроші.</AssistantInline>
        </aside>
      </div>
    </>
  );
}
