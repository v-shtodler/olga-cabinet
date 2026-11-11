import Link from "next/link";
import { notFound } from "next/navigation";
import { getShoot, getShoots, getClients, getClientPrefs, getSettings, getDismissed, getClientStats, getPresets } from "@/lib/data";
import { STATUSES, STATUS_UA, NEXT_STEP, TYPE_TONE, STATUS_TONE, buildInsights, money, fmtDate, fmtShort, fmtWeekday, relDays, daysBetween, todayISO, statusIdx } from "@/lib/domain";
import { Chip, Avatar, Kpi, Bar } from "@/components/ui";
import { Assistant } from "@/components/assistant";
import { advanceShoot, cancelShoot, markInvoiceSent, addNote, addChecklistItem, addDefaultChecklist, toggleChecklist, deletePayment } from "@/app/actions";
import { PaymentForm, InlineTitle, CancelButton, ChecklistToggle } from "./client-bits";
import * as I from "@/components/icons";

export default async function ShootPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getShoot(id); if (!data) notFound();
  const { shoot: s, payments, notes, checklist } = data;
  const [clients, prefs, settings, dismissed, stats, history, presets] = await Promise.all([getClients(), getClientPrefs(s.client_id), getSettings(), getDismissed(), getClientStats(), getShoots({ clientId: s.client_id }), getPresets()]);
  const c = clients.find((x) => x.id === s.client_id)!; const st = stats.find((x) => x.client_id === c.id);
  const today = todayISO(); const dlDays = daysBetween(today, s.deadline); const idx = statusIdx(s.status);
  const insights = buildInsights({ shoots: [s], clients, prefs, settings, dismissed, blocked: new Set(), scope: { type: "shoot", id: s.id } });
  const typeLabel = presets.find((p) => p.type === s.type)?.label ?? s.type;
  const hist = history.filter((x) => x.id !== s.id && x.status !== "cancelled" && x.date <= today).slice(-4).reverse();
  const sameType = history.filter((x) => x.type === s.type && x.status === "paid" && x.hourly_rate);
  const rateAvg = sameType.length ? Math.round(sameType.reduce((a, x) => a + (x.hourly_rate ?? 0), 0) / sameType.length) : null;
  const done = checklist.filter((x) => x.done).length;
  const terms: [string, string][] = [["Фото", `${s.photos} ретуш${s.extra_photos ? ` + ~${s.extra_photos} кольорокорекція` : ""}`], ["Термін віддачі", `${s.delivery_days} дн. після зйомки`], ["Передоплата", `${s.deposit_pct}%`], ["Права", s.rights ?? "—"], ["Локація", s.location ?? "—"], ["Віддано фото", s.photos_delivered != null ? String(s.photos_delivered) : "—"]];

  return (
    <>
      <Link href="/shoots" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent mb-3"><I.Back /> Усі зйомки</Link>
      <section className="card mb-3.5">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2"><Chip tone={TYPE_TONE[s.type]}>{typeLabel}</Chip><Chip tone={STATUS_TONE[s.status]}>{STATUS_UA[s.status]}</Chip><span className="text-xs text-muted">№ {s.no}</span></div>
            <InlineTitle id={s.id} title={s.title} />
            <p className="text-muted mt-2">📅 {fmtWeekday(s.date)}, {fmtDate(s.date, true)}{s.start_time ? ` · ${s.start_time.slice(0, 5)}–${s.end_time?.slice(0, 5)}` : ""} &nbsp; 📍 {s.location ?? "—"} &nbsp; 👤 <Link href={`/clients/${c.id}`} className="text-accent font-semibold">{c.name}</Link>{c.contact_name ? ` · ${c.contact_name}` : ""}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {NEXT_STEP[s.status] && <form action={advanceShoot.bind(null, s.id)}><button className={`btn ${s.status === "delivered" ? "btn-good" : "btn-primary"}`}>{NEXT_STEP[s.status]}</button></form>}
            <Link href={`/shoots/new?dup=${s.id}`} className="btn">Дублювати</Link>
            {s.status !== "paid" && s.status !== "cancelled" && <CancelButton action={cancelShoot.bind(null, s.id)} />}
          </div>
        </div>
        {s.status !== "cancelled" && <div className="flex gap-1.5 overflow-x-auto mt-4 pb-0.5">{STATUSES.map((k, i) => <div key={k} className="flex-none flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border" style={{ background: i === idx ? "var(--info-bg)" : "var(--glass-2)", borderColor: i === idx ? "var(--accent)" : "var(--line)", color: i < idx ? "var(--good)" : i === idx ? "var(--fg)" : "var(--muted)" }}><span className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[11px]" style={{ background: i < idx ? "var(--good-bg)" : i === idx ? "var(--accent)" : "var(--hair)", color: i === idx ? "#fff" : "inherit" }}>{i < idx ? "✓" : i + 1}</span>{STATUS_UA[k]}</div>)}</div>}
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Kpi label="Дедлайн віддачі" value={fmtShort(s.deadline)} sub={s.delivered_on ? `віддано ${fmtShort(s.delivered_on)}` : relDays(dlDays)} subTone={!s.delivered_on && dlDays < 0 ? "warn" : undefined} className={s.status === "shot" ? (dlDays < 0 ? "!bg-warn-bg" : "!bg-sun-bg") : ""} />
        <Kpi label="Вартість" value={money(s.price)} sub={`${s.hourly_rate ?? 0} ₴/год${rateAvg ? ` · середня ${rateAvg}` : ""}`} subTone={rateAvg && (s.hourly_rate ?? 0) < rateAvg ? "warn" : undefined} />
        <Kpi label="Отримано" value={money(s.paid)} sub={s.balance > 0 ? `залишок ${money(s.balance)}` : "оплачено повністю ✓"} subTone={s.balance > 0 ? "warn" : "good"} className={s.paid > 0 ? "!bg-good-bg" : ""} />
        <Kpi label="Податок із зйомки" value={money(s.price * (settings.ep_rate + settings.vz_rate) / 100)} sub={`ЄП ${settings.ep_rate}% + ВЗ ${settings.vz_rate}%`} />
      </div>

      <div className="flex flex-wrap gap-3.5 mt-3.5">
        <div className="flex-[999_1_560px] min-w-0 flex flex-col gap-3.5">
          {insights.length > 0 && <Assistant items={insights} title="Помічник про цю зйомку" />}

          <section className="card">
            <div className="flex justify-between items-baseline mb-3"><h2 className="text-lg font-bold">Фінанси</h2></div>
            <div className="flex flex-col gap-1.5">
              {payments.map((p) => <div key={p.id} className="kv items-center"><span>{{ deposit: "Передоплата", balance: "Залишок", extra: "Доплата", refund: "Повернення" }[p.kind]} · {{ invoice: "Рахунок ФОП", card: "Картка", cash: "Готівка", other: "Інше" }[p.method]} · {fmtDate(p.paid_on)}</span><span className="flex items-center gap-3"><b className="num" style={{ color: "var(--good)" }}>+ {money(Number(p.amount))}</b><form action={deletePayment.bind(null, p.id)}><button className="text-muted text-xs" aria-label="Видалити платіж" title="Видалити">×</button></form></span></div>)}
              {s.balance > 0 && <div className="kv" style={{ background: "var(--warn-bg)", color: "var(--warn)" }}><span>Залишок{s.invoice_sent_on ? ` · рахунок виставлено ${relDays(-(s.invoice_age_days ?? 0))}` : s.status === "request" ? ` · очікую передоплату ${money(Math.round(s.price * s.deposit_pct / 100))}` : " · після віддачі"}</span><b className="num">{money(s.balance)}</b></div>}
            </div>
            <div className="flex gap-2 flex-wrap mt-3">
              <PaymentForm shootId={s.id} suggested={s.balance > 0 ? s.balance : 0} hasDeposit={payments.length > 0} />
              {!s.invoice_sent_on && s.status === "delivered" && s.balance > 0 && <form action={markInvoiceSent.bind(null, s.id)}><button className="btn btn-sm">Рахунок виставлено сьогодні</button></form>}
            </div>
          </section>

          <section className="card"><h2 className="text-lg font-bold mb-3">Умови замовника</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{terms.map(([k, v]) => <div key={k} className="kv"><span className="text-muted">{k}</span><b>{v}</b></div>)}</div></section>

          <section className="card">
            <h2 className="text-lg font-bold mb-3">Таймінг · ≈ {s.total_hours} год</h2>
            <div className="flex h-9 gap-1">
              <div className="rounded-[10px] flex items-center px-2.5 text-[11px] font-bold whitespace-nowrap overflow-hidden" style={{ flex: `${s.prep_hours} 1 0`, background: "var(--sun-bg)", color: "var(--sun)" }}>Підготовка · {s.prep_hours}</div>
              <div className="rounded-[10px] flex items-center px-2.5 text-[11px] font-bold whitespace-nowrap overflow-hidden" style={{ flex: `${s.shoot_hours} 1 0`, background: "var(--accent)", color: "var(--accent-fg)" }}>Зйомка · {s.shoot_hours} год</div>
              <div className="rounded-[10px] flex items-center px-2.5 text-[11px] font-bold whitespace-nowrap overflow-hidden" style={{ flex: `${s.retouch_hours} 1 0`, background: "linear-gradient(135deg,var(--lime),var(--lime-2))", color: "#111113" }}>Відбір і ретуш · ~{s.retouch_hours} год</div>
            </div>
            <p className="text-xs text-muted mt-2.5">Ефективна ставка <b style={{ color: rateAvg && (s.hourly_rate ?? 0) < rateAvg ? "var(--warn)" : "var(--good)" }}>{s.hourly_rate ?? 0} ₴/год</b>{rateAvg ? <>; середня по «{typeLabel}» — {rateAvg} ₴/год.</> : "."}</p>
          </section>

          <section className="card">
            <h2 className="text-lg font-bold mb-3">Замітки</h2>
            <div className="flex flex-col gap-2">{notes.length ? notes.map((n) => <div key={n.id} className="px-3.5 py-3 rounded-[14px] bg-glass-2 border border-line text-[13px] leading-relaxed"><div className="text-[11px] text-muted font-semibold mb-1">{fmtDate(n.created_at.slice(0, 10))}</div>{n.text}</div>) : <div className="empty">Поки без заміток.</div>}</div>
            <form action={addNote.bind(null, s.id)} className="field flex flex-col gap-1.5 mt-3"><label htmlFor="note">Додати замітку</label><textarea id="note" name="text" placeholder="Що важливо не забути…" maxLength={2000} required /><div><button className="btn btn-sm btn-primary mt-2">Зберегти</button></div></form>
          </section>

          <section className="card">
            <div className="flex justify-between items-center mb-3"><h2 className="text-lg font-bold">Чек-лист</h2><span className="text-xs font-bold" style={{ color: "var(--good)" }}>{done} з {checklist.length}</span></div>
            {checklist.length > 0 && <div className="mb-3"><Bar pct={done / checklist.length * 100} /></div>}
            <div className="flex flex-col gap-1.5">{checklist.map((ci) => <ChecklistToggle key={ci.id} id={ci.id} text={ci.text} done={ci.done} action={toggleChecklist} />)}</div>
            <div className="flex gap-2 flex-wrap mt-3">
              <form action={addChecklistItem.bind(null, s.id)} className="flex gap-2 flex-1 min-w-[220px]"><input name="text" placeholder="Новий пункт" required maxLength={200} className="flex-1 px-3 py-2 rounded-xl border border-line bg-glass-2" aria-label="Новий пункт" /><button className="btn btn-sm">Додати</button></form>
              {checklist.length === 0 && <form action={addDefaultChecklist.bind(null, s.id)}><button className="btn btn-sm btn-ghost">Стандартний чек-лист</button></form>}
            </div>
          </section>
        </div>

        <aside className="flex-[1_1_300px] min-w-0 flex flex-col gap-3.5">
          <section className="rounded-[24px] p-5 pastel-c">
            <div className="flex justify-between items-center mb-3"><span className="text-xs font-semibold text-muted">Замовник</span><Link href={`/clients/${c.id}`} className="chip" style={{ background: "var(--accent)", color: "var(--accent-fg)" }}>Картка →</Link></div>
            <div className="flex items-center gap-3"><Avatar name={c.name} hue={c.avatar_hue} size={44} /><div><div className="text-[19px] font-extrabold tracking-tight">{c.name}</div><div className="text-xs text-muted">{c.kind ?? ""}{c.kind ? " · " : ""}з {fmtShort(c.since)} {c.since.slice(0, 4)}</div></div></div>
            <div className="grid grid-cols-2 gap-2.5 mt-3.5">{[["Зйомок", st?.shoots ?? 0], ["Усього", money(st?.total ?? 0)], ["Платять", c.default_deposit_pct === 100 ? "наперед ✓" : st?.avg_pay_delay_days != null ? `~${Math.round(st.avg_pay_delay_days)} дн` : "—"], ["Середній чек", money(st?.avg_check ?? 0)]].map(([k, v]) => <div key={String(k)} className="px-3 py-2.5 rounded-xl plate"><div className="text-xs text-muted">{k}</div><div className="font-extrabold num">{v}</div></div>)}</div>
            {prefs.length > 0 && <div className="mt-3.5"><div className="text-xs font-semibold text-muted mb-1.5">Що важливо для цього клієнта</div><ul className="m-0 pl-[18px] text-[13px] leading-relaxed">{prefs.map((p) => <li key={p.id}>{p.text}</li>)}</ul></div>}
          </section>
          <section className="card"><h2 className="text-lg font-bold mb-3">Історія з {c.name}</h2><div className="flex flex-col gap-1.5">{hist.length ? hist.map((h) => <Link key={h.id} href={`/shoots/${h.id}`} className="kv"><span><b>{h.title}</b><br /><span className="text-muted text-xs">{fmtDate(h.date)} · {h.photos} фото</span></span><b className="num">{money(h.price)}</b></Link>) : <div className="empty">Перша зйомка з цим клієнтом.</div>}</div></section>
        </aside>
      </div>
    </>
  );
}
