"use client";
import { useState, useTransition } from "react";
import { addPayment, updateShootField, cancelShoot, toggleChecklist } from "@/app/actions";
import { callOrQueue } from "@/lib/outbox";
import { todayISO } from "@/lib/domain";

export function InlineTitle({ id, title }: { id: string; title: string }) {
  const [v, setV] = useState(title);
  return (
    <h1 className="text-[clamp(26px,4vw,38px)] font-extrabold leading-[1.08] tracking-tighter outline-none rounded-md focus:ring-2 focus:ring-accent/40" contentEditable suppressContentEditableWarning spellCheck={false} title="Клацніть, щоб перейменувати"
      onBlur={(e) => { const t = (e.currentTarget.textContent ?? "").trim() || "Зйомка"; if (t !== v) { setV(t); callOrQueue("updateShootField", [id, "title", t], undefined, `Назва: ${t}`, () => updateShootField(id, "title", t)); } }}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.currentTarget as HTMLElement).blur(); } }}>{title}</h1>
  );
}

export function CancelButton({ id }: { id: string }) {
  const [sure, setSure] = useState(false); const [pending, start] = useTransition();
  if (!sure) return <button type="button" className="btn btn-ghost" onClick={() => setSure(true)}>Скасувати</button>;
  return <button type="button" className="btn" style={{ color: "var(--warn)", borderColor: "var(--warn)" }} disabled={pending} onClick={() => start(async () => { const r = await callOrQueue("cancelShoot", [id], undefined, undefined, () => cancelShoot(id)); if (r.queued) setSure(false); })}>{pending ? "…" : "Точно скасувати?"}</button>;
}

export function ChecklistToggle({ id, text, done: initial }: { id: string; text: string; done: boolean }) {
  const [pending, start] = useTransition(); const [done, setDone] = useState(initial);
  return (
    <label className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer font-medium ${done ? "line-through border-transparent" : "bg-glass-2 border-line"}`} style={done ? { background: "var(--good-bg)", color: "var(--good)" } : undefined}>
      <input type="checkbox" checked={done} disabled={pending} onChange={(e) => { const v = e.target.checked; setDone(v); start(async () => { await callOrQueue("toggleChecklist", [id, v], undefined, `${v ? "✓" : "☐"} ${text}`, () => toggleChecklist(id, v)); }); }} className="w-[18px] h-[18px]" style={{ accentColor: "#15a05a" }} /> {text}
    </label>
  );
}

export function PaymentForm({ shootId, suggested, hasDeposit }: { shootId: string; suggested: number; hasDeposit: boolean }) {
  const [open, setOpen] = useState(false); const [pending, start] = useTransition();
  if (!open) return <button type="button" className="btn btn-sm btn-good" onClick={() => setOpen(true)}>+ Платіж{suggested > 0 ? ` (${Math.round(suggested).toLocaleString("uk-UA")} ₴)` : ""}</button>;
  return (
    <form className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-2xl border border-line bg-glass-2" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); start(async () => { await callOrQueue("addPayment", [], fd, `Платіж ${fd.get("amount")} ₴`, () => addPayment(fd)); setOpen(false); }); }}>
      <input type="hidden" name="shoot_id" value={shootId} />
      <div className="field flex flex-col gap-1"><label htmlFor="p-amount">Сума, ₴</label><input id="p-amount" name="amount" type="number" min="1" defaultValue={Math.round(suggested) || ""} required /></div>
      <div className="field flex flex-col gap-1"><label htmlFor="p-date">Дата отримання</label><input id="p-date" name="paid_on" type="date" defaultValue={todayISO()} required /></div>
      <div className="field flex flex-col gap-1"><label htmlFor="p-kind">Що це</label><select id="p-kind" name="kind" defaultValue={hasDeposit ? "balance" : "deposit"}><option value="deposit">Передоплата</option><option value="balance">Залишок</option><option value="extra">Доплата</option><option value="refund">Повернення</option></select></div>
      <div className="field flex flex-col gap-1"><label htmlFor="p-method">Спосіб</label><select id="p-method" name="method" defaultValue="invoice"><option value="invoice">Рахунок ФОП</option><option value="card">Картка</option><option value="cash">Готівка</option><option value="other">Інше</option></select></div>
      <div className="col-span-2 sm:col-span-4 flex justify-between items-center gap-2 flex-wrap"><span className="text-xs text-muted">Дата платежу визначає податковий квартал.</span><span className="flex gap-2"><button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpen(false)}>Скасувати</button><button className="btn btn-sm btn-good" disabled={pending}>{pending ? "…" : "Записати"}</button></span></div>
    </form>
  );
}
