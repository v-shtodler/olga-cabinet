"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import * as I from "./icons";
import { cleanupForSignOut } from "@/lib/outbox";

async function onSignOut(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault(); const form = e.currentTarget;
  await cleanupForSignOut();
  form.submit();
}

const ITEMS = [["/", "Огляд"], ["/calendar", "Календар"], ["/shoots", "Зйомки"], ["/clients", "Замовники"], ["/analytics", "Аналітика"], ["/taxes", "Податки"]] as const;

function active(path: string, href: string) { return href === "/" ? path === "/" : path.startsWith(href); }

export function TopNav() {
  const path = usePathname();
  return (
    <header className="glass sticky z-20 flex items-center justify-between gap-4 rounded-full py-2 pr-2 pl-[18px] mb-6" style={{ top: "env(safe-area-inset-top, 0px)" }}>
      <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight whitespace-nowrap">
        <span className="w-[26px] h-[26px] rounded-lg shrink-0" style={{ background: "linear-gradient(135deg,#ff7a59,#ffb36b)", boxShadow: "0 4px 12px rgba(255,122,89,.4)" }} />
        <span className="hidden md:inline">Olga Voychik</span><span className="md:hidden">OV</span>
        <span className="text-muted font-medium">/ Кабінет</span>
      </Link>
      <nav aria-label="Головна навігація" className="hidden md:flex gap-0.5">
        {ITEMS.map(([href, label]) => (
          <Link key={href} href={href} prefetch={true} className={clsx("px-3.5 py-2 rounded-full font-medium whitespace-nowrap", active(path, href) ? "bg-glass-2 text-fg font-semibold shadow-[0_2px_8px_rgba(60,80,140,.12)]" : "text-muted")}>{label}</Link>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <Link href="/shoots/new" prefetch={true} className="btn btn-primary hidden md:inline-flex">+ Нова зйомка</Link>
        <Link href="/settings" className="icon-btn" aria-label="Налаштування"><I.Gear /></Link>
        <form action="/auth/signout" method="post" onSubmit={onSignOut}><button className="w-[34px] h-[34px] rounded-full text-white text-[11px] font-bold" style={{ background: "linear-gradient(135deg,#8b5cf6,#ec6aa3)" }} title="Вийти" aria-label="Вийти">OV</button></form>
      </div>
    </header>
  );
}

function Item({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  const path = usePathname();
  return <Link href={href} prefetch={true} aria-label={label} className={clsx("w-12 h-12 rounded-full flex items-center justify-center", active(path, href) ? "bg-fg text-bg" : "text-muted")}>{children}</Link>;
}

export function BottomNav() {
  return (
    <div className="md:hidden fixed left-0 right-0 bottom-0 z-30 flex justify-center pointer-events-none" style={{ padding: "0 max(12px, env(safe-area-inset-left)) calc(12px + env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-right))" }}>
      <nav aria-label="Нижня навігація" className="glass pointer-events-auto flex justify-around items-center w-full max-w-[440px] px-1.5 py-2 rounded-full" style={{ background: "var(--glass-2)", boxShadow: "var(--shadow-2)" }}>
        <Item href="/" label="Огляд"><I.Home /></Item>
        <Item href="/calendar" label="Календар"><I.Cal /></Item>
        <Link href="/shoots/new" prefetch={true} aria-label="Нова зйомка" className="w-14 h-14 rounded-full flex items-center justify-center text-white" style={{ background: "linear-gradient(135deg,var(--accent),var(--accent-2))", boxShadow: "0 8px 20px rgba(29,111,242,.4)" }}><I.Plus /></Link>
        <Item href="/clients" label="Замовники"><I.Users /></Item>
        <Item href="/analytics" label="Аналітика"><I.Chart /></Item>
      </nav>
    </div>
  );
}
