"use client";
import { useState } from "react";
import type { Client, Preset } from "@/lib/domain";
import { updateClient } from "@/app/actions";

/* "Контакт і умови" card: read view with an inline edit form (server action; offline → outbox via data-op). */
export function ContactCard({ c, presets, labelOf }: { c: Client; presets: Preset[]; labelOf: Record<string, string> }) {
  const [edit, setEdit] = useState(false);
  const action = updateClient.bind(null, c.id);
  return (
    <section className="card">
      <div className="flex justify-between items-center mb-3"><h2 className="text-[17px] font-semibold">Контакт і умови</h2><button type="button" className="btn btn-sm" onClick={() => setEdit((v) => !v)}>{edit ? "Скасувати" : "Редагувати"}</button></div>
      {!edit ? (
        <div className="flex flex-col gap-1.5">
          {c.kind && <div className="kv"><span className="text-muted">Хто це</span><b>{c.kind}</b></div>}
          <div className="kv"><span className="text-muted">Контакт</span><b>{c.contact_name ?? "—"}</b></div>
          {c.contact_email && <div className="kv"><span className="text-muted">Пошта</span><a href={`mailto:${c.contact_email}`} className="font-bold text-accent select-all">{c.contact_email}</a></div>}
          {c.contact_phone && <div className="kv"><span className="text-muted">Телефон</span><a href={`tel:${c.contact_phone.replace(/\s+/g, "")}`} className="font-bold text-accent select-all">{c.contact_phone}</a></div>}
          <div className="kv"><span className="text-muted">Передоплата</span><b>{c.default_deposit_pct}%</b></div>
          <div className="kv"><span className="text-muted">Типові зйомки</span><b>{c.default_types.map((t) => labelOf[t] ?? t).join(", ") || "—"}</b></div>
        </div>
      ) : (
        <form action={action} data-op="updateClient" data-args={JSON.stringify([c.id])} data-label={c.name} onSubmit={() => setEdit(false)} className="grid grid-cols-1 gap-3">
          <div className="field flex flex-col gap-1.5"><label htmlFor="e-name">Назва</label><input id="e-name" name="name" defaultValue={c.name} required maxLength={120} /></div>
          <div className="field flex flex-col gap-1.5"><label htmlFor="e-kind">Хто це</label><input id="e-kind" name="kind" defaultValue={c.kind ?? ""} maxLength={80} placeholder="Бренд одягу" /></div>
          <div className="field flex flex-col gap-1.5"><label htmlFor="e-contact">Контактна особа</label><input id="e-contact" name="contact_name" defaultValue={c.contact_name ?? ""} maxLength={120} /></div>
          <div className="field flex flex-col gap-1.5"><label htmlFor="e-email">Пошта</label><input id="e-email" name="contact_email" type="email" defaultValue={c.contact_email ?? ""} maxLength={120} /></div>
          <div className="field flex flex-col gap-1.5"><label htmlFor="e-phone">Телефон</label><input id="e-phone" name="contact_phone" type="tel" defaultValue={c.contact_phone ?? ""} maxLength={40} /></div>
          <div className="field flex flex-col gap-1.5"><label htmlFor="e-dep">Передоплата за замовчуванням</label><select id="e-dep" name="default_deposit_pct" defaultValue={String(c.default_deposit_pct)}><option value="0">0%</option><option value="30">30%</option><option value="50">50%</option><option value="70">70%</option><option value="100">100%</option></select></div>
          <fieldset className="field flex flex-col gap-1.5"><legend className="text-xs font-semibold text-muted mb-1.5">Типові зйомки</legend><div className="flex flex-wrap gap-2">{presets.map((p) => <label key={p.type} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-glass-2 cursor-pointer text-[13px] font-medium"><input type="checkbox" name="default_types" value={p.type} defaultChecked={c.default_types.includes(p.type)} style={{ accentColor: "var(--accent)" }} />{p.label}</label>)}</div></fieldset>
          <div className="flex justify-end gap-2"><button type="submit" className="btn btn-primary">Зберегти</button></div>
        </form>
      )}
    </section>
  );
}
