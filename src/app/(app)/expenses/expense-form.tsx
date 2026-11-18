"use client";
import { useState } from "react";
import { format } from "date-fns";
import { addExpense } from "@/app/actions";
import { EXPENSE_CATS, expenseColor, brandText } from "@/lib/domain";

/* Додати витрату: дата, сума, категорія і що саме купили. */
export function ExpenseForm() {
  const [cat, setCat] = useState<string>(EXPENSE_CATS[0]);

  return (
    <form action={addExpense} data-op="addExpense" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="field flex flex-col gap-1.5">
        <label htmlFor="e-date">Дата</label>
        <input id="e-date" name="spent_on" type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} required />
      </div>
      <div className="field flex flex-col gap-1.5">
        <label htmlFor="e-amount">Сума, ₴</label>
        <input id="e-amount" name="amount" type="number" step="any" min="0" placeholder="0" required />
      </div>
      <div className="field flex flex-col gap-1.5 sm:col-span-2">
        <label>Категорія</label>
        <div className="flex gap-1.5 flex-wrap" role="radiogroup" aria-label="Категорія">
          {EXPENSE_CATS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={cat === c} onClick={() => setCat(c)}
              className="chip cursor-pointer border-0 transition-transform active:scale-95"
              style={cat === c ? { background: expenseColor(c), color: brandText(expenseColor(c)) } : { background: `color-mix(in srgb, ${expenseColor(c)} 20%, transparent)`, color: "var(--muted)" }}>{c}</button>
          ))}
        </div>
        <input type="hidden" name="category" value={cat} />
      </div>
      <div className="field flex flex-col gap-1.5 sm:col-span-2">
        <label htmlFor="e-note">Що саме <span className="font-normal">(не обов’язково)</span></label>
        <input id="e-note" name="note" maxLength={200} placeholder="Напр.: об’єктив 85mm" />
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <button className="btn btn-primary" type="submit">Додати витрату</button>
      </div>
    </form>
  );
}
