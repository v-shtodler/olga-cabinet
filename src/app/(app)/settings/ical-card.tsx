"use client";
import { useState, useTransition } from "react";
import { rotateIcalToken } from "@/app/actions";
import { Group } from "@/components/ui";

export function IcalCard({ token }: { token: string | null }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const host = typeof window !== "undefined" ? window.location.host : "app.olgavoychik.space";
  const https = token ? `https://${host}/api/ical/${token}` : null;
  const webcal = https ? https.replace(/^https:/, "webcal:") : null;
  const rotate = () => start(async () => { setErr(null); try { await rotateIcalToken(); } catch (e) { setErr(e instanceof Error ? e.message : "Не вдалося"); } });
  return (
    <Group title="Календар на телефоні" footer="Зйомки й дедлайни віддачі з’являться у Календарі iPhone / Google з нагадуванням за день. Оновлюється приблизно щогодини.">
      {https ? (
        <>
          <div className="kv items-center gap-2"><span className="text-muted">Посилання</span><span className="flex items-center gap-2 min-w-0"><code className="text-[11px] truncate max-w-[180px] sm:max-w-[260px]">{https}</code><button type="button" className="btn btn-sm" onClick={() => { navigator.clipboard?.writeText(https).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}>{copied ? "Скопійовано" : "Копіювати"}</button></span></div>
          <div className="flex gap-2 flex-wrap mt-3"><a href={webcal!} className="btn btn-primary">Підписатись (iPhone / Mac)</a><button type="button" className="btn btn-ghost" disabled={pending} onClick={rotate}>Нове посилання</button></div>
          <p className="text-[13px] text-muted mt-2.5">Google Calendar: «Інші календарі» → «З URL» → вставте посилання. Посилання секретне — хто його має, бачить ваші зйомки; «Нове посилання» робить старе недійсним.</p>
        </>
      ) : (
        <div className="flex gap-2 flex-wrap"><button type="button" className="btn btn-primary" disabled={pending} onClick={rotate}>{pending ? "…" : "Створити посилання"}</button></div>
      )}
      {err && <p className="text-[13px] mt-2" style={{ color: "var(--warn)" }}>{err}</p>}
    </Group>
  );
}
