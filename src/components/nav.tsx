"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import * as I from "./icons";

const ITEMS = [["/", "Огляд"], ["/calendar", "Календар"], ["/shoots", "Зйомки"], ["/clients", "Замовники"], ["/analytics", "Аналітика"], ["/taxes", "Податки"]] as const;

function active(path: string, href: string) { return href === "/" ? path === "/" : path.startsWith(href); }

export function TopNav() {
  const path = usePathname();
  return (
    <header className="sticky z-20 flex items-center justify-between gap-4 rounded-full py-2 pr-2 pl-[18px] mb-6 bg-glass" style={{ top: "env(safe-area-inset-top, 0px)" }}>
      <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight whitespace-nowrap">
        <span className="w-[26px] h-[26px] rounded-lg shrink-0" style={{ background: "var(--accent)" }} />
        <span className="hidden md:inline">Olga Voychik</span><span className="md:hidden">OV</span>
        <span className="text-muted font-medium">/ Кабінет</span>
      </Link>
      <nav aria-label="Головна навігація" className="hidden md:flex gap-0.5">
        {ITEMS.map(([href, label]) => (
          <Link key={href} href={href} className={clsx("px-3.5 py-2 rounded-full font-medium whitespace-nowrap", active(path, href) ? "bg-accent text-accent-fg font-semibold" : "text-muted hover:bg-glass-2")}>{label}</Link>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <Link href="/shoots/new" className="btn btn-primary hidden md:inline-flex">+ Нова зйомка</Link>
        <Link href="/settings" className="icon-btn" aria-label="Налаштування"><I.Gear /></Link>
        <form action="/auth/signout" method="post"><button className="w-[34px] h-[34px] rounded-full text-[11px] font-bold" style={{ background: "linear-gradient(135deg,var(--lime),var(--lime-2))", color: "#111113" }} title="Вийти" aria-label="Вийти">OV</button></form>
      </div>
    </header>
  );
}

function Item({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  const path = usePathname();
  return <Link href={href} aria-label={label} className={clsx("w-12 h-12 rounded-full flex items-center justify-center", active(path, href) ? "bg-accent text-accent-fg" : "text-muted")}>{children}</Link>;
}

export function BottomNav() {
  return (
    <div className="md:hidden fixed left-0 right-0 bottom-0 z-30 flex justify-center pointer-events-none" style={{ padding: "0 max(12px, env(safe-area-inset-left)) calc(12px + env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-right))" }}>
      <nav aria-label="Нижня навігація" className="pointer-events-auto flex justify-around items-center w-full max-w-[440px] px-1.5 py-2 rounded-full bg-glass" style={{ boxShadow: "var(--shadow-2)" }}>
        <Item href="/" label="Огляд"><I.Home /></Item>
        <Item href="/calendar" label="Календар"><I.Cal /></Item>
        <Link href="/shoots/new" aria-label="Нова зйомка" className="w-14 h-14 rounded-full flex items-center justify-center text-accent-fg bg-accent" style={{ boxShadow: "var(--shadow-2)" }}><I.Plus /></Link>
        <Item href="/clients" label="Замовники"><I.Users /></Item>
        <Item href="/analytics" label="Аналітика"><I.Chart /></Item>
      </nav>
    </div>
  );
}
