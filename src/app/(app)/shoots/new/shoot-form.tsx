"use client";
import { useState, useTransition } from "react";
import { addDays, format } from "date-fns";
import type { Client, Preset, Shoot, ShootType } from "@/lib/domain";
import { createShoot } from "@/app/actions";

export function ShootForm({ clients, presets, initial }: { clients: Client[]; presets: Preset[]; initial: { date?: string; clientId?: string; source?: Shoot | null } }) {
  const src = initial.source;
  const firstClient = clients.find((c) => c.id === (src?.client_id ?? initial.clientId)) ?? clients[0];
  const [clientId, setClientId] = useState(firstClient.id);
  const [type, setType] = useState<ShootType>(src?.type ?? (firstClient.default_types[0] as ShootType) ?? "product");
  const preset = presets.find((p) => p.type === type) ?? presets[0];
  const [title, setTitle] = useState(src?.title ?? preset.label);
  const [price, setPrice] = useState(String(src?.price ?? preset.price));
  const [photos, setPhotos] = useState(String(src?.photos ?? preset.photos));
  const [extra, setExtra] = useState(String(src?.extra_photos ?? preset.extra_photos));
  const [dd, setDd] = useState(String(src?.delivery_days ?? preset.delivery_days));
  const [sh, setSh] = useState(String(src?.shoot_hours ?? preset.shoot_hours));
  const [rh, setRh] = useState(String(src?.retouch_hours ?? preset.retouch_hours));
  const [deposit, setDeposit] = useState(String(src?.deposit_pct ?? firstClient.default_deposit_pct));
  const [start, setStart] = useState(src?.start_time?.slice(0, 5) ?? "10:00");
  const [end, setEnd] = useState(src?.end_time?.slice(0, 5) ?? "15:00");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function applyType(t: ShootType) {
    const p = presets.find((x) => x.type === t); if (!p) return;
    setType(t);
    if (!title || presets.some((x) => x.label === title)) setTitle(p.label);
    setPrice(String(p.price)); setPhotos(String(p.photos)); setExtra(String(p.extra_photos)); setDd(String(p.delivery_days)); setSh(String(p.shoot_hours)); setRh(String(p.retouch_hours));
    const h = parseInt(start.slice(0, 2), 10); setEnd(`${String(Math.min(23, h + Math.round(Number(p.shoot_hours)))).padStart(2, "0")}:00`);
  }
  function applyClient(id: string) { setClientId(id); const c = clients.find((x) => x.id === id); if (c) { setDeposit(String(c.default_deposit_pct)); if (c.default_types[0] && !src) applyType(c.default_types[0] as ShootType); } }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => { try { await createShoot(fd); } catch (x) { setErr(x instanceof Error ? x.message : "Не вдалося зберегти"); } });
  }

  const TYPE_LABEL: Record<ShootType, string> = Object.fromEntries(presets.map((p) => [p.type, p.label])) as Record<ShootType, string>;
  const effHours = Number(sh) + Number(rh) + 1; const rate = effHours > 0 ? Math.round(Number(price) / effHours) : 0;

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="field flex flex-col gap-1.5"><label htmlFor="client_id">Замовник</label><select id="client_id" name="client_id" value={clientId} onChange={(e) => applyClient(e.target.value)}>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      <div className="field flex flex-col gap-1.5"><label htmlFor="type">Тип зйомки</label><select id="type" name="type" value={type} onChange={(e) => applyType(e.target.value as ShootType)}>{presets.map((p) => <option key={p.type} value={p.type}>{p.label}</option>)}</select></div>
      <div className="field flex flex-col gap-1.5 sm:col-span-2"><label htmlFor="title">Назва</label><input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Напр.: Lookbook FW26" required maxLength={120} /></div>
      <div className="field flex flex-col gap-1.5"><label htmlFor="date">Дата</label><input id="date" name="date" type="date" defaultValue={initial.date ?? format(addDays(new Date(), 7), "yyyy-MM-dd")} required /></div>
      <div className="field flex flex-col gap-1.5"><label htmlFor="location">Локація</label><input id="location" name="location" defaultValue={src?.location ?? "Студія"} maxLength={200} /></div>
      <div className="field flex flex-col gap-1.5"><label htmlFor="start_time">Початок</label><input id="start_time" name="start_time" type="time" value={start} onChange={(e) => setStart(e.target.value)} /></div>
      <div className="field flex flex-col gap-1.5"><label htmlFor="end_time">Кінець</label><input id="end_time" name="end_time" type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
      <div className="field flex flex-col gap-1.5"><label htmlFor="price">Ціна, ₴</label><input id="price" name="price" type="number" step="500" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required /></div>
      <div className="field flex flex-col gap-1.5"><label htmlFor="deposit_pct">Передоплата, %</label><input id="deposit_pct" name="deposit_pct" type="number" min="0" max="100" step="10" value={deposit} onChange={(e) => setDeposit(e.target.value)} /></div>
      <div className="field flex flex-col gap-1.5"><label htmlFor="photos">Фото (ретуш)</label><input id="photos" name="photos" type="number" min="0" value={photos} onChange={(e) => setPhotos(e.target.value)} /></div>
      <div className="field flex flex-col gap-1.5"><label htmlFor="extra_photos">Кольорокорекція, шт</label><input id="extra_photos" name="extra_photos" type="number" min="0" value={extra} onChange={(e) => setExtra(e.target.value)} /></div>
      <div className="field flex flex-col gap-1.5"><label htmlFor="delivery_days">Віддача, днів після зйомки</label><input id="delivery_days" name="delivery_days" type="number" min="0" value={dd} onChange={(e) => setDd(e.target.value)} /></div>
      <div className="field flex flex-col gap-1.5"><label htmlFor="rights">Права на використання</label><input id="rights" name="rights" defaultValue={src?.rights ?? "Сайт, соцмережі, 2 роки"} maxLength={200} /></div>
      <div className="field flex flex-col gap-1.5"><label htmlFor="shoot_hours">Годин зйомки</label><input id="shoot_hours" name="shoot_hours" type="number" step="0.5" min="0" value={sh} onChange={(e) => setSh(e.target.value)} /></div>
      <div className="field flex flex-col gap-1.5"><label htmlFor="retouch_hours">Годин ретушу (оцінка)</label><input id="retouch_hours" name="retouch_hours" type="number" step="0.5" min="0" value={rh} onChange={(e) => setRh(e.target.value)} /></div>
      <div className="field flex flex-col gap-1.5 sm:col-span-2"><label htmlFor="note">Замітка</label><textarea id="note" name="note" placeholder="Вимоги, референси, команда…" maxLength={2000} /></div>
      <label className="sm:col-span-2 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-glass-2 border border-line cursor-pointer font-medium"><input type="checkbox" name="deposit_received" defaultChecked className="w-[18px] h-[18px]" style={{ accentColor: "var(--fg)" }} /> Передоплату вже отримано (статус «Підтверджено», платіж запишеться сьогоднішньою датою)</label>
      <div className="sm:col-span-2 flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs text-muted">Пресет «{TYPE_LABEL[type]}» · ≈ {effHours} год разом · {rate} ₴/год</span>
        <button className="btn btn-primary" type="submit" disabled={pending}>{pending ? "Зберігаю…" : "Створити зйомку"}</button>
      </div>
      {err && <p className="sm:col-span-2 text-warn text-[13px]">{err}</p>}
    </form>
  );
}
