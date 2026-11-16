import Link from "next/link";
import { notFound } from "next/navigation";
import { getShoot, getSettings, getClients } from "@/lib/data";
import { money, fmtDate, todayISO } from "@/lib/domain";
import { InvoiceActions } from "./actions-bar";
import * as I from "@/components/icons";

export const metadata = { title: "Рахунок" };

/* Printable invoice (рахунок-фактура ФОП). ?sum=deposit|balance|full picks the amount; print via the browser → PDF. */
export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sum?: string }> }) {
  const [{ id }, { sum }] = await Promise.all([params, searchParams]);
  const [data, st, clients] = await Promise.all([getShoot(id), getSettings(), getClients()]);
  if (!data) notFound();
  const { shoot: s, payments } = data;
  const c = clients.find((x) => x.id === s.client_id); if (!c) notFound();
  const paid = payments.reduce((a, p) => a + Number(p.amount), 0);
  const deposit = Math.round(s.price * s.deposit_pct / 100);
  const mode = sum === "deposit" ? "deposit" : sum === "full" ? "full" : paid > 0 && s.price - paid > 0 ? "balance" : s.deposit_pct > 0 && s.deposit_pct < 100 && paid === 0 ? "deposit" : "full";
  const amount = mode === "deposit" ? deposit : mode === "balance" ? Math.max(0, s.price - paid) : s.price;
  const label = mode === "deposit" ? `Передоплата ${s.deposit_pct}%` : mode === "balance" ? "Остаточний розрахунок" : "Повна вартість";
  const today = todayISO();
  const no = `${s.no ?? s.id.slice(0, 6)}${mode === "deposit" ? "-1" : mode === "balance" ? "-2" : ""}`;
  const desc = `Фотозйомка «${s.title}»`;
  const missing = !st.fop_name || !st.iban;

  return (
    <>
      <div className="print:hidden flex items-center justify-between gap-3 flex-wrap mb-4">
        <Link href={`/shoots/${id}`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent"><I.Back /> До зйомки</Link>
        <InvoiceActions id={id} mode={mode} invoiceSent={!!s.invoice_sent_on} hasBalanceOption={paid > 0 && s.price - paid > 0} hasDepositOption={s.deposit_pct > 0 && s.deposit_pct < 100} />
      </div>
      {missing && <div className="print:hidden rounded-2xl px-4 py-2.5 mb-4 text-[13px] font-medium" style={{ background: "var(--warn-bg)", color: "var(--warn)" }}>Не заповнені реквізити (назва ФОП, IBAN) — <Link href="/settings" className="underline">додайте в Налаштуваннях</Link>, інакше рахунок буде без них.</div>}

      <article className="invoice card max-w-[800px] mx-auto p-8 print:p-0 print:max-w-none print:shadow-none print:border-0 print:bg-white print:text-black" style={{ color: "var(--fg)" }}>
        <header className="flex justify-between gap-6 flex-wrap mb-8">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted font-bold">Рахунок-фактура</div>
            <h1 className="text-2xl font-bold tracking-[-0.01em]">№ {no}</h1>
            <div className="text-[13px] text-muted">від {fmtDate(today, true)}</div>
          </div>
          <div className="text-right text-[13px]">
            <div className="font-bold">{st.fop_name || st.display_name}</div>
            {st.ipn && <div>РНОКПП {st.ipn}</div>}
            {st.legal_address && <div>{st.legal_address}</div>}
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-[13px]">
          <div className="rounded-xl p-3.5 print:p-0" style={{ background: "var(--glass-2)" }}>
            <div className="text-[11px] uppercase tracking-wider text-muted font-bold mb-1">Постачальник</div>
            <div className="font-bold">{st.fop_name || st.display_name}</div>
            {st.ipn && <div>РНОКПП: {st.ipn}</div>}
            {st.iban && <div>IBAN: <span className="num">{st.iban}</span></div>}
            {st.bank_name && <div>Банк: {st.bank_name}</div>}
          </div>
          <div className="rounded-xl p-3.5 print:p-0" style={{ background: "var(--glass-2)" }}>
            <div className="text-[11px] uppercase tracking-wider text-muted font-bold mb-1">Платник</div>
            <div className="font-bold">{c.name}</div>
            {c.kind && <div>{c.kind}</div>}
            {c.contact_name && <div>{c.contact_name}</div>}
            {c.contact_email && <div>{c.contact_email}</div>}
          </div>
        </section>

        <table className="w-full text-[13px] mb-6 border-collapse">
          <thead><tr className="text-left text-[11px] uppercase tracking-wider text-muted"><th className="py-2 border-b border-hair font-bold">№</th><th className="py-2 border-b border-hair font-bold">Послуга</th><th className="py-2 border-b border-hair font-bold text-right">Сума</th></tr></thead>
          <tbody>
            <tr><td className="py-3 border-b border-hair align-top w-8">1</td><td className="py-3 border-b border-hair align-top">{desc}<div className="text-muted mt-1">Дата зйомки: {fmtDate(s.date, true)}{s.location ? ` · ${s.location}` : ""}. {label}{mode !== "full" ? ` із загальної вартості ${money(s.price)}` : ""}.</div></td><td className="py-3 border-b border-hair align-top text-right num font-bold whitespace-nowrap">{money(amount)}</td></tr>
          </tbody>
          <tfoot><tr><td colSpan={2} className="py-3 text-right font-bold">Разом до сплати</td><td className="py-3 text-right num font-extrabold text-lg whitespace-nowrap">{money(amount)}</td></tr></tfoot>
        </table>

        <section className="text-[13px] mb-6"><span className="text-muted">Призначення платежу:</span> <b>Оплата за фотопослуги згідно рахунку № {no} від {fmtDate(today, true)}</b></section>
        <footer className="text-[12px] text-muted border-t border-hair pt-4">{st.invoice_note || "Без ПДВ. Платник єдиного податку 3 групи."}</footer>
      </article>

      <style>{`@media print { body { background: #fff !important; } header, nav, .print\\:hidden { display: none !important; } main { padding: 0 !important; } .invoice { box-shadow: none !important; border: 0 !important; background: #fff !important; color: #000 !important; } .invoice * { color: inherit !important; } @page { margin: 18mm; } }`}</style>
    </>
  );
}
