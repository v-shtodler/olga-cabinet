"use client";
import { useRef, useState, useTransition } from "react";
import { saveAvatar } from "@/app/actions";
import { Group } from "@/components/ui";
import { callOrQueue } from "@/lib/outbox";
import { toSquareDataUrl } from "@/lib/image";

export function AvatarCard({ src, name }: { src: string | null; name: string }) {
  const [preview, setPreview] = useState(src);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "OV";

  function pick(file: File | undefined) {
    if (!file) return;
    setErr(null);
    start(async () => {
      try {
        const url = await toSquareDataUrl(file);
        setPreview(url);
        await callOrQueue("saveAvatar", [url], undefined, "Фото профілю", () => saveAvatar(url));
      } catch (e) { setErr(e instanceof Error ? e.message : "Не вдалося завантажити фото."); setPreview(src); }
    });
  }
  function remove() {
    setErr(null); setPreview(null);
    start(async () => { try { await callOrQueue("saveAvatar", [null], undefined, "Прибрати фото", () => saveAvatar(null)); } catch (e) { setErr(e instanceof Error ? e.message : "Не вдалося."); } });
  }

  return (
    <Group title="Фото профілю" footer="Показується в меню кабінету. Зберігається зменшеним до 192 px — зайвої ваги не додає.">
      <div className="flex items-center gap-4">
        <span className="w-16 h-16 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-[18px] font-bold text-white" style={preview ? undefined : { background: "linear-gradient(135deg,#0a84ff,#5e5ce6)" }}>
          {preview
            // a data: URL from this same browser; next/image would only add a loader around it
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={preview} alt="" width={64} height={64} className="w-full h-full object-cover" />
            : initials}
        </span>
        <div className="flex gap-2 flex-wrap">
          <input ref={input} type="file" accept="image/*" className="sr-only" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
          <button type="button" className="btn btn-primary" disabled={pending} onClick={() => input.current?.click()}>{pending ? "Обробляю…" : preview ? "Замінити" : "Вибрати фото"}</button>
          {preview && <button type="button" className="btn btn-ghost" disabled={pending} style={{ color: "var(--danger)" }} onClick={remove}>Прибрати</button>}
        </div>
      </div>
      {err && <p className="text-[13px] mt-3" style={{ color: "var(--warn)" }}>{err}</p>}
    </Group>
  );
}
