import Link from "next/link";
import { notFound } from "next/navigation";
import { getClients, getClientPrefs, getClientStats, getShoots, getSettings, getDismissed, getPresets } from "@/lib/data";
import { buildInsights, money, fmtDate, fmtShort, moneyK, plural } from "@/lib/domain";
import { Avatar, Kpi, ShootRow } from "@/components/ui";
import { Assistant } from "@/components/assistant";
import { addClientPref, deleteClientPref } from "@/app/actions";
import * as I from "@/components/icons";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [clients, prefs, stats, shoots, settings, dismissed, presets] = await Promise.all([getClients(), getClientPrefs(id), getClientStats(), getShoots({ clientId: id }), getSettings(), getDismissed(), getPresets()]);
  const c = clients.find((x) => x.id === id); if (!c) notFound();
  const st = stats.find((x) => x.client_id === id);
  const list = shoots.filter((s) => s.status !== "cancelled").slice().reverse();
  const paidList = shoots.filter((s) => s.status === "paid").slice(-8);
  const maxP = Math.max(...paidList.map((s) => s.price), 1);
  const trend = paidList.length >= 2 ? paidList[paidList.length - 1].price / paidList[0].price - 1 : 0;
  const insights = buildInsights({ shoots, clients, prefs, settings, dismissed, blocked: new Set(), scope: { type: "client", id } });
  // extra client-scope insight: price below own average
  const allPaid = (await getShoots()).filter((s) => s.status === "paid");
  const avgAll = allPaid.length ? allPaid.reduce((a, s) => a + s.price, 0) / allPaid.length : 0;
  if (st && st.avg_check && avgAll && st.avg_check < avgAll * 0.75 && st.shoots >= 3 && !dismissed.has(`price-${id}`)) insights.push({ key: `price-${id}`, kind: "price", sev: "low", tag: "Ціна нижча за ваш середній чек", text: `Середній чек ${c.name} — ${money(st.avg_check)}, ваш середній по всіх — ${money(avgAll)}. ${st.shoots} ${plural(st.shoots, "зйомка", "зйомки", "зйомок")} — привід переглянути прайс.` });
  if (st?.avg_pay_delay_days != null && st.avg_pay_delay_days > 7 && !dismissed.has(`paypat-${id}`)) insights.push({ key: `paypat-${id}`, kind: "payment", sev: "low", tag: "Патерн оплати", text: `${c.name} платять у середньому на ${Math.round(st.avg_pay_delay_days)}-й день після рахунку. Варто ставити 100% передоплату або нагадувати на 7-й день.` });
  const labelOf = (t: string) => presets.find((p) => p.type === t)?.label ?? t;

  return (
    <>
      <Link href="/clients" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent mb-3"><I.Back /> Усі замовники</Link>
      <div className="flex justify-between items-end gap-4 flex-wrap mb-4 px-1">
        <div className="flex items-center gap-3.5"><Avatar name={c.name} hue={c.avatar_hue} size={56} /><div><h1 className="text-[clamp(26px,4vw,38px)] font-extrabold tracking-tighter leading-[1.08]">{c.name}</h1><p className="text-muted mt-1">{[c.kind, c.contact_name, `з ${fmtDate(c.since, true)}`].filter(Boolean).join(" · ")}</p></div></div>
        <Link href={`/shoots/new?client=${c.id}`} className="btn btn-primary">+ Зйомка для {c.name}</Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-3.5">
        <Kpi label="Зйомок" value={st?.shoots ?? 0} />
        <Kpi label="Дохід усього" value={money(st?.total ?? 0)} />
        <Kpi label="Середній чек" value={money(st?.avg_check ?? 0)} sub={paidList.length >= 2 ? `${trend >= 0 ? "↑ +" : "↓ "}${Math.round(trend * 100)}% від першої до останньої` : undefined} subTone={trend >= 0 ? "good" : "warn"} />
        <Kpi label="Платять" value={c.default_deposit_pct === 100 ? "наперед" : st?.avg_pay_delay_days != null ? `на ${Math.round(st.avg_pay_delay_days)}-й день` : "—"} sub={st?.open_balance ? `відкрито ${money(st.open_balance)}` : "боргів нема ✓"} subTone={st?.open_balance ? "warn" : "good"} />
      </div>
      <div className="flex flex-wrap gap-3.5">
        <div className="flex-[999_1_560px] min-w-0 flex flex-col gap-3.5">
          {insights.length > 0 && <Assistant items={insights} title={`Помічник про ${c.name}`} />}
          <section className="card">
            <div className="flex justify-between items-baseline mb-3"><h2 className="text-lg font-bold">Як змінювалась ціна</h2><span className="text-xs text-muted">останні оплачені зйомки</span></div>
            {paidList.length ? <><div className="flex items-end gap-2 h-[120px]">{paidList.map((s, i) => <div key={s.id} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full gap-1.5"><span className="text-[10px] text-muted font-semibold num">{moneyK(s.price)}</span><i className="block w-full rounded-t-lg rounded-b" style={{ height: Math.round(s.price / maxP * 90), background: i === paidList.length - 1 ? "linear-gradient(180deg,var(--accent-2),var(--accent))" : "linear-gradient(180deg,rgba(79,155,255,.5),rgba(29,111,242,.35))" }} /></div>)}</div><div className="flex gap-2 mt-1.5">{paidList.map((s) => <span key={s.id} className="flex-1 text-center text-[10px] font-semibold text-muted min-w-0">{fmtShort(s.date)}</span>)}</div></> : <div className="empty">Ще нема оплачених зйомок.</div>}
          </section>
          <section className="card"><h2 className="text-lg font-bold mb-3">Усі зйомки</h2><div className="flex flex-col gap-2">{list.length ? list.map((s) => <ShootRow key={s.id} s={s} />) : <div className="empty">Ще не було зйомок.</div>}</div></section>
        </div>
        <aside className="flex-[1_1_300px] min-w-0 flex flex-col gap-3.5">
          <section className="card">
            <h2 className="text-lg font-bold mb-3">Що важливо</h2>
            <div className="flex flex-col gap-1.5">{prefs.map((p) => <div key={p.id} className="kv items-center"><span>{p.text}</span><form action={deleteClientPref.bind(null, p.id)}><button className="text-muted" aria-label="Видалити">×</button></form></div>)}{!prefs.length && <div className="empty">Поки нічого.</div>}</div>
            <form action={addClientPref.bind(null, c.id)} data-op="addClientPref" data-args={JSON.stringify([c.id])} className="flex gap-2 mt-3"><input name="text" placeholder="Напр.: не любить теплий баланс" required maxLength={300} className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-line bg-glass-2" aria-label="Нова вимога" /><button className="btn btn-sm">Додати</button></form>
            <p className="text-xs text-muted mt-2.5">Ці пункти помічник підказує за день до кожної зйомки з цим клієнтом.</p>
          </section>
          <section className="card"><h2 className="text-lg font-bold mb-3">Контакт і умови</h2><div className="flex flex-col gap-1.5">
            <div className="kv"><span className="text-muted">Контакт</span><b>{c.contact_name ?? "—"}</b></div>
            {c.contact_email && <div className="kv"><span className="text-muted">Пошта</span><b className="select-all">{c.contact_email}</b></div>}
            {c.contact_phone && <div className="kv"><span className="text-muted">Телефон</span><b className="select-all">{c.contact_phone}</b></div>}
            <div className="kv"><span className="text-muted">Передоплата</span><b>{c.default_deposit_pct}%</b></div>
            <div className="kv"><span className="text-muted">Типові зйомки</span><b>{c.default_types.map(labelOf).join(", ") || "—"}</b></div>
          </div></section>
        </aside>
      </div>
    </>
  );
}
