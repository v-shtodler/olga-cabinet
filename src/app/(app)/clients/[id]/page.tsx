import Link from "next/link";
import { notFound } from "next/navigation";
import { getClients, getClientPrefs, getClientStats, getShoots, getSettings, getDismissed } from "@/lib/data";
import { buildInsights, money, fmtDate, plural } from "@/lib/domain";
import { Avatar, Kpi, ShootRow } from "@/components/ui";
import { Assistant } from "@/components/assistant";
import { addClientPref, deleteClientPref } from "@/app/actions";
import * as I from "@/components/icons";
import { ContactCard } from "./edit-client";
import { DeleteClient } from "./delete-client";
import { ClientLook } from "./client-look";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [clients, prefs, stats, shoots, settings, dismissed] = await Promise.all([getClients(), getClientPrefs(id), getClientStats(), getShoots({ clientId: id }), getSettings(), getDismissed()]);
  const c = clients.find((x) => x.id === id); if (!c) notFound();
  const st = stats.find((x) => x.client_id === id);
  const list = shoots.filter((s) => s.status !== "cancelled").slice().reverse();
  const payCount = shoots.filter((s) => s.paid > 0).length; const paidSum = shoots.reduce((a, s) => a + s.paid, 0);
  const insights = buildInsights({ shoots, clients, prefs, settings, dismissed, blocked: new Set(), scope: { type: "client", id } });
  // extra client-scope insight: price below own average
  const allPaid = (await getShoots()).filter((s) => s.status === "paid");
  const avgAll = allPaid.length ? allPaid.reduce((a, s) => a + s.price, 0) / allPaid.length : 0;
  if (st && st.avg_check && avgAll && st.avg_check < avgAll * 0.75 && st.shoots >= 3 && !dismissed.has(`price-${id}`)) insights.push({ key: `price-${id}`, kind: "price", sev: "low", tag: "Ціна нижча за ваш середній чек", text: `Середній чек ${c.name} — ${money(st.avg_check)}, ваш середній по всіх — ${money(avgAll)}. ${st.shoots} ${plural(st.shoots, "зйомка", "зйомки", "зйомок")} — привід переглянути прайс.` });
  if (st?.avg_pay_delay_days != null && st.avg_pay_delay_days > 7 && !dismissed.has(`paypat-${id}`)) insights.push({ key: `paypat-${id}`, kind: "payment", sev: "low", tag: "Патерн оплати", text: `${c.name} платять у середньому на ${Math.round(st.avg_pay_delay_days)}-й день після рахунку. Варто нагадувати на 7-й день після рахунку.` });

  return (
    <>
      <Link href="/clients" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent mb-3"><I.Back /> Усі замовники</Link>
      <div className="flex justify-between items-end gap-4 flex-wrap mb-4 px-1">
        <div className="flex items-center gap-3.5"><Avatar name={c.name} hue={c.avatar_hue} src={c.avatar_url} size={56} /><div><h1 className="text-[clamp(26px,4vw,38px)] font-bold tracking-[-0.01em] leading-[1.08]">{c.name}</h1><p className="text-muted mt-1">{[c.kind, c.contact_name, `з ${fmtDate(c.since, true)}`].filter(Boolean).join(" · ")}</p></div></div>
        <Link href={`/shoots/new?client=${c.id}`} className="btn btn-primary">+ Зйомка для {c.name}</Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 mb-3.5">
        <Kpi label="Зйомок" value={st?.shoots ?? 0} />
        <Kpi label="Дохід усього" value={money(st?.total ?? 0)} />
        <Kpi label="Платять" value={st?.avg_pay_delay_days != null ? `на ${Math.round(st.avg_pay_delay_days)}-й день` : "—"} sub={st?.open_balance ? `відкрито ${money(st.open_balance)}` : "боргів нема ✓"} subTone={st?.open_balance ? "warn" : "good"} />
      </div>
      <div className="flex flex-wrap gap-3.5">
        <div className="flex-[999_1_560px] min-w-0 flex flex-col gap-3.5">
          {insights.length > 0 && <Assistant items={insights} title={`Помічник про ${c.name}`} />}
          <section className="card"><h2 className="text-[17px] font-semibold mb-3">Усі зйомки</h2><div className="flex flex-col gap-2">{list.length ? list.map((s) => <ShootRow key={s.id} s={s} />) : <div className="empty">Ще не було зйомок.</div>}</div></section>
        </div>
        <aside className="flex-[1_1_300px] min-w-0 flex flex-col gap-3.5">
          <section className="card">
            <h2 className="text-[17px] font-semibold mb-3">Що важливо</h2>
            <div className="flex flex-col gap-1.5">{prefs.map((p) => <div key={p.id} className="kv items-center"><span>{p.text}</span><form action={deleteClientPref.bind(null, p.id)} data-op="deleteClientPref" data-args={JSON.stringify([p.id])}><button className="text-muted" aria-label="Видалити">×</button></form></div>)}{!prefs.length && <div className="empty">Поки нічого.</div>}</div>
            <form action={addClientPref.bind(null, c.id)} data-op="addClientPref" data-args={JSON.stringify([c.id])} className="flex gap-2 mt-3"><input name="text" placeholder="Напр.: не любить теплий баланс" required maxLength={300} className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-glass-2" aria-label="Нова вимога" /><button className="btn btn-sm">Додати</button></form>
            <p className="text-[13px] text-muted mt-2.5">Ці пункти помічник підказує за день до кожної зйомки з цим клієнтом.</p>
          </section>
          <ContactCard c={c} />
          <ClientLook id={c.id} name={c.name} hue={c.avatar_hue} src={c.avatar_url} />
          <DeleteClient id={c.id} name={c.name} shoots={shoots.length} payments={payCount} paid={money(paidSum)} />
        </aside>
      </div>
    </>
  );
}
