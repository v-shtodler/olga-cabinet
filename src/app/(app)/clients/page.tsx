import Link from "next/link";
import { getClients, getClientStats, getPresets } from "@/lib/data";
import { money, plural, fmtDate } from "@/lib/domain";
import { PageHead, Avatar, Chip, Kpi } from "@/components/ui";
import { createClient_ } from "@/app/actions";
import * as I from "@/components/icons";

export const metadata = { title: "Замовники" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ sort?: string; new?: string }> }) {
  const { sort = "total", new: isNew } = await searchParams;
  const [clients, stats, presets] = await Promise.all([getClients(), getClientStats(), getPresets()]);
  const rows = clients.map((c) => ({ c, st: stats.find((s) => s.client_id === c.id) ?? { shoots: 0, total: 0, avg_check: 0, last_shoot: null, avg_pay_delay_days: null, open_balance: 0 } }));
  if (sort === "total") rows.sort((a, b) => b.st.total - a.st.total);
  if (sort === "last") rows.sort((a, b) => ((b.st.last_shoot as string | null) ?? "") < ((a.st.last_shoot as string | null) ?? "") ? -1 : 1);
  if (sort === "late") rows.sort((a, b) => (b.st.avg_pay_delay_days ?? 0) - (a.st.avg_pay_delay_days ?? 0));
  const all = rows.reduce((a, r) => a + r.st.total, 0);
  const top3 = rows.slice().sort((a, b) => b.st.total - a.st.total).slice(0, 3).reduce((a, r) => a + r.st.total, 0);
  const repeat = rows.filter((r) => r.st.shoots >= 2).length;
  const delays = rows.map((r) => r.st.avg_pay_delay_days).filter((d): d is number => d != null);
  const avgDelay = delays.length ? Math.round(delays.reduce((a, d) => a + d, 0) / delays.length) : null;
  const labelOf = (t: string) => presets.find((p) => p.type === t)?.label ?? t;

  return (
    <>
      <PageHead eyebrow={`${clients.length} ${plural(clients.length, "активний", "активні", "активних")}`} title="Замовники" actions={<><div className="seg">{[["total", "За доходом"], ["last", "За датою"], ["late", "Затримують"]].map(([k, l]) => <Link key={k} href={`/clients?sort=${k}`} className={sort === k ? "on" : ""}>{l}</Link>)}</div><Link href="/clients?new=1" className="btn btn-primary">+ Замовник</Link></>} />

      {isNew && (
        <section className="card mb-3.5">
          <div className="flex justify-between items-center mb-3"><h2 className="text-lg font-bold">Новий замовник</h2><Link href="/clients" className="icon-btn" aria-label="Закрити"><I.X /></Link></div>
          <form action={createClient_} data-op="createClient_" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="field flex flex-col gap-1.5 sm:col-span-2"><label htmlFor="c-name">Назва</label><input id="c-name" name="name" required maxLength={120} placeholder="Modna Kasha" /></div>
            <div className="field flex flex-col gap-1.5"><label htmlFor="c-kind">Хто це</label><input id="c-kind" name="kind" maxLength={80} placeholder="Бренд одягу" /></div>
            <div className="field flex flex-col gap-1.5"><label htmlFor="c-contact">Контактна особа</label><input id="c-contact" name="contact_name" maxLength={120} /></div>
            <div className="field flex flex-col gap-1.5"><label htmlFor="c-email">Пошта</label><input id="c-email" name="contact_email" type="email" maxLength={120} /></div>
            <div className="field flex flex-col gap-1.5"><label htmlFor="c-phone">Телефон</label><input id="c-phone" name="contact_phone" maxLength={40} /></div>
            <div className="field flex flex-col gap-1.5"><label htmlFor="c-dep">Передоплата за замовчуванням</label><select id="c-dep" name="default_deposit_pct" defaultValue="50"><option value="50">50%</option><option value="100">100%</option><option value="30">30%</option><option value="0">без передоплати</option></select></div>
            <div className="field flex flex-col gap-1.5"><label htmlFor="c-pref">Що важливо (одна вимога)</label><input id="c-pref" name="pref" maxLength={300} placeholder="Білий фон, 3 ракурси на SKU" /></div>
            <div className="sm:col-span-2 flex justify-end"><button className="btn btn-primary">Створити</button></div>
          </form>
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-3.5">
        <Kpi label="Концентрація" value={`${all ? Math.round(top3 / all * 100) : 0}% доходу`} sub={`дають топ-3 клієнти${all && top3 / all > 0.5 ? " — варто розширювати базу" : ""}`} subTone={all && top3 / all > 0.5 ? "warn" : undefined} className="!bg-warn-bg" />
        <Kpi label="Повторні" value={`${clients.length ? Math.round(repeat / clients.length * 100) : 0}%`} sub={`${repeat} із ${clients.length} знімались 2+ рази`} className="!bg-good-bg" />
        <Kpi label="Середній строк оплати" value={avgDelay != null ? `${avgDelay} дн.` : "—"} sub={`${delays.filter((d) => d > 7).length} ${plural(delays.filter((d) => d > 7).length, "клієнт", "клієнти", "клієнтів")} стабільно платять пізніше 7 днів`} className="!bg-info-bg" />
      </div>

      <section className="card">
        {rows.length === 0 ? <div className="empty">Поки без замовників — додайте першого.</div> : (
          <div className="overflow-x-auto"><table className="w-full text-[13px]" style={{ borderCollapse: "separate", borderSpacing: "0 6px" }}>
            <thead><tr className="text-xs text-muted">{["Замовник", "Типи", "Зйомок", "Дохід", "Середній чек", "Оплата", "Остання"].map((h, i) => <th key={h} className={`font-semibold px-2.5 py-0.5 text-left ${i >= 2 && i <= 4 ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
            <tbody>{rows.map(({ c, st }) => (
              <tr key={c.id}>
                <td className="px-2.5 py-2.5 bg-glass-2 rounded-l-xl"><Link href={`/clients/${c.id}`} className="flex items-center gap-2.5"><Avatar name={c.name} hue={c.avatar_hue} size={34} /><span><b>{c.name}</b><span className="block text-xs text-muted">{c.kind ?? ""}</span></span></Link></td>
                <td className="px-2.5 py-2.5 bg-glass-2 text-muted whitespace-nowrap">{c.default_types.map(labelOf).join(", ") || "—"}</td>
                <td className="px-2.5 py-2.5 bg-glass-2 text-right num">{st.shoots}</td>
                <td className="px-2.5 py-2.5 bg-glass-2 text-right num font-bold whitespace-nowrap">{money(st.total)}</td>
                <td className="px-2.5 py-2.5 bg-glass-2 text-right num whitespace-nowrap">{money(st.avg_check)}</td>
                <td className="px-2.5 py-2.5 bg-glass-2 whitespace-nowrap"><Chip tone={c.default_deposit_pct === 100 ? "info" : st.avg_pay_delay_days == null ? "neutral" : st.avg_pay_delay_days <= 7 ? "good" : "warn"}>{c.default_deposit_pct === 100 ? "100% наперед" : st.avg_pay_delay_days == null ? "ще нема даних" : st.avg_pay_delay_days <= 7 ? "✓ вчасно" : `⏱ ~${Math.round(st.avg_pay_delay_days)} дн`}</Chip>{st.open_balance > 0 && <> <Chip tone="warn">винні {money(st.open_balance)}</Chip></>}</td>
                <td className="px-2.5 py-2.5 bg-glass-2 rounded-r-xl text-muted whitespace-nowrap">{st.last_shoot ? fmtDate(st.last_shoot as string) : "—"}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}
