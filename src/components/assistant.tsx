import Link from "next/link";
import type { Insight, InsightKind } from "@/lib/domain";
import { plural } from "@/lib/domain";
import * as I from "./icons";
import { dismissInsight, markTaxPaid } from "@/app/actions";

const ICON: Record<InsightKind, React.ReactNode> = { deadline: <I.Clock />, payment: <I.Card />, request: <I.Flag />, prep: <I.Tag />, load: <I.Leaf />, tax: <I.Tax />, price: <I.Tag /> };

/** The assistant: one consistent voice everywhere — indigo gradient block, spark mark, tag + text + actions. */
export function Assistant({ items, title = "Помічник", empty = "Усе під контролем: дедлайни й оплати в нормі, нічого термінового.", max = 6 }: { items: Insight[]; title?: string; empty?: string; max?: number }) {
  return (
    <section aria-label="Помічник" className="relative overflow-hidden rounded-[22px] p-5 text-white flex flex-col gap-3" style={{ background: "linear-gradient(135deg,var(--assist-a),var(--assist-b))", boxShadow: "0 14px 36px rgba(67,56,202,.32)" }}>
      <span aria-hidden="true" className="absolute w-56 h-56 rounded-full -right-[70px] -top-[90px] pointer-events-none" style={{ background: "rgba(255,255,255,.12)", filter: "blur(10px)" }} />
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 font-extrabold text-[15px]"><span className="w-7 h-7 rounded-[9px] inline-flex items-center justify-center" style={{ background: "rgba(255,255,255,.2)" }}><I.Spark /></span>{title}</div>
        <div className="text-xs opacity-85 font-semibold">{items.length ? `${items.length} ${plural(items.length, "зауваження", "зауваження", "зауважень")}` : "усе спокійно"}</div>
      </div>
      {items.length === 0 ? <div className="text-sm opacity-90">{empty}</div> : (
        <div className="flex flex-col gap-2">
          {items.slice(0, max).map((i) => (
            <div key={i.key} className="flex gap-3 items-start px-3.5 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)" }}>
              <div className="w-[34px] h-[34px] shrink-0 rounded-[11px] flex items-center justify-center" style={{ background: i.sev === "high" ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.18)" }}>{ICON[i.kind]}</div>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="text-[11px] font-bold tracking-wide uppercase opacity-85">{i.tag}</div>
                <div className="text-sm font-medium leading-snug">{i.text}</div>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {i.action?.href && <Link href={i.action.href} className="rounded-full px-3 py-1.5 text-xs font-bold bg-white" style={{ color: "var(--assist-b)" }}>{i.action.label}</Link>}
                  {i.action?.taxKey && <form action={markTaxPaid.bind(null, i.action.taxKey)} data-op="markTaxPaid" data-args={JSON.stringify([i.action.taxKey])}><button className="rounded-full px-3 py-1.5 text-xs font-bold bg-white" style={{ color: "var(--assist-b)" }}>{i.action.label}</button></form>}
                  <form action={dismissInsight.bind(null, i.key)} data-op="dismissInsight" data-args={JSON.stringify([i.key])}><button className="rounded-full px-3 py-1.5 text-xs font-bold text-white" style={{ background: "rgba(255,255,255,.15)" }}>Приховати на тиждень</button></form>
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
    <div className="flex gap-2.5 items-start px-3.5 py-3 rounded-2xl text-fg" style={{ background: "var(--assist-soft)", border: "1px solid rgba(79,70,229,.25)" }}>
      <span className="w-[26px] h-[26px] shrink-0 rounded-lg text-white flex items-center justify-center" style={{ background: "linear-gradient(135deg,var(--assist-a),var(--assist-b))" }}><I.Spark /></span>
      <div className="text-[13px] leading-snug font-medium">{children}</div>
    </div>
  );
}
