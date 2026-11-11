import { getSettings, getPresets, getSession } from "@/lib/data";
import { PageHead, Chip } from "@/components/ui";
import { AssistantInline } from "@/components/assistant";
import { saveSettings, savePreset } from "@/app/actions";
import { TYPE_TONE } from "@/lib/domain";
import { cookies } from "next/headers";
import { ThemeToggle } from "./theme-toggle";
import { THEMES, type Theme } from "@/app/layout";

export const metadata = { title: "Налаштування" };

function F({ id, label, name, type = "text", value, step, min, max }: { id: string; label: string; name: string; type?: string; value: string | number; step?: string; min?: number; max?: number }) {
  return <div className="field flex flex-col gap-1.5"><label htmlFor={id}>{label}</label><input id={id} name={name} type={type} defaultValue={value} step={step} min={min} max={max} /></div>;
}

export default async function SettingsPage() {
  const [s, presets, { user }, jar] = await Promise.all([getSettings(), getPresets(), getSession(), cookies()]);
  const raw = jar.get("theme")?.value; const theme: Theme = THEMES.includes(raw as Theme) ? (raw as Theme) : "light";
  return (
    <>
      <PageHead eyebrow="Кабінет" title="Налаштування" />
      <div className="flex flex-wrap gap-3.5">
        <div className="flex-[999_1_560px] min-w-0 flex flex-col gap-3.5">
          <section className="card">
            <h2 className="text-lg font-bold mb-3">Профіль і податкові ставки</h2>
            <form action={saveSettings} data-op="saveSettings" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F id="display_name" label="Як до вас звертатись" name="display_name" value={s.display_name} />
              <F id="rates_from" label="Ставки діють з" name="rates_from" type="date" value={s.rates_from} />
              <F id="ep_rate" label="Єдиний податок, %" name="ep_rate" type="number" step="0.5" min={0} max={30} value={s.ep_rate} />
              <F id="vz_rate" label="Військовий збір, %" name="vz_rate" type="number" step="0.5" min={0} max={10} value={s.vz_rate} />
              <F id="esv_monthly" label="ЄСВ на місяць, ₴" name="esv_monthly" type="number" step="0.01" min={0} value={s.esv_monthly} />
              <F id="income_limit" label="Річний ліміт групи, ₴" name="income_limit" type="number" min={0} value={s.income_limit} />
              <F id="remind_days" label="Нагадувати про дедлайни за, днів" name="remind_days" type="number" min={1} max={14} value={s.remind_days} />
              <F id="month_capacity" label="Зйомок на місяць = 100% завантаженості" name="month_capacity" type="number" min={1} max={60} value={s.month_capacity} />
              <div className="sm:col-span-2 flex items-center justify-between gap-3 flex-wrap"><span className="text-xs text-muted">Ставки та мінімалка змінюються щороку — перевіряйте в січні.</span><button className="btn btn-primary">Зберегти</button></div>
            </form>
          </section>
          <section className="card">
            <div className="flex justify-between items-baseline mb-3 flex-wrap gap-2"><h2 className="text-lg font-bold">Пресети типів зйомок</h2><span className="text-xs text-muted">що підставляється в нову зйомку</span></div>
            <div className="flex flex-col gap-2">
              {presets.map((p) => (
                <form key={p.type} action={savePreset} data-op="savePreset" data-label={p.label} className="grid grid-cols-3 sm:grid-cols-7 gap-2 items-end p-3 rounded-2xl bg-glass-2 border border-line">
                  <input type="hidden" name="type" value={p.type} />
                  <div className="col-span-3 sm:col-span-1 flex items-center"><Chip tone={TYPE_TONE[p.type]}>{p.label}</Chip></div>
                  <div className="field flex flex-col gap-1"><label htmlFor={`${p.type}-price`} className="text-[11px]">Ціна</label><input id={`${p.type}-price`} name="price" type="number" step="500" defaultValue={p.price} className="!min-h-9 !py-1.5" /></div>
                  <div className="field flex flex-col gap-1"><label htmlFor={`${p.type}-photos`} className="text-[11px]">Фото</label><input id={`${p.type}-photos`} name="photos" type="number" defaultValue={p.photos} className="!min-h-9 !py-1.5" /></div>
                  <div className="field flex flex-col gap-1"><label htmlFor={`${p.type}-extra`} className="text-[11px]">+ кольорокор.</label><input id={`${p.type}-extra`} name="extra_photos" type="number" defaultValue={p.extra_photos} className="!min-h-9 !py-1.5" /></div>
                  <div className="field flex flex-col gap-1"><label htmlFor={`${p.type}-dd`} className="text-[11px]">Віддача, дн</label><input id={`${p.type}-dd`} name="delivery_days" type="number" defaultValue={p.delivery_days} className="!min-h-9 !py-1.5" /></div>
                  <div className="field flex flex-col gap-1"><label htmlFor={`${p.type}-sh`} className="text-[11px]">Зйомка, год</label><input id={`${p.type}-sh`} name="shoot_hours" type="number" step="0.5" defaultValue={p.shoot_hours} className="!min-h-9 !py-1.5" /></div>
                  <div className="flex gap-1 items-end"><div className="field flex flex-col gap-1 flex-1"><label htmlFor={`${p.type}-rh`} className="text-[11px]">Ретуш, год</label><input id={`${p.type}-rh`} name="retouch_hours" type="number" step="0.5" defaultValue={p.retouch_hours} className="!min-h-9 !py-1.5" /></div><button className="btn btn-sm" aria-label={`Зберегти пресет ${p.label}`}>✓</button></div>
                </form>
              ))}
            </div>
          </section>
        </div>
        <aside className="flex-[1_1_300px] min-w-0 flex flex-col gap-3.5">
          <section className="card"><h2 className="text-lg font-bold mb-2">Акаунт</h2><p className="text-[13px] text-muted mb-3">Ви увійшли як <b className="text-fg select-all">{user?.email}</b>. Реєстрація нових користувачів вимкнена — кабінет приватний.</p><form action="/auth/signout" method="post"><button className="btn">Вийти</button></form></section>
          <section className="card"><h2 className="text-lg font-bold mb-1">Тема</h2><p className="text-[13px] text-muted mb-3">Світла вдень, темна «нічна» — для очей увечері. Запам’ятовується на цьому пристрої; «Як у системі» перемикається разом із телефоном чи Mac.</p><ThemeToggle initial={theme} /></section>
          <AssistantInline>Щоб додати кабінет на екран телефону: у Safari «Поділитися → На Початковий екран». Він відкриватиметься як застосунок, без адресного рядка.</AssistantInline>
          <AssistantInline>Податки рахуються за датами <b>отримання</b> платежів, а не за датами зйомок. Якщо гроші прийшли в іншому кварталі — поправте дату платежу в картці зйомки.</AssistantInline>
        </aside>
      </div>
    </>
  );
}
