"use client";
import { useState } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import { addSaving } from "@/app/actions";
import { CURRENCIES, CUR_SIGN, money, type Currency } from "@/lib/domain";

/* Додати відкладене: сума у валюті + курс, гривневий еквівалент рахується на очах.
   Курс підставляється останній використаний для цієї валюти. */
export function SavingForm({ lastRate }: { lastRate: Partial<Record<Currency, number>> }) {
  const [cur, setCur] = useState<Currency>("EUR");
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState(String(lastRate.EUR ?? ""));

  function pickCur(c: Currency) {
    setCur(c);
    setRate(String(lastRate[c] ?? ""));
  }
  const uah = Number(amount || 0) * Number(rate || 0);

  return (
    <form action={addSaving} data-op="addSaving" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="field flex flex-col gap-1.5">
        <label htmlFor="s-month">Місяць</label>
        <input id="s-month" name="month" type="month" defaultValue={format(new Date(), "yyyy-MM")} required />
      </div>
      <div className="field flex flex-col gap-1.5">
        <label htmlFor="s-cur">Валюта</label>
        <div className="seg seg-fill" role="radiogroup" aria-label="Валюта">
          {CURRENCIES.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={cur === c} className={clsx(cur === c && "on")} onClick={() => pickCur(c)}>{CUR_SIGN[c]} {c}</button>
          ))}
        </div>
        <input type="hidden" name="currency" value={cur} />
      </div>
      <div className="field flex flex-col gap-1.5">
        <label htmlFor="s-amount">Сума, {CUR_SIGN[cur]}</label>
        <input id="s-amount" name="amount" type="number" step="any" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" required />
      </div>
      <div className="field flex flex-col gap-1.5">
        <label htmlFor="s-rate">Курс, ₴ за 1 {CUR_SIGN[cur]}</label>
        <input id="s-rate" name="rate" type="number" step="any" min="0" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="0" required />
      </div>
      <div className="field flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor="s-note">Замітка <span className="font-normal">(не обов’язково)</span></label>
        <input id="s-note" name="note" maxLength={200} placeholder="Напр.: на техніку" />
      </div>
      <div className="sm:col-span-2 flex items-center justify-between gap-3 flex-wrap">
        <span className="text-[13px] text-muted">{uah > 0 ? <>Це <b className="text-fg num">{money(uah)}</b> з доходу</> : "Вкажіть суму й курс"}</span>
        <button className="btn btn-primary" type="submit">Відкласти</button>
      </div>
    </form>
  );
}
