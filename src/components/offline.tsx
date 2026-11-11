"use client";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enqueue, flush, list, emptyList, onChange, remove, toast, OP_LABEL } from "@/lib/outbox";

function subOnline(cb: () => void) { window.addEventListener("online", cb); window.addEventListener("offline", cb); return () => { window.removeEventListener("online", cb); window.removeEventListener("offline", cb); }; }

/* Offline layer for the whole app:
   1. registers the service worker (offline viewing of last-seen screens);
   2. intercepts <form data-op=…> submits while offline and stores them in the outbox instead;
   3. shows the offline band, the "waiting to send" list and small toasts;
   4. replays the outbox when the connection returns (and on load / tab focus). */
export function OfflineLayer() {
  const router = useRouter();
  const online = useSyncExternalStore(subOnline, () => navigator.onLine, () => true);
  const jobs = useSyncExternalStore(onChange, list, emptyList);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [, start] = useTransition();

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js").catch(() => {});

    const sync = async () => {
      if (!navigator.onLine || list().length === 0) return;
      const r = await flush();
      if (r.sent) { toast(`Відправлено ${r.sent} ${r.sent === 1 ? "зміну" : r.sent < 5 ? "зміни" : "змін"}`); start(() => router.refresh()); }
      if (r.failed) toast("Частину змін не вдалося застосувати — дивіться список");
    };
    const onOnline = () => { sync(); };
    const onVis = () => { if (document.visibilityState === "visible") sync(); };
    const onToast = (e: Event) => { setMsg((e as CustomEvent<string>).detail); };
    const onSubmit = (e: Event) => {
      if (navigator.onLine) return;
      const form = e.target as HTMLFormElement;
      if (!(form instanceof HTMLFormElement)) return;
      e.preventDefault(); e.stopImmediatePropagation();
      const op = form.dataset.op;
      if (!op) { toast("Ця дія недоступна без інтернету"); return; }
      const args = JSON.parse(form.dataset.args ?? "[]") as unknown[];
      const fd = new FormData(form);
      const detail = form.dataset.label ?? (fd.get("text") ?? fd.get("title") ?? fd.get("name") ?? (fd.get("amount") ? `${fd.get("amount")} ₴` : ""));
      enqueue(op, args, fd, [OP_LABEL[op] ?? op, String(detail || "")].filter(Boolean).join(": "));
      form.reset();
      toast("Збережено офлайн — відправлю, щойно з’явиться інтернет");
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVis); window.addEventListener("toast", onToast);
    document.addEventListener("submit", onSubmit, true);
    sync();
    return () => { window.removeEventListener("online", onOnline); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("toast", onToast); document.removeEventListener("submit", onSubmit, true); };
  }, [router]);

  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 3500); return () => clearTimeout(t); }, [msg]);

  const n = jobs.length;
  return (
    <>
      {(!online || n > 0) && (
        <div className="rounded-2xl px-4 py-2.5 mb-4 text-[13px] font-medium flex flex-col gap-2" style={{ background: online ? "var(--info-bg)" : "var(--warn-bg)", color: online ? "var(--info)" : "var(--warn)" }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span>{!online ? "Офлайн · зміни збережуться в чергу й відправляться самі" : `${n} ${n === 1 ? "зміна очікує" : n < 5 ? "зміни очікують" : "змін очікують"} відправки`}{online && n === 0 ? "" : ""}</span>
            <span className="flex gap-2">
              {n > 0 && <button type="button" className="btn btn-sm" onClick={() => setOpen((v) => !v)}>{open ? "Сховати" : "Показати"}{n > 0 && !online ? ` (${n})` : ""}</button>}
              {n > 0 && online && <button type="button" className="btn btn-sm btn-primary" onClick={() => flush().then((r) => { if (r.sent) start(() => router.refresh()); })}>Відправити зараз</button>}
            </span>
          </div>
          {open && n > 0 && (
            <ul className="flex flex-col gap-1.5 m-0 p-0 list-none">
              {jobs.map((j) => (
                <li key={j.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-fg" style={{ background: "var(--glass)" }}>
                  <span className="min-w-0"><span className="font-semibold">{j.label}</span><span className="text-muted"> · {new Date(j.at).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}</span>{j.error && <span className="block text-xs" style={{ color: "var(--warn)" }}>Не застосовано: {j.error}</span>}</span>
                  <button type="button" className="text-muted text-xs shrink-0" aria-label="Видалити з черги" onClick={() => remove(j.id)}>×</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {msg && <div role="status" className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-6 z-40 px-4 py-2.5 rounded-full text-[13px] font-semibold shadow-glass-2" style={{ background: "var(--fg)", color: "var(--bg)" }}>{msg}</div>}
    </>
  );
}
