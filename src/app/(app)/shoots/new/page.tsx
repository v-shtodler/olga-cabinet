import Link from "next/link";
import { getClients, getPresets, getShoot } from "@/lib/data";
import { PageHead } from "@/components/ui";
import { AssistantInline } from "@/components/assistant";
import { ShootForm } from "./shoot-form";
import * as I from "@/components/icons";

export const metadata = { title: "Нова зйомка" };

export default async function NewShootPage({ searchParams }: { searchParams: Promise<{ date?: string; client?: string; dup?: string }> }) {
  const { date, client, dup } = await searchParams;
  const [clients, presets] = await Promise.all([getClients(), getPresets()]);
  const source = dup ? (await getShoot(dup))?.shoot : null;
  if (!clients.length) {
    return (<><PageHead title="Нова зйомка" /><section className="card"><p className="mb-3">Спершу потрібен хоча б один замовник.</p><Link href="/clients?new=1" className="btn btn-primary">+ Додати замовника</Link></section></>);
  }
  return (
    <>
      <Link href="/shoots" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent mb-3"><I.Back /> Усі зйомки</Link>
      <PageHead title={source ? "Дублювати зйомку" : "Нова зйомка"} sub={source ? `На основі «${source.title}»` : "Пресет типу підставляє ціну, кількість фото і строки — усе можна змінити."} />
      <div className="flex flex-wrap gap-3.5">
        <section className="card flex-[999_1_560px] min-w-0"><ShootForm clients={clients} presets={presets} initial={{ date, clientId: client, source }} /></section>
        <aside className="flex-[1_1_280px] min-w-0 flex flex-col gap-3.5">
          <AssistantInline>Якщо передоплата ще не отримана, зйомка створиться як <b>Запит</b> і дата не блокує календар для помічника. Щойно гроші прийшли — натисніть «Підтвердити» у картці.</AssistantInline>
          <AssistantInline>Дата платежу визначає податковий квартал. Якщо передоплата прийшла не сьогодні, після створення поправте дату в розділі «Фінанси».</AssistantInline>
        </aside>
      </div>
    </>
  );
}
