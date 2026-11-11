/* Offline outbox (client only). Mutations made without a network are stored here and replayed
   through POST /api/sync as soon as the connection is back. Storage: localStorage (small JSON, no files). */

export type Job = { id: string; op: string; args: unknown[]; form?: [string, string][]; label: string; at: number; error?: string };

const KEY = "outbox.v1";
const EVT = "outbox:change";

export const OP_LABEL: Record<string, string> = {
  createShoot: "Нова зйомка", addPayment: "Платіж", addNote: "Замітка", addChecklistItem: "Пункт чек-листа", addDefaultChecklist: "Стандартний чек-лист",
  toggleChecklist: "Чек-лист", advanceShoot: "Наступний крок зйомки", cancelShoot: "Скасування зйомки", markInvoiceSent: "Рахунок виставлено",
  deletePayment: "Видалення платежу", updateShootField: "Зміна в зйомці", dismissInsight: "Приховати зауваження", markTaxPaid: "Податок сплачено",
  toggleBlockedDay: "Вихідний у календарі", createClient_: "Новий замовник", addClientPref: "Побажання замовника", deleteClientPref: "Видалення побажання",
  saveSettings: "Налаштування", savePreset: "Пресет",
};

export function isOnline() { return typeof navigator === "undefined" ? true : navigator.onLine; }
export function isNetworkError(e: unknown) { return e instanceof TypeError && /fetch|network|load failed/i.test(e.message); }

const EMPTY: Job[] = [];
let snap: { raw: string; jobs: Job[] } = { raw: "[]", jobs: EMPTY };
/** Stable snapshot: the same array is returned while the stored JSON is unchanged (safe for useSyncExternalStore). */
export function list(): Job[] {
  let raw = "[]";
  try { raw = localStorage.getItem(KEY) ?? "[]"; } catch { return EMPTY; }
  if (raw !== snap.raw) { try { snap = { raw, jobs: JSON.parse(raw) as Job[] }; } catch { snap = { raw, jobs: EMPTY }; } }
  return snap.jobs;
}
export function emptyList() { return EMPTY; }
function save(jobs: Job[]) {
  try { localStorage.setItem(KEY, JSON.stringify(jobs)); } catch { /* storage unavailable — nothing to do */ }
  window.dispatchEvent(new Event(EVT));
}
export function onChange(fn: () => void) { window.addEventListener(EVT, fn); return () => window.removeEventListener(EVT, fn); }

export function enqueue(op: string, args: unknown[], form?: FormData | [string, string][], label?: string): Job {
  const entries = form instanceof FormData ? ([...form.entries()].filter(([, v]) => typeof v === "string") as [string, string][]) : form;
  const job: Job = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, op, args, form: entries, label: label ?? OP_LABEL[op] ?? op, at: Date.now() };
  save([...list(), job]);
  return job;
}
export function remove(id: string) { save(list().filter((j) => j.id !== id)); }
export function clear() { save([]); }

let flushing = false;
/** Replays queued jobs in order. Stops at the first network failure or 401 (login needed); a 4xx leaves the job marked with its error and continues. */
export async function flush(): Promise<{ sent: number; failed: number; stopped: false | "network" | "auth" | "busy" }> {
  if (flushing || !isOnline()) return { sent: 0, failed: 0, stopped: "busy" };
  flushing = true;
  let sent = 0, failed = 0, stopped: false | "network" | "auth" = false;
  try {
    for (const job of list()) {
      let res: Response;
      try {
        res = await fetch("/api/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op: job.op, args: job.args, form: job.form }), credentials: "same-origin" });
      } catch { stopped = "network"; break; }
      if (res.status === 401) { stopped = "auth"; break; }
      const ct = res.headers.get("content-type") ?? "";
      if (res.ok && ct.includes("application/json")) {
        const j = await res.json().catch(() => null) as { ok?: boolean } | null;
        if (j?.ok === true) { remove(job.id); sent++; continue; }
      }
      if (!ct.includes("application/json")) { stopped = "network"; break; } // unexpected answer (e.g. a login page) — keep the job, try later
      const msg = (await res.json().catch(() => ({ error: res.statusText }))).error ?? "Помилка";
      save(list().map((j) => (j.id === job.id ? { ...j, error: String(msg) } : j)));
      failed++;
    }
  } finally { flushing = false; }
  return { sent, failed, stopped };
}

/** Run a server action now, or queue it when offline (also when the request itself fails on a dead connection). */
export async function callOrQueue<T>(op: string, args: unknown[], form: FormData | undefined, label: string | undefined, fn: () => Promise<T>): Promise<{ queued: boolean; result?: T }> {
  if (!isOnline()) { enqueue(op, args, form, label); toast("Збережено офлайн — відправлю, щойно з’явиться інтернет"); return { queued: true }; }
  try { return { queued: false, result: await fn() }; } catch (e) {
    if (isNetworkError(e)) { enqueue(op, args, form, label); toast("Немає зв’язку — зміну поставлено в чергу"); return { queued: true }; }
    throw e;
  }
}

/** Explicit sign-out: send what is pending, then drop the queue and every cached screen on this device. */
export async function cleanupForSignOut() {
  if (isOnline() && list().length) await flush();
  clear();
  await clearCaches();
}
export async function clearCaches() {
  try { if ("caches" in window) for (const k of await caches.keys()) await caches.delete(k); } catch { /* ignore */ }
}

export function toast(text: string) { window.dispatchEvent(new CustomEvent("toast", { detail: text })); }
