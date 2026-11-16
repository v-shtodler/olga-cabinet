"use client";
import Link from "next/link";
import { useTransition } from "react";
import { markInvoiceSent } from "@/app/actions";
import { callOrQueue } from "@/lib/outbox";

export function InvoiceActions({ id, mode, invoiceSent, hasBalanceOption }: { id: string; mode: string; invoiceSent: boolean; hasBalanceOption: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="seg">
        {hasBalanceOption && <Link href={`/shoots/${id}/invoice?sum=balance`} className={mode === "balance" ? "on" : ""}>Залишок</Link>}
        <Link href={`/shoots/${id}/invoice?sum=full`} className={mode === "full" ? "on" : ""}>Уся сума</Link>
      </div>
      <button type="button" className="btn" onClick={() => window.print()}>Друк / PDF</button>
      {!invoiceSent && <button type="button" className="btn btn-primary" disabled={pending} onClick={() => start(async () => { await callOrQueue("markInvoiceSent", [id], undefined, undefined, () => markInvoiceSent(id)); })}>{pending ? "…" : "Позначити виставленим"}</button>}
      {invoiceSent && <span className="chip" style={{ background: "var(--good-bg)", color: "var(--good)" }}>Рахунок виставлено</span>}
    </div>
  );
}
