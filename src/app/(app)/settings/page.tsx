import { getSettings, getSession } from "@/lib/data";
import { PageHead, Group } from "@/components/ui";
import { AssistantInline } from "@/components/assistant";
import { saveSettings } from "@/app/actions";
import { cookies } from "next/headers";
import { ThemeToggle } from "./theme-toggle";
import { BgPicker } from "./bg-picker";
import { IcalCard } from "./ical-card";
import { AvatarCard } from "./avatar-card";
import { THEMES, type Theme, readBg, readBgs } from "@/app/layout";

export const metadata = { title: "Налаштування" };

function F({ id, label, name, type = "text", value, step, min, max }: { id: string; label: string; name: string; type?: string; value: string | number; step?: string; min?: number; max?: number }) {
  return <div className="field flex flex-col gap-1.5"><label htmlFor={id}>{label}</label><input id={id} name={name} type={type} defaultValue={value} step={step} min={min} max={max} /></div>;
}

export default async function SettingsPage() {
  const [s, { user }, jar] = await Promise.all([getSettings(), getSession(), cookies()]);
  const raw = jar.get("theme")?.value; const theme: Theme = THEMES.includes(raw as Theme) ? (raw as Theme) : "light";
  const bg = readBg(jar.get("bg")?.value), bgs = readBgs(jar.get("bgs")?.value);
  return (
    <>
      <PageHead eyebrow="Кабінет" title="Налаштування" />
      <div className="flex flex-wrap gap-3.5">
        <div className="flex-[999_1_560px] min-w-0 flex flex-col gap-3.5">
          <Group title="Профіль і податкові ставки">
            <form action={saveSettings} data-op="saveSettings" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F id="display_name" label="Як до вас звертатись" name="display_name" value={s.display_name} />
              <F id="rates_from" label="Ставки діють з" name="rates_from" type="date" value={s.rates_from} />
              <F id="ep_rate" label="Єдиний податок, %" name="ep_rate" type="number" step="any" min={0} max={30} value={s.ep_rate} />
              <F id="vz_rate" label="Військовий збір, %" name="vz_rate" type="number" step="any" min={0} max={10} value={s.vz_rate} />
              <F id="esv_monthly" label="ЄСВ на місяць, ₴" name="esv_monthly" type="number" step="any" min={0} value={s.esv_monthly} />
              <F id="income_limit" label="Річний ліміт групи, ₴" name="income_limit" type="number" min={0} value={s.income_limit} />
              <F id="remind_days" label="Нагадувати про дедлайни за, днів" name="remind_days" type="number" min={1} max={14} value={s.remind_days} />
              <F id="month_capacity" label="Зйомок на місяць = 100% завантаженості" name="month_capacity" type="number" min={1} max={60} value={s.month_capacity} />
              <div className="sm:col-span-2 flex items-center justify-between gap-3 flex-wrap"><span className="text-[13px] text-muted">Ставки та мінімалка змінюються щороку — перевіряйте в січні.</span><button className="btn btn-primary">Зберегти</button></div>
            </form>
          </Group>
          <Group title="Реквізити для рахунків" note="друкуються на рахунку ФОП">
            <p className="text-[13px] text-muted mb-3">Порожні поля на рахунку не показуються. Рахунок відкривається з картки зйомки → «Рахунок».</p>
            <form action={saveSettings} data-op="saveSettings" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* the same action needs the base fields too — pass them along hidden so one form saves everything */}
              {(["display_name", "rates_from", "ep_rate", "vz_rate", "esv_monthly", "income_limit", "remind_days", "month_capacity"] as const).map((k) => <input key={k} type="hidden" name={k} value={String(s[k])} />)}
              <F id="fop_name" label="Назва ФОП (як у реєстрі)" name="fop_name" value={s.fop_name ?? ""} />
              <F id="ipn" label="РНОКПП (ІПН)" name="ipn" value={s.ipn ?? ""} />
              <F id="iban" label="IBAN" name="iban" value={s.iban ?? ""} />
              <F id="bank_name" label="Банк" name="bank_name" value={s.bank_name ?? ""} />
              <div className="sm:col-span-2"><F id="legal_address" label="Адреса" name="legal_address" value={s.legal_address ?? ""} /></div>
              <div className="sm:col-span-2"><F id="invoice_note" label="Примітка внизу рахунку" name="invoice_note" value={s.invoice_note ?? "Без ПДВ. Платник єдиного податку 3 групи."} /></div>
              <div className="sm:col-span-2 flex justify-end"><button className="btn btn-primary">Зберегти реквізити</button></div>
            </form>
          </Group>
        </div>
        <aside className="flex-[1_1_300px] min-w-0 flex flex-col gap-3.5">
          <Group title="Акаунт"><p className="text-[13px] text-muted mb-3">Ви увійшли як <b className="text-fg select-all">{user?.email}</b>. Реєстрація нових користувачів вимкнена — кабінет приватний.</p><div className="flex gap-2 flex-wrap"><a href="/api/export" className="btn" download>Резервна копія (JSON)</a><form action="/auth/signout" method="post"><button className="btn btn-ghost">Вийти</button></form></div><p className="text-[13px] text-muted mt-2.5">Копія містить усі ваші дані (зйомки, платежі, замовники, налаштування). Зберігайте її час від часу.</p></Group>
          <AvatarCard src={s.avatar_url ?? null} name={s.display_name} />
          <IcalCard token={s.ical_token ?? null} />
          <Group title="Тема"><p className="text-[13px] text-muted mb-3">Світла вдень, темна «нічна» — для очей увечері. Запам’ятовується на цьому пристрої; «Як у системі» перемикається разом із телефоном чи Mac.</p><ThemeToggle initial={theme} /></Group>
          <Group title="Фон" note="колір за картками"><p className="text-[13px] text-muted mb-3">М’який кольоровий градієнт за інтерфейсом. У темній темі він автоматично приглушується. Налаштування запам’ятовується на цьому пристрої.</p><BgPicker initial={bg} initialStrength={bgs} /></Group>
          <AssistantInline>Щоб додати кабінет на екран телефону: у Safari «Поділитися → На Початковий екран». Він відкриватиметься як застосунок, без адресного рядка.</AssistantInline>
          <AssistantInline>Податки рахуються за датами <b>отримання</b> платежів, а не за датами зйомок. Якщо гроші прийшли в іншому кварталі — поправте дату платежу в картці зйомки.</AssistantInline>
        </aside>
      </div>
    </>
  );
}
