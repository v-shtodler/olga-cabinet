import Link from "next/link";
import { notFound } from "next/navigation";
import { getShoot, getShoots, getClients, getClientPrefs, getSettings, getDismissed, getClientStats } from "@/lib/data";
import { STATUSES, STATUS_UA, NEXT_STEP, STATUS_TONE, buildInsights, money, fmtDate, fmtShort, fmtWeekday, relDays, todayISO, statusIdx } from "@/lib/domain";
import { Chip, Avatar, Kpi } from "@/components/ui";
import { Assistant } from "@/components/assistant";
import { advanceShoot, markInvoiceSent, addNote, deletePayment, deleteNote } from "@/app/actions";
import { PaymentForm, CancelButton, DangerButton } from "./client-bits";
import * as I from "@/components/icons";

export default async function ShootPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getShoot(id); if (!data) notFound();
  const { shoot: s, payments, notes } = data;
  const [clients, prefs, settings, dismissed, stats, history] = await Promise.all([getClients(), getClientPrefs(s.client_id), getSettings(), getDismissed(), getClientStats(), getShoots({ clientId: s.client_id })]);
  const c = clients.find((x) => x.id === s.client_id)!; const st = stats.find((x) => x.client_id === c.id);
  const today = todayISO(); const idx = statusIdx(s.status);
  const insights = buildInsights({ shoots: [s], clients, prefs, settings, dismissed, blocked: new Set(), scope: { type: "shoot", id: s.id } });
  const hist = history.filter((x) => x.id !== s.id && x.status !== "cancelled" && x.date <= today).slice(-4).reverse();

  return (
    <>
      <Link href="/shoots" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent mb-3"><I.Back /> Усі зйомки</Link>
      <section className="card mb-3.5">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2"><Chip tone={STATUS_TONE[s.status]}>{STATUS_UA[s.status]}</Chip><span className="text-[13px] text-muted">№ {s.no}</span></div>
            <h1 className="text-[clamp(26px,4vw,34px)] font-bold tracking-[-0.01em] leading-[1.1]"><Link href={`/clients/${c.id}`}>{c.name}</Link></h1>
            <p className="text-muted mt-2">📅 {fmtWeekday(s.date)}, {fmtDate(s.date, true)}{s.start_time ? ` · ${s.start_time.slice(0, 5)}` : ""} &nbsp; 📍 {s.location ?? "—"}{c.contact_name ? <> &nbsp; 👤 {c.contact_name}</> : null}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {NEXT_STEP[s.status] && <form action={advanceShoot.bind(null, s.id)} data-op="advanceShoot" data-args={JSON.stringify([s.id])} data-label={NEXT_STEP[s.status] ?? ""}><button className={`btn ${s.status === "confirmed" ? "btn-good" : "btn-primary"}`}>{NEXT_STEP[s.status]}</button></form>}
            {s.status !== "cancelled" && <Link href={`/shoots/${s.id}/edit`} className="btn">Редагувати</Link>}
            {s.status !== "paid" && s.status !== "cancelled" && <CancelButton id={s.id} />}
            {s.status === "cancelled" && <DangerButton label="Видалити назавжди" confirm="Так, видалити" op="deleteShoot" id={s.id} />}
          </div>
        </div>
        {/* Progress through the stages, iOS-style: filled dots joined by a rail, current stage in blue */}
        {s.status !== "cancelled" && (
          <ol className="flex items-start mt-5 pb-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {STATUSES.map((k, i) => {
              const done = i < idx, now = i === idx;
              return (
                <li key={k} className="flex-1 min-w-[72px] flex flex-col items-center gap-1.5 relative">
                  {i > 0 && <span aria-hidden="true" className="absolute top-[11px] right-1/2 left-[-50%] h-[2px] rounded-full" style={{ background: done || now ? "var(--good)" : "var(--fill-3)" }} />}
                  <span className="relative w-[22px] h-[22px] rounded-full inline-flex items-center justify-center text-[11px] font-semibold" style={{ background: done ? "var(--good)" : now ? "var(--accent)" : "var(--fill-3)", color: done || now ? "#fff" : "var(--muted)" }}>{done ? "✓" : i + 1}</span>
                  <span className="text-[12px] font-medium text-center leading-tight" style={{ color: now ? "var(--fg)" : "var(--muted)" }}>{STATUS_UA[k]}</span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Kpi label="Вартість" value={money(s.price)} />
        <Kpi label="Отримано" value={money(s.paid)} sub={s.balance > 0 ? `залишок ${money(s.balance)}` : "оплачено повністю ✓"} subTone={s.balance > 0 ? "warn" : "good"} className={s.paid > 0 ? "!bg-good-bg" : ""} />
        <Kpi label="Податок із зйомки" value={money(s.price * (settings.ep_rate + settings.vz_rate) / 100)} sub={`ЄП ${settings.ep_rate}% + ВЗ ${settings.vz_rate}%`} />
      </div>

      <div className="flex flex-wrap gap-3.5 mt-3.5 max-lg:flex-col">
        <div className="flex-[999_1_560px] min-w-0 flex flex-col gap-3.5 max-lg:contents">
          {insights.length > 0 && <Assistant items={insights} title="Помічник про цю зйомку" />}

          <section className="card">
            <div className="flex justify-between items-baseline mb-3 gap-2 flex-wrap"><h2 className="text-[17px] font-semibold">Фінанси</h2>{s.status !== "cancelled" && <Link href={`/shoots/${s.id}/invoice`} className="btn btn-sm">Рахунок →</Link>}</div>
            <div className="flex flex-col gap-1.5">
              {payments.map((p) => <div key={p.id} className="kv items-center"><span>{{ deposit: "Оплата", balance: "Оплата", extra: "Доплата", refund: "Повернення" }[p.kind]} · {{ invoice: "Рахунок ФОП", card: "Картка", cash: "Готівка", other: "Інше" }[p.method]} · {fmtDate(p.paid_on)}</span><span className="flex items-center gap-3"><b className="num" style={{ color: "var(--good)" }}>+ {money(Number(p.amount))}</b><form action={deletePayment.bind(null, p.id)} data-op="deletePayment" data-args={JSON.stringify([p.id])}><button className="text-muted text-xs" aria-label="Видалити платіж" title="Видалити">×</button></form></span></div>)}
              {s.balance > 0 && <div className="kv" style={{ background: "var(--warn-bg)", color: "var(--warn)" }}><span>Залишок{s.invoice_sent_on ? ` · рахунок виставлено ${relDays(-(s.invoice_age_days ?? 0))}` : s.status === "request" ? " · очікую оплату" : " · після зйомки"}</span><b className="num">{money(s.balance)}</b></div>}
            </div>
            <div className="flex gap-2 flex-wrap mt-3">
              <PaymentForm shootId={s.id} suggested={s.balance > 0 ? s.balance : 0} />
              {!s.invoice_sent_on && s.status === "confirmed" && s.date <= today && s.balance > 0 && <form action={markInvoiceSent.bind(null, s.id)} data-op="markInvoiceSent" data-args={JSON.stringify([s.id])}><button className="btn btn-sm">Рахунок виставлено сьогодні</button></form>}
            </div>
          </section>

          {/* collapsed by default: notes are written rarely and read rarely */}
          <details className="card group max-lg:order-4">
            <summary className="flex items-center justify-between gap-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <h2 className="text-[17px] font-semibold">Замітки{notes.length > 0 && <span className="text-muted font-medium"> · {notes.length}</span>}</h2>
              <span className="text-[13px] font-semibold text-accent">{notes.length ? "Показати" : "Додати"} <span className="inline-block transition-transform group-open:rotate-90">›</span></span>
            </summary>
            <div className="flex flex-col gap-2 mt-3">{notes.length ? notes.map((n) => <div key={n.id} className="px-3.5 py-3 rounded-[14px] bg-glass-2 text-[13px] leading-relaxed"><div className="flex justify-between items-center mb-1"><span className="text-[11px] text-muted font-semibold">{fmtDate(n.created_at.slice(0, 10))}</span><form action={deleteNote.bind(null, n.id)} data-op="deleteNote" data-args={JSON.stringify([n.id])}><button className="text-muted text-xs" aria-label="Видалити замітку" title="Видалити">×</button></form></div><div className="whitespace-pre-wrap">{n.text}</div></div>) : <div className="empty">Поки без заміток.</div>}</div>
            <form action={addNote.bind(null, s.id)} data-op="addNote" data-args={JSON.stringify([s.id])} className="field flex flex-col gap-1.5 mt-3"><label htmlFor="note">Додати замітку</label><textarea id="note" name="text" placeholder="Що важливо не забути…" maxLength={2000} required /><div><button className="btn btn-sm btn-primary mt-2">Зберегти</button></div></form>
          </details>

        </div>

        <aside className="flex-[1_1_300px] min-w-0 flex flex-col gap-3.5 max-lg:order-3">
          <section className="card">
            <div className="flex justify-between items-center mb-3"><span className="text-[13px] font-medium text-muted">Замовник</span><Link href={`/clients/${c.id}`} className="chip" style={{ background: "var(--accent-tint)", color: "var(--accent)" }}>Картка →</Link></div>
            <div className="flex items-center gap-3"><Avatar name={c.name} hue={c.avatar_hue} size={44} /><div><div className="text-[19px] font-bold tracking-[-0.01em]">{c.name}</div><div className="text-[13px] text-muted">{c.kind ?? ""}{c.kind ? " · " : ""}з {fmtShort(c.since)} {c.since.slice(0, 4)}</div></div></div>
            <div className="grid grid-cols-2 gap-2.5 mt-3.5">{[["Зйомок", st?.shoots ?? 0], ["Усього", money(st?.total ?? 0)]].map(([k, v]) => <div key={String(k)} className="px-3 py-2.5 rounded-[10px]" style={{ background: "var(--glass-2)" }}><div className="text-[12px] text-muted">{k}</div><div className="font-semibold num">{v}</div></div>)}</div>
            {prefs.length > 0 && <div className="mt-3.5"><div className="text-[13px] font-semibold text-muted mb-1.5">Що важливо для цього клієнта</div><ul className="m-0 pl-[18px] text-[13px] leading-relaxed">{prefs.map((p) => <li key={p.id}>{p.text}</li>)}</ul></div>}
          </section>
          <section className="card"><h2 className="text-[17px] font-semibold mb-3">Історія · {c.name}</h2><div className="flex flex-col gap-1.5">{hist.length ? hist.map((h) => <Link key={h.id} href={`/shoots/${h.id}`} className="kv"><span><b>{fmtDate(h.date)}</b><br /><span className="text-muted text-xs">{h.location ?? "—"}</span></span><b className="num">{money(h.price)}</b></Link>) : <div className="empty">Перша зйомка з цим клієнтом.</div>}</div></section>
        </aside>
      </div>
    </>
  );
}
