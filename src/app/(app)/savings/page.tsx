import { format, parseISO } from "date-fns";
import { uk } from "date-fns/locale";
import { getSavings, getIncomeMonthly } from "@/lib/data";
import Link from "next/link";
import { nowKyiv, money, fx, CUR_SIGN, CUR_COLOR, CURRENCIES, brandInk, brandText, type Currency, type Saving } from "@/lib/domain";
import { PageHead, Kpi } from "@/components/ui";
import { AssistantInline } from "@/components/assistant";
import { deleteSaving } from "@/app/actions";
import { SavingForm } from "./saving-form";

export const metadata = { title: "Відкладення" };

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const monthName = (m: string) => cap(format(parseISO(m), "LLLL yyyy", { locale: uk }));

export default async function SavingsPage({ searchParams }: { searchParams: Promise<{ y?: string }> }) {
  const [{ y: yParam }, rows, monthly] = await Promise.all([searchParams, getSavings(), getIncomeMonthly()]);
  const now = nowKyiv();

  // Період: конкретний рік або весь час
  const years = [...new Set(rows.map((r) => r.month.slice(0, 4)))].sort().reverse();
  const thisYear = String(now.getFullYear());
  const year = yParam === "all" ? null : years.includes(yParam ?? "") ? yParam! : years.includes(thisYear) ? thisYear : years[0] ?? thisYear;
  const inPeriod = year ? rows.filter((r) => r.month.startsWith(year)) : rows;
  const label = year ?? "увесь час";

  const sum = (list: Saving[], c?: Currency) => list.filter((r) => !c || r.currency === c).reduce((a, r) => a + Number(c ? r.amount : r.uah), 0);
  const incomePeriod = monthly.filter((m) => !year || m.month.startsWith(year)).reduce((a, m) => a + m.income, 0);
  const share = incomePeriod ? Math.round(sum(inPeriod) / incomePeriod * 100) : 0;
  const months = [...new Set(inPeriod.map((r) => r.month))];

  return (
    <>
      <PageHead
        eyebrow={`${months.length} ${months.length === 1 ? "місяць" : months.length < 5 ? "місяці" : "місяців"} із відкладеннями`}
        title="Відкладення 🏦"
        actions={years.length > 0 ? (
          <div className="seg">
            {years.map((yy) => <Link key={yy} href={`/savings?y=${yy}`} className={year === yy ? "on" : ""}>{yy}</Link>)}
            <Link href="/savings?y=all" className={year === null ? "on" : ""}>Увесь час</Link>
          </div>
        ) : undefined}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-3.5">
        <Kpi label={`Відкладено за ${label}`} value={money(sum(inPeriod))} sub={incomePeriod ? `${share}% доходу за період` : "доходу ще немає"} subTone={share >= 10 ? "good" : undefined} dot="var(--good)" />
        {CURRENCIES.map((c) => (
          <Kpi key={c} label={c === "EUR" ? "У євро" : "У доларах"} dot={CUR_COLOR[c]}
            value={<span style={{ color: brandInk(CUR_COLOR[c]) }}>{fx(sum(inPeriod, c), c)}</span>}
            sub={`${inPeriod.filter((r) => r.currency === c).length} ${inPeriod.filter((r) => r.currency === c).length === 1 ? "запис" : "записів"} · ${label}`} />
        ))}
      </div>

      <div className="flex flex-wrap gap-3.5">
        <section className="card flex-[999_1_520px] min-w-0">
          <h2 className="text-[17px] font-semibold mb-3">Історія</h2>
          {months.length ? (
            <div className="flex flex-col gap-3.5">
              {months.map((m) => {
                const list = inPeriod.filter((r) => r.month === m);
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
                        <div key={r.id} className="kv items-center" style={{ background: `color-mix(in srgb, ${CUR_COLOR[r.currency]} 18%, transparent)` }}>
                          <span className="min-w-0 flex items-center gap-2">
                            <span className="chip shrink-0" style={{ background: CUR_COLOR[r.currency], color: brandText(CUR_COLOR[r.currency]) }}>{fx(Number(r.amount), r.currency)}</span>
                            <span className="text-muted truncate">{Number(r.rate) > 0 ? `курс ${Number(r.rate).toFixed(2).replace(".", ",")} ₴` : "курс не визначено"}{r.note ? ` · ${r.note}` : ""}</span>
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
          ) : <div className="empty">{year ? `За ${year} нічого не відкладено.` : "Ще нічого не відкладено. Додайте перший місяць праворуч."}</div>}
        </section>

        <aside className="flex-[1_1_320px] min-w-0 flex flex-col gap-3.5">
          <section className="card">
            <h2 className="text-[17px] font-semibold mb-1">Відкласти</h2>
            <p className="text-[13px] text-muted mb-3">Місяць, валюта й сума. Курс кабінет візьме сам — офіційний НБУ за той місяць, щоб порахувати частку від доходу.</p>
            <SavingForm />
          </section>
          <AssistantInline>Курс береться офіційний НБУ на кінець того місяця, тож частка від доходу рахується сама. {CUR_SIGN.EUR} і {CUR_SIGN.USD} зберігаються окремо — видно, у чому саме лежать гроші.</AssistantInline>
        </aside>
      </div>
    </>
  );
}
