/* Replays a queued offline mutation. The body names a Server Action from src/app/actions.ts; the same
   function runs here with the same arguments, so offline and online changes go through identical code. */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as A from "@/app/actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Op = (...a: any[]) => Promise<unknown>;
const OPS: Record<string, Op> = {
  dismissInsight: A.dismissInsight, markTaxPaid: A.markTaxPaid, toggleBlockedDay: A.toggleBlockedDay, createShoot: A.createShoot, updateShootField: A.updateShootField,
  advanceShoot: A.advanceShoot, cancelShoot: A.cancelShoot, markInvoiceSent: A.markInvoiceSent, addPayment: A.addPayment, deletePayment: A.deletePayment,
  addNote: A.addNote, addChecklistItem: A.addChecklistItem, addDefaultChecklist: A.addDefaultChecklist, toggleChecklist: A.toggleChecklist,
  createClient_: A.createClient_, addClientPref: A.addClientPref, deleteClientPref: A.deleteClientPref, saveSettings: A.saveSettings, savePreset: A.savePreset,
};

function isRedirect(e: unknown) { return typeof e === "object" && e !== null && String((e as { digest?: string }).digest ?? "").startsWith("NEXT_REDIRECT"); }

function sameOrigin(req: Request) {
  const sfs = req.headers.get("sec-fetch-site");
  if (sfs && sfs !== "same-origin" && sfs !== "none") return false;
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return false;
  return true;
}

export async function POST(req: Request) {
  if (!sameOrigin(req) || !(req.headers.get("content-type") ?? "").includes("application/json")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { op?: string; args?: unknown[]; form?: [string, string][] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const fn = body.op ? OPS[body.op] : undefined;
  if (!fn) return NextResponse.json({ error: "unknown op" }, { status: 400 });

  const args = Array.isArray(body.args) ? body.args : [];
  const call = [...args];
  if (Array.isArray(body.form)) { const fd = new FormData(); for (const [k, v] of body.form) fd.append(k, v); call.push(fd); }

  try { await fn(...call); } catch (e) {
    if (!isRedirect(e)) return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 422 });
  }
  return NextResponse.json({ ok: true });
}
