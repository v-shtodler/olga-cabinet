import Link from "next/link";
import clsx from "clsx";
import { type Tone, type ShootView, brandColor, STATUS_TONE, STATUS_UA, money, relDays, daysBetween, todayISO, fmtShort } from "@/lib/domain";
import { parseISO, format } from "date-fns";
import * as I from "./icons";
import { uk } from "date-fns/locale";

export const TONE_BG: Record<Tone, string> = { good: "var(--good-bg)", warn: "var(--warn-bg)", info: "var(--info-bg)", purple: "var(--purple-bg)", sun: "var(--sun-bg)", pink: "var(--pink-bg)", neutral: "var(--glass-2)", dark: "var(--fg)" };
export const TONE_FG: Record<Tone, string> = { good: "var(--good)", warn: "var(--warn)", info: "var(--info)", purple: "var(--purple)", sun: "var(--sun)", pink: "var(--pink)", neutral: "var(--muted)", dark: "var(--bg)" };
export const GRADS = ["#ff9500", "#af52de", "#007aff", "#34c759", "#ff2d55", "#ffcc00", "#5ac8fa", "#5856d6"];

export function Chip({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return <span className={clsx("chip", className)} style={{ background: TONE_BG[tone], color: TONE_FG[tone] }}>{children}</span>;
}
export function Avatar({ name, hue, size = 38 }: { name: string; hue: number; size?: number }) {
  const ini = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return <span aria-hidden="true" className="inline-flex items-center justify-center text-white font-bold shrink-0" style={{ width: size, height: size, borderRadius: Math.round(size * 0.32), background: GRADS[hue % GRADS.length], fontSize: Math.round(size * 0.3) }}>{ini}</span>;
}
export function DateBox({ date, tone, accent }: { date: string; tone: Tone; accent?: string }) {
  const d = parseISO(date);
  return (
    <div className="w-12 h-12 shrink-0 rounded-[12px] flex flex-col items-center justify-center leading-none" style={accent ? { background: `color-mix(in srgb, ${accent} 16%, transparent)`, color: accent } : { background: TONE_BG[tone], color: TONE_FG[tone] }}>
      <div className="text-[17px] font-semibold tracking-[-0.01em]">{d.getDate()}</div>
      {/* three letters always fit the 48pt box: "лист." / "листоп" overflowed */}
      <div className="text-[10px] font-semibold uppercase mt-1 tracking-[0.02em]">{format(d, "LLL", { locale: uk }).replace(".", "").slice(0, 3)}</div>
    </div>
  );
}
export function ShootRow({ s, rel }: { s: ShootView; rel?: boolean }) {
  const today = todayISO(); const d = daysBetween(today, s.date);
  let end: React.ReactNode;
  if (s.status === "delivered" && s.balance > 0) end = <Chip tone="warn">очікую {money(s.balance)}</Chip>;
  else if (s.status === "shot" && s.deadline) { const dl = daysBetween(today, s.deadline); end = <Chip tone={dl < 0 ? "warn" : "sun"}>віддати {relDays(dl)}</Chip>; }
  else end = <Chip tone={STATUS_TONE[s.status]}>{STATUS_UA[s.status]}</Chip>;
  return (
    <Link href={`/shoots/${s.id}`} className="srow">
      <DateBox date={s.date} tone="neutral" accent={brandColor(s.client_hue)} />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="font-semibold truncate">{s.client_name}</div>
        <div className="text-[13px] text-muted truncate">{s.location ?? "—"}{s.start_time ? `, ${s.start_time.slice(0, 5)}` : ""}{rel && d >= 0 ? ` · ${relDays(d)}` : ""}</div>
      </div>
      <div className="flex flex-col items-end gap-1"><div className="font-semibold num">{money(s.price)}</div>{end}</div>
      <I.Right className="shrink-0" style={{ color: "var(--muted-2)" }} />
    </Link>
  );
}
export function Kpi({ label, value, sub, subTone, dot, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; subTone?: Tone; dot?: string; className?: string }) {
  return (
    <div className={clsx("card flex flex-col gap-1.5", className)}>
      <div className="text-[13px] text-muted font-medium flex justify-between items-center">{label}{dot && <span className="w-2 h-2 rounded-full" style={{ background: dot }} />}</div>
      <div className="text-[26px] font-bold tracking-[-0.01em] num leading-tight">{value}</div>
      {sub && <div className="text-xs font-semibold" style={{ color: subTone ? TONE_FG[subTone] : "var(--muted)" }}>{sub}</div>}
    </div>
  );
}
/** Inset grouped section: a quiet uppercase header above the card and an optional footnote under it (Settings.app). */
export function Group({ title, note, footer, children, className }: { title?: string; note?: React.ReactNode; footer?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={clsx("min-w-0", className)}>
      {(title || note) && (
        <div className="flex items-baseline justify-between gap-3 px-1 mb-2">
          {title && <h2 className="text-[13px] font-semibold uppercase tracking-[0.05em]" style={{ color: "var(--muted)" }}>{title}</h2>}
          {note && <span className="text-[13px]" style={{ color: "var(--muted)" }}>{note}</span>}
        </div>
      )}
      <div className="card">{children}</div>
      {footer && <p className="text-[13px] px-1 mt-2" style={{ color: "var(--muted)" }}>{footer}</p>}
    </section>
  );
}
export function PageHead({ eyebrow, title, sub, actions }: { eyebrow?: string; title: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-end gap-4 flex-wrap mb-4 px-1">
      <div>
        {eyebrow && <div className="text-[13px] text-muted font-medium mb-1">{eyebrow}</div>}
        <h1 className="text-[34px] md:text-[32px] font-bold leading-[1.1] tracking-[-0.01em]">{title}</h1>
        {sub && <p className="text-muted mt-1.5">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
export function Bar({ pct, color }: { pct: number; color?: string }) {
  return <div className="bar"><i style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color ?? "var(--accent)" }} /></div>;
}
export { fmtShort };
