import Link from "next/link";
import clsx from "clsx";
import { type Tone, type ShootView, TYPE_TONE, STATUS_TONE, STATUS_UA, money, relDays, daysBetween, todayISO, fmtShort } from "@/lib/domain";
import { parseISO, format } from "date-fns";
import { uk } from "date-fns/locale";

export const TONE_BG: Record<Tone, string> = { good: "var(--good-bg)", warn: "var(--warn-bg)", info: "var(--info-bg)", purple: "var(--purple-bg)", sun: "var(--sun-bg)", pink: "var(--pink-bg)", neutral: "var(--glass-2)", dark: "var(--fg)" };
export const TONE_FG: Record<Tone, string> = { good: "var(--good)", warn: "var(--warn)", info: "var(--info)", purple: "var(--purple)", sun: "var(--sun)", pink: "var(--pink)", neutral: "var(--muted)", dark: "var(--bg)" };
export const GRADS = ["#ec4899", "#84cc16", "#f97316", "#111113", "#3b82f6", "#a855f7", "#14b8a6", "#ef4444"];

export function Chip({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return <span className={clsx("chip", className)} style={{ background: TONE_BG[tone], color: TONE_FG[tone] }}>{children}</span>;
}
export function Avatar({ name, hue, size = 38 }: { name: string; hue: number; size?: number }) {
  const ini = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return <span aria-hidden="true" className="inline-flex items-center justify-center text-white font-bold shrink-0" style={{ width: size, height: size, borderRadius: Math.round(size * 0.32), background: GRADS[hue % GRADS.length], fontSize: Math.round(size * 0.3) }}>{ini}</span>;
}
export function DateBox({ date, tone }: { date: string; tone: Tone }) {
  const d = parseISO(date);
  return (
    <div className="w-12 h-12 shrink-0 rounded-[14px] flex flex-col items-center justify-center leading-none font-extrabold" style={{ background: TONE_BG[tone], color: TONE_FG[tone] }}>
      <div className="text-lg tracking-tight">{d.getDate()}</div>
      <div className="text-[10px] font-bold uppercase mt-0.5">{format(d, "LLL", { locale: uk }).replace(".", "")}</div>
    </div>
  );
}
export function ShootRow({ s, rel }: { s: ShootView; rel?: boolean }) {
  const today = todayISO(); const d = daysBetween(today, s.date);
  let end: React.ReactNode;
  if (s.status === "delivered" && s.balance > 0) end = <Chip tone="warn">очікую {money(s.balance)}</Chip>;
  else if (s.status === "shot") { const dl = daysBetween(today, s.deadline); end = <Chip tone={dl < 0 ? "warn" : "sun"}>віддати {relDays(dl)}</Chip>; }
  else end = <Chip tone={STATUS_TONE[s.status]}>{STATUS_UA[s.status]}</Chip>;
  return (
    <Link href={`/shoots/${s.id}`} className="srow">
      <DateBox date={s.date} tone={TYPE_TONE[s.type]} />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="font-semibold truncate">{s.title} · {s.client_name}</div>
        <div className="text-xs text-muted truncate">{s.location ?? "—"}{s.start_time ? `, ${s.start_time.slice(0, 5)}–${s.end_time?.slice(0, 5) ?? ""}` : ""}{rel && d >= 0 ? ` · ${relDays(d)}` : ""}</div>
      </div>
      <div className="flex flex-col items-end gap-1"><div className="font-extrabold tracking-tight num">{money(s.price)}</div>{end}</div>
    </Link>
  );
}
export function Kpi({ label, value, sub, subTone, dot, className }: { label: string; value: React.ReactNode; sub?: React.ReactNode; subTone?: Tone; dot?: string; className?: string }) {
  return (
    <div className={clsx("card flex flex-col gap-1.5", className)}>
      <div className="text-xs text-muted font-semibold flex justify-between items-center">{label}{dot && <span className="w-2 h-2 rounded-full" style={{ background: dot }} />}</div>
      <div className="text-[clamp(20px,2.6vw,28px)] font-extrabold tracking-tight num">{value}</div>
      {sub && <div className="text-xs font-semibold" style={{ color: subTone ? TONE_FG[subTone] : "var(--muted)" }}>{sub}</div>}
    </div>
  );
}
export function PageHead({ eyebrow, title, sub, actions }: { eyebrow?: string; title: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-end gap-4 flex-wrap mb-4 px-1">
      <div>
        {eyebrow && <div className="text-[13px] text-muted font-medium mb-1.5">{eyebrow}</div>}
        <h1 className="text-[clamp(26px,4vw,38px)] font-extrabold leading-[1.08] tracking-tighter">{title}</h1>
        {sub && <p className="text-muted mt-1.5">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
export function Bar({ pct, color }: { pct: number; color?: string }) {
  return <div className="bar"><i style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color ?? "linear-gradient(90deg,var(--lime),var(--lime-2))" }} /></div>;
}
export { fmtShort };
