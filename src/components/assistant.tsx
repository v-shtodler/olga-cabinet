import Link from "next/link";
import type { Insight, InsightKind } from "@/lib/domain";
import { plural } from "@/lib/domain";
import * as I from "./icons";
import { dismissInsight, markTaxPaid } from "@/app/actions";

const ICON: Record<InsightKind, React.ReactNode> = { deadline: <I.Clock />, payment: <I.Card />, request: <I.Flag />, prep: <I.Tag />, load: <I.Leaf />, tax: <I.Tax />, price: <I.Tag /> };

/** The assistant: one consistent voice everywhere — indigo gradient block, spark mark, tag + text + actions. */
export function Assistant({ items, title = "Помічник", empty = "Усе під контролем: дедлайни й оплати в нормі, нічого термінового.", max = 6 }: { items: Insight[]; title?: string; empty?: string; max?: number }) {
  return (
    <section aria-label="Помічник" className="relative overflow-hidden rounded-[24px] p-5 flex flex-col gap-3" style={{ background: "var(--assist-a)", color: "var(--assist-fg)" }}>
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 font-extrabold text-[15px]"><span className="w-7 h-7 rounded-[9px] inline-flex items-center justify-center" style={{ background: "linear-gradient(135deg,var(--lime),var(--lime-2))", color: "#111113" }}><I.Spark /></span>{title}</div>
        <div className="text-xs opacity-70 font-semibold">{items.length ? `${items.length} ${plural(items.length, "зауваження", "зауваження", "зауважень")}` : "усе спокійно"}</div>
      </div>
      {items.length === 0 ? <div className="text-sm opacity-80">{empty}</div> : (
        <div className="flex flex-col gap-2">
          {items.slice(0, max).map((i) => (
            <div key={i.key} className="flex gap-3 items-start px-3.5 py-3 rounded-2xl" style={{ background: "rgba(127,127,127,.14)" }}>
              <div className="w-[34px] h-[34px] shrink-0 rounded-[11px] flex items-center justify-center" style={{ background: i.sev === "high" ? "linear-gradient(135deg,var(--lime),var(--lime-2))" : "rgba(127,127,127,.22)", color: i.sev === "high" ? "#111113" : "inherit" }}>{ICON[i.kind]}</div>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="text-[11px] font-bold tracking-wide uppercase opacity-70">{i.tag}</div>
                <div className="text-sm font-medium leading-snug">{i.text}</div>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {i.action?.href && <Link href={i.action.href} className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: "var(--assist-fg)", color: "var(--assist-a)" }}>{i.action.label}</Link>}
                  {i.action?.taxKey && <form action={markTaxPaid.bind(null, i.action.taxKey)}><button className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: "var(--assist-fg)", color: "var(--assist-a)" }}>{i.action.label}</button></form>}
                  <form action={dismissInsight.bind(null, i.key)}><button className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: "rgba(127,127,127,.22)", color: "inherit" }}>Приховати на тиждень</button></form>
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
    <div className="flex gap-2.5 items-start px-3.5 py-3 rounded-2xl text-fg" style={{ background: "var(--glass)" }}>
      <span className="w-[26px] h-[26px] shrink-0 rounded-lg flex items-center justify-center" style={{ background: "var(--assist-a)", color: "var(--assist-fg)" }}><I.Spark /></span>
      <div className="text-[13px] leading-snug font-medium">{children}</div>
    </div>
  );
}
