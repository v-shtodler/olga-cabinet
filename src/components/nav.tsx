"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import clsx from "clsx";
import * as I from "./icons";
import { cleanupForSignOut } from "@/lib/outbox";

/* Navigation in the Apple idiom: a source-list sidebar on Mac/desktop, a translucent top bar + tab bar on iPhone. */
const ITEMS: { href: string; label: string; icon: React.ReactNode }[] = [
  { href: "/", label: "Огляд", icon: <I.Home size={20} /> },
  { href: "/calendar", label: "Календар", icon: <I.Cal size={20} /> },
  { href: "/shoots", label: "Зйомки", icon: <I.Camera size={20} /> },
  { href: "/clients", label: "Замовники", icon: <I.Users size={20} /> },
  { href: "/analytics", label: "Аналітика", icon: <I.Chart size={20} /> },
  { href: "/taxes", label: "Податки", icon: <I.Tax size={20} /> },
];
const active = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

/** App mark: the owner's photo when set, otherwise the blue/indigo monogram. */
export function Mark({ src, size = 28, radius = 8 }: { src?: string | null; size?: number; radius?: number }) {
  const style = { width: size, height: size, borderRadius: radius } as React.CSSProperties;
  if (src) {
    // a data: URL stored in the owner's own settings row; next/image adds nothing here
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" style={{ ...style, objectFit: "cover" }} className="shrink-0" />;
  }
  return <span style={{ ...style, background: "linear-gradient(135deg,#0a84ff,#5e5ce6)" }} className="inline-flex items-center justify-center text-[11px] font-bold text-white shrink-0">OV</span>;
}

async function onSignOut(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); const f = e.currentTarget; await cleanupForSignOut(); f.submit(); }

export function Sidebar({ avatar }: { avatar?: string | null }) {
  const path = usePathname();
  return (
    <aside className="hidden md:flex flex-col w-[232px] shrink-0 sticky top-0 h-dvh px-3 py-4 gap-1" style={{ background: "var(--sidebar)", borderRight: "0.5px solid var(--hair)" }}>
      <Link href="/" className="flex items-center gap-2.5 px-2 py-1.5 mb-3">
        <Mark src={avatar} size={28} radius={avatar ? 14 : 8} />
        <span className="font-semibold text-[15px]">Кабінет</span>
      </Link>
      <nav aria-label="Головна навігація" className="flex flex-col gap-0.5">
        {ITEMS.map((it) => (
          <Link key={it.href} href={it.href} prefetch={true} className={clsx("flex items-center gap-2.5 px-2.5 h-[34px] rounded-[8px] text-[14px] font-medium transition-colors", active(path, it.href) ? "text-accent" : "hover:bg-fill-3")} style={active(path, it.href) ? { background: "var(--accent-tint)" } : undefined}>
            <span className={active(path, it.href) ? "text-accent" : "text-muted"}>{it.icon}</span>{it.label}
          </Link>
        ))}
      </nav>
      <Link href="/shoots/new" prefetch={true} className="btn btn-primary mt-4">+ Нова зйомка</Link>
      <div className="mt-auto flex flex-col gap-0.5">
        <Link href="/settings" className={clsx("flex items-center gap-2.5 px-2.5 h-[34px] rounded-[8px] text-[14px] font-medium transition-colors", active(path, "/settings") ? "text-accent" : "hover:bg-fill-3")} style={active(path, "/settings") ? { background: "var(--accent-tint)" } : undefined}><span className={active(path, "/settings") ? "text-accent" : "text-muted"}><I.Gear size={20} /></span>Налаштування</Link>
        <form action="/auth/signout" method="post" onSubmit={onSignOut}><button className="w-full flex items-center gap-2.5 px-2.5 h-[34px] rounded-[8px] text-[14px] font-medium text-muted hover:bg-fill-3 transition-colors"><I.Out size={20} />Вийти</button></form>
      </div>
    </aside>
  );
}

/* The mobile bar reads two things from the DOM: the page title and whether the large title scrolled away.
   That is external state, so it goes through a store instead of setState-in-effect. */
