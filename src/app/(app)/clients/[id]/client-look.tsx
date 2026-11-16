"use client";
import { useRef, useState, useTransition } from "react";
import { saveClientLook } from "@/app/actions";
import { Avatar } from "@/components/ui";
import { BRAND } from "@/lib/domain";
import { toSquareDataUrl } from "@/lib/image";
import { callOrQueue } from "@/lib/outbox";

/* Колір і фото замовника. The colour is what the calendar paints this brand's days with;
   the photo (1:1) replaces the initials everywhere the client shows up. Both save at once. */
export function ClientLook({ id, name, hue, src }: { id: string; name: string; hue: number; src: string | null }) {
  const [h, setH] = useState(hue);
  const [photo, setPhoto] = useState(src);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  function save(patch: { avatar_hue?: number; avatar_url?: string | null }, label: string) {
    start(async () => {
      try { await callOrQueue("saveClientLook", [id, patch], undefined, `${label} · ${name}`, () => saveClientLook(id, patch)); }
      catch (e) { setErr(e instanceof Error ? e.message : "Не вдалося зберегти."); }
    });
  }
  function pickColor(i: number) { setErr(null); setH(i); save({ avatar_hue: i }, "Колір"); }
  function pickPhoto(file: File | undefined) {
    if (!file) return;
    setErr(null);
    start(async () => {
      try {
        const url = await toSquareDataUrl(file);
        setPhoto(url);
        await callOrQueue("saveClientLook", [id, { avatar_url: url }], undefined, `Фото · ${name}`, () => saveClientLook(id, { avatar_url: url }));
      } catch (e) { setErr(e instanceof Error ? e.message : "Не вдалося завантажити фото."); setPhoto(src); }
    });
  }
  function removePhoto() { setErr(null); setPhoto(null); save({ avatar_url: null }, "Прибрати фото"); }

  return (
    <section className="card">
      <h2 className="text-[17px] font-semibold mb-1">Колір і фото</h2>
      <p className="text-[13px] text-muted mb-3">Цим кольором у календарі підсвічуються дні цього бренду. Фото 1:1 замінює ініціали в списках і картках.</p>
      <div className="flex items-center gap-4 mb-3.5">
        <Avatar name={name} hue={h} src={photo} size={64} />
        <div className="flex gap-2 flex-wrap">
          <input ref={input} type="file" accept="image/*" className="sr-only" onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = ""; }} />
          <button type="button" className="btn btn-sm btn-primary" disabled={pending} onClick={() => input.current?.click()}>{pending ? "Обробляю…" : photo ? "Замінити фото" : "Вибрати фото"}</button>
          {photo && <button type="button" className="btn btn-sm btn-ghost" disabled={pending} style={{ color: "var(--danger)" }} onClick={removePhoto}>Прибрати</button>}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Колір бренду">
        {BRAND.map((c, i) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={h === i}
            aria-label={`Колір ${i + 1}`}
            onClick={() => pickColor(i)}
            className="w-8 h-8 rounded-full cursor-pointer border-0 transition-transform active:scale-95"
            style={{ background: c, boxShadow: h === i ? "0 0 0 2px var(--glass), 0 0 0 4px var(--fg)" : undefined }}
          />
        ))}
      </div>
      {err && <p className="text-[13px] mt-3" style={{ color: "var(--warn)" }}>{err}</p>}
    </section>
  );
}
