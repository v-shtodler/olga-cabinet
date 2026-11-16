"use client";
import { useRef, useState, useTransition } from "react";
import { saveAvatar } from "@/app/actions";
import { Group } from "@/components/ui";
import { callOrQueue } from "@/lib/outbox";

const SIZE = 192; // enough for a 2× 48pt avatar; keeps the row well under 30 KB

/** Reads a picked file, crops it to a square and re-encodes it small enough to live in one DB column. */
async function toSquareDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Браузер не дав обробити зображення.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  for (const [type, q] of [["image/webp", 0.82], ["image/jpeg", 0.82]] as const) {
    const url = canvas.toDataURL(type, q);
    if (url.startsWith(`data:${type}`) && url.length <= 170_000) return url;
  }
  throw new Error("Не вдалося стиснути фото — спробуйте інше.");
}

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