type Snap = { title: string; compact: boolean };
const EMPTY: Snap = { title: "", compact: false };
let snap: Snap = EMPTY;
const listeners = new Set<() => void>();
function readBar() {
  const h1 = document.querySelector("main h1");
  const title = h1?.textContent?.trim() ?? "";
  const compact = !h1 || h1.getBoundingClientRect().bottom < 52;
  if (title !== snap.title || compact !== snap.compact) { snap = { title, compact }; listeners.forEach((l) => l()); }
}
function subscribeBar(cb: () => void) {
  listeners.add(cb);
  let frame = 0;
  const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; readBar(); }); };
  if (listeners.size === 1) {
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    cleanup = () => { window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); mo.disconnect(); };
  }
  schedule();
  return () => { listeners.delete(cb); if (listeners.size === 0) { cleanup?.(); cleanup = null; } };
}
let cleanup: (() => void) | null = null;
const getBar = () => snap;
const getBarServer = () => EMPTY;

/** iPhone top bar: translucent, shows the page title once the large title scrolls away; "+" on the right. */
export function MobileBar({ avatar }: { avatar?: string | null }) {
  const { title, compact } = useSyncExternalStore(subscribeBar, getBar, getBarServer);
  return (
    <header className="md:hidden sticky top-0 z-20 bar-material" style={{ paddingTop: "env(safe-area-inset-top, 0px)", borderBottom: `0.5px solid ${compact ? "var(--hair)" : "transparent"}` }}>
      <div className="h-[48px] grid grid-cols-[1fr_auto_1fr] items-center px-2">
        <div className="justify-self-start"><Link href="/" className="w-9 h-9 inline-flex items-center justify-center rounded-full"><Mark src={avatar} size={28} radius={avatar ? 14 : 8} /></Link></div>
        <div className={clsx("text-[17px] font-semibold truncate max-w-[56vw] transition-opacity duration-200", compact ? "opacity-100" : "opacity-0")}>{title}</div>
        <div className="justify-self-end flex items-center gap-1">
          <Link href="/settings" className="w-9 h-9 inline-flex items-center justify-center rounded-full text-accent" aria-label="Налаштування"><I.Gear size={20} /></Link>
          <Link href="/shoots/new" prefetch={true} className="w-9 h-9 inline-flex items-center justify-center rounded-full text-accent" aria-label="Нова зйомка"><I.Plus size={24} /></Link>
        </div>
      </div>
    </header>
  );
}

/** iPhone tab bar with a "Ще" sheet for the secondary sections. */
export function TabBar() {
  const path = usePathname();
  const [more, setMore] = useState(false);
  const [seen, setSeen] = useState(path);
  if (seen !== path) { setSeen(path); setMore(false); } // close the sheet on navigation (React's "adjust state during render")
  const tabs = ITEMS.slice(0, 4);
  const moreActive = ["/analytics", "/taxes", "/settings"].some((h) => path.startsWith(h));
  return (
    <>
      {more && <button type="button" aria-label="Закрити" className="md:hidden fixed inset-0 z-30" style={{ background: "rgba(0,0,0,0.3)" }} onClick={() => setMore(false)} />}
      {more && (
        <div role="dialog" aria-label="Ще" className="md:hidden fixed left-0 right-0 z-40 rounded-t-[20px] px-4 pt-2 pb-3" style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px))", background: "var(--glass)" }}>
          <div className="w-9 h-[5px] rounded-full mx-auto mb-3" style={{ background: "var(--fill)" }} />
          <div className="list">
            {ITEMS.slice(4).concat({ href: "/settings", label: "Налаштування", icon: <I.Gear size={20} /> }).map((it) => (
              <Link key={it.href} href={it.href} prefetch={true} className="flex items-center gap-3 px-3.5 h-[48px] text-[17px]"><span className="text-accent">{it.icon}</span><span className="flex-1">{it.label}</span><I.Right className="text-muted-2" /></Link>
            ))}
            <form action="/auth/signout" method="post" onSubmit={onSignOut}><button className="w-full flex items-center gap-3 px-3.5 h-[48px] text-[17px]" style={{ color: "var(--danger)" }}><I.Out size={20} />Вийти</button></form>
          </div>
        </div>
      )}
      <nav aria-label="Нижня навігація" className="md:hidden fixed left-0 right-0 bottom-0 z-40 bar-material" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", borderTop: "0.5px solid var(--hair)" }}>
        <div className="h-[56px] grid grid-cols-5">
          {tabs.map((it) => (
            <Link key={it.href} href={it.href} prefetch={true} className={clsx("flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium", active(path, it.href) && !more ? "text-accent" : "text-muted")}>{it.icon}<span>{it.label}</span></Link>
          ))}
          <button type="button" aria-expanded={more} className={clsx("flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium", more || moreActive ? "text-accent" : "text-muted")} onClick={() => setMore((v) => !v)}><I.More size={20} /><span>Ще</span></button>
        </div>
      </nav>
    </>
  );
}
