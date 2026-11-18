import Link from "next/link";
import type { Insight, InsightKind } from "@/lib/domain";
import { plural } from "@/lib/domain";
import * as I from "./icons";
import { dismissInsight, markTaxPaid } from "@/app/actions";

const ICON: Record<InsightKind, React.ReactNode> = { payment: <I.Card />, request: <I.Flag />, prep: <I.Tag />, load: <I.Leaf />, tax: <I.Tax />, price: <I.Tag /> };

/** The assistant: one consistent voice everywhere — indigo gradient block, spark mark, tag + text + actions. */
export function Assistant({ items, title = "Помічник", empty = "Усе під контролем: дедлайни й оплати в нормі, нічого термінового.", max = 6 }: { items: Insight[]; title?: string; empty?: string; max?: number }) {
  return (
    <section aria-label="Помічник" className="assist relative rounded-[16px] p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 font-extrabold text-[15px]"><span className="assist-mark w-7 h-7 rounded-[8px] inline-flex items-center justify-center"><I.Spark /></span>{title}</div>
        <div className="text-[13px] text-muted font-medium">{items.length ? `${items.length} ${plural(items.length, "зауваження", "зауваження", "зауважень")}` : "усе спокійно"}</div>
      </div>
      {items.length === 0 ? <div className="text-[15px] text-muted">{empty}</div> : (
        <div className="flex flex-col gap-2">
          {items.slice(0, max).map((i) => (
            <div key={i.key} className="flex gap-3 items-start px-3.5 py-3 rounded-[12px]" style={{ background: "var(--glass-2)" }}>
              <div className="w-[34px] h-[34px] shrink-0 rounded-[11px] flex items-center justify-center" style={{ background: i.sev === "high" ? "var(--danger-bg)" : i.sev === "mid" ? "var(--warn-bg)" : "var(--accent-tint)", color: i.sev === "high" ? "var(--danger)" : i.sev === "mid" ? "var(--warn)" : "var(--accent)" }}>{ICON[i.kind]}</div>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="text-[12px] font-semibold text-muted">{i.tag}</div>
                <div className="text-[15px] leading-snug">{i.text}</div>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {i.action?.href && <Link href={i.action.href} className="btn btn-sm btn-primary">{i.action.label}</Link>}
                  {i.action?.taxKey && <form action={markTaxPaid.bind(null, i.action.taxKey)} data-op="markTaxPaid" data-args={JSON.stringify([i.action.taxKey])}><button className="btn btn-sm btn-primary">{i.action.label}</button></form>}
                  <form action={dismissInsight.bind(null, i.key)} data-op="dismissInsight" data-args={JSON.stringify([i.key])}><button className="btn btn-sm">Приховати на тиждень</button></form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function AssistantInline({ children }: { children: React.ReactNode }) {
  return (
    <div className="assist flex gap-2.5 items-start px-3.5 py-3 rounded-[12px] text-fg">
      <span className="assist-mark w-[26px] h-[26px] shrink-0 rounded-[7px] flex items-center justify-center"><I.Spark /></span>
      <div className="text-[14px] leading-snug">{children}</div>
    </div>
  );
}
