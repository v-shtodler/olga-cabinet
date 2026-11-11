"use client";
import { useEffect, useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

/* Client cache + silent refresh ("stale-while-revalidate" for the whole app):
   Next keeps visited screens in the client router cache (experimental.staleTimes), so a tap shows the
   last-seen version instantly. This component then re-fetches the current screen in a transition —
   the UI stays as is, no skeleton, and the fresh data is swapped in when it arrives.
   Triggers: revisiting a cached screen, returning to the tab, coming back online, every 90s while visible. */
const seen = new Set<string>();
const MIN_GAP_MS = 4000;

export function Refresher() {
  const path = usePathname();
  const router = useRouter();
  const [, start] = useTransition();
  const last = useRef(0);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - last.current < MIN_GAP_MS) return;
      last.current = now;
      start(() => router.refresh());
    };
    if (seen.has(path)) refresh(); else seen.add(path);
    const onVis = () => { if (document.visibilityState === "visible") refresh(); };
    const tick = setInterval(refresh, 90_000);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    return () => { clearInterval(tick); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); };
  }, [path, router]);

  return null;
}
