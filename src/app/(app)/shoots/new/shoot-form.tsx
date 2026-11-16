"use client";
import { useState, useTransition } from "react";
import { addDays, format } from "date-fns";
import { useRouter } from "next/navigation";
import type { Client, Shoot } from "@/lib/domain";
import { createShoot, updateShoot } from "@/app/actions";
import { callOrQueue } from "@/lib/outbox";

const NEW = "__new";

/** The whole shoot in seven fields: who, what, when, where, how much — plus an optional delivery date. */
export function ShootForm({ clients, initial, editId }: { clients: Client[]; initial: { date?: string; clientId?: string; source?: Shoot | null }; editId?: string }) {
  const src = initial.source;
  const edit = !!editId;
  const firstClient = clients.find((c) => c.id === (src?.client_id ?? initial.clientId)) ?? clients[0];
  const [clientId, setClientId] = useState(firstClient?.id ?? NEW);
  const [newClient, setNewClient] = useState("");
  const [deposit, setDeposit] = useState(String(src?.deposit_pct ?? firstClient?.default_deposit_pct ?? 50));
  const [depositNow, setDepositNow] = useState(true);
  const [price, setPrice] = useState(src ? String(src.price) : "");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  function applyClient(id: string) {
    setClientId(id);
    if (id === NEW) return;
    const c = clients.find((x) => x.id === id);
    if (c) setDeposit(String(c.default_deposit_pct));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (edit) { const r = await callOrQueue("updateShoot", [editId], fd, `Зміни в зйомці: ${fd.get("title")}`, () => updateShoot(editId!, fd)); router.push(`/shoots/${editId}`); if (!r.queued) router.refresh(); }
        else { const r = await callOrQueue("createShoot", [], fd, `Нова зйомка: ${fd.get("title")} · ${fd.get("date")}`, () => createShoot(fd)); if (r.queued) router.push("/shoots"); }
      } catch (x) { setErr(x instanceof Error ? x.message : "Не вдалося зберегти"); }
    });
  }

  const depositSum = Math.round(Number(price || 0) * Number(deposit || 0) / 100);

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="field flex flex-col gap-1.5 sm:col-span-2"><label htmlFor="title">Назва</label><input id="title" name="title" defaultValue={src?.title ?? ""} placeholder="Напр.: Lookbook FW26" required maxLength={120} /></div>
      <div className="field flex flex-col gap-1.5"><label htmlFor="client_id">Замовник</label><select id="client_id" name="client_id" value={clientId} onChange={(e) => applyClient(e.target.value)}>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}{!edit && <option value={NEW}>+ Новий замовник…</option>}</select></div>
      {clientId === NEW
        ? <div className="field flex flex-col gap-1.5"><label htmlFor="new_client_name">Назва нового замовника</label><input id="new_client_name" name="new_client_name" value={newClient} onChange={(e) => setNewClient(e.target.value)} placeholder="Бренд або ім’я" required maxLength={120} autoFocus /></div>
        : <div className="field flex flex-col gap-1.5"><label htmlFor="location">Локація</label><input id="location" name="location" defaultValue={src?.location ?? "Студія"} maxLength={200} /></div>}
      {clientId === NEW && <div className="field flex flex-col gap-1.5"><label htmlFor="location">Локація</label><input id="location" name="location" defaultValue={src?.location ?? "Студія"} maxLength={200} /></div>}
      <div className="field flex flex-col gap-1.5"><label htmlFor="date">Дата</label><input id="date" name="date" type="date" defaultValue={initial.date ?? (edit ? src?.date : undefined) ?? format(addDays(new Date(), 7), "yyyy-MM-dd")} required /></div>
      <div className="field flex flex-col gap-1.5"><label htmlFor="start_time">Початок</label><input id="start_time" name="start_time" type="time" defaultValue={src?.start_time?.slice(0, 5) ?? "10:00"} /></div>
      <div className="field flex flex-col gap-1.5"><label htmlFor="price">Ціна, ₴</label><input id="price" name="price" type="number" step="any" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" required /></div>
      <div className="field flex flex-col gap-1.5"><label htmlFor="deposit_pct">Передоплата, %</label><input id="deposit_pct" name="deposit_pct" type="number" min="0" max="100" step="1" value={deposit} onChange={(e) => setDeposit(e.target.value)} /></div>
      <div className="field flex flex-col gap-1.5 sm:col-span-2"><label htmlFor="deadline_on">Віддати до <span className="font-normal">(не обов’язково)</span></label><input id="deadline_on" name="deadline_on" type="date" defaultValue={src?.deadline_on ?? ""} /></div>
      {!edit && <div className="field flex flex-col gap-1.5 sm:col-span-2"><label htmlFor="note">Замітка</label><textarea id="note" name="note" placeholder="Вимоги, референси, команда…" maxLength={2000} /></div>}
      {!edit && <label className="sm:col-span-2 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-glass-2 cursor-pointer font-medium"><input type="checkbox" name="deposit_received" checked={depositNow} onChange={(e) => setDepositNow(e.target.checked)} className="switch" /> Передоплату вже отримано — статус «Підтверджено»</label>}
      {!edit && depositNow && Number(deposit) > 0 && <div className="field flex flex-col gap-1.5"><label htmlFor="deposit_on">Дата передоплати <span className="font-normal">(визначає податковий квартал)</span></label><input id="deposit_on" name="deposit_on" type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} /></div>}
      <div className="sm:col-span-2 flex items-center justify-between gap-3 flex-wrap">
        <span className="text-[13px] text-muted">{depositSum > 0 ? `Передоплата ≈ ${depositSum.toLocaleString("uk-UA")} ₴` : "Передоплати немає"}</span>
        <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Зберігаю…" : edit ? "Зберегти зміни" : "Створити зйомку"}</button>
      </div>
      {err && <p className="sm:col-span-2 text-[13px]" style={{ color: "var(--warn)" }}>{err}</p>}
    </form>
  );
}
