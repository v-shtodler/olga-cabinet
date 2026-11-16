"use client";
import { useState } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import { addSaving } from "@/app/actions";
import { CURRENCIES, CUR_SIGN, type Currency } from "@/lib/domain";

/* Відкласти: місяць, валюта, сума. Курс кабінет бере сам — офіційний курс НБУ
   на той місяць, щоб порахувати, скільки це було з доходу. */
export function SavingForm() {
  const [cur, setCur] = useState<Currency>("EUR");

  return (
    <form action={addSaving} data-op="addSaving" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="field flex flex-col gap-1.5">
        <label htmlFor="s-month">Місяць</label>
        <input id="s-month" name="month" type="month" defaultValue={format(new Date(), "yyyy-MM")} required />
      </div>
      <div className="field flex flex-col gap-1.5">
        <label htmlFor="s-amount">Сума, {CUR_SIGN[cur]}</label>
        <input id="s-amount" name="amount" type="number" step="any" min="0" placeholder="0" required />
      </div>
      <div className="field flex flex-col gap-1.5 sm:col-span-2">
        <label>Валюта</label>
        <div className="seg seg-fill" role="radiogroup" aria-label="Валюта">
          {CURRENCIES.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={cur === c} className={clsx(cur === c && "on")} onClick={() => setCur(c)}>{CUR_SIGN[c]} {c}</button>
          ))}
        </div>
        <input type="hidden" name="currency" value={cur} />
      </div>
      <div className="sm:col-span-2 flex items-center justify-between gap-3 flex-wrap">
        <span className="text-[13px] text-muted">Курс — офіційний НБУ за цей місяць</span>
        <button className="btn btn-primary" type="submit">Відкласти</button>
      </div>
    </form>
  );
}
