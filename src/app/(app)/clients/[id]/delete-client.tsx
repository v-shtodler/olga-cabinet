"use client";
import { useState, useTransition } from "react";
import { deleteClient } from "@/app/actions";
import { callOrQueue } from "@/lib/outbox";

/** Deleting a client takes its shoots and payments with it, so the confirmation spells out what goes. */
export function DeleteClient({ id, name, shoots, payments, paid }: { id: string; name: string; shoots: number; payments: number; paid: string }) {
  const [sure, setSure] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (!sure) return <button type="button" className="btn btn-ghost w-full" style={{ color: "var(--danger)" }} onClick={() => setSure(true)}>Видалити замовника</button>;

  return (
    <div className="flex flex-col gap-2.5 p-3.5 rounded-[12px]" style={{ background: "var(--danger-bg)" }}>
      <div className="text-[15px] font-semibold" style={{ color: "var(--danger)" }}>Видалити «{name}» назавжди?</div>
      <div className="text-[13px]">
        {shoots === 0 ? "Зйомок у цього замовника немає — зникне тільки картка." : <>Разом із ним зникнуть <b>{shoots} {shoots === 1 ? "зйомка" : shoots < 5 ? "зйомки" : "зйомок"}</b>{payments > 0 && <> і <b>{payments} {payments === 1 ? "платіж" : payments < 5 ? "платежі" : "платежів"}</b> на {paid}</>}. Дохід і податкові підсумки перерахуються без них. Відновити не можна.</>}
      </div>
      <div className="flex gap-2 flex-wrap">
        <button type="button" className="btn" style={{ background: "var(--danger)", color: "#fff" }} disabled={pending}
          onClick={() => start(async () => { setErr(null); try { await callOrQueue("deleteClient", [id, shoots > 0], undefined, `Видалення замовника: ${name}`, () => deleteClient(id, shoots > 0)); } catch (e) { setErr(e instanceof Error ? e.message : "Не вдалося видалити"); } })}>
          {pending ? "Видаляю…" : shoots === 0 ? "Так, видалити" : `Так, видалити разом із ${shoots === 1 ? "зйомкою" : "зйомками"}`}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setSure(false)}>Скасувати</button>
      </div>
      {err && <p className="text-[13px]" style={{ color: "var(--danger)" }}>{err}</p>}
    </div>
  );
}
